import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DeepPartial, EntityManager, FindOptionsWhere } from 'typeorm';
import dataSource from './config/data-source';
import {
  Organization,
  OrganizationStatus,
  Language,
} from './modules/orgs/entities/organization.entity';
import { Shop, ShopStatus } from './modules/shops/entities/shop.entity';
import { User, UserStatus } from './modules/users/entities/user.entity';
import { Role, UserShopRole } from './modules/users/entities/user-shop-role.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import {
  Service,
  ServiceCategory,
  ServiceStatus,
  ServiceUnit,
} from './modules/catalog/entities/service.entity';
import {
  Ticket,
  TicketStatus,
} from './modules/tickets/entities/ticket.entity';
import { TicketItem } from './modules/tickets/entities/ticket-item.entity';
import {
  PhotoContext,
  TicketPhoto,
} from './modules/tickets/entities/ticket-photo.entity';
import {
  PaymentMethod,
  PaymentRecord,
} from './modules/payments/entities/payment-record.entity';

const DEMO_PASSWORD = 'demo1234';

async function findOrCreate<T extends object>(
  m: EntityManager,
  Entity: new () => T,
  where: FindOptionsWhere<NoInfer<T>>,
  make: () => DeepPartial<NoInfer<T>>,
): Promise<T> {
  const repo = m.getRepository(Entity);
  const found = await repo.findOne({ where });
  if (found) return found;
  const created: T = repo.create(make());
  return repo.save(created);
}

