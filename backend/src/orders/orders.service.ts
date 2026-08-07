import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const now = new Date();
    const requestedTime = createOrderDto.requestedTime
      ? new Date(createOrderDto.requestedTime)
      : new Date(now.getTime() + 30 * 60 * 1000);

    if (requestedTime.getTime() < now.getTime()) {
      throw new BadRequestException(
        'Der gewünschte Abholzeitpunkt darf nicht in der Vergangenheit liegen.',
      );
    }

    const latestAllowedTime = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000,
    );

    if (requestedTime.getTime() > latestAllowedTime.getTime()) {
      throw new BadRequestException(
        'Der gewünschte Abholzeitpunkt darf höchstens 14 Tage in der Zukunft liegen.',
      );
    }

    const orderNumber = await this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({
        where: {
          sessionId: createOrderDto.cartId,
        },
        include: {
          items: {
            include: {
              product: true,
              options: true,
            },
          },
        },
      });

      if (!cart) {
        throw new NotFoundException('Warenkorb wurde nicht gefunden.');
      }

      if (cart.status !== 'offen') {
        throw new ConflictException(
          'Aus diesem Warenkorb kann keine Bestellung mehr erstellt werden.',
        );
      }

      if (cart.items.length === 0) {
        throw new BadRequestException(
          'Aus einem leeren Warenkorb kann keine Bestellung erstellt werden.',
        );
      }

      const existingOrder = await transaction.order.findFirst({
        where: {
          cartId: cart.id,
        },
      });

      if (existingOrder) {
        throw new ConflictException(
          'Für diesen Warenkorb wurde bereits eine Bestellung erstellt.',
        );
      }

      const initialStatus = await transaction.orderStatus.findUnique({
        where: {
          name: 'Eingegangen',
        },
      });

      if (!initialStatus) {
        throw new ConflictException(
          'Der initiale Bestellstatus ist nicht eingerichtet. Bitte führe das Datenbank-Seeding aus.',
        );
      }

      const subtotal = cart.items.reduce((cartTotal, item) => {
        const optionSurcharge = item.options.reduce(
          (optionTotal, option) => optionTotal.plus(option.surcharge),
          new Prisma.Decimal(0),
        );

        const unitTotal = item.unitPrice.plus(optionSurcharge);
        return cartTotal.plus(unitTotal.mul(item.quantity));
      }, new Prisma.Decimal(0));

      const generatedOrderNumber = this.generateOrderNumber(now);

      const closedCart = await transaction.cart.updateMany({
        where: {
          id: cart.id,
          status: 'offen',
        },
        data: {
          status: 'bestellt',
        },
      });

      if (closedCart.count !== 1) {
        throw new ConflictException(
          'Der Warenkorb wurde bereits bestellt oder zwischenzeitlich geändert.',
        );
      }

      await transaction.order.create({
        data: {
          cartId: cart.id,
          orderStatusId: initialStatus.id,
          orderNumber: generatedOrderNumber,
          orderType: 'ABHOLUNG',
          orderedAt: now,
          requestedTime,
          subtotal,
          deliveryFee: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: subtotal,
          note: createOrderDto.note || null,
          customer: {
            create: {
              firstName: createOrderDto.customer.firstName,
              lastName: createOrderDto.customer.lastName,
              phone: createOrderDto.customer.phone,
            },
          },
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              options: {
                create: item.options.map((option) => ({
                  productOptionId: option.productOptionId,
                  optionName: option.optionName,
                  surcharge: option.surcharge,
                })),
              },
            })),
          },
          statusHistory: {
            create: {
              orderStatusId: initialStatus.id,
              changedAt: now,
              note: 'Bestellung wurde erstellt.',
            },
          },
        },
      });

      return generatedOrderNumber;
    });

    return this.findByOrderNumber(orderNumber);
  }

  async findByOrderNumber(orderNumber: string) {
    const normalizedOrderNumber = orderNumber.trim().toUpperCase();

    const order = await this.prisma.order.findUnique({
      where: {
        orderNumber: normalizedOrderNumber,
      },
      include: {
        orderStatus: true,
        customer: true,
        items: {
          orderBy: {
            id: 'asc',
          },
          include: {
            options: {
              orderBy: {
                id: 'asc',
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Bestellung wurde nicht gefunden.');
    }

    return {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.orderStatus.name,
      orderedAt: order.orderedAt,
      requestedTime: order.requestedTime,
      customer: order.customer
        ? {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            phone: order.customer.phone,
          }
        : null,
      note: order.note,
      items: order.items.map((item) => {
        const optionSurcharge = item.options.reduce(
          (total, option) => total.plus(option.surcharge),
          new Prisma.Decimal(0),
        );

        const unitTotal = item.unitPrice.plus(optionSurcharge);
        const lineTotal = unitTotal.mul(item.quantity);

        return {
          itemId: item.id,
          product: {
            id: item.productId,
            name: item.productName,
          },
          quantity: item.quantity,
          baseUnitPrice: item.unitPrice.toFixed(2),
          options: item.options.map((option) => ({
            id: option.productOptionId,
            name: option.optionName,
            surcharge: option.surcharge.toFixed(2),
          })),
          optionSurcharge: optionSurcharge.toFixed(2),
          unitTotal: unitTotal.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        };
      }),
      subtotal: order.subtotal.toFixed(2),
      deliveryFee: order.deliveryFee.toFixed(2),
      discountAmount: order.discountAmount.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
    };
  }

  private generateOrderNumber(date: Date): string {
    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');

    const randomPart = randomUUID()
      .replaceAll('-', '')
      .slice(0, 8)
      .toUpperCase();

    return `IDIL-${datePart}-${randomPart}`;
  }
}
