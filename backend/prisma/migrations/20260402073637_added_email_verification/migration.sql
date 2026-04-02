-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `email` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX `users_email_is_email_verified_idx` ON `users`(`email`, `is_email_verified`);
