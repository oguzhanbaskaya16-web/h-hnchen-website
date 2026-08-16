import { Module } from '@nestjs/common';
import { OrderPdfService } from './order-pdf.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfService],
  exports: [OrderPdfService],
})
export class OrdersModule {}
