-- CreateTable
CREATE TABLE `search_history` (
    `sciper` INTEGER NOT NULL,
    `search` VARCHAR(191) NOT NULL,
    `page` VARCHAR(191) NOT NULL,

    INDEX `sciper`(`sciper`),
    INDEX `page`(`page`),
    UNIQUE INDEX `unique_search_for_user_per_page`(`sciper`, `page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
