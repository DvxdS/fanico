import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Expense } from '../src/modules/expenses/entities/expense.entity';
import { CashDrawerSession } from '../src/modules/cash-drawer/entities/cash-drawer-session.entity';
import { Organization, OrganizationStatus, Language } from '../src/modules/orgs/entities/organization.entity';
import { Shop, ShopStatus } from '../src/modules/shops/entities/shop.entity';
import { User, UserStatus } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/users/entities/user-shop-role.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Service, ServiceCategory, ServiceStatus, ServiceUnit } from '../src/modules/catalog/entities/service.entity';
import { Ticket, TicketStatus } from '../src/modules/tickets/entities/ticket.entity';
import { TicketItem } from '../src/modules/tickets/entities/ticket-item.entity';
import { PhotoContext, TicketPhoto } from '../src/modules/tickets/entities/ticket-photo.entity';

interface Seeded {
  orgId: string;
  shopId: string;
  userId: string;
  customerId: string;
  serviceId: string;
  draftTicketId: string;
}

describe('Cross-org isolation + audit + expense reconciliation (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const tag = Date.now();
  let A: Seeded;
  let B: Seeded;
  let tokenA: string;
  let tokenB: string;
  const today = new Date().toISOString().slice(0, 10);

  async function seedOrg(label: string, code: string): Promise<Seeded> {
    const org = await ds.getRepository(Organization).save(
      ds.getRepository(Organization).create({
        name: `E2E ${label} ${tag}`,
        slug: `e2e-${label}-${tag}`,
        defaultLanguage: Language.FR,
        currency: 'XOF',
        status: OrganizationStatus.ACTIVE,
      }),
    );
    const shop = await ds.getRepository(Shop).save(
      ds.getRepository(Shop).create({ orgId: org.id, name: `Shop ${label}`, code, status: ShopStatus.ACTIVE }),
    );
    const user = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        orgId: org.id,
        fullName: `Owner ${label}`,
        phone: `+225${tag}${label === 'a' ? '1' : '2'}`,
        passwordHash: 'x',
        language: Language.FR,
        status: UserStatus.ACTIVE,
      }),
    );
    const customer = await ds.getRepository(Customer).save(
      ds.getRepository(Customer).create({ orgId: org.id, fullName: `Cust ${label}`, phone: `+225cust${tag}${label}` }),
    );
    const service = await ds.getRepository(Service).save(
      ds.getRepository(Service).create({
        orgId: org.id,
        name: `Svc ${label}`,
        category: ServiceCategory.WASH,
        unit: ServiceUnit.ITEM,
        basePriceXof: 1500,
        defaultLeadHours: 48,
        status: ServiceStatus.ACTIVE,
      }),
    );
    // A DRAFT ticket with one item + intake photo, ready to commit via the API.
    const ticket = await ds.getRepository(Ticket).save(
      ds.getRepository(Ticket).create({
        orgId: org.id,
        shopId: shop.id,
        customerId: customer.id,
        ticketNumber: `${code}-E2E-0001`,
        status: TicketStatus.DRAFT,
        totalXof: 3000,
        paidXof: 0,
      }),
    );
    await ds.getRepository(TicketItem).save(
      ds.getRepository(TicketItem).create({
        ticketId: ticket.id,
        serviceId: service.id,
        quantity: 2,
        unitPriceXof: 1500,
        lineTotalXof: 3000,
      }),
    );
    await ds.getRepository(TicketPhoto).save(
      ds.getRepository(TicketPhoto).create({
        ticketId: ticket.id,
        storagePath: 'x.jpg',
        context: PhotoContext.INTAKE_OVERVIEW,
        uploadedByUserId: user.id,
      }),
    );
    return {
      orgId: org.id,
      shopId: shop.id,
      userId: user.id,
      customerId: customer.id,
      serviceId: service.id,
      draftTicketId: ticket.id,
    };
  }

  const sign = (s: Seeded) =>
    jwt.sign({ sub: s.userId, orgId: s.orgId, roles: [{ role: Role.OWNER, shopId: null }] });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    A = await seedOrg('a', 'AAA');
    B = await seedOrg('b', 'BBB');
    tokenA = sign(A);
    tokenB = sign(B);
  }, 30000);

  afterAll(async () => {
    if (ds) {
      const orgIds = In([A.orgId, B.orgId]);
      // Remove RESTRICT-referencing rows first so the org cascade can proceed.
      await ds.getRepository(Ticket).delete({ orgId: orgIds }); // cascades items/photos/events/payments
      await ds.getRepository(Expense).delete({ orgId: orgIds });
      await ds.getRepository(CashDrawerSession).delete({ orgId: orgIds });
      await ds.getRepository(Organization).delete([A.orgId, B.orgId]);
    }
    if (app) await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('org A cannot fetch org B ticket by id (404)', async () => {
    await request(app.getHttpServer())
      .get(`/tickets/${B.draftTicketId}`)
      .set(auth(tokenA))
      .expect(404);
  });

  it('org A ticket list does not leak org B tickets', async () => {
    const res = await request(app.getHttpServer())
      .get('/tickets')
      .set(auth(tokenA))
      .expect(200);
    const ids = res.body.data.map((t: { id: string }) => t.id);
    expect(ids).not.toContain(B.draftTicketId);
  });

  it('org A cannot record a payment on an org B ticket (404)', async () => {
    await request(app.getHttpServer())
      .post(`/tickets/${B.draftTicketId}/payments`)
      .set(auth(tokenA))
      .send({ payments: [{ method: 'CASH', amountXof: 100 }] })
      .expect(404);
  });

  it("daily report for org B's shop under org A's token yields zero (no leakage)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/reports/daily?shopId=${B.shopId}&date=${today}`)
      .set(auth(tokenA))
      .expect(200);
    expect(res.body.totalRevenueXof).toBe(0);
  });

  it('writes audit rows for a ticket transition and a payment (org-scoped)', async () => {
    await request(app.getHttpServer())
      .post(`/tickets/${A.draftTicketId}/commit`)
      .set(auth(tokenA))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/tickets/${A.draftTicketId}/payments`)
      .set(auth(tokenA))
      .send({ payments: [{ method: 'CASH', amountXof: 3000 }] })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/audit')
      .set(auth(tokenA))
      .expect(200);
    const types = res.body.data.map((a: { entityType: string }) => a.entityType);
    expect(types).toContain('ticket');
    expect(types).toContain('payment');
    // org B must not see org A's audit trail
    const resB = await request(app.getHttpServer())
      .get('/audit')
      .set(auth(tokenB))
      .expect(200);
    expect(resB.body.total).toBe(0);
  });

  it('factors CASH expenses into cash drawer reconciliation', async () => {
    const open = await request(app.getHttpServer())
      .post('/cash-drawers/open')
      .set(auth(tokenA))
      .send({ shopId: A.shopId, startingAmountXof: 10000 })
      .expect(201);
    const sessionId = open.body.id;

    // A CASH payment (2000) and a CASH expense (500) during the session.
    await request(app.getHttpServer())
      .post(`/tickets/${A.draftTicketId}/payments`)
      .set(auth(tokenA))
      .send({ payments: [{ method: 'CASH', amountXof: 2000 }] })
      .expect(201);
    await request(app.getHttpServer())
      .post('/expenses')
      .set(auth(tokenA))
      .send({ shopId: A.shopId, category: 'detergent_softener', amountXof: 500, method: 'CASH', date: today })
      .expect(201);

    // expected = 10000 + 2000 - 500 = 11500
    const close = await request(app.getHttpServer())
      .post(`/cash-drawers/${sessionId}/close`)
      .set(auth(tokenA))
      .send({ endingAmountXof: 11500 })
      .expect(200);
    expect(close.body.expectedAmountXof).toBe(11500);
    expect(close.body.discrepancyXof).toBe(0);
    expect(close.body.status).toBe('closed');
  });
});
