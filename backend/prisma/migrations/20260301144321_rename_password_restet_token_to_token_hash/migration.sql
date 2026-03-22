/*
  Warnings:

  - You are about to drop the column `password_reset_token` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_hash]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `users_password_reset_token_key` ON `users`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `password_reset_token`,
    ADD COLUMN `token_hash` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_token_hash_key` ON `users`(`token_hash`);
