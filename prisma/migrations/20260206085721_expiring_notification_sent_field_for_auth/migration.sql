-- AlterTable
ALTER TABLE `authorization` ADD COLUMN `expiring_notification_sent` BOOLEAN NOT NULL DEFAULT false;
