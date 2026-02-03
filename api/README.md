## AXS

Three classes of laboratories exist in LHD:

**DSPS Relevant**: laboratories with at least one hazard flagged as true at a high level. Training and medical checks may all be set to false.

**DSPS Irrelevant**: laboratories with at least one hazard flagged as true at a low level. All training and medical checks are set to false.

**No Hazards**: laboratories with no hazards, where all hazard, training, and medical check flags are set to false.

With the current configuration, no distinction is made between **DSPS Irrelevant** and **No Hazards** laboratories. As a result, DSPS Irrelevant laboratories are downgraded to No Hazards, meaning their hazard flags are set to false.

A distinction between **DSPS Irrelevant** and **No Hazards** should be preserved if the signature of the COSEC/Professor is required only for laboratories with at least one hazard (low or high) set to true. Laboratories classified as No Hazards would therefore not require a signature.
