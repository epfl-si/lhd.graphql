/*
  Warnings:

  - You are about to drop the column `version` on the `hazard_form_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `hazard_form` ADD COLUMN `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0';

-- AlterTable
ALTER TABLE `hazard_form_history` DROP COLUMN `version`,
    MODIFY `modified_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
