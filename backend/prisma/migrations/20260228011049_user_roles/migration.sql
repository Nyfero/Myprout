/*
  Warnings:

  - You are about to drop the `_user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_user_roles` DROP FOREIGN KEY `_user_roles_A_fkey`;

-- DropForeignKey
ALTER TABLE `_user_roles` DROP FOREIGN KEY `_user_roles_B_fkey`;

-- DropTable
DROP TABLE `_user_roles`;

-- CreateTable
CREATE TABLE `userRoles` (
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
