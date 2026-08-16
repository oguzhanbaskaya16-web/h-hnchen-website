import { Module, OnModuleInit } from '@nestjs/common';
import { PrintAgentAuthGuard } from './guards/print-agent-auth.guard';
import { PrintJobsController } from './print-jobs.controller';
import { PrintJobsService } from './print-jobs.service';

@Module({
  controllers: [PrintJobsController],
  providers: [PrintJobsService, PrintAgentAuthGuard],
})
export class PrintJobsModule implements OnModuleInit {
  onModuleInit(): void {
    const token = process.env.PRINT_AGENT_TOKEN?.trim();
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !token) {
      throw new Error(
        'PRINT_AGENT_TOKEN muss in der Produktionsumgebung gesetzt sein.',
      );
    }

    if (token && token.length < 32) {
      throw new Error(
        'PRINT_AGENT_TOKEN muss aus mindestens 32 Zeichen bestehen.',
      );
    }
  }
}
