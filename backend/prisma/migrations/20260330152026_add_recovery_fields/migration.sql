/*
  Warnings:

  - You are about to drop the `ipAddress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ipAddress` DROP FOREIGN KEY `ipAddress_user_id_fkey`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `recovery_encrypted_crypto_key` VARCHAR(191) NULL,
    ADD COLUMN `recovery_questions` JSON NULL;

-- DropTable
DROP TABLE `ipAddress`;
