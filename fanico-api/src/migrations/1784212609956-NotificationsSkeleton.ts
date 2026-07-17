import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationsSkeleton1784212609956 implements MigrationInterface {
    name = 'NotificationsSkeleton1784212609956'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_recipienttype_enum" AS ENUM('customer', 'user')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_channel_enum" AS ENUM('whatsapp', 'sms', 'email')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('queued', 'sent', 'delivered', 'failed')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orgId" uuid NOT NULL, "recipientType" "public"."notifications_recipienttype_enum" NOT NULL, "recipientId" uuid NOT NULL, "channel" "public"."notifications_channel_enum" NOT NULL, "eventType" character varying NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'queued', "externalId" character varying, "sentAt" TIMESTAMP WITH TIME ZONE, "deliveredAt" TIMESTAMP WITH TIME ZONE, "failedReason" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ac41284f99d958df36531fd020" ON "notifications"  ("orgId") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_ac41284f99d958df36531fd0203" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_ac41284f99d958df36531fd0203"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac41284f99d958df36531fd020"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_recipienttype_enum"`);
    }

}
