-- CreateTable
CREATE TABLE `mutation_logs` (
    `id_mutation_logs` INTEGER NOT NULL AUTO_INCREMENT,
    `modified_by` VARCHAR(191) NOT NULL,
    `modified_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `table_name` VARCHAR(191) NOT NULL,
    `column_name` VARCHAR(191) NOT NULL,
    `old_value` LONGTEXT NOT NULL,
    `new_value` LONGTEXT NOT NULL,
    `action` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_mutation_logs`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
