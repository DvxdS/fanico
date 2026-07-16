import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
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

/**
 * Demo seed: 1 org, 1 shop (with code), 1 owner user (org-wide OWNER role),
 * 1 customer, and 2 services — enough to create/test tickets end-to-end.
 * Idempotent on the org slug — safe to re-run.
 */
async function seed() {
  await dataSource.initialize();
  const OWNER_PHONE = '+2250700000001';
  const OWNER_PASSWORD = 'owner-password';

  try {
    await dataSource.transaction(async (manager) => {
      const orgRepo = manager.getRepository(Organization);
      const shopRepo = manager.getRepository(Shop);
      const userRepo = manager.getRepository(User);
      const roleRepo = manager.getRepository(UserShopRole);
      const customerRepo = manager.getRepository(Customer);
      const serviceRepo = manager.getRepository(Service);

      let org = await orgRepo.findOne({ where: { slug: 'fanico-demo' } });
      if (!org) {
        org = await orgRepo.save(
          orgRepo.create({
            name: 'Fanico Demo',
            slug: 'fanico-demo',
            defaultLanguage: Language.FR,
            currency: 'XOF',
            status: OrganizationStatus.ACTIVE,
          }),
        );
      }

      let shop = await shopRepo.findOne({
        where: { orgId: org.id, name: 'Fanico Plateau' },
      });
      if (!shop) {
        shop = await shopRepo.save(
          shopRepo.create({
            orgId: org.id,
            name: 'Fanico Plateau',
            code: 'PLT',
            address: 'Plateau, Abidjan',
            phone: '+2252700000000',
            status: ShopStatus.ACTIVE,
          }),
        );
      } else if (!shop.code) {
        shop.code = 'PLT';
        await shopRepo.save(shop);
      }

      let owner = await userRepo.findOne({
        where: { orgId: org.id, phone: OWNER_PHONE },
      });
      if (!owner) {
        owner = await userRepo.save(
          userRepo.create({
            orgId: org.id,
            fullName: 'Awa Diallo',
            phone: OWNER_PHONE,
            email: 'owner@fanico.test',
            passwordHash: await bcrypt.hash(OWNER_PASSWORD, 10),
            language: Language.FR,
            status: UserStatus.ACTIVE,
          }),
        );

        // Org-wide OWNER role (shopId null).
        await roleRepo.save(
          roleRepo.create({
            userId: owner.id,
            shopId: null,
            role: Role.OWNER,
          }),
        );
      }

      let customer = await customerRepo.findOne({
        where: { orgId: org.id, phone: '+2250500000009' },
      });
      if (!customer) {
        customer = await customerRepo.save(
          customerRepo.create({
            orgId: org.id,
            fullName: 'Koffi Yao',
            phone: '+2250500000009',
            email: null,
            notes: null,
            preferences: null,
          }),
        );
      }

      const serviceSeeds = [
        {
          name: 'Chemise - lavage & repassage',
          category: ServiceCategory.WASH,
          unit: ServiceUnit.ITEM,
          basePriceXof: 1500,
        },
        {
          name: 'Costume - nettoyage à sec',
          category: ServiceCategory.DRY_CLEAN,
          unit: ServiceUnit.SET,
          basePriceXof: 6000,
        },
      ];
      const services: Service[] = [];
      for (const s of serviceSeeds) {
        let svc = await serviceRepo.findOne({
          where: { orgId: org.id, name: s.name },
        });
        if (!svc) {
          svc = await serviceRepo.save(
            serviceRepo.create({
              orgId: org.id,
              name: s.name,
              category: s.category,
              unit: s.unit,
              basePriceXof: s.basePriceXof,
              defaultLeadHours: 48,
              status: ServiceStatus.ACTIVE,
            }),
          );
        }
        services.push(svc);
      }

      // eslint-disable-next-line no-console
      console.log('Seed complete:');
      // eslint-disable-next-line no-console
      console.log(`  org:      ${org.name} (${org.id})`);
      // eslint-disable-next-line no-console
      console.log(`  shop:     ${shop.name} [${shop.code}] (${shop.id})`);
      // eslint-disable-next-line no-console
      console.log(`  customer: ${customer.fullName} (${customer.id})`);
      // eslint-disable-next-line no-console
      services.forEach((s) =>
        // eslint-disable-next-line no-console
        console.log(`  service:  ${s.name} = ${s.basePriceXof} XOF (${s.id})`),
      );
      // eslint-disable-next-line no-console
      console.log(`  login:    phone=${OWNER_PHONE}  password=${OWNER_PASSWORD}`);
    });
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
