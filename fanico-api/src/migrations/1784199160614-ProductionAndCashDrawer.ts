import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductionAndCashDrawer1784199160614 implements MigrationInterface {
    name = 'ProductionAndCashDrawer1784199160614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."cash_drawer_sessions_status_enum" AS ENUM('open', 'closed', 'flagged')`);
        await queryRunner.query(`CREATE TABLE "cash_drawer_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid NOT NULL, "cashierUserId" uuid NOT NULL, "openedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "closedAt" TIMESTAMP WITH TIME ZONE, "startingAmountXof" integer NOT NULL, "endingAmountXof" integer, "expectedAmountXof" integer, "discrepancyXof" integer, "status" "public"."cash_drawer_sessions_status_enum" NOT NULL DEFAULT 'open', "notes" character varying, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e616253a66196e3a42e06d4e8a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_56826500adddcd1645152f7b74" ON "cash_drawer_sessions"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ff39964d459c70c926c0095f0" ON "cash_drawer_sessions"  ("shopId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_cash_drawer_open_per_cashier_shop" ON "cash_drawer_sessions"  ("shopId", "cashierUserId") WHERE "status" = 'open'`);
        await queryRunner.query(`CREATE TYPE "public"."equipment_type_enum" AS ENUM('washer', 'dryer', 'press', 'dry_clean_unit')`);
        await queryRunner.query(`CREATE TYPE "public"."equipment_status_enum" AS ENUM('available', 'in_use', 'down')`);
        await queryRunner.query(`CREATE TABLE "equipment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."equipment_type_enum" NOT NULL, "capacityKg" integer, "status" "public"."equipment_status_enum" NOT NULL DEFAULT 'available', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17bf51b75531d6aecea98ecc34" ON "equipment"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc8cff7e2ab0cbedd1be54bd70" ON "equipment"  ("shopId") `);
        await queryRunner.query(`CREATE TYPE "public"."batches_currentstage_enum" AS ENUM('WASHING', 'DRYING', 'IRONING', 'QC', 'READY')`);
        await queryRunner.query(`CREATE TABLE "batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid NOT NULL, "batchNumber" character varying NOT NULL, "category" character varying NOT NULL, "equipmentId" uuid, "currentStage" "public"."batches_currentstage_enum" NOT NULL DEFAULT 'WASHING', "assignedToUserId" uuid, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "readyAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_batch_shop_number" UNIQUE ("shopId", "batchNumber"), CONSTRAINT "PK_55e7ff646e969b61d37eea5be7a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_acd5b12033bf0d7cb53d16a46c" ON "batches"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_486957bbe9c49dcb7dcf29967c" ON "batches"  ("shopId") `);
        await queryRunner.query(`CREATE TABLE "batch_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid NOT NULL, "year" integer NOT NULL, "lastSeq" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_batch_counter_shop_year" UNIQUE ("shopId", "year"), CONSTRAINT "PK_789b393a40e6c83a983ac62ceec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."batch_stage_events_stage_enum" AS ENUM('WASHING', 'DRYING', 'IRONING', 'QC', 'READY')`);
        await queryRunner.query(`CREATE TABLE "batch_stage_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batchId" uuid NOT NULL, "stage" "public"."batch_stage_events_stage_enum" NOT NULL, "enteredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "exitedAt" TIMESTAMP WITH TIME ZONE, "actorUserId" uuid NOT NULL, "notes" character varying, CONSTRAINT "PK_237c694d8346df6705af2e51b2e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0e9475664560c1842d5af40fcb" ON "batch_stage_events"  ("batchId") `);
        await queryRunner.query(`ALTER TABLE "ticket_items" ADD "batchId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_d9e2ffd5c3f46d93d23d71f2db" ON "ticket_items"  ("batchId") `);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" ADD CONSTRAINT "FK_56826500adddcd1645152f7b74f" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" ADD CONSTRAINT "FK_7ff39964d459c70c926c0095f07" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" ADD CONSTRAINT "FK_0d03a661a2c515a02e0c43fdabb" FOREIGN KEY ("cashierUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD CONSTRAINT "FK_17bf51b75531d6aecea98ecc34d" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD CONSTRAINT "FK_fc8cff7e2ab0cbedd1be54bd707" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batches" ADD CONSTRAINT "FK_acd5b12033bf0d7cb53d16a46cf" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batches" ADD CONSTRAINT "FK_486957bbe9c49dcb7dcf29967ca" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batches" ADD CONSTRAINT "FK_b0832104543e46a36ddfad82989" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batches" ADD CONSTRAINT "FK_ab90bcd623ff964d136588489d4" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_items" ADD CONSTRAINT "FK_d9e2ffd5c3f46d93d23d71f2db3" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batch_stage_events" ADD CONSTRAINT "FK_0e9475664560c1842d5af40fcbd" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "batch_stage_events" ADD CONSTRAINT "FK_be60335795b224c5bae3a3ec3b0" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "batch_stage_events" DROP CONSTRAINT "FK_be60335795b224c5bae3a3ec3b0"`);
        await queryRunner.query(`ALTER TABLE "batch_stage_events" DROP CONSTRAINT "FK_0e9475664560c1842d5af40fcbd"`);
        await queryRunner.query(`ALTER TABLE "ticket_items" DROP CONSTRAINT "FK_d9e2ffd5c3f46d93d23d71f2db3"`);
        await queryRunner.query(`ALTER TABLE "batches" DROP CONSTRAINT "FK_ab90bcd623ff964d136588489d4"`);
        await queryRunner.query(`ALTER TABLE "batches" DROP CONSTRAINT "FK_b0832104543e46a36ddfad82989"`);
        await queryRunner.query(`ALTER TABLE "batches" DROP CONSTRAINT "FK_486957bbe9c49dcb7dcf29967ca"`);
        await queryRunner.query(`ALTER TABLE "batches" DROP CONSTRAINT "FK_acd5b12033bf0d7cb53d16a46cf"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP CONSTRAINT "FK_fc8cff7e2ab0cbedd1be54bd707"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP CONSTRAINT "FK_17bf51b75531d6aecea98ecc34d"`);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" DROP CONSTRAINT "FK_0d03a661a2c515a02e0c43fdabb"`);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" DROP CONSTRAINT "FK_7ff39964d459c70c926c0095f07"`);
        await queryRunner.query(`ALTER TABLE "cash_drawer_sessions" DROP CONSTRAINT "FK_56826500adddcd1645152f7b74f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9e2ffd5c3f46d93d23d71f2db"`);
        await queryRunner.query(`ALTER TABLE "ticket_items" DROP COLUMN "batchId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e9475664560c1842d5af40fcb"`);
        await queryRunner.query(`DROP TABLE "batch_stage_events"`);
        await queryRunner.query(`DROP TYPE "public"."batch_stage_events_stage_enum"`);
        await queryRunner.query(`DROP TABLE "batch_counters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_486957bbe9c49dcb7dcf29967c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_acd5b12033bf0d7cb53d16a46c"`);
        await queryRunner.query(`DROP TABLE "batches"`);
        await queryRunner.query(`DROP TYPE "public"."batches_currentstage_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc8cff7e2ab0cbedd1be54bd70"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17bf51b75531d6aecea98ecc34"`);
        await queryRunner.query(`DROP TABLE "equipment"`);
        await queryRunner.query(`DROP TYPE "public"."equipment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."equipment_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_cash_drawer_open_per_cashier_shop"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ff39964d459c70c926c0095f0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56826500adddcd1645152f7b74"`);
        await queryRunner.query(`DROP TABLE "cash_drawer_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."cash_drawer_sessions_status_enum"`);
    }

}
