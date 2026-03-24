/*
  Warnings:

  - You are about to drop the `aa` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `aa` DROP FOREIGN KEY `aa_ibfk_1`;

-- DropForeignKey
ALTER TABLE `aa` DROP FOREIGN KEY `aa_ibfk_2`;

-- DropForeignKey
ALTER TABLE `aa` DROP FOREIGN KEY `aa_ibfk_3`;

-- DropForeignKey
ALTER TABLE `aa` DROP FOREIGN KEY `aa_ibfk_4`;

-- DropTable
DROP TABLE `aa`;
