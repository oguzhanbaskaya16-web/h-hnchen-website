import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create() {
    const cart = await this.prisma.cart.create({
      data: {
        sessionId: randomUUID(),
      },
    });

    return {
      sessionId: cart.sessionId,
      status: cart.status,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: [],
      total: 0,
    };
  }

  async addItem(sessionId: string, { productId, quantity }: AddCartItemDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { sessionId },
    });

    if (!cart) {
      throw new NotFoundException('Warenkorb wurde nicht gefunden.');
    }

    if (cart.status !== 'offen') {
      throw new ConflictException(
        'Artikel können nur zu einem offenen Warenkorb hinzugefügt werden.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isAvailable) {
      throw new NotFoundException('Produkt ist nicht verfügbar.');
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem && existingItem.quantity + quantity > 99) {
      throw new ConflictException(
        'Von einem Produkt sind höchstens 99 Stück pro Warenkorb erlaubt.',
      );
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: product.price,
      },
      update: {
        quantity: {
          increment: quantity,
        },
        unitPrice: product.price,
      },
    });

    return this.findPublicCart(sessionId);
  }

  private async findPublicCart(sessionId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { sessionId },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: { product: true },
        },
      },
    });

    const items = cart.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
    }));

    return {
      sessionId: cart.sessionId,
      status: cart.status,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items,
      total: items.reduce((total, item) => total + item.lineTotal, 0),
    };
  }
}
