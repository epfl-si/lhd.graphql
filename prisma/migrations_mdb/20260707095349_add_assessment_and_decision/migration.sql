-- CreateTable
CREATE TABLE `assessment_and_decision_subject` (
    `id_assessment_and_decision_subject` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `unique_assessment_and_decision_subject`(`subject`),
    PRIMARY KEY (`id_assessment_and_decision_subject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision` (
    `id_assessment_and_decision` INTEGER NOT NULL AUTO_INCREMENT,
    `id_assessment_and_decision_subject` INTEGER NOT NULL,
    `subject_other` VARCHAR(60) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `conclusion` LONGTEXT NULL,
    `status` ENUM('Draft', 'Active', 'Closed') NOT NULL,
    `date` DATE NOT NULL,
    `created_by` VARCHAR(50) NOT NULL,
    `created_on` DATETIME(0) NOT NULL,
    `modified_by` VARCHAR(50) NOT NULL,
    `modified_on` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id_assessment_and_decision`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision_has_file` (
    `id_assessment_and_decision` INTEGER NOT NULL,
    `file_path` VARCHAR(250) NOT NULL,

    INDEX `file_path`(`file_path`),
    UNIQUE INDEX `unique_assessment_and_decision_has_file`(`id_assessment_and_decision`, `file_path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision_has_ticket` (
    `id_assessment_and_decision` INTEGER NOT NULL,
    `ticket_number` VARCHAR(191) NOT NULL,

    INDEX `ticket_number`(`ticket_number`),
    UNIQUE INDEX `unique_assessment_and_decision_has_ticket`(`id_assessment_and_decision`, `ticket_number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision_has_contact` (
    `id_assessment_and_decision` INTEGER NOT NULL,
    `id_person` INTEGER NOT NULL,

    INDEX `id_person`(`id_person`),
    UNIQUE INDEX `unique_assessment_and_decision_has_contact`(`id_assessment_and_decision`, `id_person`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision_has_room` (
    `id_assessment_and_decision` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,

    INDEX `id_lab`(`id_lab`),
    UNIQUE INDEX `unique_assessment_and_decision_has_room`(`id_assessment_and_decision`, `id_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_and_decision_has_unit` (
    `id_assessment_and_decision` INTEGER NOT NULL,
    `id_unit` INTEGER NOT NULL,

    INDEX `id_unit`(`id_unit`),
    UNIQUE INDEX `unique_assessment_and_decision_has_unit`(`id_assessment_and_decision`, `id_unit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_and_decision` ADD CONSTRAINT `assessment_and_decision_has_subject_ibfk_1` FOREIGN KEY (`id_assessment_and_decision_subject`) REFERENCES `assessment_and_decision_subject`(`id_assessment_and_decision_subject`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_file` ADD CONSTRAINT `assessment_and_decision_has_file_ibfk_1` FOREIGN KEY (`id_assessment_and_decision`) REFERENCES `assessment_and_decision`(`id_assessment_and_decision`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_ticket` ADD CONSTRAINT `assessment_and_decision_has_ticket_ibfk_1` FOREIGN KEY (`id_assessment_and_decision`) REFERENCES `assessment_and_decision`(`id_assessment_and_decision`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_contact` ADD CONSTRAINT `assessment_and_decision_has_contact_ibfk_1` FOREIGN KEY (`id_assessment_and_decision`) REFERENCES `assessment_and_decision`(`id_assessment_and_decision`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_contact` ADD CONSTRAINT `assessment_and_decision_has_contact_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_room` ADD CONSTRAINT `assessment_and_decision_has_room_ibfk_1` FOREIGN KEY (`id_assessment_and_decision`) REFERENCES `assessment_and_decision`(`id_assessment_and_decision`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_room` ADD CONSTRAINT `assessment_and_decision_has_room_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_unit` ADD CONSTRAINT `assessment_and_decision_has_unit_ibfk_1` FOREIGN KEY (`id_assessment_and_decision`) REFERENCES `assessment_and_decision`(`id_assessment_and_decision`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_and_decision_has_unit` ADD CONSTRAINT `assessment_and_decision_has_unit_ibfk_2` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;
