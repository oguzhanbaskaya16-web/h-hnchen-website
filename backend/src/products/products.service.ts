import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isAvailable: true,
      },
      include: {
        category: true,
        optionGroups: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            options: {
              where: {
                optionProduct: {
                  isAvailable: true,
                },
              },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              include: {
                optionProduct: true,
              },
            },
          },
        },
        recommendations: {
          where: {
            recommendedProduct: {
              isAvailable: true,
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            recommendedProduct: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produkt wurde nicht gefunden.');
    }

    return {
      id: product.id,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price.toFixed(2),
      image: product.image,
      preparationTimeMinutes: product.preparationTimeMinutes,
      allergenInformation: product.allergenInformation,
      isHighlight: product.isHighlight,
      isAvailable: product.isAvailable,
      category: {
        id: product.category.id,
        name: product.category.name,
      },
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
          shortDescription: option.optionProduct.shortDescription,
          description: option.optionProduct.description,
          surcharge: option.surcharge.toFixed(2),
          image: option.optionProduct.image,
          isAvailable: option.optionProduct.isAvailable,
        })),
      })),
      recommendations: product.recommendations.map((recommendation) => ({
        id: recommendation.recommendedProduct.id,
        name: recommendation.recommendedProduct.name,
        shortDescription: recommendation.recommendedProduct.shortDescription,
        price: recommendation.recommendedProduct.price.toFixed(2),
        image: recommendation.recommendedProduct.image,
        category: {
          id: recommendation.recommendedProduct.category.id,
          name: recommendation.recommendedProduct.category.name,
        },
      })),
    };
  }
}
