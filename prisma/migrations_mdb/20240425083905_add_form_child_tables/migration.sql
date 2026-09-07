-- CreateTable
CREATE TABLE `hazard_form_child` (
    `id_hazard_form_child` INTEGER NOT NULL AUTO_INCREMENT,
    `id_hazard_form` INTEGER NOT NULL,
    `form` LONGTEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',

    INDEX `id_hazard_form`(`id_hazard_form`),
    PRIMARY KEY (`id_hazard_form_child`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hazard_form_child_history` (
    `id_hazard_form_child_history` INTEGER NOT NULL AUTO_INCREMENT,
    `id_hazard_form_child` INTEGER NOT NULL,
    `form` LONGTEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `modified_by` VARCHAR(191) NOT NULL,
    `modified_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `id_hazard_form_child`(`id_hazard_form_child`),
    PRIMARY KEY (`id_hazard_form_child_history`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_has_hazards_child` (
    `id_lab_has_hazards_child` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab_has_hazards` INTEGER NOT NULL,
    `id_hazard_form_child_history` INTEGER NOT NULL,
    `submission` LONGTEXT NOT NULL,

    INDEX `id_lab_has_hazards`(`id_lab_has_hazards`),
    INDEX `id_hazard_form_child_history`(`id_hazard_form_child_history`),
    PRIMARY KEY (`id_lab_has_hazards_child`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hazard_form_child` ADD CONSTRAINT `hazard_form_child_id_hazard_form_fkey` FOREIGN KEY (`id_hazard_form`) REFERENCES `hazard_form`(`id_hazard_form`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hazard_form_child_history` ADD CONSTRAINT `hazard_form_child_history_id_hazard_form_child_fkey` FOREIGN KEY (`id_hazard_form_child`) REFERENCES `hazard_form_child`(`id_hazard_form_child`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_has_hazards_child` ADD CONSTRAINT `lab_has_hazards_child_id_lab_has_hazards_fkey` FOREIGN KEY (`id_lab_has_hazards`) REFERENCES `lab_has_hazards`(`id_lab_has_hazards`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_has_hazards_child` ADD CONSTRAINT `lab_has_hazards_child_id_hazard_form_child_history_fkey` FOREIGN KEY (`id_hazard_form_child_history`) REFERENCES `hazard_form_child_history`(`id_hazard_form_child_history`) ON DELETE RESTRICT ON UPDATE CASCADE;
