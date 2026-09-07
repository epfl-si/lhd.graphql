/*
  Warnings:

  - Made the column `expiration_date` on table `authorization` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `authorization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `authorization` MODIFY `expiration_date` DATE NOT NULL,
    MODIFY `status` VARCHAR(30) NOT NULL;
