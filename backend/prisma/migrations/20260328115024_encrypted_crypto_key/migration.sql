/*
  Warnings:

  - You are about to drop the column `crypto_salt` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `users_crypto_salt_key` ON `users`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `crypto_salt`,
    ADD COLUMN `encrypted_crypto_key` TEXT NULL,
    ADD COLUMN `kek_salt` VARCHAR(64) NULL;
