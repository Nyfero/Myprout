/*
  Warnings:

  - You are about to drop the column `old_email` on the `passwords` table. All the data in the column will be lost.
  - You are about to drop the column `old_note` on the `passwords` table. All the data in the column will be lost.
  - You are about to drop the column `old_password` on the `passwords` table. All the data in the column will be lost.
  - You are about to drop the column `old_title` on the `passwords` table. All the data in the column will be lost.
  - You are about to drop the column `old_username` on the `passwords` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[crypto_salt]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `passwords` DROP COLUMN `old_email`,
    DROP COLUMN `old_note`,
    DROP COLUMN `old_password`,
    DROP COLUMN `old_title`,
    DROP COLUMN `old_username`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `crypto_salt` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_crypto_salt_key` ON `users`(`crypto_salt`);
