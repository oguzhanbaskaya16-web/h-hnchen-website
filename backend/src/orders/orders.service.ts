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

      const berlinDateParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Berlin',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(requestedTime);

      const weekday = berlinDateParts
        .find((part) => part.type === 'weekday')
        ?.value.toUpperCase();

      const requestedHour = Number(
        berlinDateParts.find((part) => part.type === 'hour')?.value,
      );

      const requestedMinute = Number(
        berlinDateParts.find((part) => part.type === 'minute')?.value,
      );

      if (
        !weekday ||
        Number.isNaN(requestedHour) ||
        Number.isNaN(requestedMinute)
      ) {
        throw new BadRequestException(
          'Der gewünschte Abholzeitpunkt konnte nicht verarbeitet werden.',
        );
      }

      const openingHours = await transaction.openingHour.findMany({
        where: {
          weekday,
        },
      });

      if (openingHours.length === 0) {
        throw new BadRequestException(
          'Das Restaurant ist am gewünschten Abholtag geschlossen.',
        );
      }

      const requestedMinutes = requestedHour * 60 + requestedMinute;

      const matchingOpeningHour = openingHours.find((openingHour) => {
        const openingMinutes =
          openingHour.opensAt.getUTCHours() * 60 +
          openingHour.opensAt.getUTCMinutes();

        const closingMinutes =
          openingHour.closesAt.getUTCHours() * 60 +
          openingHour.closesAt.getUTCMinutes();

        return (
          requestedMinutes >= openingMinutes &&
          requestedMinutes <= closingMinutes
        );
      });

      if (!matchingOpeningHour) {
        throw new BadRequestException(
          'Der gewünschte Abholzeitpunkt liegt außerhalb der Öffnungszeiten.',
        );
      }

      const closingMinutes =
        matchingOpeningHour.closesAt.getUTCHours() * 60 +
        matchingOpeningHour.closesAt.getUTCMinutes();

      const latestPickupMinutes = closingMinutes - 30;

      if (requestedMinutes > latestPickupMinutes) {
        throw new BadRequestException(
          'Der gewünschte Abholzeitpunkt muss mindestens 30 Minuten vor Ladenschluss liegen.',
        );
      }

      const minimumPreparationTime = new Date(now.getTime() + 30 * 60 * 1000);

      if (requestedTime < minimumPreparationTime) {
        throw new BadRequestException(
          'Der gewünschte Abholzeitpunkt muss mindestens 30 Minuten in der Zukunft liegen.',
        );
      }

      const unavailableItem = cart.items.find(
        (item) => !item.product.isAvailable,
      );

      const invalidQuantityItem = cart.items.find(
        (item) => item.quantity < 1 || item.quantity > 20,
      );

      if (invalidQuantityItem) {
        throw new ConflictException(
          `Die Menge des Produkts „${invalidQuantityItem.product.name}“ muss zwischen 1 und 20 liegen. Bitte aktualisiere deinen Warenkorb.`,
        );
      }

      if (unavailableItem) {
        throw new ConflictException(
          `Das Produkt „${unavailableItem.product.name}“ ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.`,
        );
      }

      const selectedOptionIds = cart.items.flatMap((item) =>
        item.options.map((option) => option.productOptionId),
      );

      const currentOptions = await transaction.productOption.findMany({
        where: {
          id: {
            in: selectedOptionIds,
          },
        },
        include: {
          optionProduct: true,
        },
      });

      const currentOptionsById = new Map(
        currentOptions.map((option) => [option.id, option]),
      );

      for (const item of cart.items) {
        for (const selectedOption of item.options) {
          const currentOption = currentOptionsById.get(
            selectedOption.productOptionId,
          );

          if (!currentOption || !currentOption.optionProduct.isAvailable) {
            throw new ConflictException(
              `Die Option „${selectedOption.optionName}“ ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.`,
            );
          }
          if (currentOption.mainProductId !== item.productId) {
            throw new ConflictException(
              `Die Option „${selectedOption.optionName}“ gehört nicht mehr zum Produkt „${item.product.name}“. Bitte aktualisiere deinen Warenkorb.`,
            );
          }
        }
      }

      const currentOptionGroups = await transaction.productOptionGroup.findMany(
        {
          where: {
            mainProductId: {
              in: cart.items.map((item) => item.productId),
            },
          },
          select: {
            id: true,
            mainProductId: true,
            name: true,
            minSelections: true,
            maxSelections: true,
          },
        },
      );

      for (const item of cart.items) {
        const optionCountsByGroupId = new Map<number, number>();

        for (const selectedOption of item.options) {
          const currentOption = currentOptionsById.get(
            selectedOption.productOptionId,
          );

          if (!currentOption) {
            continue;
          }

          const currentCount =
            optionCountsByGroupId.get(currentOption.optionGroupId) ?? 0;

          optionCountsByGroupId.set(
            currentOption.optionGroupId,
            currentCount + 1,
          );
        }

        const itemOptionGroups = currentOptionGroups.filter(
          (group) => group.mainProductId === item.productId,
        );

        for (const group of itemOptionGroups) {
          const selectedCount = optionCountsByGroupId.get(group.id) ?? 0;

          if (selectedCount < group.minSelections) {
            throw new ConflictException(
              `Für die Optionsgruppe „${group.name}“ des Produkts „${item.product.name}“ müssen mindestens ${group.minSelections} Optionen ausgewählt werden. Bitte aktualisiere deinen Warenkorb.`,
            );
          }

          if (selectedCount > group.maxSelections) {
            throw new ConflictException(
              `Für die Optionsgruppe „${group.name}“ des Produkts „${item.product.name}“ dürfen höchstens ${group.maxSelections} Optionen ausgewählt werden. Bitte aktualisiere deinen Warenkorb.`,
            );
          }
        }
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

      const paymentMethod = await transaction.paymentMethod.findUnique({
        where: {
          id: createOrderDto.paymentMethodId,
        },
      });

      if (!paymentMethod || !paymentMethod.isActive) {
        throw new BadRequestException(
          'Die ausgewählte Zahlungsart ist nicht verfügbar.',
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
          payments: {
            create: {
              paymentMethodId: paymentMethod.id,
              amount: subtotal,
              paymentStatus: 'AUSSTEHEND',
              createdAt: now,
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
        payments: {
          orderBy: {
            id: 'asc',
          },
          include: {
            paymentMethod: true,
          },
        },
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
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: {
          id: payment.paymentMethod.id,
          name: payment.paymentMethod.name,
          isOnlinePayment: payment.paymentMethod.isOnlinePayment,
        },
        amount: payment.amount.toFixed(2),
        status: payment.paymentStatus,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      })),
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
