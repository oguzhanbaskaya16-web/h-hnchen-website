import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderPdf(orderNumber: string): Promise<Buffer> {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();

    const [order, restaurant] = await Promise.all([
      this.prisma.order.findUnique({
        where: {
          orderNumber: normalizedOrderNumber,
        },
        include: {
          orderStatus: true,
          customer: true,
          payments: {
            orderBy: {
              id: 'asc',
            },
            include: {
              paymentMethod: true,
            },
          },
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
        },
      }),
      this.prisma.restaurant.findFirst({
        orderBy: {
          id: 'asc',
        },
      }),
    ]);

    if (!order) {
      throw new NotFoundException('Bestellung wurde nicht gefunden.');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        bufferPages: true,
        info: {
          Title: `Bestellbeleg ${order.orderNumber}`,
          Author: restaurant?.name ?? 'IDIL Hähnchengrill',
          Subject: 'Bestellbeleg',
          Keywords: 'Bestellung, Abholung, IDIL Hähnchengrill',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageWidth - doc.page.margins.right;
      const contentWidth = right - left;

      const ensureSpace = (height: number): void => {
        const bottom = doc.page.height - doc.page.margins.bottom;

        if (doc.y + height > bottom) {
          doc.addPage();
        }
      };

      const separator = (): void => {
        ensureSpace(14);
        const y = doc.y + 4;
        doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
        doc.moveDown(0.8);
      };

      const sectionTitle = (title: string): void => {
        ensureSpace(28);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(11).text(title.toUpperCase());
        doc.moveDown(0.4);
      };

      const labelValue = (label: string, value: string): void => {
        ensureSpace(18);

        const labelWidth = 130;
        const y = doc.y;

        doc.font('Helvetica-Bold').fontSize(10).text(label, left, y, {
          width: labelWidth,
          continued: false,
        });

        doc
          .font('Helvetica')
          .fontSize(10)
          .text(value, left + labelWidth, y, {
            width: contentWidth - labelWidth,
          });
      };

      const moneyRow = (
        label: string,
        amount: Prisma.Decimal,
        bold = false,
      ): void => {
        ensureSpace(18);

        const font = bold ? 'Helvetica-Bold' : 'Helvetica';
        const y = doc.y;

        doc
          .font(font)
          .fontSize(10)
          .text(label, left, y, {
            width: contentWidth - 100,
          });

        doc.font(font).fontSize(10).text(this.formatMoney(amount), left, y, {
          width: contentWidth,
          align: 'right',
        });
      };

      const restaurantName = restaurant?.name ?? 'IDIL Hähnchengrill';

      doc.font('Helvetica-Bold').fontSize(20).text(restaurantName, {
        align: 'center',
      });

      doc.moveDown(0.25);

      if (restaurant) {
        const addressParts = [
          [restaurant.street, restaurant.houseNumber].filter(Boolean).join(' '),
          [restaurant.postalCode, restaurant.city].filter(Boolean).join(' '),
        ].filter(Boolean);

        if (addressParts.length > 0) {
          doc.font('Helvetica').fontSize(9).text(addressParts.join(', '), {
            align: 'center',
          });
        }

        const contactParts = [
          restaurant.phone ? `Tel.: ${restaurant.phone}` : null,
          restaurant.email ? `E-Mail: ${restaurant.email}` : null,
        ].filter((value): value is string => Boolean(value));

        if (contactParts.length > 0) {
          doc.font('Helvetica').fontSize(9).text(contactParts.join(' | '), {
            align: 'center',
          });
        }
      }

      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(15).text('BESTELLBELEG', {
        align: 'center',
      });

      doc.moveDown(0.8);
      separator();

      sectionTitle('Bestellung');
      labelValue('Bestellnummer:', order.orderNumber);
      labelValue('Bestellt am:', this.formatDateTime(order.orderedAt));
      labelValue('Bestellart:', this.formatOrderType(order.orderType));
      labelValue('Abholung:', this.formatDateTime(order.requestedTime));
      labelValue('Status:', order.orderStatus.name);

      separator();

      sectionTitle('Kunde');

      if (order.customer) {
        const customerName =
          `${order.customer.firstName} ${order.customer.lastName}`.trim();

        labelValue('Name:', customerName);
        labelValue('Telefon:', order.customer.phone);
        labelValue('E-Mail:', order.customer.email);
      } else {
        doc
          .font('Helvetica')
          .fontSize(10)
          .text('Keine Kundendaten gespeichert.');
      }

      separator();

      sectionTitle('Bestellpositionen');

      for (const item of order.items) {
        const optionSurcharge = item.options.reduce(
          (sum, option) => sum.plus(option.surcharge),
          new Prisma.Decimal(0),
        );

        const unitTotal = item.unitPrice.plus(optionSurcharge);
        const lineTotal = unitTotal.mul(item.quantity);

        const estimatedItemHeight = 78 + item.options.length * 18;

        ensureSpace(estimatedItemHeight);

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(`${item.quantity} × ${item.productName}`, {
            width: contentWidth - 105,
          });

        const itemHeadingY = doc.y - 13;

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(this.formatMoney(lineTotal), left, itemHeadingY, {
            width: contentWidth,
            align: 'right',
          });

        doc.moveDown(0.35);

        moneyRow('Grundpreis je Stück', item.unitPrice);

        for (const option of item.options) {
          moneyRow(`+ ${option.optionName}`, option.surcharge);
        }

        moneyRow('Einzelpreis inkl. Optionen', unitTotal);

        ensureSpace(20);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Positionssumme', left, doc.y, {
            width: contentWidth - 100,
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(this.formatMoney(lineTotal), left, doc.y - 12, {
            width: contentWidth,
            align: 'right',
          });

        doc.moveDown(0.6);
        separator();
      }

      sectionTitle('Zusammenfassung');
      moneyRow('Zwischensumme', order.subtotal);
      moneyRow('Rabatt', order.discountAmount);
      moneyRow('Liefergebühr', order.deliveryFee);

      ensureSpace(34);
      doc.moveDown(0.4);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(1).stroke();
      doc.moveDown(0.5);

      moneyRow('GESAMTBETRAG', order.totalAmount, true);

      separator();

      sectionTitle('Zahlung');

      if (order.payments.length === 0) {
        doc.font('Helvetica').fontSize(10).text('Keine Zahlung gespeichert.');
      } else {
        order.payments.forEach((payment, index) => {
          ensureSpace(54);

          if (order.payments.length > 1) {
            doc
              .font('Helvetica-Bold')
              .fontSize(10)
              .text(`Zahlung ${index + 1}`);
          }

          labelValue('Zahlungsart:', payment.paymentMethod.name);
          labelValue('Zahlungsstatus:', payment.paymentStatus);
          labelValue('Betrag:', this.formatMoney(payment.amount));

          if (payment.paidAt) {
            labelValue('Bezahlt am:', this.formatDateTime(payment.paidAt));
          }

          if (payment.transactionReference) {
            labelValue('Transaktionsreferenz:', payment.transactionReference);
          }

          if (index < order.payments.length - 1) {
            doc.moveDown(0.4);
          }
        });
      }

      if (order.note) {
        separator();
        sectionTitle('Anmerkung');
        ensureSpace(40);
        doc.font('Helvetica').fontSize(10).text(order.note, {
          width: contentWidth,
        });
      }

      doc.moveDown(1.2);
      ensureSpace(30);

      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Dieser Beleg dokumentiert die Bestellung und ist nicht automatisch eine steuerrechtliche Rechnung.',
          {
            align: 'center',
          },
        );

      const pageRange = doc.bufferedPageRange();

      for (
        let pageIndex = pageRange.start;
        pageIndex < pageRange.start + pageRange.count;
        pageIndex += 1
      ) {
        doc.switchToPage(pageIndex);

        const footerY = doc.page.height - 32;

        doc
          .font('Helvetica')
          .fontSize(8)
          .text(
            `Bestellung ${order.orderNumber} · Seite ${
              pageIndex - pageRange.start + 1
            } von ${pageRange.count}`,
            left,
            footerY,
            {
              width: contentWidth,
              align: 'center',
              lineBreak: false,
            },
          );
      }

      doc.end();
    });
  }

  private formatMoney(value: Prisma.Decimal): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value.toFixed(2)));
  }

  private formatDateTime(value: Date): string {
    return `${new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(value)} Uhr`;
  }

  private formatOrderType(orderType: string): string {
    if (orderType === 'ABHOLUNG') {
      return 'Abholung';
    }

    return orderType;
  }
}
