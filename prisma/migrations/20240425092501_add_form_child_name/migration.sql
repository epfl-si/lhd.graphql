/*
  Warnings:

  - Added the required column `hazard_form_child_name` to the `hazard_form_child` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `hazard_form_child` ADD COLUMN `hazard_form_child_name` VARCHAR(200) NOT NULL;
