import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, PrintJobStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimPrintJobDto } from './dto/claim-print-job.dto';
import { MarkPrintJobFailedDto } from './dto/mark-print-job-failed.dto';
import { MarkPrintJobPrintedDto } from './dto/mark-print-job-printed.dto';
import { RetryPrintJobDto } from './dto/retry-print-job.dto';
import { OrderPdfService } from '../orders/order-pdf.service';

const LEASE_DURATION_MS = 5 * 60 * 1000;
const RETRY_DELAY_MS = 60 * 1000;

type ClaimCandidate = {
  id: string;
};

@Injectable()
export class PrintJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderPdfService: OrderPdfService,
  ) {}

  async claim(dto: ClaimPrintJobDto) {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);
    const claimToken = randomUUID();

    const printJob = await this.prisma.$transaction(async (transaction) => {
      const candidates = await transaction.$queryRaw<ClaimCandidate[]>(
        Prisma.sql`
          SELECT "druckauftrag_id" AS "id"
          FROM "druckauftraege"
          WHERE "druckversuche" < "maximale_druckversuche"
            AND (
              (
                "status" = 'PENDING'
                AND (
                  "naechster_versuch_am" IS NULL
                  OR "naechster_versuch_am" <= ${now}
                )
              )
              OR (
                "status" = 'PRINTING'
                AND "reservierung_laeuft_ab" IS NOT NULL
                AND "reservierung_laeuft_ab" <= ${now}
              )
            )
          ORDER BY "erstellt_am" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `,
      );

      const candidate = candidates[0];

      if (!candidate) {
        return null;
      }

      return transaction.printJob.update({
        where: {
          id: candidate.id,
        },
        data: {
          status: PrintJobStatus.PRINTING,
          attempts: {
            increment: 1,
          },
          claimedAt: now,
          leaseExpiresAt,
          nextAttemptAt: null,
          failedAt: null,
          claimToken,
          agentId: dto.agentId,
          printerName: dto.printerName,
          lastError: null,
        },
        include: {
          order: {
            include: {
              customer: true,
              items: {
                orderBy: {
                  id: 'asc',
                },
                include: {
                  options: {
                    orderBy: {
                      id: 'asc',
                    },
                  },
                },
              },
              payments: {
                orderBy: {
                  id: 'asc',
                },
                include: {
                  paymentMethod: true,
                },
              },
            },
          },
        },
      });
    });

    if (!printJob) {
      return {
        job: null,
      };
    }

    return {
      job: {
        id: printJob.id,
        claimToken: printJob.claimToken,
        attempt: printJob.attempts,
        maxAttempts: printJob.maxAttempts,
        claimedAt: printJob.claimedAt,
        leaseExpiresAt: printJob.leaseExpiresAt,
        agentId: printJob.agentId,
        printerName: printJob.printerName,
        pdfPath: `/api/v1/print-jobs/${encodeURIComponent(printJob.id)}/pdf`,
        order: {
          orderNumber: printJob.order.orderNumber,
          orderType: printJob.order.orderType,
          orderedAt: printJob.order.orderedAt,
          requestedTime: printJob.order.requestedTime,
          customer: printJob.order.customer
            ? {
                firstName: printJob.order.customer.firstName,
                lastName: printJob.order.customer.lastName,
                phone: printJob.order.customer.phone,
              }
            : null,
          note: printJob.order.note,
          items: printJob.order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            options: item.options.map((option) => ({
              name: option.optionName,
              surcharge: option.surcharge.toFixed(2),
            })),
          })),
          subtotal: printJob.order.subtotal.toFixed(2),
          totalAmount: printJob.order.totalAmount.toFixed(2),
          payment: printJob.order.payments[0]
            ? {
                method: printJob.order.payments[0].paymentMethod.name,
                status: printJob.order.payments[0].paymentStatus,
              }
            : null,
        },
      },
    };
  }

  async getPdf(id: string, claimToken: string, agentId: string) {
    const printJob = await this.prisma.printJob.findUnique({
      where: {
        id,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    if (!printJob) {
      throw new NotFoundException('PrintJob wurde nicht gefunden.');
    }

    if (printJob.status !== PrintJobStatus.PRINTING) {
      throw new ConflictException(
        'Der PrintJob ist nicht mehr zum Drucken reserviert.',
      );
    }

    this.assertOwnership(printJob, claimToken, agentId);

    const pdf = await this.orderPdfService.generateOrderPdf(
      printJob.order.orderNumber,
      {
        printJobId: printJob.id,
        attempt: printJob.attempts,
        maxAttempts: printJob.maxAttempts,
      },
    );

    return {
      pdf,
      orderNumber: printJob.order.orderNumber,
      attempt: printJob.attempts,
    };
  }

  async markPrinted(id: string, dto: MarkPrintJobPrintedDto) {
    const printJob = await this.findPrintJob(id);

    if (printJob.status === PrintJobStatus.PRINTED) {
      this.assertOwnership(printJob, dto.claimToken, dto.agentId);

      return this.statusResponse(printJob);
    }

    if (printJob.status !== PrintJobStatus.PRINTING) {
      throw new ConflictException(
        'Der PrintJob ist nicht mehr zum Drucken reserviert.',
      );
    }

    this.assertOwnership(printJob, dto.claimToken, dto.agentId);

    const updated = await this.prisma.printJob.updateMany({
      where: {
        id,
        status: PrintJobStatus.PRINTING,
        claimToken: dto.claimToken,
        agentId: dto.agentId,
      },
      data: {
        status: PrintJobStatus.PRINTED,
        printedAt: new Date(),
        leaseExpiresAt: null,
        nextAttemptAt: null,
        failedAt: null,
        printerName: dto.printerName,
        lastError: null,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Der PrintJob wurde zwischenzeitlich verändert.',
      );
    }

    return this.statusResponse(await this.findPrintJob(id));
  }

  async markFailed(id: string, dto: MarkPrintJobFailedDto) {
    const printJob = await this.findPrintJob(id);

    if (
      (printJob.status === PrintJobStatus.PENDING ||
        printJob.status === PrintJobStatus.FAILED) &&
      printJob.claimToken === dto.claimToken &&
      printJob.agentId === dto.agentId
    ) {
      return this.statusResponse(printJob);
    }

    if (printJob.status !== PrintJobStatus.PRINTING) {
      throw new ConflictException(
        'Der PrintJob ist nicht mehr zum Drucken reserviert.',
      );
    }

    this.assertOwnership(printJob, dto.claimToken, dto.agentId);

    const retryable =
      dto.errorType !== 'PERMANENT' && printJob.attempts < printJob.maxAttempts;

    const now = new Date();

    const updated = await this.prisma.printJob.updateMany({
      where: {
        id,
        status: PrintJobStatus.PRINTING,
        claimToken: dto.claimToken,
        agentId: dto.agentId,
      },
      data: {
        status: retryable ? PrintJobStatus.PENDING : PrintJobStatus.FAILED,
        leaseExpiresAt: null,
        nextAttemptAt: retryable
          ? new Date(now.getTime() + RETRY_DELAY_MS)
          : null,
        failedAt: retryable ? null : now,
        printerName: dto.printerName,
        lastError: `[${dto.errorType}] ${dto.error}`,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Der PrintJob wurde zwischenzeitlich verändert.',
      );
    }

    return this.statusResponse(await this.findPrintJob(id));
  }

  async retry(id: string, dto: RetryPrintJobDto) {
    const printJob = await this.findPrintJob(id);

    if (printJob.status !== PrintJobStatus.FAILED) {
      throw new ConflictException(
        'Nur endgültig fehlgeschlagene PrintJobs können manuell wiederholt werden.',
      );
    }

    const updated = await this.prisma.printJob.updateMany({
      where: {
        id,
        status: PrintJobStatus.FAILED,
      },
      data: {
        status: PrintJobStatus.PENDING,
        attempts: 0,
        claimedAt: null,
        leaseExpiresAt: null,
        printedAt: null,
        failedAt: null,
        nextAttemptAt: null,
        claimToken: null,
        agentId: null,
        printerName: null,
        lastError: `[MANUAL_RETRY] ${dto.reason}`,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Der PrintJob wurde zwischenzeitlich verändert.',
      );
    }

    return this.statusResponse(await this.findPrintJob(id));
  }

  private async findPrintJob(id: string) {
    const printJob = await this.prisma.printJob.findUnique({
      where: {
        id,
      },
    });

    if (!printJob) {
      throw new NotFoundException('PrintJob wurde nicht gefunden.');
    }

    return printJob;
  }

  private assertOwnership(
    printJob: {
      claimToken: string | null;
      agentId: string | null;
    },
    claimToken: string,
    agentId: string,
  ): void {
    if (printJob.claimToken !== claimToken || printJob.agentId !== agentId) {
      throw new ConflictException(
        'Die PrintJob-Reservierung gehört nicht zu diesem Agenten.',
      );
    }
  }

  private statusResponse(printJob: {
    id: string;
    status: PrintJobStatus;
    attempts: number;
    maxAttempts: number;
    printedAt: Date | null;
    failedAt: Date | null;
    nextAttemptAt: Date | null;
    lastError: string | null;
  }) {
    return {
      id: printJob.id,
      status: printJob.status,
      attempts: printJob.attempts,
      maxAttempts: printJob.maxAttempts,
      printedAt: printJob.printedAt,
      failedAt: printJob.failedAt,
      nextAttemptAt: printJob.nextAttemptAt,
      lastError: printJob.lastError,
    };
  }
}
