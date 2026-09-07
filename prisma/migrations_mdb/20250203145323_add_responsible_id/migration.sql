-- AlterTable
ALTER TABLE `unit` ADD COLUMN `responsible_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `responsible_id` ON `unit`(`responsible_id`);

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_has_responsible` FOREIGN KEY (`responsible_id`) REFERENCES `person`(`id_person`) ON DELETE SET NULL ON UPDATE RESTRICT;


delete from subunpro where id_person = 185;
commit;
