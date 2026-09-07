-- CreateTable
CREATE TABLE `hazards_additional_info_has_file` (
    `id_lab_has_hazards_additional_info` INTEGER NOT NULL,
    `file_path` VARCHAR(250) NOT NULL,

    INDEX `file_path`(`file_path`),
    UNIQUE INDEX `unique_hazards_additional_info_has_file`(`id_lab_has_hazards_additional_info`, `file_path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hazards_additional_info_has_file` ADD CONSTRAINT `lab_has_hazards_additional_info_has_file_ibfk_1` FOREIGN KEY (`id_lab_has_hazards_additional_info`) REFERENCES `lab_has_hazards_additional_info`(`id_lab_has_hazards_additional_info`) ON DELETE RESTRICT ON UPDATE RESTRICT;
