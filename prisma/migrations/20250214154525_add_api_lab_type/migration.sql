-- AlterTable
ALTER TABLE `lab` ADD COLUMN `lab_type_is_different` BOOLEAN NOT NULL DEFAULT false;

update lab set id_labType = null;

delete from `labType`;

commit;

