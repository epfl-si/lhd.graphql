-- AlterTable
ALTER TABLE `authorization` ADD COLUMN `authority` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `authorization_has_radiation` (
    `id_authorization` INTEGER NOT NULL,
    `source` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `unique_authorization_has_radiation`(`id_authorization`, `source`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `authorization_has_radiation` ADD CONSTRAINT `authorization_has_radiation_ibfk_1` FOREIGN KEY (`id_authorization`) REFERENCES `authorization`(`id_authorization`) ON DELETE RESTRICT ON UPDATE RESTRICT;
