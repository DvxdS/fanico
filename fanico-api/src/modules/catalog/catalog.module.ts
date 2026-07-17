import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopPriceOverride } from './entities/shop-price-override.entity';
import { Service } from './entities/service.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShopPriceOverride, Service, Shop])],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
