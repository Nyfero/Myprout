/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `ip_address` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[password_reset_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `ip_address` DROP FOREIGN KEY `ip_address_user_id_fkey`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `password`,
    ADD COLUMN `password_hash` VARCHAR(191) NULL,
    ADD COLUMN `password_reset_token` VARCHAR(191) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NULL;

-- DropTable
DROP TABLE `ip_address`;

-- CreateTable
CREATE TABLE `ipAddress` (
    `ip_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_time_used` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`ip_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_password_reset_token_key` ON `users`(`password_reset_token`);

-- AddForeignKey
ALTER TABLE `ipAddress` ADD CONSTRAINT `ipAddress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
