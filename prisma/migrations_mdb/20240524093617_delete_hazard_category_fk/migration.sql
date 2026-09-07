/*
  Warnings:

  - You are about to drop the column `id_hazard_category` on the `haz` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `haz` DROP FOREIGN KEY `haz_id_hazard_category_fkey`;

-- AlterTable
ALTER TABLE `haz` DROP COLUMN `id_hazard_category`;
