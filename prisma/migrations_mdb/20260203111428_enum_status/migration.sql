/*
  Warnings:

  - You are about to alter the column `status` on the `authorization` table. The data in that column could be lost. The data in that column will be cast from `VarChar(30)` to `Enum(EnumId(0))`.
  - You are about to alter the column `status` on the `dispensation` table. The data in that column could be lost. The data in that column will be cast from `VarChar(10)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `authorization` MODIFY `status` ENUM('Active', 'Expired') NOT NULL;

-- AlterTable
ALTER TABLE `dispensation` MODIFY `status` ENUM('Draft', 'Active', 'Expired', 'Cancelled') NOT NULL;
