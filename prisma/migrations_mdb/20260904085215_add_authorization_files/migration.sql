-- CreateTable
CREATE TABLE `authorization_has_file` (
    `id_authorization` INTEGER NOT NULL,
    `file_path` VARCHAR(250) NOT NULL,

    INDEX `file_path`(`file_path`),
    UNIQUE INDEX `unique_authorization_has_file`(`id_authorization`, `file_path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `authorization_has_file` ADD CONSTRAINT `authorization_has_file_ibfk_1` FOREIGN KEY (`id_authorization`) REFERENCES `authorization`(`id_authorization`) ON DELETE RESTRICT ON UPDATE RESTRICT;
