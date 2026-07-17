import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpensesAndAudit1784214446305 implements MigrationInterface {
    name = 'ExpensesAndAudit1784214446305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'transition')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "actorUserId" uuid NOT NULL, "actorRole" character varying NOT NULL, "shopId" uuid, "entityType" character varying NOT NULL, "entityId" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "before" jsonb, "after" jsonb, "reason" character varying, "ip" character varying, "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2d174aac379260555b5a571c08" ON "audit_logs"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_entity" ON "audit_logs"  ("entityType", "entityId") `);
        await queryRunner.query(`CREATE TYPE "public"."expenses_category_enum" AS ENUM('water', 'electricity', 'detergent_softener', 'consumables_other', 'salaries', 'rent', 'fuel_transport', 'equipment_maintenance', 'marketing', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."expenses_method_enum" AS ENUM('CASH', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'BANK_TRANSFER', 'CARD_VISA_GIM', 'CHEQUE', 'CREDIT')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "shopId" uuid, "category" "public"."expenses_category_enum" NOT NULL, "amountXof" integer NOT NULL, "method" "public"."expenses_method_enum" NOT NULL, "date" date NOT NULL, "vendor" character varying, "notes" character varying, "photoPath" character varying, "recordedByUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ecc160398e47080c5e82d3d271" ON "expenses"  ("orgId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2411acac576fa1e666f0fc958f" ON "expenses"  ("shopId") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_2d174aac379260555b5a571c08f" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_ecc160398e47080c5e82d3d2718" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_2411acac576fa1e666f0fc958fc" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_757dbfde17e952a1ab5af1fb2b7" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_757dbfde17e952a1ab5af1fb2b7"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_2411acac576fa1e666f0fc958fc"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_ecc160398e47080c5e82d3d2718"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_2d174aac379260555b5a571c08f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2411acac576fa1e666f0fc958f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ecc160398e47080c5e82d3d271"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_entity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d174aac379260555b5a571c08"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    }

}
