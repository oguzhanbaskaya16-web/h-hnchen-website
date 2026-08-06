import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantModule } from './restaurant/restaurant.module';

@Module({
  imports: [PrismaModule, HealthModule, RestaurantModule],
})
export class AppModule {}
