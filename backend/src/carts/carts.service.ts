import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

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
}
