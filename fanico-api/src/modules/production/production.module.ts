import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';
import { Batch } from './entities/batch.entity';
import { BatchStageEvent } from './entities/batch-stage-event.entity';
import { BatchCounter } from './entities/batch-counter.entity';
import { TicketItem } from '../tickets/entities/ticket-item.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Service } from '../catalog/entities/service.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { ProductionService } from './production.service';
import { BatchesController } from './batches.controller';
import { EquipmentController } from './equipment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      Batch,
      BatchStageEvent,
      BatchCounter,
      TicketItem,
      Shop,
      Service,
    ]),
    TicketsModule,
  ],
  providers: [ProductionService],
  controllers: [BatchesController, EquipmentController],
})
export class ProductionModule {}
