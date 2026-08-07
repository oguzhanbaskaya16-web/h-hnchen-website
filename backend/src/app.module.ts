import { Module } from '@nestjs/common';
import { CartsModule } from './carts/carts.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    RestaurantModule,
    MenuModule,
    CartsModule,
    OrdersModule,
  ],
})
export class AppModule {}
