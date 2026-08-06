import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Prisma } from '../generated/prisma/client';

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

  async addItem(
    sessionId: string,
    { productId, quantity, optionIds = [] }: AddCartItemDto,
  ) {
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
      include: {
        optionGroups: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            options: {
              orderBy: {
                sortOrder: 'asc',
              },
              include: {
                optionProduct: true,
              },
            },
          },
        },
      },
    });

    if (!product || !product.isAvailable) {
      throw new NotFoundException('Produkt ist nicht verfügbar.');
    }

    const availableOptions = product.optionGroups.flatMap((group) =>
      group.options.map((option) => ({
        ...option,
        group,
      })),
    );

    const optionById = new Map(
      availableOptions.map((option) => [option.id, option]),
    );

    const selectedOptions = optionIds.map((optionId) => {
      const option = optionById.get(optionId);

      if (!option) {
        throw new BadRequestException(
          `Die Produktoption mit der ID ${optionId} ist für dieses Produkt nicht erlaubt.`,
        );
      }

      if (!option.optionProduct.isAvailable) {
        throw new ConflictException(
          `Die Produktoption "${option.optionProduct.name}" ist derzeit nicht verfügbar.`,
        );
      }

      return option;
    });

    for (const group of product.optionGroups) {
      const selectedCount = selectedOptions.filter(
        (option) => option.optionGroupId === group.id,
      ).length;

      if (selectedCount < group.minSelections) {
        throw new BadRequestException(
          `Für die Optionsgruppe "${group.name}" müssen mindestens ${group.minSelections} Optionen ausgewählt werden.`,
        );
      }

      if (selectedCount > group.maxSelections) {
        throw new BadRequestException(
          `Für die Optionsgruppe "${group.name}" dürfen höchstens ${group.maxSelections} Optionen ausgewählt werden.`,
        );
      }
    }

    const sortedOptionIds = [...optionIds].sort(
      (first, second) => first - second,
    );

    const configurationKey =
      `product:${productId}|options:` + sortedOptionIds.join(',');

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_configurationKey: {
          cartId: cart.id,
          configurationKey,
        },
      },
    });

    if (existingItem && existingItem.quantity + quantity > 99) {
      throw new ConflictException(
        'Von einer Produktkonfiguration sind höchstens 99 Stück pro Warenkorb erlaubt.',
      );
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_configurationKey: {
          cartId: cart.id,
          configurationKey,
        },
      },
      create: {
        cart: {
          connect: {
            id: cart.id,
          },
        },
        product: {
          connect: {
            id: product.id,
          },
        },
        quantity,
        unitPrice: product.price,
        configurationKey,
        options: {
          create: selectedOptions.map((option) => ({
            productOption: {
              connect: {
                id: option.id,
              },
            },
            optionName: option.optionProduct.name,
            surcharge: option.surcharge,
          })),
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    return this.findPublicCart(sessionId);
  }

  async updateItem(
    sessionId: string,
    itemIdValue: string,
    { quantity, optionIds }: UpdateCartItemDto,
  ) {
    const itemId = Number(itemIdValue);

    if (!Number.isInteger(itemId) || itemId < 1) {
      throw new BadRequestException(
        'Die Warenkorbpositions-ID muss eine positive ganze Zahl sein.',
      );
    }

    if (quantity === undefined && optionIds === undefined) {
      throw new BadRequestException(
        'Mindestens quantity oder optionIds muss angegeben werden.',
      );
    }

    const cart = await this.prisma.cart.findUnique({
      where: {
        sessionId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Warenkorb wurde nicht gefunden.');
    }

    if (cart.status !== 'offen') {
      throw new ConflictException(
        'Positionen können nur in einem offenen Warenkorb geändert werden.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Warenkorbposition wurde nicht gefunden.');
    }

    if (quantity === 0) {
      await this.prisma.cartItem.delete({
        where: {
          id: item.id,
        },
      });

      return this.findPublicCart(sessionId);
    }

    const targetQuantity = quantity ?? item.quantity;

    const product = await this.prisma.product.findUnique({
      where: {
        id: item.productId,
      },
      include: {
        optionGroups: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            options: {
              orderBy: {
                sortOrder: 'asc',
              },
              include: {
                optionProduct: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produkt wurde nicht gefunden.');
    }

    if (targetQuantity > item.quantity && !product.isAvailable) {
      throw new ConflictException(
        'Die Menge eines nicht mehr verfügbaren Produkts kann nicht erhöht werden.',
      );
    }

    if (optionIds === undefined) {
      await this.prisma.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: targetQuantity,
        },
      });

      return this.findPublicCart(sessionId);
    }

    if (!product.isAvailable) {
      throw new ConflictException(
        'Die Optionen eines nicht mehr verfügbaren Produkts können nicht geändert werden.',
      );
    }

    const availableOptions = product.optionGroups.flatMap((group) =>
      group.options.map((option) => ({
        ...option,
        group,
      })),
    );

    const optionById = new Map(
      availableOptions.map((option) => [option.id, option]),
    );

    const selectedOptions = optionIds.map((optionId) => {
      const option = optionById.get(optionId);

      if (!option) {
        throw new BadRequestException(
          `Die Produktoption mit der ID ${optionId} ist für dieses Produkt nicht erlaubt.`,
        );
      }

      if (!option.optionProduct.isAvailable) {
        throw new ConflictException(
          `Die Produktoption "${option.optionProduct.name}" ist derzeit nicht verfügbar.`,
        );
      }

      return option;
    });

    for (const group of product.optionGroups) {
      const selectedCount = selectedOptions.filter(
        (option) => option.optionGroupId === group.id,
      ).length;

      if (selectedCount < group.minSelections) {
        throw new BadRequestException(
          `Für die Optionsgruppe "${group.name}" müssen mindestens ${group.minSelections} Optionen ausgewählt werden.`,
        );
      }

      if (selectedCount > group.maxSelections) {
        throw new BadRequestException(
          `Für die Optionsgruppe "${group.name}" dürfen höchstens ${group.maxSelections} Optionen ausgewählt werden.`,
        );
      }
    }

    const sortedOptionIds = [...optionIds].sort(
      (first, second) => first - second,
    );

    const configurationKey =
      `product:${product.id}|options:` + sortedOptionIds.join(',');

    const collidingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        configurationKey,
        id: {
          not: item.id,
        },
      },
    });

    if (collidingItem) {
      const combinedQuantity = collidingItem.quantity + targetQuantity;

      if (combinedQuantity > 99) {
        throw new ConflictException(
          'Von einer Produktkonfiguration sind höchstens 99 Stück pro Warenkorb erlaubt.',
        );
      }

      await this.prisma.$transaction(async (transaction) => {
        await transaction.cartItem.update({
          where: {
            id: collidingItem.id,
          },
          data: {
            quantity: combinedQuantity,
          },
        });

        await transaction.cartItem.delete({
          where: {
            id: item.id,
          },
        });
      });

      return this.findPublicCart(sessionId);
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.cartItemOption.deleteMany({
        where: {
          cartItemId: item.id,
        },
      });

      await transaction.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: targetQuantity,
          configurationKey,
          options: {
            create: selectedOptions.map((option) => ({
              productOption: {
                connect: {
                  id: option.id,
                },
              },
              optionName: option.optionProduct.name,
              surcharge: option.surcharge,
            })),
          },
        },
      });
    });

    return this.findPublicCart(sessionId);
  }
  async removeItem(sessionId: string, itemIdValue: string) {
    const itemId = Number(itemIdValue);

    if (!Number.isInteger(itemId) || itemId < 1) {
      throw new BadRequestException(
        'Die Warenkorbpositions-ID muss eine positive ganze Zahl sein.',
      );
    }

    const cart = await this.prisma.cart.findUnique({
      where: {
        sessionId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Warenkorb wurde nicht gefunden.');
    }

    if (cart.status !== 'offen') {
      throw new ConflictException(
        'Positionen können nur aus einem offenen Warenkorb entfernt werden.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Warenkorbposition wurde nicht gefunden.');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    return this.findPublicCart(sessionId);
  }

  private async findPublicCart(sessionId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: {
        sessionId,
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
          include: {
            product: true,
            options: {
              orderBy: {
                id: 'asc',
              },
              include: {
                productOption: {
                  include: {
                    optionProduct: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const items = cart.items.map((item) => {
      const optionSurcharge = item.options.reduce(
        (sum, option) => sum.plus(option.surcharge),
        new Prisma.Decimal(0),
      );

      const unitTotal = item.unitPrice.plus(optionSurcharge);
      const lineTotal = unitTotal.mul(item.quantity);

      return {
        itemId: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
        },
        quantity: item.quantity,

        baseUnitPrice: item.unitPrice.toFixed(2),

        options: item.options.map((option) => ({
          id: option.productOption.id,
          name: option.optionName,
          surcharge: option.surcharge.toFixed(2),
        })),

        optionSurcharge: optionSurcharge.toFixed(2),
        unitTotal: unitTotal.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      };
    });

    const total = cart.items.reduce((cartTotal, item) => {
      const optionSurcharge = item.options.reduce(
        (sum, option) => sum.plus(option.surcharge),
        new Prisma.Decimal(0),
      );

      const unitTotal = item.unitPrice.plus(optionSurcharge);
      const lineTotal = unitTotal.mul(item.quantity);

      return cartTotal.plus(lineTotal);
    }, new Prisma.Decimal(0));

    return {
      sessionId: cart.sessionId,
      status: cart.status,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items,
      total: total.toFixed(2),
    };
  }
}
