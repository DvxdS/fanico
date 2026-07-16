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

/**
 * Minimal Step 1 seed: 1 org, 1 shop, 1 owner user (org-wide OWNER role).
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
            address: 'Plateau, Abidjan',
            phone: '+2252700000000',
            status: ShopStatus.ACTIVE,
          }),
        );
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

      // eslint-disable-next-line no-console
      console.log('Seed complete:');
      // eslint-disable-next-line no-console
      console.log(`  org:   ${org.name} (${org.id})`);
      // eslint-disable-next-line no-console
      console.log(`  shop:  ${shop.name} (${shop.id})`);
      // eslint-disable-next-line no-console
      console.log(`  login: phone=${OWNER_PHONE}  password=${OWNER_PASSWORD}`);
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
