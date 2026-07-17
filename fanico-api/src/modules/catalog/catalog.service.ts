import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ShopPriceOverride } from './entities/shop-price-override.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Service } from './entities/service.entity';
import {
  CreatePriceOverrideDto,
  ListPriceOverridesQueryDto,
  UpdatePriceOverrideDto,
} from './dto/price-override.dto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ShopPriceOverride)
    private readonly overrideRepo: Repository<ShopPriceOverride>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  async createOverride(
    orgId: string,
    dto: CreatePriceOverrideDto,
  ): Promise<ShopPriceOverride> {
    const shop = await this.shopRepo.findOne({
      where: { id: dto.shopId, orgId },
    });
    if (!shop) {
      throw new BadRequestException('Shop not found in this organization');
    }
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, orgId },
    });
    if (!service) {
      throw new BadRequestException('Service not found in this organization');
    }
    const existing = await this.overrideRepo.findOne({
      where: { shopId: dto.shopId, serviceId: dto.serviceId },
    });
    if (existing) {
      throw new BadRequestException(
        'A price override already exists for this shop+service; PATCH it instead',
      );
    }
    return this.overrideRepo.save(
      this.overrideRepo.create({
        shopId: dto.shopId,
        serviceId: dto.serviceId,
        basePriceXof: dto.basePriceXof,
      }),
    );
  }

  async updateOverride(
    orgId: string,
    id: string,
    dto: UpdatePriceOverrideDto,
  ): Promise<ShopPriceOverride> {
    const override = await this.loadInOrg(orgId, id);
    override.basePriceXof = dto.basePriceXof;
    return this.overrideRepo.save(override);
  }

  async listOverrides(
    orgId: string,
    query: ListPriceOverridesQueryDto,
  ): Promise<{
    data: ShopPriceOverride[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // Scope to org by joining through the shop.
    const qb = this.overrideRepo
      .createQueryBuilder('o')
      .innerJoin(Shop, 's', 's.id = o.shopId')
      .where('s.orgId = :orgId', { orgId });
    if (query.shopId) {
      qb.andWhere('o.shopId = :shopId', { shopId: query.shopId });
    }
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    return { data, total, limit, offset };
  }

  private async loadInOrg(
    orgId: string,
    id: string,
  ): Promise<ShopPriceOverride> {
    const override = await this.overrideRepo
      .createQueryBuilder('o')
      .innerJoin(Shop, 's', 's.id = o.shopId')
      .where('o.id = :id AND s.orgId = :orgId', { id, orgId })
      .getOne();
    if (!override) {
      throw new NotFoundException('Price override not found');
    }
    return override;
  }
}
