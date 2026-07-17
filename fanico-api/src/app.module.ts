import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { OrgScopeInterceptor } from './common/interceptors/org-scope.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ProductionModule } from './modules/production/production.module';
import { CashDrawerModule } from './modules/cash-drawer/cash-drawer.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AuditModule } from './modules/audit/audit.module';
import { CatalogModule } from './modules/catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('databaseUrl'),
        synchronize: false,
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        logging:
          config.get<string>('nodeEnv') === 'production'
            ? ['error', 'warn']
            : ['error'],
      }),
    }),
    AuthModule,
    TicketsModule,
    ProductionModule,
    CashDrawerModule,
    ReportsModule,
    NotificationsModule,
    ExpensesModule,
    AuditModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: OrgScopeInterceptor },
  ],
})
export class AppModule {}
