/*
  Warnings:

  - You are about to drop the column `user_id` on the `roles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `roles` DROP FOREIGN KEY `roles_user_id_fkey`;

-- DropIndex
DROP INDEX `roles_user_id_fkey` ON `roles`;

-- AlterTable
ALTER TABLE `roles` DROP COLUMN `user_id`;

-- CreateTable
CREATE TABLE `_user_roles` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_user_roles_AB_unique`(`A`, `B`),
    INDEX `_user_roles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_user_roles` ADD CONSTRAINT `_user_roles_A_fkey` FOREIGN KEY (`A`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_user_roles` ADD CONSTRAINT `_user_roles_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
