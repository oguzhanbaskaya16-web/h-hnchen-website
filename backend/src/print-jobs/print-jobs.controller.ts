import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClaimPrintJobDto } from './dto/claim-print-job.dto';
import { MarkPrintJobFailedDto } from './dto/mark-print-job-failed.dto';
import { MarkPrintJobPrintedDto } from './dto/mark-print-job-printed.dto';
import { RetryPrintJobDto } from './dto/retry-print-job.dto';
import { PrintAgentAuthGuard } from './guards/print-agent-auth.guard';
import { PrintJobsService } from './print-jobs.service';

@Controller('print-jobs')
@UseGuards(PrintAgentAuthGuard)
export class PrintJobsController {
  constructor(private readonly printJobsService: PrintJobsService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  claim(@Body() dto: ClaimPrintJobDto) {
    return this.printJobsService.claim(dto);
  }

  @Get(':id/pdf')
  async getPdf(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-print-claim-token') claimToken: string,
    @Headers('x-print-agent-id') agentId: string,
    @Res() response: Response,
  ) {
    const result = await this.printJobsService.getPdf(id, claimToken, agentId);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        `inline; filename="druckbeleg-${result.orderNumber}` +
        `-versuch-${result.attempt}.pdf"`,
      'Content-Length': result.pdf.length.toString(),
      'Cache-Control': 'no-store',
      'X-Print-Job-Id': id,
      'X-Print-Attempt': result.attempt.toString(),
      'X-Print-Repeat': result.attempt > 1 ? 'true' : 'false',
    });

    response.end(result.pdf);
  }

  @Post(':id/printed')
  @HttpCode(HttpStatus.OK)
  markPrinted(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: MarkPrintJobPrintedDto,
  ) {
    return this.printJobsService.markPrinted(id, dto);
  }

  @Post(':id/failed')
  @HttpCode(HttpStatus.OK)
  markFailed(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: MarkPrintJobFailedDto,
  ) {
    return this.printJobsService.markFailed(id, dto);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  retry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RetryPrintJobDto,
  ) {
    return this.printJobsService.retry(id, dto);
  }
}
