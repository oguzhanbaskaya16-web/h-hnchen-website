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
          price: Number(product.price),
          image: product.image,
          preparationTimeMinutes: product.preparationTimeMinutes,
          allergenInformation: product.allergenInformation,
          isHighlight: product.isHighlight,
        })),
      })),
    };
  }
}
