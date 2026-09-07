-- CreateTable
CREATE TABLE `hazard_category` (
    `id_hazard_category` INTEGER NOT NULL AUTO_INCREMENT,
    `hazard_category_name` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `unique_hazard_category_name`(`hazard_category_name`),
    PRIMARY KEY (`id_hazard_category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hazard_form` (
    `id_hazard_form` INTEGER NOT NULL AUTO_INCREMENT,
    `id_hazard_category` INTEGER NOT NULL,
    `form` LONGTEXT NOT NULL,

    INDEX `id_hazard_category`(`id_hazard_category`),
    UNIQUE INDEX `hazard_form_id_hazard_category_key`(`id_hazard_category`),
    PRIMARY KEY (`id_hazard_form`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hazard_form_history` (
    `id_hazard_form_history` INTEGER NOT NULL AUTO_INCREMENT,
    `id_hazard_form` INTEGER NOT NULL,
    `form` LONGTEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `modified_by` VARCHAR(191) NOT NULL,
    `modified_on` DATETIME(3) NOT NULL,

    INDEX `id_hazard_form`(`id_hazard_form`),
    PRIMARY KEY (`id_hazard_form_history`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_has_hazards` (
    `id_lab_has_hazards` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NOT NULL,
    `id_hazard_form_history` INTEGER NOT NULL,
    `submission` LONGTEXT NOT NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_hazard_form_history`(`id_hazard_form_history`),
    PRIMARY KEY (`id_lab_has_hazards`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hazard_form` ADD CONSTRAINT `hazard_form_id_hazard_category_fkey` FOREIGN KEY (`id_hazard_category`) REFERENCES `hazard_category`(`id_hazard_category`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hazard_form_history` ADD CONSTRAINT `hazard_form_history_id_hazard_form_fkey` FOREIGN KEY (`id_hazard_form`) REFERENCES `hazard_form`(`id_hazard_form`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_has_hazards` ADD CONSTRAINT `lab_has_hazards_id_lab_fkey` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_has_hazards` ADD CONSTRAINT `lab_has_hazards_id_hazard_form_history_fkey` FOREIGN KEY (`id_hazard_form_history`) REFERENCES `hazard_form_history`(`id_hazard_form_history`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO hazard_category (hazard_category_name) VALUES
                                               ('Biological'),
                                               ('Chemical'),
                                               ('CompressedGas'),
                                               ('Cryogenics'),
                                               ('Electrical'),
                                               ('EMRadiation'),
                                               ('IonisingRadiation'),
                                               ('Laser'),
                                               ('StaticMagneticField'),
                                               ('Nanoparticles'),
                                               ('Noise'),
                                               ('Temperature');
commit;
