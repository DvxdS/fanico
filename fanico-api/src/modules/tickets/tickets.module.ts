import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketItem } from './entities/ticket-item.entity';
import { TicketPhoto } from './entities/ticket-photo.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketCounter } from './entities/ticket-counter.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Service } from '../catalog/entities/service.entity';
import { ShopPriceOverride } from '../catalog/entities/shop-price-override.entity';
import { PaymentsModule } from '../payments/payments.module';
import { TicketsService } from './tickets.service';
import { TicketStateMachineService } from './ticket-state-machine.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketItem,
      TicketPhoto,
      TicketEvent,
      TicketCounter,
      Shop,
      Customer,
      Service,
      ShopPriceOverride,
    ]),
    PaymentsModule,
  ],
  providers: [TicketsService, TicketStateMachineService],
  controllers: [TicketsController],
})
export class TicketsModule {}