async function seed() {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (m) => {
      const org = await findOrCreate(
        m,
        Organization,
        { slug: 'fanico-demo' },
        () => ({
          name: 'Fanico Demo',
          slug: 'fanico-demo',
          defaultLanguage: Language.FR,
          currency: 'XOF',
          status: OrganizationStatus.ACTIVE,
        }),
      );

      const plateau = await findOrCreate(
        m,
        Shop,
        { orgId: org.id, name: 'Fanico Plateau' },
        () => ({
          orgId: org.id,
          name: 'Fanico Plateau',
          code: 'PLT',
          address: 'Plateau, Abidjan',
          phone: '+2252700000000',
          status: ShopStatus.ACTIVE,
        }),
      );
      const cocody = await findOrCreate(
        m,
        Shop,
        { orgId: org.id, name: 'Fanico Cocody' },
        () => ({
          orgId: org.id,
          name: 'Fanico Cocody',
          code: 'COC',
          address: 'Cocody, Abidjan',
          phone: '+2252700000001',
          status: ShopStatus.ACTIVE,
        }),
      );

      const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const staff: Array<{
        fullName: string;
        phone: string;
        role: Role;
        shopId: string | null;
      }> = [
        { fullName: 'Awa Diallo (Owner)', phone: '+2250700000001', role: Role.OWNER, shopId: null },
        { fullName: 'Moussa Ba (Manager)', phone: '+2250700000002', role: Role.SHOP_MANAGER, shopId: plateau.id },
        { fullName: 'Fatou Sow (Cashier)', phone: '+2250700000003', role: Role.CASHIER, shopId: plateau.id },
        { fullName: 'Ibrahima Kone (Operator)', phone: '+2250700000004', role: Role.OPERATOR, shopId: plateau.id },
      ];
      for (const s of staff) {
        const user = await findOrCreate(
          m,
          User,
          { orgId: org.id, phone: s.phone },
          () => ({
            orgId: org.id,
            fullName: s.fullName,
            phone: s.phone,
            email: null,
            passwordHash: hash,
            language: Language.FR,
            status: UserStatus.ACTIVE,
          }),
        );
        // Ensure the demo password is consistent even for pre-existing users.
        if (user.passwordHash !== hash) {
          user.passwordHash = hash;
          await m.getRepository(User).save(user);
        }
        await findOrCreate(
          m,
          UserShopRole,
          { userId: user.id, role: s.role },
          () => ({ userId: user.id, shopId: s.shopId, role: s.role }),
        );
      }
      const owner = await m
        .getRepository(User)
        .findOneOrFail({ where: { orgId: org.id, phone: '+2250700000001' } });

      const customers = await Promise.all(
        [
          { fullName: 'Koffi Yao', phone: '+2250500000009' },
          { fullName: 'Aya Traore', phone: '+2250500000010' },
        ].map((c) =>
          findOrCreate(m, Customer, { orgId: org.id, phone: c.phone }, () => ({
            orgId: org.id,
            fullName: c.fullName,
            phone: c.phone,
            email: null,
            notes: null,
            preferences: null,
          })),
        ),
      );

      const services = await Promise.all(
        [
          { name: 'Chemise - lavage & repassage', category: ServiceCategory.WASH, unit: ServiceUnit.ITEM, basePriceXof: 1500 },
          { name: 'Costume - nettoyage à sec', category: ServiceCategory.DRY_CLEAN, unit: ServiceUnit.SET, basePriceXof: 6000 },
        ].map((s) =>
          findOrCreate(m, Service, { orgId: org.id, name: s.name }, () => ({
            orgId: org.id,
            name: s.name,
            category: s.category,
            unit: s.unit,
            basePriceXof: s.basePriceXof,
            defaultLeadHours: 48,
            status: ServiceStatus.ACTIVE,
          })),
        ),
      );

      // Tickets in mixed states (only if not already seeded).
      const marker = await m
        .getRepository(Ticket)
        .findOne({ where: { shopId: plateau.id, ticketNumber: 'PLT-DEMO-0001' } });
      if (!marker) {
        const states = [
          TicketStatus.DRAFT,
          TicketStatus.OPEN,
          TicketStatus.IN_PRODUCTION,
          TicketStatus.READY,
          TicketStatus.CLOSED,
        ];
        let seq = 1;
        for (const status of states) {
          const svc = services[seq % services.length];
          const qty = 2;
          const total = svc.basePriceXof * qty;
          const closed = status === TicketStatus.CLOSED;
          const ticket = await m.getRepository(Ticket).save(
            m.getRepository(Ticket).create({
              orgId: org.id,
              shopId: plateau.id,
              customerId: customers[seq % customers.length].id,
              ticketNumber: `PLT-DEMO-${String(seq).padStart(4, '0')}`,
              status,
              totalXof: total,
              paidXof: closed ? total : 0,
              promisedPickupAt: null,
              notes: `Demo ticket in ${status}`,
              openedByUserId: status === TicketStatus.DRAFT ? null : owner.id,
              closedByUserId: closed ? owner.id : null,
            }),
          );
          await m.getRepository(TicketItem).save(
            m.getRepository(TicketItem).create({
              ticketId: ticket.id,
              serviceId: svc.id,
              quantity: qty,
              unitPriceXof: svc.basePriceXof,
              modifiers: null,
              lineTotalXof: total,
            }),
          );
          if (status !== TicketStatus.DRAFT) {
            await m.getRepository(TicketPhoto).save(
              m.getRepository(TicketPhoto).create({
                ticketId: ticket.id,
                storagePath: `uploads/demo/${ticket.ticketNumber}.jpg`,
                context: PhotoContext.INTAKE_OVERVIEW,
                caption: 'Demo intake',
                uploadedByUserId: owner.id,
              }),
            );
          }
          if (closed) {
            await m.getRepository(PaymentRecord).save(
              m.getRepository(PaymentRecord).create({
                ticketId: ticket.id,
                method: PaymentMethod.CASH,
                amountXof: total,
                externalReference: null,
                notes: 'Demo payment',
                recordedByUserId: owner.id,
              }),
            );
          }
          seq += 1;
        }
      }

      /* eslint-disable no-console */
      console.log('Demo seed complete:');
      console.log(`  org:    ${org.name} (${org.id})`);
      console.log(`  shops:  ${plateau.name} [PLT], ${cocody.name} [COC]`);
      console.log('  logins (password for all: ' + DEMO_PASSWORD + '):');
      staff.forEach((s) => console.log(`    ${s.role.padEnd(13)} ${s.phone}`));
      console.log('  tickets: DRAFT, OPEN, IN_PRODUCTION, READY, CLOSED (PLT-DEMO-0001..0005)');
      /* eslint-enable no-console */
    });
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Demo seed failed:', err);
  process.exit(1);
});
