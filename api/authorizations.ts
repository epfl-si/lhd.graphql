import {Express} from "express";
import {authenticate, getToken} from "./libs/authentication";
import {makeQuery} from "./libs/query";

export function registerAuthApi(app: Express) {
	app.post("/api/snow.php", async (req, res) => {
		try {
			const token = getToken(req, res);
			if (!authenticate(token, "SNOW")) {
				return res.status(401).json({ Message: "Unauthorized" });
			}

			const method = req.query.m as string;
			const request = req.query.req as string;

			if (!method) return res.status(404).json({ Message: "missing <m> command (e.g. m=auth_req)." });
			if (!request) return res.status(404).json({ Message: "missing <req> string for request+authorisation number of the form req=AUTH_SST-AUTH_REQ" });
			if (!req.query.date) return res.status(404).json({ Message: "missing authorisation expiration <date>" });
			const expirationDate = new Date(req.query.date as string);

			let query = '';

			switch (method) {
				case "auth_req":
					const idUnit = parseInt(req.query.id_unit as string);
					if (!idUnit) return res.status(404).json({ Message: "missing <id_unit>" });

					if (!req.query.room_ids) return res.status(404).json({ Message: "missing <room_ids> list of lab ids" });
					const roomIds = (req.query.room_ids as string).split(',');

					if (!req.query.scipers) return res.status(404).json({ Message: "missing <scipers> list of authorisation holders" });
					const scipers = (req.query.scipers as string).split(',');

					const cas = (req.query.cas as string).split(',');

					query = `mutation addAuthorizationFromSNow {
								addAuthorization(
									token: "${token}",
									id_unit: "${idUnit}",
									authorization: "${request}",
									creation_date: "${(new Date()).toLocaleDateString("en-GB")}",
									expiration_date: "${(new Date(expirationDate)).toLocaleDateString("en-GB")}",
									status: "Active",
									type: "Chemical",
									cas: [
										${cas.map(c => `{name: "${c}", status: "New"}`)}
									],
									holders: [
										${scipers.map(sc => `{sciper: ${sc}, status: "New"}`)}
									],
									rooms: [
										${roomIds.map(r => `{id: ${r}, status: "New"}`)}
									],
								)
							 {
								errors {
									message
								}
								isSuccess
							}
						}`;
					const resultNew = await makeQuery(query, 'SNOW');
					if (resultNew.addAuthorization.isSuccess)
						res.json({Message: "Ok"});
					else {
						const error = resultNew.addAuthorization.errors.map(err => err.message).join(', ');
						if (error.indexOf("Unique constraint failed on the constraint: `authorization`") > -1)
							res.json({Message: "Ok"});
						else
							res.json({Message: error});
					}
					break;
				case "auth_renew":
					const reqParts = request.split("-");
					const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
					const queryForAuth = `query fetchChemicalAuthorizations {
							authorizationsWithPagination (take: 0, skip: 0, search: "Authorization=${requestNumber}", type: "Chemical", token: "${token}") {
								authorizations{
									id
								}
								totalCount
							}
						}`;
					const resultForAuth = await makeQuery(queryForAuth, 'SNOW');
					if (resultForAuth.authorizationsWithPagination.totalCount === 1) {
						query = `mutation updateRadioprotection {
								updateAuthorization(
									token: "${token}",
									id: ${JSON.stringify(resultForAuth.authorizationsWithPagination.authorizations[0].id)},
									expiration_date: "${(new Date(expirationDate)).toLocaleDateString("en-GB")}",
									status: "Active",
									renewals: ${parseInt(reqParts[2])}
								)
							 {
								errors {
									message
								}
								isSuccess
							}
						}`;
					} else {
						return res.status(404).json({ Message: "Could not find parent authorisation" });
					}
					const resultRenew = await makeQuery(query, 'SNOW');
					if (resultRenew.updateAuthorization.isSuccess)
						res.json({Message: "Ok"});
					else
						res.json({Message: resultRenew.updateAuthorization.errors.map(err => err.message).join(', ')});
					break;
				default:
					res.status(404).json({Message: 'Not Found'});
					break;
			}
		} catch (err: any) {
			res.status(500).json({Message: err.message});
		}
	});
	app.get("/api/catalyse.php", async (req, res) => {
		try {
			const token = getToken(req, res);
			if (!authenticate(token, "CATALYSE")) {
				return res.status(401).json({ Message: "Unauthorized" });
			}

			const method = req.query.m as string;
			if (!method) return res.status(404).json({ Message: "Not Found" });

			let query = '';

			switch (method) {
				case "auth_check":
					if (!req.query.sciper) return res.status(404).json({ Message: "Missing sciper number" });
					const sciper = (req.query.sciper as string);
					const cas = (req.query.cas as string).split(',');

					query = `query fetchChemicalAuthorizations {
						authorizationsWithPagination (take: 0, skip: 0, search: "Holder=${sciper}", type: "Chemical"
									token: "${token}",) {
							authorizations{
								expiration_date
								authorization_chemicals {
									cas_auth_chem
									flag_auth_chem
								}
							}
						}
					}`;
					const result = await makeQuery(query, 'CATALYSE');
					const casResult = result.authorizationsWithPagination.authorizations
						.filter(auth => auth.expiration_date > new Date())
						.flatMap(auth => auth.authorization_chemicals)
						.filter(chem => chem.flag_auth_chem == 1)
						.flatMap(cas => cas.cas_auth_chem);
					const casAuth = {};
					cas.forEach(c => {
						if (casResult.includes(c)) {
							casAuth[c] = 1;
						} else {
							casAuth[c] = 0;
						}
					})
					res.json({Message: "Ok", Data: [casAuth]});
					break;
				default:
					res.status(404).json({Message: 'Not Found'});
					break;
			}
		} catch (err: any) {
			res.status(500).json({Message: err.message});
		}
	});
}
