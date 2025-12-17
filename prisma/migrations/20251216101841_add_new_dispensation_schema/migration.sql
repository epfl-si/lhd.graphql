-- CreateTable
CREATE TABLE `dispensation_subject` (
    `id_dispensation_subject` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `unique_dispensation_subject`(`subject`),
    PRIMARY KEY (`id_dispensation_subject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispensation` (
    `id_dispensation` INTEGER NOT NULL AUTO_INCREMENT,
    `dispensation` VARCHAR(50) NOT NULL,
    `renewals` INTEGER NOT NULL,
    `id_dispensation_subject` INTEGER NOT NULL,
    `other_subject` VARCHAR(60) NOT NULL,
    `requires` LONGTEXT NOT NULL,
    `comment` LONGTEXT NULL,
    `status` VARCHAR(10) NOT NULL,
    `date_start` DATE NOT NULL,
    `date_end` DATE NOT NULL,
    `file_path` VARCHAR(250) NULL,
    `created_by` VARCHAR(50) NOT NULL,
    `created_on` DATETIME(0) NOT NULL,
    `modified_by` VARCHAR(50) NOT NULL,
    `modified_on` DATETIME(0) NOT NULL,

    UNIQUE INDEX `dispensation`(`dispensation`),
    PRIMARY KEY (`id_dispensation`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispensation_has_ticket` (
    `id_dispensation` INTEGER NOT NULL,
    `ticket_number` VARCHAR(191) NOT NULL,

    INDEX `ticket_number`(`ticket_number`),
    UNIQUE INDEX `unique_dispensation_has_ticket`(`id_dispensation`, `ticket_number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispensation_has_holder` (
    `id_dispensation` INTEGER NOT NULL,
    `id_person` INTEGER NOT NULL,

    INDEX `id_person`(`id_person`),
    UNIQUE INDEX `unique_dispensation_has_holder`(`id_dispensation`, `id_person`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispensation_has_room` (
    `id_dispensation` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,

    INDEX `id_lab`(`id_lab`),
    UNIQUE INDEX `unique_dispensation_has_room`(`id_dispensation`, `id_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispensation` ADD CONSTRAINT `dispensation_has_subject_ibfk_1` FOREIGN KEY (`id_dispensation_subject`) REFERENCES `dispensation_subject`(`id_dispensation_subject`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_ticket` ADD CONSTRAINT `dispensation_has_ticket_ibfk_1` FOREIGN KEY (`id_dispensation`) REFERENCES `dispensation`(`id_dispensation`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_holder` ADD CONSTRAINT `dispensation_has_holder_ibfk_1` FOREIGN KEY (`id_dispensation`) REFERENCES `dispensation`(`id_dispensation`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_holder` ADD CONSTRAINT `dispensation_has_holder_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_room` ADD CONSTRAINT `dispensation_has_room_ibfk_1` FOREIGN KEY (`id_dispensation`) REFERENCES `dispensation`(`id_dispensation`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dispensation_has_room` ADD CONSTRAINT `dispensation_has_room_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;


INSERT INTO dispensation_subject (id_dispensation_subject,subject) VALUES
            (9,'Chemical storage'),
            (1,'Chemical substances'),
            (8,'Chemical waste'),
            (7,'Cryogenics'),
            (3,'Flammable Gas'),
            (2,'Gas'),
            (4,'Inert Gas'),
            (10,'Laser'),
            (11,'Other'),
            (5,'Oxydising Gas'),
            (6,'Toxic Gas');
