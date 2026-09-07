-- CreateTable
CREATE TABLE `lab_has_hazards_additional_info` (
    `id_lab_has_hazards_additional_info` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NOT NULL,
    `id_hazard_category` INTEGER NOT NULL,
    `comment` LONGTEXT NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_hazard_category`(`id_hazard_category`),
    PRIMARY KEY (`id_lab_has_hazards_additional_info`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lab_has_hazards_additional_info` ADD CONSTRAINT `lab_has_hazards_additional_info_id_hazard_category_fkey` FOREIGN KEY (`id_hazard_category`) REFERENCES `hazard_category`(`id_hazard_category`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_has_hazards_additional_info` ADD CONSTRAINT `lab_has_hazards_additional_info_id_lab_fkey` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE CASCADE;
