-- AlterTable
ALTER TABLE `haz` ADD COLUMN `id_hazard_category` INTEGER NULL;

-- CreateIndex
CREATE INDEX `id_hazard_category` ON `haz`(`id_hazard_category`);

-- AddForeignKey
ALTER TABLE `haz` ADD CONSTRAINT `haz_id_hazard_category_fkey` FOREIGN KEY (`id_hazard_category`) REFERENCES `hazard_category`(`id_hazard_category`) ON DELETE SET NULL ON UPDATE CASCADE;
