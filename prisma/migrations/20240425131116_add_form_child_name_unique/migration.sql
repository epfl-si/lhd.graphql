/*
  Warnings:

  - A unique constraint covering the columns `[hazard_form_child_name]` on the table `hazard_form_child` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `hazard_form_child_hazard_form_child_name_key` ON `hazard_form_child`(`hazard_form_child_name`);
