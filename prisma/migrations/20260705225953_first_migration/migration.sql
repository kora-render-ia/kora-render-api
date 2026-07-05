-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED', 'REFUNDED', 'CANCELED');

-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "license_key" VARCHAR(30) NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "max_devices" INTEGER NOT NULL DEFAULT 2,
    "hotmart_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER NOT NULL,
    "device_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(255) NOT NULL,
    "operating_system" VARCHAR(100) NOT NULL,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER NOT NULL,
    "token_jti" VARCHAR(255) NOT NULL,
    "device_hash" VARCHAR(255) NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" SERIAL NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_license_key_key" ON "License"("license_key");

-- CreateIndex
CREATE INDEX "License_email_idx" ON "License"("email");

-- CreateIndex
CREATE INDEX "License_license_key_idx" ON "License"("license_key");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "License_hotmart_id_idx" ON "License"("hotmart_id");

-- CreateIndex
CREATE INDEX "Device_license_id_idx" ON "Device"("license_id");

-- CreateIndex
CREATE INDEX "Device_device_hash_idx" ON "Device"("device_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Device_license_id_device_hash_key" ON "Device"("license_id", "device_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_jti_key" ON "Session"("token_jti");

-- CreateIndex
CREATE INDEX "Session_token_jti_idx" ON "Session"("token_jti");

-- CreateIndex
CREATE INDEX "Session_license_id_idx" ON "Session"("license_id");

-- CreateIndex
CREATE INDEX "WebhookLog_event_idx" ON "WebhookLog"("event");

-- CreateIndex
CREATE INDEX "WebhookLog_processed_at_idx" ON "WebhookLog"("processed_at");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
