import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderPdfService } from './order-pdf.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfService],
})
export class OrdersModule {}
