import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClaimPrintJobDto } from './dto/claim-print-job.dto';
import { MarkPrintJobFailedDto } from './dto/mark-print-job-failed.dto';
import { MarkPrintJobPrintedDto } from './dto/mark-print-job-printed.dto';
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
}
