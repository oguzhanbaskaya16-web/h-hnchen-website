import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicMenu() {
    const categories = await this.prisma.productCategory.findMany({
      orderBy: {
        id: 'asc',
      },
      include: {
        products: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            id: 'asc',
          },
          include: {
            optionGroups: {
              orderBy: {
                id: 'asc',
              },
              include: {
                options: {
                  where: {
                    optionProduct: {
                      isAvailable: true,
                    },
                  },
                  orderBy: {
                    id: 'asc',
                  },
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

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        products: category.products.map((product) => ({
          id: product.id,
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          price: product.price.toFixed(2),
          image: product.image,
          preparationTimeMinutes: product.preparationTimeMinutes,
          allergenInformation: product.allergenInformation,
          isHighlight: product.isHighlight,
          optionGroups: product.optionGroups.map((group) => ({
            id: group.id,
            name: group.name,
            optionType: group.optionType,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            options: group.options.map((option) => ({
              id: option.id,
              productId: option.optionProduct.id,
              name: option.optionProduct.name,
              surcharge: option.surcharge.toFixed(2),
            })),
          })),
        })),
      })),
    };
  }
}
