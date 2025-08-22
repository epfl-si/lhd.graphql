/*
  Warnings:

  - Added the required column `renewals` to the `authorization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `authorization` ADD COLUMN `renewals` INTEGER NOT NULL;
