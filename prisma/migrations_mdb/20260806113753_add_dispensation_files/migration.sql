-- CreateTable
CREATE TABLE `dispensation_has_file` (
    `id_dispensation` INTEGER NOT NULL,
    `file_path` VARCHAR(250) NOT NULL,

    INDEX `file_path`(`file_path`),
    UNIQUE INDEX `unique_dispensation_has_file`(`id_dispensation`, `file_path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispensation_has_file` ADD CONSTRAINT `dispensation_has_file_ibfk_1` FOREIGN KEY (`id_dispensation`) REFERENCES `dispensation`(`id_dispensation`) ON DELETE RESTRICT ON UPDATE RESTRICT;
