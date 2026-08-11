import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartsService } from './carts.service';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  create() {
    return this.cartsService.create();
  }

  @Get(':cartId')
  findOne(@Param('cartId') cartId: string) {
    return this.cartsService.findPublicCart(cartId);
  }

  @Post(':cartId/items')
  addItem(
    @Param('cartId') cartId: string,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    return this.cartsService.addItem(cartId, addCartItemDto);
  }

  @Patch(':cartId/items/:itemId')
  updateItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(cartId, itemId, updateCartItemDto);
  }

  @Delete(':cartId/items')
  clear(@Param('cartId') cartId: string) {
    return this.cartsService.clear(cartId);
  }

  @Delete(':cartId/items/:itemId')
  removeItem(@Param('cartId') cartId: string, @Param('itemId') itemId: string) {
    return this.cartsService.removeItem(cartId, itemId);
  }
}
