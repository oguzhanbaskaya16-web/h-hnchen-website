import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicRestaurant() {
    const restaurant = await this.prisma.restaurant.findFirst({
      include: {
        openingHours: true,
        socialMediaLinks: {
          take: 3,
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurantdaten wurden nicht gefunden.');
    }

    return {
  name: restaurant.name,
  phone: restaurant.phone,
  email: restaurant.email,
  description: restaurant.description,
  address: {
    street: restaurant.street,
    houseNumber: restaurant.houseNumber,
    postalCode: restaurant.postalCode,
    city: restaurant.city,
  },
  openingHours: restaurant.openingHours.map((openingHour) => ({
    dayOfWeek: openingHour.weekday,
    opensAt: openingHour.opensAt.toISOString().slice(11, 16),
    closesAt: openingHour.closesAt.toISOString().slice(11, 16),
  })),
  socialLinks: restaurant.socialMediaLinks.map((socialMediaLink) => ({
    platform: socialMediaLink.platform,
    url: socialMediaLink.url,
  })),
  ordering: {
    pickupAvailable: true,
    deliveryAvailable: false,
    paymentMethods: ['CASH'],
  },
};
  }
}
