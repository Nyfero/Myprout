-- DropIndex
DROP INDEX `users_password_reset_token_key` ON `users`;

-- AlterTable
ALTER TABLE `users` MODIFY `password_reset_token` TEXT NULL;
