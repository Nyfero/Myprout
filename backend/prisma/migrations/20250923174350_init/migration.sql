-- DropForeignKey
ALTER TABLE `roles` DROP FOREIGN KEY `roles_user_id_fkey`;

-- DropIndex
DROP INDEX `roles_user_id_fkey` ON `roles`;

-- AlterTable
ALTER TABLE `roles` MODIFY `user_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
