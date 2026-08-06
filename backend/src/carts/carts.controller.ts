import { Body, Controller, Param, Post } from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  create() {
    return this.cartsService.create();
  }

  @Post(':cartId/items')
  addItem(
    @Param('cartId') cartId: string,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    return this.cartsService.addItem(cartId, addCartItemDto);
  }
}
