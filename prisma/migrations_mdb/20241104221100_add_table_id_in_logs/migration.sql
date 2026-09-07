/*
  Warnings:

  - Added the required column `table_id` to the `mutation_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mutation_logs` ADD COLUMN `table_id` INTEGER NOT NULL;
