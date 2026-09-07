-- CreateEnum
CREATE TYPE "authorization_status" AS ENUM ('Active', 'Expired');

-- CreateEnum
CREATE TYPE "DispensationStatus" AS ENUM ('Draft', 'Active', 'Expired', 'Cancelled');

-- CreateEnum
CREATE TYPE "AssessmentDecisionStatus" AS ENUM ('Draft', 'Active', 'Closed');

-- CreateTable
CREATE TABLE "audits" (
    "id_audit" SERIAL NOT NULL,
    "id_unit" INTEGER NOT NULL,
    "date_audit" DATE NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id_audit")
);

-- CreateTable
CREATE TABLE "auth_chem" (
    "id_auth_chem" SERIAL NOT NULL,
    "cas_auth_chem" VARCHAR(100) NOT NULL,
    "auth_chem_en" VARCHAR(500) NOT NULL,
    "auth_chem_fr" VARCHAR(500),
    "flag_auth_chem" BOOLEAN NOT NULL,
    "fastway" BOOLEAN,
    "auth_code" TEXT,

    CONSTRAINT "auth_chem_pkey" PRIMARY KEY ("id_auth_chem")
);

-- CreateTable
CREATE TABLE "bio_org" (
    "id_bio_org" SERIAL NOT NULL,
    "organism" VARCHAR(100) NOT NULL,
    "risk_group" INTEGER NOT NULL,
    "filePath" VARCHAR(250),
    "updated_on" DATE,
    "updated_by" VARCHAR(50),

    CONSTRAINT "bio_org_pkey" PRIMARY KEY ("id_bio_org")
);

-- CreateTable
CREATE TABLE "faculty" (
    "id_faculty" SERIAL NOT NULL,
    "name_faculty" VARCHAR(20),

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id_faculty")
);

-- CreateTable
CREATE TABLE "institut" (
    "id_institut" SERIAL NOT NULL,
    "name_institut" VARCHAR(60),
    "id_faculty" INTEGER NOT NULL,

    CONSTRAINT "institut_pkey" PRIMARY KEY ("id_institut")
);

-- CreateTable
CREATE TABLE "lab" (
    "id_lab" SERIAL NOT NULL,
    "sciper_lab" INTEGER,
    "site" VARCHAR(50),
    "building" VARCHAR(5) NOT NULL,
    "sector" VARCHAR(5),
    "floor" VARCHAR(5),
    "lab" VARCHAR(10) NOT NULL,
    "id_labType" INTEGER,
    "lab_type_is_different" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(200),
    "location" VARCHAR(10),
    "vol" DOUBLE PRECISION,
    "vent" CHAR(1),
    "lab_display" VARCHAR(20),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lab_pkey" PRIMARY KEY ("id_lab")
);

-- CreateTable
CREATE TABLE "labType" (
    "id_labType" SERIAL NOT NULL,
    "labType" VARCHAR(100),
    "id_labTypeCristal" TEXT,

    CONSTRAINT "labType_pkey" PRIMARY KEY ("id_labType")
);

