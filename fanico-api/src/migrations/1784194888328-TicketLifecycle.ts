import { MigrationInterface, QueryRunner } from "typeorm";

export class TicketLifecycle1784194888328 implements MigrationInterface {
    name = 'TicketLifecycle1784194888328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" uuid NOT NULL, "serviceId" uuid NOT NULL, "quantity" integer NOT NULL, "unitPriceXof" integer NOT NULL, "modifiers" jsonb, "lineTotalXof" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_42c1d9799d0b98de1654a97ef1a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d229a0672a063c7eaa64720cd6" ON "ticket_items"  ("ticketId") `);
        await queryRunner.query(`CREATE TYPE "public"."ticket_photos_context_enum" AS ENUM('intake_overview', 'intake_detail', 'qc', 'dispute')`);
        await queryRunner.query(`CREATE TABLE "ticket_photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" uuid NOT NULL, "storagePath" character varying NOT NULL, "context" "public"."ticket_photos_context_enum" NOT NULL, "caption" character varying, "uploadedByUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b28b51467bc25fc78a068af95e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_59888292344046ec2bfb4bbfc1" ON "ticket_photos"  ("ticketId") `);
        await queryRunner.query(`CREATE TABLE "ticket_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" uuid NOT NULL, "eventType" character varying NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', "actorUserId" uuid NOT NULL, "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d61d07653b492eca67f9bad8ec2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1a0f730822e73763a752dfdc55" ON "ticket_events"  ("ticketId") `);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('DRAFT', 'OPEN', 'IN_PRODUCTION', 'READY', 'CLOSED', 'PARTIALLY_CLOSED', 'CANCELLED', 'DISPUTED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid NOT NULL, "customerId" uuid NOT NULL, "ticketNumber" character varying NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'DRAFT', "totalXof" integer NOT NULL DEFAULT '0', "paidXof" integer NOT NULL DEFAULT '0', "promisedPickupAt" TIMESTAMP WITH TIME ZONE, "pickedUpAt" TIMESTAMP WITH TIME ZONE, "notes" text, "openedByUserId" uuid, "closedByUserId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_ticket_shop_number" UNIQUE ("shopId", "ticketNumber"), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c1bb27f48aef1cdaaa90dee58" ON "tickets"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_efe9391fc9768ce3bb010e8d5f" ON "tickets"  ("shopId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a1f978a1c1a6b2b1133014b4b" ON "tickets"  ("customerId") `);
        await queryRunner.query(`CREATE TYPE "public"."payment_records_method_enum" AS ENUM('CASH', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'BANK_TRANSFER', 'CARD_VISA_GIM', 'CHEQUE', 'CREDIT')`);
        await queryRunner.query(`CREATE TABLE "payment_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" uuid NOT NULL, "method" "public"."payment_records_method_enum" NOT NULL, "amountXof" integer NOT NULL, "externalReference" character varying, "notes" character varying, "recordedByUserId" uuid NOT NULL, "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1770b3d8261895c6bafd8faef91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_880c42e69bf23272b8d1a273f5" ON "payment_records"  ("ticketId") `);
        await queryRunner.query(`CREATE TABLE "ticket_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shopId" uuid NOT NULL, "year" integer NOT NULL, "lastSeq" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_ticket_counter_shop_year" UNIQUE ("shopId", "year"), CONSTRAINT "PK_282dbaf6165a2d4825bfb02dda2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "code" character varying(12)`);
        await queryRunner.query(`ALTER TABLE "ticket_items" ADD CONSTRAINT "FK_d229a0672a063c7eaa64720cd6a" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_items" ADD CONSTRAINT "FK_e156c81bb88756f5a13e2ca1868" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_photos" ADD CONSTRAINT "FK_59888292344046ec2bfb4bbfc15" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_photos" ADD CONSTRAINT "FK_0b7594d0deae294ed202f307f1c" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_1a0f730822e73763a752dfdc55c" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_a5657c97e63104995ec52a0e896" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_4c1bb27f48aef1cdaaa90dee58c" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_efe9391fc9768ce3bb010e8d5f4" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_7a1f978a1c1a6b2b1133014b4b2" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_bd5e5b470a92fc2af129bfeb96c" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_21b977daca1fc611eba15e5b5f3" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD CONSTRAINT "FK_880c42e69bf23272b8d1a273f53" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_records" ADD CONSTRAINT "FK_d8ceec5831390c94c1706b34518" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_records" DROP CONSTRAINT "FK_d8ceec5831390c94c1706b34518"`);
        await queryRunner.query(`ALTER TABLE "payment_records" DROP CONSTRAINT "FK_880c42e69bf23272b8d1a273f53"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_21b977daca1fc611eba15e5b5f3"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_bd5e5b470a92fc2af129bfeb96c"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_7a1f978a1c1a6b2b1133014b4b2"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_efe9391fc9768ce3bb010e8d5f4"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_4c1bb27f48aef1cdaaa90dee58c"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_a5657c97e63104995ec52a0e896"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_1a0f730822e73763a752dfdc55c"`);
        await queryRunner.query(`ALTER TABLE "ticket_photos" DROP CONSTRAINT "FK_0b7594d0deae294ed202f307f1c"`);
        await queryRunner.query(`ALTER TABLE "ticket_photos" DROP CONSTRAINT "FK_59888292344046ec2bfb4bbfc15"`);
        await queryRunner.query(`ALTER TABLE "ticket_items" DROP CONSTRAINT "FK_e156c81bb88756f5a13e2ca1868"`);
        await queryRunner.query(`ALTER TABLE "ticket_items" DROP CONSTRAINT "FK_d229a0672a063c7eaa64720cd6a"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "code"`);
        await queryRunner.query(`DROP TABLE "ticket_counters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_880c42e69bf23272b8d1a273f5"`);
        await queryRunner.query(`DROP TABLE "payment_records"`);
        await queryRunner.query(`DROP TYPE "public"."payment_records_method_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a1f978a1c1a6b2b1133014b4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efe9391fc9768ce3bb010e8d5f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c1bb27f48aef1cdaaa90dee58"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a0f730822e73763a752dfdc55"`);
        await queryRunner.query(`DROP TABLE "ticket_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59888292344046ec2bfb4bbfc1"`);
        await queryRunner.query(`DROP TABLE "ticket_photos"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_photos_context_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d229a0672a063c7eaa64720cd6"`);
        await queryRunner.query(`DROP TABLE "ticket_items"`);
    }

}
