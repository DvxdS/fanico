import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashDrawerSession } from './entities/cash-drawer-session.entity';
import { Shop } from '../shops/entities/shop.entity';
import { PaymentsModule } from '../payments/payments.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { CashDrawerService } from './cash-drawer.service';
import { CashDrawerController } from './cash-drawer.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashDrawerSession, Shop]),
    PaymentsModule,
    ExpensesModule,
  ],
  providers: [CashDrawerService],
  controllers: [CashDrawerController],
})
export class CashDrawerModule {}