-- CreateTable
CREATE TABLE "unit_has_room" (
    "id_unit" INTEGER NOT NULL,
    "id_lab" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "unit_has_cosec" (
    "id_unit" INTEGER NOT NULL,
    "id_person" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "person" (
    "id_person" SERIAL NOT NULL,
    "sciper" INTEGER,
    "name_person" VARCHAR(60),
    "surname_person" VARCHAR(60),
    "email_person" VARCHAR(60),

    CONSTRAINT "person_pkey" PRIMARY KEY ("id_person")
);

-- CreateTable
CREATE TABLE "subunpro" (
    "id_subunpro" SERIAL NOT NULL,
    "id_unit" INTEGER,
    "id_person" INTEGER,
    "id_subject" CHAR(2),

    CONSTRAINT "subunpro_pkey" PRIMARY KEY ("id_subunpro")
);

-- CreateTable
CREATE TABLE "unit" (
    "id_unit" SERIAL NOT NULL,
    "sciper_unit" INTEGER,
    "name_unit" VARCHAR(60),
    "id_institut" INTEGER,
    "responsible_id" INTEGER,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id_unit")
);

-- CreateTable
CREATE TABLE "hazard_category" (
    "id_hazard_category" SERIAL NOT NULL,
    "hazard_category_name" VARCHAR(60) NOT NULL,

    CONSTRAINT "hazard_category_pkey" PRIMARY KEY ("id_hazard_category")
);

-- CreateTable
CREATE TABLE "hazard_form" (
    "id_hazard_form" SERIAL NOT NULL,
    "id_hazard_category" INTEGER NOT NULL,
    "form" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "hazard_form_pkey" PRIMARY KEY ("id_hazard_form")
);

-- CreateTable
CREATE TABLE "hazard_form_history" (
    "id_hazard_form_history" SERIAL NOT NULL,
    "id_hazard_form" INTEGER NOT NULL,
    "form" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "modified_by" TEXT NOT NULL,
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_form_history_pkey" PRIMARY KEY ("id_hazard_form_history")
);

-- CreateTable
CREATE TABLE "lab_has_hazards" (
    "id_lab_has_hazards" SERIAL NOT NULL,
    "id_lab" INTEGER NOT NULL,
    "id_hazard_form_history" INTEGER NOT NULL,
    "submission" TEXT NOT NULL,

    CONSTRAINT "lab_has_hazards_pkey" PRIMARY KEY ("id_lab_has_hazards")
);

-- CreateTable
CREATE TABLE "hazard_form_child" (
    "id_hazard_form_child" SERIAL NOT NULL,
    "id_hazard_form" INTEGER NOT NULL,
    "hazard_form_child_name" VARCHAR(200) NOT NULL,
    "form" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "hazard_form_child_pkey" PRIMARY KEY ("id_hazard_form_child")
);

-- CreateTable
CREATE TABLE "hazard_form_child_history" (
    "id_hazard_form_child_history" SERIAL NOT NULL,
    "id_hazard_form_child" INTEGER NOT NULL,
    "form" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "modified_by" TEXT NOT NULL,
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazard_form_child_history_pkey" PRIMARY KEY ("id_hazard_form_child_history")
);

-- CreateTable
CREATE TABLE "lab_has_hazards_child" (
    "id_lab_has_hazards_child" SERIAL NOT NULL,
    "id_lab_has_hazards" INTEGER NOT NULL,
    "id_hazard_form_child_history" INTEGER NOT NULL,
    "submission" TEXT NOT NULL,

    CONSTRAINT "lab_has_hazards_child_pkey" PRIMARY KEY ("id_lab_has_hazards_child")
);

-- CreateTable
CREATE TABLE "mutation_logs" (
    "id_mutation_logs" SERIAL NOT NULL,
    "modified_by" TEXT NOT NULL,
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "table_name" TEXT NOT NULL,
    "table_id" INTEGER NOT NULL,
    "column_name" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "mutation_logs_pkey" PRIMARY KEY ("id_mutation_logs")
);

-- CreateTable
CREATE TABLE "lab_has_hazards_additional_info" (
    "id_lab_has_hazards_additional_info" SERIAL NOT NULL,
    "id_lab" INTEGER NOT NULL,
    "id_hazard_category" INTEGER NOT NULL,
    "comment" TEXT,
    "filePath" VARCHAR(250),
    "modified_by" TEXT NOT NULL,
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_has_hazards_additional_info_pkey" PRIMARY KEY ("id_lab_has_hazards_additional_info")
);

-- CreateTable
CREATE TABLE "hazards_additional_info_has_file" (
    "id_lab_has_hazards_additional_info" INTEGER NOT NULL,
    "file_path" VARCHAR(250) NOT NULL
);

-- CreateTable
CREATE TABLE "authorization" (
    "id_authorization" SERIAL NOT NULL,
    "authorization" VARCHAR(50) NOT NULL,
    "renewals" INTEGER NOT NULL,
    "id_unit" INTEGER,
    "expiration_date" DATE,
    "status" "authorization_status" NOT NULL,
    "creation_date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "authority" TEXT,
    "date_expiry_notified" DATE,

    CONSTRAINT "authorization_pkey" PRIMARY KEY ("id_authorization")
);

-- CreateTable
CREATE TABLE "authorization_has_room" (
    "id_authorization" INTEGER NOT NULL,
    "id_lab" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "authorization_has_holder" (
    "id_authorization" INTEGER NOT NULL,
    "id_person" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "authorization_has_chemical" (
    "id_authorization" INTEGER NOT NULL,
    "id_chemical" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "authorization_has_radiation" (
    "id_authorization" INTEGER NOT NULL,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "authorization_has_file" (
    "id_authorization" INTEGER NOT NULL,
    "file_path" VARCHAR(250) NOT NULL
);

-- CreateTable
CREATE TABLE "tag" (
    "id_tag" SERIAL NOT NULL,
    "tag_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id_tag")
);

-- CreateTable
CREATE TABLE "hazards_additional_info_has_tag" (
    "id_hazards_additional_info_has_tag" SERIAL NOT NULL,
    "id_tag" INTEGER NOT NULL,
    "id_lab_has_hazards_additional_info" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "hazards_additional_info_has_tag_pkey" PRIMARY KEY ("id_hazards_additional_info_has_tag")
);

-- CreateTable
CREATE TABLE "dispensation_subject" (
    "id_dispensation_subject" SERIAL NOT NULL,
    "subject" VARCHAR(60) NOT NULL,

    CONSTRAINT "dispensation_subject_pkey" PRIMARY KEY ("id_dispensation_subject")
);

-- CreateTable
CREATE TABLE "dispensation" (
    "id_dispensation" SERIAL NOT NULL,
    "renewals" INTEGER NOT NULL,
    "id_dispensation_subject" INTEGER NOT NULL,
    "subject_other" VARCHAR(60) NOT NULL,
    "requires" TEXT NOT NULL,
    "comment" TEXT,
    "status" "DispensationStatus" NOT NULL,
    "date_start" DATE NOT NULL,
    "date_end" DATE NOT NULL,
    "file_path" VARCHAR(250),
    "date_expiry_notified" DATE,
    "created_by" VARCHAR(50) NOT NULL,
    "created_on" TIMESTAMP(0) NOT NULL,
    "modified_by" VARCHAR(50) NOT NULL,
    "modified_on" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "dispensation_pkey" PRIMARY KEY ("id_dispensation")
);

-- CreateTable
CREATE TABLE "dispensation_has_ticket" (
    "id_dispensation" INTEGER NOT NULL,
    "ticket_number" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "dispensation_has_file" (
    "id_dispensation" INTEGER NOT NULL,
    "file_path" VARCHAR(250) NOT NULL
);

-- CreateTable
CREATE TABLE "dispensation_has_holder" (
    "id_dispensation" INTEGER NOT NULL,
    "id_person" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "dispensation_has_room" (
    "id_dispensation" INTEGER NOT NULL,
    "id_lab" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "dispensation_has_unit" (
    "id_dispensation" INTEGER NOT NULL,
    "id_unit" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "assessment_and_decision_subject" (
    "id_assessment_and_decision_subject" SERIAL NOT NULL,
    "subject" VARCHAR(60) NOT NULL,

    CONSTRAINT "assessment_and_decision_subject_pkey" PRIMARY KEY ("id_assessment_and_decision_subject")
);

-- CreateTable
CREATE TABLE "assessment_and_decision" (
    "id_assessment_and_decision" SERIAL NOT NULL,
    "id_assessment_and_decision_subject" INTEGER NOT NULL,
    "subject_other" VARCHAR(60) NOT NULL,
    "description" TEXT NOT NULL,
    "conclusion" TEXT,
    "status" "AssessmentDecisionStatus" NOT NULL,
    "date" DATE NOT NULL,
    "created_by" VARCHAR(50) NOT NULL,
    "created_on" TIMESTAMP(0) NOT NULL,
    "modified_by" VARCHAR(50) NOT NULL,
    "modified_on" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "assessment_and_decision_pkey" PRIMARY KEY ("id_assessment_and_decision")
);

-- CreateTable
CREATE TABLE "assessment_and_decision_has_file" (
    "id_assessment_and_decision" INTEGER NOT NULL,
    "file_path" VARCHAR(250) NOT NULL
);

-- CreateTable
CREATE TABLE "assessment_and_decision_has_ticket" (
    "id_assessment_and_decision" INTEGER NOT NULL,
    "ticket_number" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "assessment_and_decision_has_contact" (
    "id_assessment_and_decision" INTEGER NOT NULL,
    "id_person" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "assessment_and_decision_has_room" (
    "id_assessment_and_decision" INTEGER NOT NULL,
    "id_lab" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "assessment_and_decision_has_unit" (
    "id_assessment_and_decision" INTEGER NOT NULL,
    "id_unit" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "audits_id_unit_key" ON "audits"("id_unit");

-- CreateIndex
CREATE UNIQUE INDEX "unique_audit" ON "audits"("id_unit", "date_audit");

-- CreateIndex
CREATE UNIQUE INDEX "cas_auth_chem" ON "auth_chem"("cas_auth_chem");

-- CreateIndex
CREATE UNIQUE INDEX "auth_chem_en" ON "auth_chem"("auth_chem_en");

-- CreateIndex
CREATE UNIQUE INDEX "org_risk" ON "bio_org"("organism", "risk_group");

-- CreateIndex
CREATE UNIQUE INDEX "unique_faculty" ON "faculty"("name_faculty");

-- CreateIndex
CREATE INDEX "id_faculty" ON "institut"("id_faculty");

-- CreateIndex
CREATE UNIQUE INDEX "unique_institut" ON "institut"("name_institut", "id_faculty");

-- CreateIndex
CREATE UNIQUE INDEX "unique_sciper_lab" ON "lab"("sciper_lab");

-- CreateIndex
CREATE INDEX "id_labType" ON "lab"("id_labType");

-- CreateIndex
CREATE UNIQUE INDEX "unique_lab" ON "lab"("building", "sector", "floor", "lab");

-- CreateIndex
CREATE UNIQUE INDEX "unique_labo" ON "lab"("sciper_lab", "building", "sector", "floor", "lab");

-- CreateIndex
CREATE INDEX "unit_has_room_id_lab_idx" ON "unit_has_room"("id_lab");

-- CreateIndex
CREATE UNIQUE INDEX "unique_unit_has_room" ON "unit_has_room"("id_unit", "id_lab");

-- CreateIndex
CREATE INDEX "unit_has_cosec_id_person_idx" ON "unit_has_cosec"("id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_unit_has_person" ON "unit_has_cosec"("id_unit", "id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_sciper" ON "person"("sciper");

-- CreateIndex
CREATE UNIQUE INDEX "unique_per" ON "person"("name_person", "surname_person", "email_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_person" ON "person"("sciper", "name_person", "surname_person", "email_person");

-- CreateIndex
CREATE INDEX "subunpro_id_person_idx" ON "subunpro"("id_person");

-- CreateIndex
CREATE INDEX "subunpro_id_unit_idx" ON "subunpro"("id_unit");

-- CreateIndex
CREATE UNIQUE INDEX "unique_subunpro" ON "subunpro"("id_unit", "id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_sciper_unit" ON "unit"("sciper_unit");

-- CreateIndex
CREATE INDEX "id_institut" ON "unit"("id_institut");

-- CreateIndex
CREATE INDEX "responsible_id" ON "unit"("responsible_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_un" ON "unit"("name_unit", "id_institut");

-- CreateIndex
CREATE UNIQUE INDEX "unique_unit" ON "unit"("sciper_unit", "name_unit", "id_institut");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hazard_category_name" ON "hazard_category"("hazard_category_name");

-- CreateIndex
CREATE INDEX "id_hazard_category" ON "hazard_form"("id_hazard_category");

-- CreateIndex
CREATE UNIQUE INDEX "hazard_form_id_hazard_category_key" ON "hazard_form"("id_hazard_category");

-- CreateIndex
CREATE INDEX "hazard_form_history_id_hazard_form_idx" ON "hazard_form_history"("id_hazard_form");

-- CreateIndex
CREATE INDEX "lab_has_hazards_id_lab_idx" ON "lab_has_hazards"("id_lab");

-- CreateIndex
CREATE INDEX "id_hazard_form_history" ON "lab_has_hazards"("id_hazard_form_history");

-- CreateIndex
CREATE INDEX "id_hazard_form" ON "hazard_form_child"("id_hazard_form");

-- CreateIndex
CREATE UNIQUE INDEX "hazard_form_child_hazard_form_child_name_key" ON "hazard_form_child"("hazard_form_child_name");

-- CreateIndex
CREATE INDEX "id_hazard_form_child" ON "hazard_form_child_history"("id_hazard_form_child");

-- CreateIndex
CREATE INDEX "id_lab_has_hazards" ON "lab_has_hazards_child"("id_lab_has_hazards");

-- CreateIndex
CREATE INDEX "id_hazard_form_child_history" ON "lab_has_hazards_child"("id_hazard_form_child_history");

-- CreateIndex
CREATE INDEX "lab_has_hazards_additional_info_id_lab_idx" ON "lab_has_hazards_additional_info"("id_lab");

-- CreateIndex
CREATE INDEX "lab_has_hazards_additional_info_id_hazard_category_idx" ON "lab_has_hazards_additional_info"("id_hazard_category");

-- CreateIndex
CREATE INDEX "hazards_additional_info_has_file_file_path_idx" ON "hazards_additional_info_has_file"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hazards_additional_info_has_file" ON "hazards_additional_info_has_file"("id_lab_has_hazards_additional_info", "file_path");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_authorization_key" ON "authorization"("authorization");

-- CreateIndex
CREATE INDEX "authorization_has_room_id_lab_idx" ON "authorization_has_room"("id_lab");

-- CreateIndex
CREATE UNIQUE INDEX "unique_authorization_has_room" ON "authorization_has_room"("id_authorization", "id_lab");

-- CreateIndex
CREATE INDEX "authorization_has_holder_id_person_idx" ON "authorization_has_holder"("id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_authorization_has_holder" ON "authorization_has_holder"("id_authorization", "id_person");

-- CreateIndex
CREATE INDEX "id_chemical" ON "authorization_has_chemical"("id_chemical");

-- CreateIndex
CREATE UNIQUE INDEX "unique_authorization_has_chemical" ON "authorization_has_chemical"("id_authorization", "id_chemical");

-- CreateIndex
CREATE UNIQUE INDEX "unique_authorization_has_radiation" ON "authorization_has_radiation"("id_authorization", "source");

-- CreateIndex
CREATE INDEX "authorization_has_file_file_path_idx" ON "authorization_has_file"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "unique_authorization_has_file" ON "authorization_has_file"("id_authorization", "file_path");

-- CreateIndex
CREATE UNIQUE INDEX "unique_tag_name" ON "tag"("tag_name");

-- CreateIndex
CREATE INDEX "id_tag" ON "hazards_additional_info_has_tag"("id_tag");

-- CreateIndex
CREATE INDEX "id_lab_has_hazards_additional_info" ON "hazards_additional_info_has_tag"("id_lab_has_hazards_additional_info");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_subject" ON "dispensation_subject"("subject");

-- CreateIndex
CREATE INDEX "dispensation_has_ticket_ticket_number_idx" ON "dispensation_has_ticket"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_has_ticket" ON "dispensation_has_ticket"("id_dispensation", "ticket_number");

-- CreateIndex
CREATE INDEX "dispensation_has_file_file_path_idx" ON "dispensation_has_file"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_has_file" ON "dispensation_has_file"("id_dispensation", "file_path");

-- CreateIndex
CREATE INDEX "dispensation_has_holder_id_person_idx" ON "dispensation_has_holder"("id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_has_holder" ON "dispensation_has_holder"("id_dispensation", "id_person");

-- CreateIndex
CREATE INDEX "dispensation_has_room_id_lab_idx" ON "dispensation_has_room"("id_lab");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_has_room" ON "dispensation_has_room"("id_dispensation", "id_lab");

-- CreateIndex
CREATE INDEX "dispensation_has_unit_id_unit_idx" ON "dispensation_has_unit"("id_unit");

-- CreateIndex
CREATE UNIQUE INDEX "unique_dispensation_has_unit" ON "dispensation_has_unit"("id_dispensation", "id_unit");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_subject" ON "assessment_and_decision_subject"("subject");

-- CreateIndex
CREATE INDEX "file_path" ON "assessment_and_decision_has_file"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_has_file" ON "assessment_and_decision_has_file"("id_assessment_and_decision", "file_path");

-- CreateIndex
CREATE INDEX "ticket_number" ON "assessment_and_decision_has_ticket"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_has_ticket" ON "assessment_and_decision_has_ticket"("id_assessment_and_decision", "ticket_number");

-- CreateIndex
CREATE INDEX "id_person" ON "assessment_and_decision_has_contact"("id_person");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_has_contact" ON "assessment_and_decision_has_contact"("id_assessment_and_decision", "id_person");

-- CreateIndex
CREATE INDEX "id_lab" ON "assessment_and_decision_has_room"("id_lab");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_has_room" ON "assessment_and_decision_has_room"("id_assessment_and_decision", "id_lab");

-- CreateIndex
CREATE INDEX "id_unit" ON "assessment_and_decision_has_unit"("id_unit");

-- CreateIndex
CREATE UNIQUE INDEX "unique_assessment_and_decision_has_unit" ON "assessment_and_decision_has_unit"("id_assessment_and_decision", "id_unit");

-- AddForeignKey
ALTER TABLE "institut" ADD CONSTRAINT "institut_ibfk_1" FOREIGN KEY ("id_faculty") REFERENCES "faculty"("id_faculty") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "lab" ADD CONSTRAINT "lab_ibfk_1" FOREIGN KEY ("id_labType") REFERENCES "labType"("id_labType") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit_has_room" ADD CONSTRAINT "unit_has_room_ibfk_1" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit_has_room" ADD CONSTRAINT "unit_has_room_ibfk_2" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit_has_cosec" ADD CONSTRAINT "unit_has_cosec_ibfk_1" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit_has_cosec" ADD CONSTRAINT "unit_has_cosec_ibfk_2" FOREIGN KEY ("id_person") REFERENCES "person"("id_person") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "subunpro" ADD CONSTRAINT "subunpro_ibfk_1" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "subunpro" ADD CONSTRAINT "subunpro_ibfk_2" FOREIGN KEY ("id_person") REFERENCES "person"("id_person") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_ibfk_1" FOREIGN KEY ("id_institut") REFERENCES "institut"("id_institut") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_has_responsible" FOREIGN KEY ("responsible_id") REFERENCES "person"("id_person") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hazard_form" ADD CONSTRAINT "hazard_form_id_hazard_category_fkey" FOREIGN KEY ("id_hazard_category") REFERENCES "hazard_category"("id_hazard_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_form_history" ADD CONSTRAINT "hazard_form_history_id_hazard_form_fkey" FOREIGN KEY ("id_hazard_form") REFERENCES "hazard_form"("id_hazard_form") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards" ADD CONSTRAINT "lab_has_hazards_id_lab_fkey" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards" ADD CONSTRAINT "lab_has_hazards_id_hazard_form_history_fkey" FOREIGN KEY ("id_hazard_form_history") REFERENCES "hazard_form_history"("id_hazard_form_history") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_form_child" ADD CONSTRAINT "hazard_form_child_id_hazard_form_fkey" FOREIGN KEY ("id_hazard_form") REFERENCES "hazard_form"("id_hazard_form") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazard_form_child_history" ADD CONSTRAINT "hazard_form_child_history_id_hazard_form_child_fkey" FOREIGN KEY ("id_hazard_form_child") REFERENCES "hazard_form_child"("id_hazard_form_child") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards_child" ADD CONSTRAINT "lab_has_hazards_child_id_lab_has_hazards_fkey" FOREIGN KEY ("id_lab_has_hazards") REFERENCES "lab_has_hazards"("id_lab_has_hazards") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards_child" ADD CONSTRAINT "lab_has_hazards_child_id_hazard_form_child_history_fkey" FOREIGN KEY ("id_hazard_form_child_history") REFERENCES "hazard_form_child_history"("id_hazard_form_child_history") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards_additional_info" ADD CONSTRAINT "lab_has_hazards_additional_info_id_hazard_category_fkey" FOREIGN KEY ("id_hazard_category") REFERENCES "hazard_category"("id_hazard_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_has_hazards_additional_info" ADD CONSTRAINT "lab_has_hazards_additional_info_id_lab_fkey" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazards_additional_info_has_file" ADD CONSTRAINT "lab_has_hazards_additional_info_has_file_ibfk_1" FOREIGN KEY ("id_lab_has_hazards_additional_info") REFERENCES "lab_has_hazards_additional_info"("id_lab_has_hazards_additional_info") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization" ADD CONSTRAINT "authorization_unit_ibfk_1" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_room" ADD CONSTRAINT "authorization_has_room_ibfk_1" FOREIGN KEY ("id_authorization") REFERENCES "authorization"("id_authorization") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_room" ADD CONSTRAINT "authorization_has_room_ibfk_2" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_holder" ADD CONSTRAINT "authorization_has_holder_ibfk_1" FOREIGN KEY ("id_authorization") REFERENCES "authorization"("id_authorization") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_holder" ADD CONSTRAINT "authorization_has_holder_ibfk_2" FOREIGN KEY ("id_person") REFERENCES "person"("id_person") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_chemical" ADD CONSTRAINT "authorization_has_chemical_ibfk_1" FOREIGN KEY ("id_authorization") REFERENCES "authorization"("id_authorization") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_chemical" ADD CONSTRAINT "authorization_has_chemical_ibfk_2" FOREIGN KEY ("id_chemical") REFERENCES "auth_chem"("id_auth_chem") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_radiation" ADD CONSTRAINT "authorization_has_radiation_ibfk_1" FOREIGN KEY ("id_authorization") REFERENCES "authorization"("id_authorization") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "authorization_has_file" ADD CONSTRAINT "authorization_has_file_ibfk_1" FOREIGN KEY ("id_authorization") REFERENCES "authorization"("id_authorization") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hazards_additional_info_has_tag" ADD CONSTRAINT "hazards_additional_info_has_tag_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "tag"("id_tag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazards_additional_info_has_tag" ADD CONSTRAINT "hazards_additional_info_has_tag_id_lab_has_hazards_additio_fkey" FOREIGN KEY ("id_lab_has_hazards_additional_info") REFERENCES "lab_has_hazards_additional_info"("id_lab_has_hazards_additional_info") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensation" ADD CONSTRAINT "dispensation_has_subject_ibfk_1" FOREIGN KEY ("id_dispensation_subject") REFERENCES "dispensation_subject"("id_dispensation_subject") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_ticket" ADD CONSTRAINT "dispensation_has_ticket_ibfk_1" FOREIGN KEY ("id_dispensation") REFERENCES "dispensation"("id_dispensation") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_file" ADD CONSTRAINT "dispensation_has_file_ibfk_1" FOREIGN KEY ("id_dispensation") REFERENCES "dispensation"("id_dispensation") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_holder" ADD CONSTRAINT "dispensation_has_holder_ibfk_1" FOREIGN KEY ("id_dispensation") REFERENCES "dispensation"("id_dispensation") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_holder" ADD CONSTRAINT "dispensation_has_holder_ibfk_2" FOREIGN KEY ("id_person") REFERENCES "person"("id_person") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_room" ADD CONSTRAINT "dispensation_has_room_ibfk_1" FOREIGN KEY ("id_dispensation") REFERENCES "dispensation"("id_dispensation") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_room" ADD CONSTRAINT "dispensation_has_room_ibfk_2" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_unit" ADD CONSTRAINT "dispensation_has_unit_ibfk_1" FOREIGN KEY ("id_dispensation") REFERENCES "dispensation"("id_dispensation") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dispensation_has_unit" ADD CONSTRAINT "dispensation_has_unit_ibfk_2" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision" ADD CONSTRAINT "assessment_and_decision_has_subject_ibfk_1" FOREIGN KEY ("id_assessment_and_decision_subject") REFERENCES "assessment_and_decision_subject"("id_assessment_and_decision_subject") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_file" ADD CONSTRAINT "assessment_and_decision_has_file_ibfk_1" FOREIGN KEY ("id_assessment_and_decision") REFERENCES "assessment_and_decision"("id_assessment_and_decision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_ticket" ADD CONSTRAINT "assessment_and_decision_has_ticket_ibfk_1" FOREIGN KEY ("id_assessment_and_decision") REFERENCES "assessment_and_decision"("id_assessment_and_decision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_contact" ADD CONSTRAINT "assessment_and_decision_has_contact_ibfk_1" FOREIGN KEY ("id_assessment_and_decision") REFERENCES "assessment_and_decision"("id_assessment_and_decision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_contact" ADD CONSTRAINT "assessment_and_decision_has_contact_ibfk_2" FOREIGN KEY ("id_person") REFERENCES "person"("id_person") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_room" ADD CONSTRAINT "assessment_and_decision_has_room_ibfk_1" FOREIGN KEY ("id_assessment_and_decision") REFERENCES "assessment_and_decision"("id_assessment_and_decision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_room" ADD CONSTRAINT "assessment_and_decision_has_room_ibfk_2" FOREIGN KEY ("id_lab") REFERENCES "lab"("id_lab") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_unit" ADD CONSTRAINT "assessment_and_decision_has_unit_ibfk_1" FOREIGN KEY ("id_assessment_and_decision") REFERENCES "assessment_and_decision"("id_assessment_and_decision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assessment_and_decision_has_unit" ADD CONSTRAINT "assessment_and_decision_has_unit_ibfk_2" FOREIGN KEY ("id_unit") REFERENCES "unit"("id_unit") ON DELETE RESTRICT ON UPDATE RESTRICT;
