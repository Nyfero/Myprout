/*
  Warnings:

  - You are about to drop the column `recovery_payload` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `recovery_payload`;
