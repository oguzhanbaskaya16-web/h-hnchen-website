import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':productId')
  findOne(@Param('productId', ParseIntPipe) productId: number) {
    return this.productsService.findOne(productId);
  }
}
