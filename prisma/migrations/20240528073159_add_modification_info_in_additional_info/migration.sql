/*
  Warnings:

  - Added the required column `modified_by` to the `lab_has_hazards_additional_info` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `lab_has_hazards_additional_info` ADD COLUMN `modified_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `modified_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
