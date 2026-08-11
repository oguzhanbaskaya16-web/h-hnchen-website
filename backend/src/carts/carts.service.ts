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
import {
  cartClosed,
  cartItemNotFound,
  cartNotFound,
  maximumQuantityExceeded,
  optionSelectionInvalid,
  productOptionInvalid,
  productOptionUnavailable,
  productUnavailable,
} from './cart-errors';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  private async touchCart(cartId: number): Promise<void> {
    await this.prisma.cart.update({
      where: {
        id: cartId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  async create() {
    const cart = await this.prisma.cart.create({
      data: {
        sessionId: randomUUID(),
      },
    });

    return {
      cartId: cart.sessionId,
      status: cart.status,
      currency: 'EUR',
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: [],
      total: '0.00',
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
      throw cartNotFound();
    }

    if (cart.status !== 'offen') {
      throw maximumQuantityExceeded();
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

    const selectedOptions = this.validateSelectedOptions(product, optionIds);

    const configurationKey = this.createConfigurationKey(productId, optionIds);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_configurationKey: {
          cartId: cart.id,
          configurationKey,
        },
      },
    });

    if (existingItem && existingItem.quantity + quantity > 99) {
      throw maximumQuantityExceeded();
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

    await this.touchCart(cart.id);

    return this.findPublicCart(sessionId);
  }

  private readonly productWithOptionGroups = {
    optionGroups: {
      orderBy: {
        sortOrder: 'asc' as const,
      },
      include: {
        options: {
          orderBy: {
            sortOrder: 'asc' as const,
          },
          include: {
            optionProduct: true,
          },
        },
      },
    },
  };

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
      throw cartNotFound();
    }

    if (cart.status !== 'offen') {
      throw maximumQuantityExceeded();
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

      await this.touchCart(cart.id);

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
      throw maximumQuantityExceeded();
    }

    if (optionIds === undefined) {
      await this.prisma.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity,
        },
      });

      await this.touchCart(cart.id);

      return this.findPublicCart(sessionId);
    }

    if (!product.isAvailable) {
      throw maximumQuantityExceeded();
    }

    const selectedOptions = this.validateSelectedOptions(product, optionIds);

    const configurationKey = this.createConfigurationKey(product.id, optionIds);

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
        throw maximumQuantityExceeded();
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
        await transaction.cart.update({
          where: {
            id: cart.id,
          },
          data: {
            updatedAt: new Date(),
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
      await transaction.cart.update({
        where: {
          id: cart.id,
        },
        data: {
          updatedAt: new Date(),
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
      throw cartNotFound();
    }

    if (cart.status !== 'offen') {
      throw maximumQuantityExceeded();
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

    await this.touchCart(cart.id);

    return this.findPublicCart(sessionId);
  }

  async clear(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { sessionId: cartId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!cart) {
      throw cartNotFound();
    }

    if (cart.status !== 'offen') {
      throw maximumQuantityExceeded();
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.touchCart(cart.id);

    return this.findPublicCart(cartId);
  }

  async findPublicCart(sessionId: string) {
    const cart = await this.prisma.cart.findUnique({
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

    if (!cart) {
      throw cartNotFound();
    }

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
      cartId: cart.sessionId,
      status: cart.status,
      currency: 'EUR',
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items,
      total: total.toFixed(2),
    };
  }

  private validateSelectedOptions<
    T extends {
      optionGroups: Array<{
        id: number;
        name: string;
        minSelections: number;
        maxSelections: number;
        options: Array<{
          id: number;
          optionGroupId: number;
          surcharge: Prisma.Decimal;
          optionProduct: {
            name: string;
            isAvailable: boolean;
          };
        }>;
      }>;
    },
  >(product: T, optionIds: number[]) {
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
        throw productOptionInvalid(optionId);
      }

      if (!option.optionProduct.isAvailable) {
        throw productOptionUnavailable(option.optionProduct.name);
      }

      return option;
    });

    for (const group of product.optionGroups) {
      const selectedCount = selectedOptions.filter(
        (option) => option.optionGroupId === group.id,
      ).length;

      if (selectedCount < group.minSelections) {
        throw optionSelectionInvalid(
          `Für die Optionsgruppe "${group.name}" müssen mindestens ${group.minSelections} Optionen ausgewählt werden.`,
        );
      }

      if (selectedCount > group.maxSelections) {
        throw optionSelectionInvalid(
          `Für die Optionsgruppe "${group.name}" dürfen höchstens ${group.maxSelections} Optionen ausgewählt werden.`,
        );
      }
    }

    return selectedOptions;
  }

  private createConfigurationKey(
    productId: number,
    optionIds: number[],
  ): string {
    const sortedOptionIds = [...optionIds].sort(
      (first, second) => first - second,
    );

    return `product:${productId}|options:${sortedOptionIds.join(',')}`;
  }
}
