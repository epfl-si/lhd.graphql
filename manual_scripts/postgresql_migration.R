library(DBI)
library(RMariaDB)
library(RPostgres)

environment <- "local" # test | prod

if (environment == 'local') {
  mdb <- dbConnect(
    RMariaDB::MariaDB(),
    host = "127.0.0.1",
    port = 3307,
    user = "root",
    password = "ROOT",
    dbname = "lhd_test"
  )

  pg <- dbConnect(
    RPostgres::Postgres(),
    host = "127.0.0.1",
    port = 45432,
    user = "root",
    password = "ROOT",
    dbname = "lhd"
  )
} else {
  db_conf <- yaml::read_yaml(paste0("/keybase/team/epfl_lhd/secrets_", environment, ".yml"))

  # MariaDB
  mdb <- dbConnect(
    RMariaDB::MariaDB(),
    host = db_conf$mysql$lhd_admin$host,
    dbname = db_conf$mysql$lhd_admin$dbname,
    user = db_conf$mysql$lhd_admin$user,
    password = db_conf$mysql$lhd_admin$password,
    port = db_conf$mysql$lhd_admin$port
  )

  # Postgres
  pg <- dbConnect(
    RPostgres::Postgres(),
    host = db_conf$postgresql$host,
    dbname = db_conf$postgresql$name,
    user = db_conf$postgresql$user,
    password = db_conf$postgresql$password,
    port = db_conf$postgresql$port
  )
}

tables_in_order <- c(
  # Level 0 - no FK dependencies
  "audits",
  "auth_chem",
  "bio_org",
  "faculty",
  "labType",
  "person",
  "hazard_category",
  "mutation_logs",
  "tag",
  "dispensation_subject",
  "assessment_and_decision_subject",

  # Level 1
  "institut",
  "lab",
  "hazard_form",
  "dispensation",
  "assessment_and_decision",

  # Level 2
  "unit",
  "hazard_form_history",
  "hazard_form_child",
  "dispensation_has_ticket",
  "dispensation_has_file",
  "dispensation_has_holder",
  "dispensation_has_room",
  "assessment_and_decision_has_file",
  "assessment_and_decision_has_ticket",
  "assessment_and_decision_has_contact",
  "assessment_and_decision_has_room",

  # Level 3
  "unit_has_room",
  "unit_has_cosec",
  "subunpro",
  "authorization",
  "lab_has_hazards",
  "lab_has_hazards_additional_info",
  "hazard_form_child_history",
  "dispensation_has_unit",
  "assessment_and_decision_has_unit",

  # Level 4
  "authorization_has_room",
  "authorization_has_holder",
  "authorization_has_chemical",
  "authorization_has_radiation",
  "authorization_has_file",
  "lab_has_hazards_child",
  "hazards_additional_info_has_file",
  "hazards_additional_info_has_tag"
)

dbExecute(pg, "SET session_replication_role = 'replica';")

for (tbl in tables_in_order) {
  df <- dbReadTable(mdb, tbl)
  dbWriteTable(pg, tbl, df, append = TRUE, row.names = FALSE)
}

dbExecute(pg, "SET session_replication_role = 'origin';")

for (tbl in tables_in_order) {
  pk_col <- dbGetQuery(pg, sprintf(
    "SELECT a.attname FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = '\"%s\"'::regclass AND i.indisprimary;", tbl
  ))
  if (nrow(pk_col) > 0) {
    col <- pk_col$attname[1]
    seq <- dbGetQuery(pg, sprintf(
      "SELECT pg_get_serial_sequence('\"%s\"', '%s') AS seq;", tbl, col
    ))$seq
    if (!is.na(seq) && !is.null(seq)) {
      dbExecute(pg, sprintf(
        "SELECT setval('%s', COALESCE((SELECT MAX(\"%s\") FROM \"%s\"), 1));",
        seq, col, tbl
      ))
    }
  }
}

dbDisconnect(pg)
dbDisconnect(mdb)
