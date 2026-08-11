import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPdfService } from './order-pdf.service';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderPdfService: OrderPdfService,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get(':orderNumber/pdf')
  async getPdf(
    @Param('orderNumber') orderNumber: string,
    @Res() response: Response,
  ) {
    const pdf = await this.orderPdfService.generateOrderPdf(orderNumber);

    const normalizedOrderNumber = orderNumber.trim().toUpperCase();

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bestellung-${normalizedOrderNumber}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });

    response.end(pdf);
  }

  @Get(':orderNumber')
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }
}
