-- CreateTable
CREATE TABLE `tag` (
    `id_tag` INTEGER NOT NULL AUTO_INCREMENT,
    `tag_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `unique_tag_name`(`tag_name`),
    PRIMARY KEY (`id_tag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hazards_additional_info_has_tag` (
    `id_hazards_additional_info_has_tag` INTEGER NOT NULL AUTO_INCREMENT,
    `id_tag` INTEGER NOT NULL,
    `id_lab_has_hazards_additional_info` INTEGER NOT NULL,
    `comment` LONGTEXT NULL,

    INDEX `id_tag`(`id_tag`),
    INDEX `id_lab_has_hazards_additional_info`(`id_lab_has_hazards_additional_info`),
    PRIMARY KEY (`id_hazards_additional_info_has_tag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hazards_additional_info_has_tag` ADD CONSTRAINT `hazards_additional_info_has_tag_id_tag_fkey` FOREIGN KEY (`id_tag`) REFERENCES `tag`(`id_tag`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hazards_additional_info_has_tag` ADD CONSTRAINT `hazards_additional_info_has_tag_id_lab_has_hazards_addition_fkey` FOREIGN KEY (`id_lab_has_hazards_additional_info`) REFERENCES `lab_has_hazards_additional_info`(`id_lab_has_hazards_additional_info`) ON DELETE RESTRICT ON UPDATE CASCADE;
