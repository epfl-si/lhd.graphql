-- CreateTable
CREATE TABLE `dispensation_has_unit` (
    `id_dispensation` INTEGER NOT NULL,
    `id_unit` INTEGER NOT NULL,

    INDEX `id_unit`(`id_unit`),
    UNIQUE INDEX `unique_dispensation_has_unit`(`id_dispensation`, `id_unit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispensation_has_unit` ADD CONSTRAINT `dispensation_has_unit_ibfk_1` FOREIGN KEY (`id_dispensation`) REFERENCES `dispensation`(`id_dispensation`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_unit` ADD CONSTRAINT `dispensation_has_unit_ibfk_2` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;
