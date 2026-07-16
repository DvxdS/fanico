import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1784192523922 implements MigrationInterface {
    name = 'InitSchema1784192523922'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."organizations_defaultlanguage_enum" AS ENUM('fr', 'en')`);
        await queryRunner.query(`CREATE TYPE "public"."organizations_status_enum" AS ENUM('active', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "defaultLanguage" "public"."organizations_defaultlanguage_enum" NOT NULL DEFAULT 'fr', "currency" character varying NOT NULL DEFAULT 'XOF', "status" "public"."organizations_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."services_category_enum" AS ENUM('wash', 'iron_only', 'dry_clean', 'special')`);
        await queryRunner.query(`CREATE TYPE "public"."services_unit_enum" AS ENUM('item', 'kg', 'set')`);
        await queryRunner.query(`CREATE TYPE "public"."services_status_enum" AS ENUM('active', 'archived')`);
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "name" character varying NOT NULL, "category" "public"."services_category_enum" NOT NULL, "unit" "public"."services_unit_enum" NOT NULL, "basePriceXof" integer NOT NULL, "defaultLeadHours" integer NOT NULL DEFAULT '48', "status" "public"."services_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_471ea67808a5067c261d4c25f9" ON "services"  ("orgId") `);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "fullName" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying, "notes" text, "preferences" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_customer_org_phone" UNIQUE ("orgId", "phone"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d8efc0acf10024139dc048f43e" ON "customers"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_88acd889fbe17d0e16cc4bc917" ON "customers"  ("phone") `);
        await queryRunner.query(`CREATE TYPE "public"."shops_status_enum" AS ENUM('active', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "shops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "name" character varying NOT NULL, "address" character varying, "phone" character varying, "status" "public"."shops_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e4953cb5a41691c1062b0cfa49" ON "shops"  ("orgId") `);
        await queryRunner.query(`CREATE TABLE "shop_price_overrides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shopId" uuid NOT NULL, "serviceId" uuid NOT NULL, "basePriceXof" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_shop_service_override" UNIQUE ("shopId", "serviceId"), CONSTRAINT "PK_6ff2db795b4c491a74953752437" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cbe92bf45fcf98e28d2d485872" ON "shop_price_overrides"  ("shopId") `);
        await queryRunner.query(`CREATE INDEX "IDX_289bce393fd5e94598a51ddbcd" ON "shop_price_overrides"  ("serviceId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_language_enum" AS ENUM('fr', 'en')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "fullName" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying, "passwordHash" character varying NOT NULL, "language" "public"."users_language_enum" NOT NULL DEFAULT 'fr', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_user_org_phone" UNIQUE ("orgId", "phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1890588e47e133fd85670f187d" ON "users"  ("orgId") `);
        await queryRunner.query(`CREATE TYPE "public"."user_shop_roles_role_enum" AS ENUM('OWNER', 'SHOP_MANAGER', 'CASHIER', 'OPERATOR', 'AUDITOR')`);
        await queryRunner.query(`CREATE TABLE "user_shop_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "shopId" uuid, "role" "public"."user_shop_roles_role_enum" NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c3cafb0d07cd7df4b86755253e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bbb4711e5a2f4adecfa7c53f88" ON "user_shop_roles"  ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_49a98a8b15ad255e4f263e96d3" ON "user_shop_roles"  ("shopId") `);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_471ea67808a5067c261d4c25f93" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_d8efc0acf10024139dc048f43ea" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_e4953cb5a41691c1062b0cfa49e" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shop_price_overrides" ADD CONSTRAINT "FK_cbe92bf45fcf98e28d2d4858727" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shop_price_overrides" ADD CONSTRAINT "FK_289bce393fd5e94598a51ddbcd8" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_1890588e47e133fd85670f187d6" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_shop_roles" ADD CONSTRAINT "FK_bbb4711e5a2f4adecfa7c53f888" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_shop_roles" ADD CONSTRAINT "FK_49a98a8b15ad255e4f263e96d36" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_shop_roles" DROP CONSTRAINT "FK_49a98a8b15ad255e4f263e96d36"`);
        await queryRunner.query(`ALTER TABLE "user_shop_roles" DROP CONSTRAINT "FK_bbb4711e5a2f4adecfa7c53f888"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_1890588e47e133fd85670f187d6"`);
        await queryRunner.query(`ALTER TABLE "shop_price_overrides" DROP CONSTRAINT "FK_289bce393fd5e94598a51ddbcd8"`);
        await queryRunner.query(`ALTER TABLE "shop_price_overrides" DROP CONSTRAINT "FK_cbe92bf45fcf98e28d2d4858727"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_e4953cb5a41691c1062b0cfa49e"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_d8efc0acf10024139dc048f43ea"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_471ea67808a5067c261d4c25f93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49a98a8b15ad255e4f263e96d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bbb4711e5a2f4adecfa7c53f88"`);
        await queryRunner.query(`DROP TABLE "user_shop_roles"`);
        await queryRunner.query(`DROP TYPE "public"."user_shop_roles_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1890588e47e133fd85670f187d"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_language_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_289bce393fd5e94598a51ddbcd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cbe92bf45fcf98e28d2d485872"`);
        await queryRunner.query(`DROP TABLE "shop_price_overrides"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4953cb5a41691c1062b0cfa49"`);
        await queryRunner.query(`DROP TABLE "shops"`);
        await queryRunner.query(`DROP TYPE "public"."shops_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88acd889fbe17d0e16cc4bc917"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8efc0acf10024139dc048f43e"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_471ea67808a5067c261d4c25f9"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP TYPE "public"."services_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."services_unit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."services_category_enum"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TYPE "public"."organizations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."organizations_defaultlanguage_enum"`);
    }

}
