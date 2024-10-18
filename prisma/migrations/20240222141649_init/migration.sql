-- CreateTable
CREATE TABLE `aa` (
    `id_aa` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NOT NULL,
    `din` VARCHAR(10) NOT NULL,
    `vol` DOUBLE NULL,
    `description` VARCHAR(100) NULL,
    `id_unit` INTEGER NOT NULL,
    `id_cosec` INTEGER NOT NULL,
    `id_head` INTEGER NOT NULL,
    `updated` VARCHAR(100) NOT NULL,
    `who_when` VARCHAR(100) NULL,
    `flag` BOOLEAN NULL,

    INDEX `id_cosec`(`id_cosec`),
    INDEX `id_head`(`id_head`),
    INDEX `id_lab`(`id_lab`),
    INDEX `id_unit`(`id_unit`),
    PRIMARY KEY (`id_aa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audits` (
    `id_audit` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NOT NULL,
    `date_audit` DATE NOT NULL,

    UNIQUE INDEX `id_unit`(`id_unit`),
    UNIQUE INDEX `unique_audit`(`id_unit`, `date_audit`),
    PRIMARY KEY (`id_audit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_chem` (
    `id_auth_chem` INTEGER NOT NULL AUTO_INCREMENT,
    `cas_auth_chem` VARCHAR(100) NOT NULL,
    `auth_chem_en` VARCHAR(500) NOT NULL,
    `auth_chem_fr` VARCHAR(500) NULL,
    `flag_auth_chem` BOOLEAN NOT NULL,

    UNIQUE INDEX `cas_auth_chem`(`cas_auth_chem`),
    UNIQUE INDEX `auth_chem_en`(`auth_chem_en`),
    PRIMARY KEY (`id_auth_chem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_chem_log` (
    `id_auth_chem_log` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_chem` INTEGER NOT NULL,
    `sciper_author` INTEGER NOT NULL,
    `author` VARCHAR(100) NOT NULL,
    `action` VARCHAR(10) NOT NULL,
    `date` DATETIME(0) NOT NULL,

    INDEX `auth_chem_log_ibfk_1`(`id_auth_chem`),
    PRIMARY KEY (`id_auth_chem_log`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_chem_old` (
    `id_auth_chem` INTEGER NOT NULL AUTO_INCREMENT,
    `cas_auth_chem` VARCHAR(100) NULL,
    `auth_chem_en` VARCHAR(100) NULL,
    `auth_chem_fr` VARCHAR(100) NULL,

    UNIQUE INDEX `cas_auth_chem`(`cas_auth_chem`),
    UNIQUE INDEX `auth_chem_en`(`auth_chem_en`),
    PRIMARY KEY (`id_auth_chem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_dsps` (
    `id_auth_dsps` INTEGER NOT NULL AUTO_INCREMENT,
    `auth_dsps` VARCHAR(10) NOT NULL,
    `log_in` INTEGER NULL,
    `log_in_time` DATETIME(0) NULL,

    UNIQUE INDEX `auth_dsps`(`auth_dsps`),
    UNIQUE INDEX `auth_dsps_id_auth_dsps`(`auth_dsps`, `id_auth_dsps`),
    UNIQUE INDEX `log_in_auth_dsps`(`log_in`, `id_auth_dsps`),
    UNIQUE INDEX `log_in_time_auth_dsps`(`log_in_time`, `id_auth_dsps`),
    PRIMARY KEY (`id_auth_dsps`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_dsps_holder` (
    `id_auth_dsps_holder` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_dsps_version` INTEGER NOT NULL,
    `id_person` INTEGER NOT NULL,

    INDEX `id_auth_dsps_version`(`id_auth_dsps_version`),
    UNIQUE INDEX `authholder`(`id_person`, `id_auth_dsps_version`),
    PRIMARY KEY (`id_auth_dsps_holder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_dsps_lab` (
    `id_auth_dsps_lab` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_dsps_version` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,

    INDEX `id_auth_dsps_version`(`id_auth_dsps_version`),
    UNIQUE INDEX `authlab`(`id_lab`, `id_auth_dsps_version`),
    PRIMARY KEY (`id_auth_dsps_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_dsps_version` (
    `id_auth_dsps_version` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_dsps` INTEGER NOT NULL,
    `author` VARCHAR(50) NOT NULL,
    `sciper_author` INTEGER NOT NULL,
    `subject` VARCHAR(50) NOT NULL,
    `requires` VARCHAR(2000) NULL,
    `comment` VARCHAR(2000) NULL,
    `status` VARCHAR(10) NOT NULL,
    `date_start` DATE NOT NULL,
    `date_end` DATE NOT NULL,
    `date` DATETIME(0) NOT NULL,
    `version` CHAR(5) NOT NULL,
    `notifier` VARCHAR(50) NULL,
    `notification_date` DATETIME(0) NULL,

    INDEX `id_auth_dsps`(`id_auth_dsps`),
    PRIMARY KEY (`id_auth_dsps_version`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_holder` (
    `id_auth_holder` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_sst` INTEGER NOT NULL,
    `sciper` INTEGER NOT NULL,
    `holder_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `id_auth_sst_sciper_holder`(`id_auth_sst`, `sciper`, `holder_name`),
    PRIMARY KEY (`id_auth_holder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_lab` (
    `id_auth_lab` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_req` INTEGER NOT NULL,
    `id_lab` INTEGER NULL,
    `id_storage` INTEGER NULL,

    INDEX `id_auth_req`(`id_auth_req`),
    INDEX `id_lab`(`id_lab`),
    INDEX `id_storage`(`id_storage`),
    PRIMARY KEY (`id_auth_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_rchem` (
    `id_auth_rchem` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_req` INTEGER NULL,
    `id_auth_chem` INTEGER NULL,

    INDEX `id_auth_chem`(`id_auth_chem`),
    INDEX `id_auth_req`(`id_auth_req`),
    PRIMARY KEY (`id_auth_rchem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_req` (
    `id_auth_req` INTEGER NOT NULL AUTO_INCREMENT,
    `auth_req` VARCHAR(16) NULL,
    `date_auth_req` DATE NULL,

    UNIQUE INDEX `auth_req`(`auth_req`),
    PRIMARY KEY (`id_auth_req`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sst` (
    `id_auth_sst` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth_req` INTEGER NOT NULL,
    `auth_sst` VARCHAR(50) NULL,
    `id_unit_auth_sst` INTEGER NULL,
    `date_auth_sst` DATE NULL,
    `qstock_auth_sst` VARCHAR(80) NULL,
    `quse_auth_sst` VARCHAR(80) NULL,
    `form_auth_sst` VARCHAR(80) NULL,
    `status_auth_sst` VARCHAR(30) NULL,
    `com_auth_sst` VARCHAR(500) NULL,
    `created_at` DATE NULL,

    UNIQUE INDEX `auth_sst`(`auth_sst`),
    INDEX `id_auth_req`(`id_auth_req`),
    PRIMARY KEY (`id_auth_sst`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bio` (
    `id_bio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NOT NULL,
    `bio_level` INTEGER NOT NULL,
    `comment` VARCHAR(2000) NULL,

    UNIQUE INDEX `id_lab_2`(`id_lab`),
    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_bio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bio_org` (
    `id_bio_org` INTEGER NOT NULL AUTO_INCREMENT,
    `organism` VARCHAR(100) NOT NULL,
    `risk_group` INTEGER NOT NULL,
    `updated_on` DATE NULL,
    `updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `org_risk`(`organism`, `risk_group`),
    PRIMARY KEY (`id_bio_org`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bio_org_lab` (
    `id_bio_org_lab` INTEGER NOT NULL AUTO_INCREMENT,
    `id_bio` INTEGER NOT NULL,
    `id_bio_org` INTEGER NULL,

    INDEX `id_bio_org`(`id_bio_org`),
    UNIQUE INDEX `org_lab`(`id_bio`, `id_bio_org`),
    PRIMARY KEY (`id_bio_org_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cad_corr` (
    `id_cad_sto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `id_storage` INTEGER NULL,
    `id_haz` INTEGER NULL,
    `score` INTEGER NULL,

    INDEX `id_haz`(`id_haz`),
    INDEX `id_lab`(`id_lab`),
    INDEX `id_storage`(`id_storage`),
    PRIMARY KEY (`id_cad_sto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cad_lab` (
    `id_cad` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `id_haz` INTEGER NULL,
    `score` INTEGER NULL,

    INDEX `id_haz`(`id_haz`),
    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_cad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cryo` (
    `id_cryo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_dewar` INTEGER NOT NULL,
    `liquid` VARCHAR(3) NULL,
    `liters` DOUBLE NULL,

    INDEX `id_dewar`(`id_dewar`),
    PRIMARY KEY (`id_cryo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cut` (
    `id_cut` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `cut` VARCHAR(50) NULL,
    `cut_time` INTEGER NULL,
    `cut_hazard` VARCHAR(500) NULL,
    `cut_measure` VARCHAR(500) NULL,
    `cut_priority` INTEGER NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_cut`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuts` (
    `id_cut` INTEGER NOT NULL AUTO_INCREMENT,
    `building` VARCHAR(10) NULL,
    `sector` VARCHAR(10) NULL,
    `floor` INTEGER NULL,
    `lab_number` VARCHAR(10) NULL,
    `type` VARCHAR(200) NULL,
    `unit` VARCHAR(50) NULL,
    `prof` VARCHAR(100) NULL,
    `cosec` VARCHAR(100) NULL,
    `cut` VARCHAR(50) NULL,
    `time` VARCHAR(20) NULL,
    `hazard` VARCHAR(500) NULL,
    `measure` VARCHAR(500) NULL,
    `priority` INTEGER NULL,

    PRIMARY KEY (`id_cut`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dewar` (
    `id_dewar` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `comment` VARCHAR(500) NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_dewar`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `elec` (
    `id_elec` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `capacitor` CHAR(1) NULL,
    `v_ac` DOUBLE NULL,
    `v_dc` DOUBLE NULL,
    `i` DOUBLE NULL,
    `i_battery` DOUBLE NULL,
    `state` INTEGER NULL,
    `access` INTEGER NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_elec`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faculty` (
    `id_faculty` INTEGER NOT NULL AUTO_INCREMENT,
    `name_faculty` VARCHAR(20) NULL,

    UNIQUE INDEX `unique_faculty`(`name_faculty`),
    PRIMARY KEY (`id_faculty`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gas` (
    `id_gas` INTEGER NOT NULL AUTO_INCREMENT,
    `gas` VARCHAR(50) NULL,
    `state` VARCHAR(4) NULL,

    PRIMARY KEY (`id_gas`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gasbottle` (
    `bottle` INTEGER NULL,
    `building` VARCHAR(5) NULL,
    `type` VARCHAR(2) NULL,
    `cupboard` CHAR(1) NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gaschem` (
    `id_gaschem` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `id_storage` INTEGER NULL,
    `id_haz` INTEGER NOT NULL,
    `score` INTEGER NULL,

    INDEX `id_haz`(`id_haz`),
    UNIQUE INDEX `labhaz`(`id_lab`, `id_haz`),
    UNIQUE INDEX `stohaz`(`id_storage`, `id_haz`),
    PRIMARY KEY (`id_gaschem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gashazard` (
    `id_gashazard` INTEGER NOT NULL AUTO_INCREMENT,
    `id_gas` INTEGER NULL,
    `id_hazard` VARCHAR(2) NULL,

    INDEX `id_gas`(`id_gas`),
    PRIMARY KEY (`id_gashazard`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gnb` (
    `id_gnb` INTEGER NOT NULL AUTO_INCREMENT,
    `id_gas` INTEGER NULL,
    `gnb_q` DOUBLE NULL,
    `gnb_p` INTEGER NULL,

    INDEX `id_gas`(`id_gas`),
    PRIMARY KEY (`id_gnb`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gnb_labsto` (
    `id_gnbls` INTEGER NOT NULL AUTO_INCREMENT,
    `id_gnb` INTEGER NULL,
    `id_storage` INTEGER NULL,
    `id_lab` INTEGER NULL,

    INDEX `id_gnb`(`id_gnb`),
    INDEX `id_lab`(`id_lab`),
    INDEX `id_storage`(`id_storage`),
    PRIMARY KEY (`id_gnbls`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `haz` (
    `id_haz` INTEGER NOT NULL AUTO_INCREMENT,
    `haz_category` VARCHAR(60) NULL,
    `haz_en` VARCHAR(80) NULL,
    `haz_fr` VARCHAR(80) NULL,
    `id_haz_category` INTEGER NOT NULL,

    PRIMARY KEY (`id_haz`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `haz_category` (
    `id_haz_category` INTEGER NOT NULL AUTO_INCREMENT,
    `haz_category` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `haz_category`(`haz_category`),
    PRIMARY KEY (`id_haz_category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `haz_date` (
    `id_haz_date` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NOT NULL,
    `id_haz_category` INTEGER NOT NULL,
    `id_haz` INTEGER NULL,
    `date` DATETIME(0) NOT NULL,
    `editor` VARCHAR(50) NOT NULL,
    `log_in` INTEGER NULL,
    `log_in_time` DATETIME(0) NULL,

    INDEX `id_haz`(`id_haz`),
    INDEX `id_haz_category`(`id_haz_category`),
    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_haz_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `institut` (
    `id_institut` INTEGER NOT NULL AUTO_INCREMENT,
    `name_institut` VARCHAR(60) NULL,
    `id_faculty` INTEGER NOT NULL,

    INDEX `id_faculty`(`id_faculty`),
    UNIQUE INDEX `unique_institut`(`name_institut`, `id_faculty`),
    PRIMARY KEY (`id_institut`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `irad` (
    `id_irad` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `irad_facility` VARCHAR(50) NULL,
    `irad_source` VARCHAR(20) NULL,
    `irad_radioisotope` VARCHAR(10) NULL,
    `irad_activity` DOUBLE NULL,
    `irad_voltage` DOUBLE NULL,
    `irad_current` DOUBLE NULL,
    `irad_power` DOUBLE NULL,
    `irad_protection` VARCHAR(20) NULL,
    `irad_name_instrument` VARCHAR(50) NULL,
    `irad_authority` VARCHAR(10) NULL,
    `id_person` INTEGER NULL,
    `irad_n_authorisation` VARCHAR(20) NULL,
    `irad_state_authorisation` VARCHAR(20) NULL,
    `irad_exdate_authorisation` DATE NULL,
    `irad_comment` VARCHAR(200) NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_person`(`id_person`),
    PRIMARY KEY (`id_irad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab` (
    `id_lab` INTEGER NOT NULL AUTO_INCREMENT,
    `sciper_lab` INTEGER NULL,
    `building` VARCHAR(5) NOT NULL,
    `sector` VARCHAR(5) NULL,
    `floor` VARCHAR(5) NULL,
    `lab` VARCHAR(10) NOT NULL,
    `id_labType` INTEGER NULL,
    `description` VARCHAR(200) NULL,
    `location` VARCHAR(10) NULL,
    `vol` DOUBLE NULL,
    `vent` CHAR(1) NULL,
    `lab_display` VARCHAR(20) NULL,

    UNIQUE INDEX `unique_sciper_lab`(`sciper_lab`),
    INDEX `id_labType`(`id_labType`),
    UNIQUE INDEX `unique_lab`(`building`, `sector`, `floor`, `lab`),
    UNIQUE INDEX `unique_labo`(`sciper_lab`, `building`, `sector`, `floor`, `lab`),
    PRIMARY KEY (`id_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `labType` (
    `id_labType` INTEGER NOT NULL AUTO_INCREMENT,
    `labType` VARCHAR(100) NULL,

    PRIMARY KEY (`id_labType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_has_room` (
    `id_unit` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,

    INDEX `id_lab`(`id_lab`),
    UNIQUE INDEX `unique_unit_has_room`(`id_unit`, `id_lab`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_has_cosec` (
    `id_unit` INTEGER NOT NULL,
    `id_person` INTEGER NOT NULL,

    INDEX `id_person`(`id_person`),
    UNIQUE INDEX `unique_unit_has_person`(`id_unit`, `id_person`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laser` (
    `id_laser` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `laser_class` CHAR(2) NULL,
    `laser_mode` VARCHAR(20) NULL,
    `laser_wave` DOUBLE NULL,
    `laser_power` DOUBLE NULL,
    `laser_energy` DOUBLE NULL,
    `laser_pulse` DOUBLE NULL,
    `laser_frequency` DOUBLE NULL,
    `comment` VARCHAR(300) NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_laser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mag` (
    `id_mag` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `id_person` INTEGER NULL,
    `bmax` DOUBLE NULL,
    `mag_comment` VARCHAR(500) NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_person`(`id_person`),
    PRIMARY KEY (`id_mag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mag_f` (
    `id_magf` INTEGER NOT NULL AUTO_INCREMENT,
    `id_mag` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,
    `line` DOUBLE NOT NULL,
    `line_place` CHAR(1) NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_mag`(`id_mag`),
    UNIQUE INDEX `magf_unique`(`id_mag`, `id_lab`, `line`),
    PRIMARY KEY (`id_magf`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `migrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(96) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nano` (
    `id_nano` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `nano_class` VARCHAR(2) NULL,
    `nano_type` VARCHAR(100) NULL,
    `nano_state` VARCHAR(20) NULL,
    `nano_quantity` DOUBLE NULL,
    `nano_activity` VARCHAR(500) NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_nano`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `naudits` (
    `id_naudits` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `score1` DOUBLE NULL,
    `score2` DOUBLE NULL,
    `score3` DOUBLE NULL,
    `score4` DOUBLE NULL,
    `score5` DOUBLE NULL,
    `score6` DOUBLE NULL,
    `score7` DOUBLE NULL,
    `score8` DOUBLE NULL,
    `naudits` DOUBLE NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_naudits`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nirad` (
    `id_nirad` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `nirad_type` CHAR(2) NULL,
    `source` CHAR(1) NULL,
    `freq` DOUBLE NULL,
    `e_field` DOUBLE NULL,
    `h_field` DOUBLE NULL,
    `b_field` DOUBLE NULL,
    `power` DOUBLE NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_nirad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `noise` (
    `id_noise` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `lex` DOUBLE NULL,
    `lpeak` DOUBLE NULL,

    UNIQUE INDEX `id_lab_2`(`id_lab`),
    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_noise`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person` (
    `id_person` INTEGER NOT NULL AUTO_INCREMENT,
    `sciper` INTEGER NULL,
    `name_person` VARCHAR(60) NULL,
    `surname_person` VARCHAR(60) NULL,
    `email_person` VARCHAR(60) NULL,

    UNIQUE INDEX `unique_sciper`(`sciper`),
    UNIQUE INDEX `unique_per`(`name_person`, `surname_person`, `email_person`),
    UNIQUE INDEX `unique_person`(`sciper`, `name_person`, `surname_person`, `email_person`),
    PRIMARY KEY (`id_person`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoPlace` (
    `id_place` INTEGER NOT NULL AUTO_INCREMENT,
    `place` VARCHAR(30) NULL,

    PRIMARY KEY (`id_place`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoPlace_catalyse` (
    `id_stoPlace` INTEGER NOT NULL AUTO_INCREMENT,
    `stoPlace` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`id_stoPlace`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoProperty` (
    `id_stoProperty` INTEGER NOT NULL AUTO_INCREMENT,
    `stoProperty` VARCHAR(50) NULL,

    PRIMARY KEY (`id_stoProperty`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoProperty_catalyse` (
    `id_stoProperty` INTEGER NOT NULL AUTO_INCREMENT,
    `stoProperty` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id_stoProperty`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoType` (
    `id_stoType` INTEGER NOT NULL AUTO_INCREMENT,
    `stoType` VARCHAR(20) NULL,

    PRIMARY KEY (`id_stoType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stoType_catalyse` (
    `id_stoType` INTEGER NOT NULL AUTO_INCREMENT,
    `stoType` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id_stoType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storage` (
    `id_storage` INTEGER NOT NULL AUTO_INCREMENT,
    `id_stoType` INTEGER NULL,
    `id_stoProperty` INTEGER NULL,
    `barcode` VARCHAR(80) NULL,
    `id_place` INTEGER NULL,
    `content` CHAR(2) NULL,

    INDEX `id_place`(`id_place`),
    INDEX `id_stoProperty`(`id_stoProperty`),
    INDEX `id_stoType`(`id_stoType`),
    PRIMARY KEY (`id_storage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storage_catalyse` (
    `id_storage` INTEGER NOT NULL AUTO_INCREMENT,
    `id_stoType` INTEGER NOT NULL,
    `id_stoProperty` INTEGER NOT NULL,
    `id_stoPlace` INTEGER NOT NULL,
    `content` CHAR(2) NOT NULL,
    `barcode` VARCHAR(80) NOT NULL,
    `lab_display` VARCHAR(20) NOT NULL,
    `sciper` INTEGER NOT NULL,
    `author` VARCHAR(50) NOT NULL,
    `date` DATETIME(0) NOT NULL,

    UNIQUE INDEX `barcode`(`barcode`),
    INDEX `id_stoPlace`(`id_stoPlace`),
    INDEX `id_stoProperty`(`id_stoProperty`),
    INDEX `id_stoType`(`id_stoType`),
    UNIQUE INDEX `unique_barcode`(`barcode`, `lab_display`),
    PRIMARY KEY (`id_storage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_storage_catalyse` (
    `id_sub_storage` INTEGER NOT NULL AUTO_INCREMENT,
    `id_storage` INTEGER NOT NULL,
    `sub_storage_barcode` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `sub_storage_barcode`(`sub_storage_barcode`),
    UNIQUE INDEX `unique_sub_storage_barcode`(`id_storage`, `sub_storage_barcode`),
    PRIMARY KEY (`id_sub_storage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subunpro` (
    `id_subunpro` INTEGER NOT NULL AUTO_INCREMENT,
    `id_unit` INTEGER NULL,
    `id_person` INTEGER NULL,
    `id_subject` CHAR(2) NULL,

    INDEX `id_person`(`id_person`),
    INDEX `id_unit`(`id_unit`),
    UNIQUE INDEX `unique_subunpro`(`id_unit`, `id_person`),
    PRIMARY KEY (`id_subunpro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tdegree` (
    `id_tdegree` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lab` INTEGER NULL,
    `tdegree` DOUBLE NULL,
    `tdegree_type` CHAR(2) NULL,
    `tdegree_place` CHAR(1) NULL,

    INDEX `id_lab`(`id_lab`),
    PRIMARY KEY (`id_tdegree`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit` (
    `id_unit` INTEGER NOT NULL AUTO_INCREMENT,
    `sciper_unit` INTEGER NULL,
    `name_unit` VARCHAR(60) NULL,
    `id_institut` INTEGER NULL,

    UNIQUE INDEX `unique_sciper_unit`(`sciper_unit`),
    INDEX `id_institut`(`id_institut`),
    UNIQUE INDEX `unique_un`(`name_unit`, `id_institut`),
    UNIQUE INDEX `unique_unit`(`sciper_unit`, `name_unit`, `id_institut`),
    PRIMARY KEY (`id_unit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_has_storage_for_room` (
    `id_unit` INTEGER NOT NULL,
    `id_lab` INTEGER NOT NULL,
    `id_storage` INTEGER NOT NULL,

    INDEX `id_lab`(`id_lab`),
    INDEX `id_storage`(`id_storage`),
    UNIQUE INDEX `unique_unit_has_storage_for_room`(`id_unit`, `id_lab`, `id_storage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aa` ADD CONSTRAINT `aa_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aa` ADD CONSTRAINT `aa_ibfk_2` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `aa` ADD CONSTRAINT `aa_ibfk_3` FOREIGN KEY (`id_cosec`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `aa` ADD CONSTRAINT `aa_ibfk_4` FOREIGN KEY (`id_head`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_chem_log` ADD CONSTRAINT `auth_chem_log_ibfk_1` FOREIGN KEY (`id_auth_chem`) REFERENCES `auth_chem`(`id_auth_chem`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_dsps_holder` ADD CONSTRAINT `auth_dsps_holder_ibfk_1` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_dsps_holder` ADD CONSTRAINT `auth_dsps_holder_ibfk_2` FOREIGN KEY (`id_auth_dsps_version`) REFERENCES `auth_dsps_version`(`id_auth_dsps_version`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_dsps_lab` ADD CONSTRAINT `auth_dsps_lab_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_dsps_lab` ADD CONSTRAINT `auth_dsps_lab_ibfk_2` FOREIGN KEY (`id_auth_dsps_version`) REFERENCES `auth_dsps_version`(`id_auth_dsps_version`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_dsps_version` ADD CONSTRAINT `auth_dsps_version_ibfk_1` FOREIGN KEY (`id_auth_dsps`) REFERENCES `auth_dsps`(`id_auth_dsps`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_holder` ADD CONSTRAINT `auth_holder_ibfk_1` FOREIGN KEY (`id_auth_sst`) REFERENCES `auth_sst`(`id_auth_sst`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_lab` ADD CONSTRAINT `auth_lab_ibfk_3` FOREIGN KEY (`id_storage`) REFERENCES `storage`(`id_storage`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_lab` ADD CONSTRAINT `auth_lab_ibfk_4` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_lab` ADD CONSTRAINT `auth_lab_ibfk_5` FOREIGN KEY (`id_auth_req`) REFERENCES `auth_req`(`id_auth_req`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_rchem` ADD CONSTRAINT `auth_rchem_ibfk_1` FOREIGN KEY (`id_auth_chem`) REFERENCES `auth_chem`(`id_auth_chem`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_rchem` ADD CONSTRAINT `auth_rchem_ibfk_2` FOREIGN KEY (`id_auth_req`) REFERENCES `auth_req`(`id_auth_req`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_sst` ADD CONSTRAINT `auth_sst_ibfk_1` FOREIGN KEY (`id_auth_req`) REFERENCES `auth_req`(`id_auth_req`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `bio` ADD CONSTRAINT `bio_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `bio_org_lab` ADD CONSTRAINT `bio_org_lab_ibfk_1` FOREIGN KEY (`id_bio`) REFERENCES `bio`(`id_bio`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `bio_org_lab` ADD CONSTRAINT `bio_org_lab_ibfk_2` FOREIGN KEY (`id_bio_org`) REFERENCES `bio_org`(`id_bio_org`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cad_corr` ADD CONSTRAINT `cad_corr_ibfk_1` FOREIGN KEY (`id_storage`) REFERENCES `storage`(`id_storage`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cad_corr` ADD CONSTRAINT `cad_corr_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cad_lab` ADD CONSTRAINT `cad_lab_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cad_lab` ADD CONSTRAINT `cad_lab_ibfk_2` FOREIGN KEY (`id_haz`) REFERENCES `haz`(`id_haz`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cryo` ADD CONSTRAINT `cryo_ibfk_1` FOREIGN KEY (`id_dewar`) REFERENCES `dewar`(`id_dewar`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cut` ADD CONSTRAINT `cut_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dewar` ADD CONSTRAINT `dewar_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `elec` ADD CONSTRAINT `elec_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gaschem` ADD CONSTRAINT `gaschem_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gaschem` ADD CONSTRAINT `gaschem_ibfk_2` FOREIGN KEY (`id_haz`) REFERENCES `haz`(`id_haz`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gaschem` ADD CONSTRAINT `gaschem_ibfk_3` FOREIGN KEY (`id_storage`) REFERENCES `storage`(`id_storage`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gashazard` ADD CONSTRAINT `gashazard_ibfk_1` FOREIGN KEY (`id_gas`) REFERENCES `gas`(`id_gas`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gnb` ADD CONSTRAINT `gnb_ibfk_1` FOREIGN KEY (`id_gas`) REFERENCES `gas`(`id_gas`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gnb_labsto` ADD CONSTRAINT `gnb_labsto_ibfk_1` FOREIGN KEY (`id_gnb`) REFERENCES `gnb`(`id_gnb`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gnb_labsto` ADD CONSTRAINT `gnb_labsto_ibfk_2` FOREIGN KEY (`id_storage`) REFERENCES `storage`(`id_storage`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `gnb_labsto` ADD CONSTRAINT `gnb_labsto_ibfk_3` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `haz_date` ADD CONSTRAINT `haz_date_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `haz_date` ADD CONSTRAINT `haz_date_ibfk_2` FOREIGN KEY (`id_haz_category`) REFERENCES `haz_category`(`id_haz_category`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `haz_date` ADD CONSTRAINT `haz_date_ibfk_3` FOREIGN KEY (`id_haz`) REFERENCES `haz`(`id_haz`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `institut` ADD CONSTRAINT `institut_ibfk_1` FOREIGN KEY (`id_faculty`) REFERENCES `faculty`(`id_faculty`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `irad` ADD CONSTRAINT `irad_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `irad` ADD CONSTRAINT `irad_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `lab` ADD CONSTRAINT `lab_ibfk_1` FOREIGN KEY (`id_labType`) REFERENCES `labType`(`id_labType`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_room` ADD CONSTRAINT `unit_has_room_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_room` ADD CONSTRAINT `unit_has_room_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_cosec` ADD CONSTRAINT `unit_has_cosec_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_cosec` ADD CONSTRAINT `unit_has_cosec_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `laser` ADD CONSTRAINT `laser_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mag` ADD CONSTRAINT `mag_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mag` ADD CONSTRAINT `mag_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mag_f` ADD CONSTRAINT `mag_f_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mag_f` ADD CONSTRAINT `mag_f_ibfk_2` FOREIGN KEY (`id_mag`) REFERENCES `mag`(`id_mag`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `nano` ADD CONSTRAINT `nano_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `naudits` ADD CONSTRAINT `naudits_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `nirad` ADD CONSTRAINT `nirad_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `noise` ADD CONSTRAINT `noise_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `storage` ADD CONSTRAINT `storage_ibfk_4` FOREIGN KEY (`id_stoType`) REFERENCES `stoType`(`id_stoType`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `storage` ADD CONSTRAINT `storage_ibfk_5` FOREIGN KEY (`id_stoProperty`) REFERENCES `stoProperty`(`id_stoProperty`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `storage` ADD CONSTRAINT `storage_ibfk_6` FOREIGN KEY (`id_place`) REFERENCES `stoPlace`(`id_place`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subunpro` ADD CONSTRAINT `subunpro_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subunpro` ADD CONSTRAINT `subunpro_ibfk_2` FOREIGN KEY (`id_person`) REFERENCES `person`(`id_person`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tdegree` ADD CONSTRAINT `tdegree_ibfk_1` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit` ADD CONSTRAINT `unit_ibfk_1` FOREIGN KEY (`id_institut`) REFERENCES `institut`(`id_institut`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_storage_for_room` ADD CONSTRAINT `unit_has_storage_for_room_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `unit`(`id_unit`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_storage_for_room` ADD CONSTRAINT `unit_has_storage_for_room_ibfk_2` FOREIGN KEY (`id_lab`) REFERENCES `lab`(`id_lab`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `unit_has_storage_for_room` ADD CONSTRAINT `unit_has_storage_for_room_ibfk_3` FOREIGN KEY (`id_storage`) REFERENCES `storage`(`id_storage`) ON DELETE RESTRICT ON UPDATE RESTRICT;
