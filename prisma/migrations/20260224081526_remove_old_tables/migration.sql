/*
  Warnings:

  - You are about to drop the `auth_chem_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_chem_old` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_dsps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_dsps_holder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_dsps_lab` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_dsps_version` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_holder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_lab` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_rchem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_req` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_sst` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bio_org_lab` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cad_corr` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cad_lab` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cryo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cut` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cuts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dewar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `elec` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gasbottle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gaschem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gashazard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gnb` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gnb_labsto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `haz` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `haz_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `haz_date` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `irad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `laser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mag_f` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `migrations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nano` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `naudits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nirad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `noise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoPlace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoPlace_catalyse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoProperty` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoProperty_catalyse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stoType_catalyse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `storage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `storage_catalyse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sub_storage_catalyse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tdegree` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `unit_has_storage_for_room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `auth_chem_log` DROP FOREIGN KEY `auth_chem_log_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_dsps_holder` DROP FOREIGN KEY `auth_dsps_holder_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_dsps_holder` DROP FOREIGN KEY `auth_dsps_holder_ibfk_2`;

-- DropForeignKey
ALTER TABLE `auth_dsps_lab` DROP FOREIGN KEY `auth_dsps_lab_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_dsps_lab` DROP FOREIGN KEY `auth_dsps_lab_ibfk_2`;

-- DropForeignKey
ALTER TABLE `auth_dsps_version` DROP FOREIGN KEY `auth_dsps_version_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_holder` DROP FOREIGN KEY `auth_holder_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_lab` DROP FOREIGN KEY `auth_lab_ibfk_3`;

-- DropForeignKey
ALTER TABLE `auth_lab` DROP FOREIGN KEY `auth_lab_ibfk_4`;

-- DropForeignKey
ALTER TABLE `auth_lab` DROP FOREIGN KEY `auth_lab_ibfk_5`;

-- DropForeignKey
ALTER TABLE `auth_rchem` DROP FOREIGN KEY `auth_rchem_ibfk_1`;

-- DropForeignKey
ALTER TABLE `auth_rchem` DROP FOREIGN KEY `auth_rchem_ibfk_2`;

-- DropForeignKey
ALTER TABLE `auth_sst` DROP FOREIGN KEY `auth_sst_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bio` DROP FOREIGN KEY `bio_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bio_org_lab` DROP FOREIGN KEY `bio_org_lab_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bio_org_lab` DROP FOREIGN KEY `bio_org_lab_ibfk_2`;

-- DropForeignKey
ALTER TABLE `cad_corr` DROP FOREIGN KEY `cad_corr_ibfk_1`;

-- DropForeignKey
ALTER TABLE `cad_corr` DROP FOREIGN KEY `cad_corr_ibfk_2`;

-- DropForeignKey
ALTER TABLE `cad_lab` DROP FOREIGN KEY `cad_lab_ibfk_1`;

-- DropForeignKey
ALTER TABLE `cad_lab` DROP FOREIGN KEY `cad_lab_ibfk_2`;

-- DropForeignKey
ALTER TABLE `cryo` DROP FOREIGN KEY `cryo_ibfk_1`;

-- DropForeignKey
ALTER TABLE `cut` DROP FOREIGN KEY `cut_ibfk_1`;

-- DropForeignKey
ALTER TABLE `dewar` DROP FOREIGN KEY `dewar_ibfk_1`;

-- DropForeignKey
ALTER TABLE `elec` DROP FOREIGN KEY `elec_ibfk_1`;

-- DropForeignKey
ALTER TABLE `gaschem` DROP FOREIGN KEY `gaschem_ibfk_1`;

-- DropForeignKey
ALTER TABLE `gaschem` DROP FOREIGN KEY `gaschem_ibfk_2`;

-- DropForeignKey
ALTER TABLE `gaschem` DROP FOREIGN KEY `gaschem_ibfk_3`;

-- DropForeignKey
ALTER TABLE `gashazard` DROP FOREIGN KEY `gashazard_ibfk_1`;

-- DropForeignKey
ALTER TABLE `gnb` DROP FOREIGN KEY `gnb_ibfk_1`;

-- DropForeignKey
ALTER TABLE `gnb_labsto` DROP FOREIGN KEY `gnb_labsto_ibfk_1`;

-- DropForeignKey
ALTER TABLE `gnb_labsto` DROP FOREIGN KEY `gnb_labsto_ibfk_2`;

-- DropForeignKey
ALTER TABLE `gnb_labsto` DROP FOREIGN KEY `gnb_labsto_ibfk_3`;

-- DropForeignKey
ALTER TABLE `haz_date` DROP FOREIGN KEY `haz_date_ibfk_1`;

-- DropForeignKey
ALTER TABLE `haz_date` DROP FOREIGN KEY `haz_date_ibfk_2`;

-- DropForeignKey
ALTER TABLE `haz_date` DROP FOREIGN KEY `haz_date_ibfk_3`;

-- DropForeignKey
ALTER TABLE `irad` DROP FOREIGN KEY `irad_ibfk_1`;

-- DropForeignKey
ALTER TABLE `irad` DROP FOREIGN KEY `irad_ibfk_2`;

-- DropForeignKey
ALTER TABLE `laser` DROP FOREIGN KEY `laser_ibfk_1`;

-- DropForeignKey
ALTER TABLE `mag` DROP FOREIGN KEY `mag_ibfk_1`;

-- DropForeignKey
ALTER TABLE `mag` DROP FOREIGN KEY `mag_ibfk_2`;

-- DropForeignKey
ALTER TABLE `mag_f` DROP FOREIGN KEY `mag_f_ibfk_1`;

-- DropForeignKey
ALTER TABLE `mag_f` DROP FOREIGN KEY `mag_f_ibfk_2`;

-- DropForeignKey
ALTER TABLE `nano` DROP FOREIGN KEY `nano_ibfk_1`;

-- DropForeignKey
ALTER TABLE `naudits` DROP FOREIGN KEY `naudits_ibfk_1`;

-- DropForeignKey
ALTER TABLE `nirad` DROP FOREIGN KEY `nirad_ibfk_1`;

-- DropForeignKey
ALTER TABLE `noise` DROP FOREIGN KEY `noise_ibfk_1`;

-- DropForeignKey
ALTER TABLE `storage` DROP FOREIGN KEY `storage_ibfk_4`;

-- DropForeignKey
ALTER TABLE `storage` DROP FOREIGN KEY `storage_ibfk_5`;

-- DropForeignKey
ALTER TABLE `storage` DROP FOREIGN KEY `storage_ibfk_6`;

-- DropForeignKey
ALTER TABLE `tdegree` DROP FOREIGN KEY `tdegree_ibfk_1`;

-- DropForeignKey
ALTER TABLE `unit_has_storage_for_room` DROP FOREIGN KEY `unit_has_storage_for_room_ibfk_1`;

-- DropForeignKey
ALTER TABLE `unit_has_storage_for_room` DROP FOREIGN KEY `unit_has_storage_for_room_ibfk_2`;

-- DropForeignKey
ALTER TABLE `unit_has_storage_for_room` DROP FOREIGN KEY `unit_has_storage_for_room_ibfk_3`;

-- DropTable
DROP TABLE `auth_chem_log`;

-- DropTable
DROP TABLE `auth_chem_old`;

-- DropTable
DROP TABLE `auth_dsps`;

-- DropTable
DROP TABLE `auth_dsps_holder`;

-- DropTable
DROP TABLE `auth_dsps_lab`;

-- DropTable
DROP TABLE `auth_dsps_version`;

-- DropTable
DROP TABLE `auth_holder`;

-- DropTable
DROP TABLE `auth_lab`;

-- DropTable
DROP TABLE `auth_rchem`;

-- DropTable
DROP TABLE `auth_req`;

-- DropTable
DROP TABLE `auth_sst`;

-- DropTable
DROP TABLE `bio`;

-- DropTable
DROP TABLE `bio_org_lab`;

-- DropTable
DROP TABLE `cad_corr`;

-- DropTable
DROP TABLE `cad_lab`;

-- DropTable
DROP TABLE `cryo`;

-- DropTable
DROP TABLE `cut`;

-- DropTable
DROP TABLE `cuts`;

-- DropTable
DROP TABLE `dewar`;

-- DropTable
DROP TABLE `elec`;

-- DropTable
DROP TABLE `gas`;

-- DropTable
DROP TABLE `gasbottle`;

-- DropTable
DROP TABLE `gaschem`;

-- DropTable
DROP TABLE `gashazard`;

-- DropTable
DROP TABLE `gnb`;

-- DropTable
DROP TABLE `gnb_labsto`;

-- DropTable
DROP TABLE `haz`;

-- DropTable
DROP TABLE `haz_category`;

-- DropTable
DROP TABLE `haz_date`;

-- DropTable
DROP TABLE `irad`;

-- DropTable
DROP TABLE `laser`;

-- DropTable
DROP TABLE `mag`;

-- DropTable
DROP TABLE `mag_f`;

-- DropTable
DROP TABLE `migrations`;

-- DropTable
DROP TABLE `nano`;

-- DropTable
DROP TABLE `naudits`;

-- DropTable
DROP TABLE `nirad`;

-- DropTable
DROP TABLE `noise`;

-- DropTable
DROP TABLE `stoPlace`;

-- DropTable
DROP TABLE `stoPlace_catalyse`;

-- DropTable
DROP TABLE `stoProperty`;

-- DropTable
DROP TABLE `stoProperty_catalyse`;

-- DropTable
DROP TABLE `stoType`;

-- DropTable
DROP TABLE `stoType_catalyse`;

-- DropTable
DROP TABLE `storage`;

-- DropTable
DROP TABLE `storage_catalyse`;

-- DropTable
DROP TABLE `sub_storage_catalyse`;

-- DropTable
DROP TABLE `tdegree`;

-- DropTable
DROP TABLE `unit_has_storage_for_room`;
