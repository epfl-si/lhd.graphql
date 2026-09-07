-- CreateTable
CREATE TABLE `authorization` (
    `id_authorization` INTEGER NOT NULL AUTO_INCREMENT,
    `authorization` VARCHAR(50) NOT NULL,
    `id_unit` INTEGER NULL,
    `expiration_date` DATE NULL,
    `status` VARCHAR(30) NULL,
    `creation_date` DATE NOT NULL,

    UNIQUE INDEX `authorization`(`authorization`),
    PRIMARY KEY (`id_authorization`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_has_room` (
    `id_authorization` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,

    INDEX `id_lab`(`id_lab`),
    UNIQUE INDEX `unique_authorization_has_room`(`id_authorization`, `id_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_has_holder` (
    `id_authorization` INTEGER NOT NULL,
    `id_person` INTEGER NOT NULL,

    INDEX `id_person`(`id_person`),
    UNIQUE INDEX `unique_authorization_has_holder`(`id_authorization`, `id_person`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_has_chemical` (
    `id_authorization` INTEGER NOT NULL,
    `id_chemical` INTEGER NOT NULL,

    INDEX `id_chemical`(`id_chemical`),
    UNIQUE INDEX `unique_authorization_has_chemical`(`id_authorization`, `id_chemical`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `authorization` ADD CONSTRAINT `authorization_unit_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_room` ADD CONSTRAINT `authorization_has_room_ibfk_1` FOREIGN KEY (`id_authorization`) REFERENCES `authorization`(`id_authorization`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_room` ADD CONSTRAINT `authorization_has_room_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_holder` ADD CONSTRAINT `authorization_has_holder_ibfk_1` FOREIGN KEY (`id_authorization`) REFERENCES `authorization`(`id_authorization`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_holder` ADD CONSTRAINT `authorization_has_holder_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_chemical` ADD CONSTRAINT `authorization_has_chemical_ibfk_1` FOREIGN KEY (`id_authorization`) REFERENCES `authorization`(`id_authorization`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `authorization_has_chemical` ADD CONSTRAINT `authorization_has_chemical_ibfk_2` FOREIGN KEY (`id_chemical`) REFERENCES `auth_chem`(`id_auth_chem`) ON DELETE RESTRICT ON UPDATE RESTRICT;
