import {getNow} from "../libs/date";
import {
	createAuthorization,
	getAuthorization,
	getAuthorizationsWithPagination,
	getAuthorizationToString,
	updateAuthorization
} from "../schema/authorization/authorization";
import {createChemical, getChemicalWithPagination} from "../schema/authorization/chemicals";
import {IDObfuscator} from "../utils/IDObfuscator";
import {getRoomsWithPagination} from "../schema/global/rooms";
import {getParentUnit, getUnitByName} from "../schema/roomdetails/units";
import {checkAPICall} from "./lib/checkedAPICalls";
import {
	singleCAS,
	reqRegexp,
	roomNameRegexp,
	textRegexp,
	unitNameRegexp,
	validateCASList,
	validateCommaSeparatedNumbers
} from "./lib/lhdValidators";

	app.use(restAuthenticate);
	app.use((req: Request, _res, next) => {
		req.prisma = getPrismaForUser(configFromDotEnv(), req.user);

		next();
	});

	app.use('/api', (req, res, next) => {
		console.log(`API CALL - [${getNow()}] - ${req.method} - ${req.protocol}://${req.hostname}${req.originalUrl}`);

		//TODO delete when Catalyse can change the call
		if (req.url.indexOf(".php") > -1) {
			const method = req.query.m as string;
			if (!method) return res.status(404).json({ Message: "missing <m> command (e.g. m=auth_req)." });
		}

		next();
	});


	//TODO delete when Catalyse and SNOW can change their calls
	app.post("/api/snow.php", async (req, res) => {
		try {
			const method = req.query.m as string;
			const request = req.query.req as string;

			if (!request && method !== 'auth_chem') return res.status(404).json({ Message: "missing <req> string for request+authorisation number of the form req=AUTH_SST-AUTH_REQ" });
			if (!req.query.date && method !== 'auth_chem') return res.status(404).json({ Message: "missing authorisation expiration <date>" });
			const expirationDate = new Date(req.query.date as string);

			switch (method) {
				case "auth_req":
					if ( !req.user.canEditAuthorizations )
						res.status(403).json({Message: 'Unauthorized'});
					else {
						const idUnit = parseInt(req.query.id_unit as string);
						if (!idUnit) return res.status(404).json({ Message: "missing <id_unit>" });

						if (!req.query.room_ids) return res.status(404).json({ Message: "missing <room_ids> list of lab ids" });
						const roomIds = (req.query.room_ids as string).split(',');

						if (!req.query.scipers) return res.status(404).json({ Message: "missing <scipers> list of authorisation holders" });
						const scipers = (req.query.scipers as string).split(',');

						const cas = (req.query.cas as string).split(',');
						const args = {
							id_unit: idUnit,
							authorization: request,
							expiration_date: (new Date(expirationDate)).toLocaleDateString("en-GB"),
							status: "Active",
							type: "Chemical",
							cas: cas.map(c => {
									return {name: c, status: "New"};
								}),
							holders: scipers.map(sc => {
									return {sciper: parseInt(sc), status: "New"};
								}),
							rooms: roomIds.map(r => {
									return {id: parseInt(r), status: "New"};
								}),
						}
						const add = await createAuthorization(args, context);
						if (add.isSuccess)
							res.json({Message: "Ok"});
						else {
							const error = add.errors.map(err => err.message).join(', ');
							res.json({Message: error});
						}
					}
					break;
				case "auth_renew":
					if ( !req.user.canEditAuthorizations )
						res.status(403).json({Message: 'Unauthorized'});
					else {
						const reqParts = request.split("-");
						const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
						const argsRenew = {
							take: 0,
							skip: 0,
							search: requestNumber,
							type: "Chemical"
						}

						const resultForAuth = await getAuthorization(argsRenew, context);
						if ( resultForAuth.totalCount === 1 ) {
							const encryptedID = IDObfuscator.obfuscate({
								id: resultForAuth.authorizations[0].id_authorization,
								obj: getAuthorizationToString(resultForAuth.authorizations[0])
							});
							const argsUpdate = {
								id: JSON.stringify(encryptedID),
								expiration_date: (new Date(expirationDate)).toLocaleDateString("en-GB"),
								status: "Active",
								renewals: parseInt(reqParts[2])
							};
							const resultRenew = await updateAuthorization(argsUpdate, context)
							if ( resultRenew.isSuccess )
								res.json({Message: "Ok"});
							else
								res.json({Message: resultRenew.errors.map(err => err.message).join(', ')});
						} else {
							return res.status(404).json({Message: "Could not find parent authorisation"});
						}
					}
					break;
				case "auth_chem":
					if ( !req.user.canEditChemicals )
						res.status(403).json({Message: 'Unauthorized'});
					else {
						if ( !req.query.cas ) return res.status(404).json({Message: "missing <cas> code for chemical product"});
						if ( !req.query.en ) return res.status(404).json({Message: "missing <en> english translation of the chemical name or description"});
						if ( !req.query.auth ) return res.status(404).json({Message: "missing <auth> flag for setting if the new chemical requires authorisation"});

						const argsChem = {
							auth_chem_en: req.query.en as string,
							cas_auth_chem: req.query.cas as string,
							flag_auth_chem: (req.query.auth as string).toLowerCase() == 'yes' || (req.query.auth as string) == '1'
						}
						const resultNewChem = await createChemical(argsChem, context);
						if ( resultNewChem.isSuccess )
							res.json({Message: "Ok"});
						else {
							const error = resultNewChem.errors.map(err => err.message).join(', ');
							res.json({Message: error});
						}
					}
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
			switch (req.query.m as string) {
				case "auth_check":
					if ( !req.user.canListAuthorizations )
						res.status(403).json({Message: 'Unauthorized'});
					else {
						if ( !req.query.sciper ) return res.status(404).json({Message: "Missing sciper number"});
						if ( !req.query.cas ) return res.status(404).json({Message: "Missing cas number"});
						const sciper = (req.query.sciper as string);
						const cas = (req.query.cas as string).split(',');

						const argsCheck = {
							take: 0,
							skip: 0,
							search: `Holder=${sciper}`,
							type: "Chemical"
						}
						const result = await getAuthorizationsWithPagination(argsCheck, context);
						const casResult = result.authorizations
							.filter(auth => auth.expiration_date > new Date())
							.flatMap(auth => auth.authorization_has_chemical)
							.flatMap(auth => auth.chemical)
							.filter(chem => chem.flag_auth_chem == 1)
							.flatMap(cas => cas.cas_auth_chem);
						const casAuth = {};
						cas.forEach(c => {
							if ( casResult.includes(c) ) {
								casAuth[c] = 1;
							} else {
								casAuth[c] = 0;
							}
						})
						res.json({Message: "Ok", Data: [casAuth]});
					}
					break;
				default:
					res.status(404).json({Message: 'Not Found'});
					break;
			}
		} catch (err: any) {
			res.status(500).json({Message: err.message});
		}
	});

	app.post("/api/auth_req",
		checkAPICall(
			{
				authorize: (req) => req.user.canEditAuthorizations,
				required: {
					req (req) { return req.query.req; },
					date (req) { return req.query.date; },
					id_unit (req) { return req.query.id_unit; },
					room_ids (req) { return req.query.room_ids },
					scipers (req) { return req.query.scipers },
					cas (req) { return req.query.cas },
				},
				validate: {
					req: reqRegexp,
					date: Date,
					id_unit: Number,
					room_ids: validateCommaSeparatedNumbers,
					scipers: validateCommaSeparatedNumbers,
					cas: validateCASList
				}
			}),
		async (req, res) => {
			const args = {
				id_unit: req.params.id_unit,
				authorization: req.params.req,
				expiration_date: req.params.date.toLocaleDateString("en-GB"),
				status: "Active",
				type: "Chemical",
				cas: req.params.cas.map(c => {
					return {name: c, status: "New"};
				}),
				holders: req.params.scipers.map(sc => {
					return {sciper: sc, status: "New"};
				}),
				rooms: req.params.room_ids.map(r => {
					return {id: r, status: "New"};
				}),
			}
			const add = await createAuthorization(args, context);
			if ( add.isSuccess )
				res.json({Message: "Ok"});
			else {
				const error = add.errors.map(err => err.message).join(', ');
				res.json({Message: error});
			}
		}
	);

	app.post("/api/auth_renew",
		checkAPICall(
			{
				authorize: (req) => req.user.canEditAuthorizations,
				required: {
					req (req) { return req.query.req; },
					date (req) { return req.query.date; }
				},
				validate: {
					req: reqRegexp,
					date: Date
				}
			}),
		async (req, res) => {
			const reqParts = req.params.req.split("-");
			const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
			const argsRenew = {
				take: 0,
				skip: 0,
				search: requestNumber,
				type: "Chemical"
			}

			const resultForAuth = await getAuthorization(argsRenew, context);
			if ( resultForAuth.totalCount === 1 ) {
				const encryptedID = IDObfuscator.obfuscate({
					id: resultForAuth.authorizations[0].id_authorization,
					obj: getAuthorizationToString(resultForAuth.authorizations[0])
				});
				const argsUpdate = {
					id: JSON.stringify(encryptedID),
					expiration_date: (new Date(req.params.date)).toLocaleDateString("en-GB"),
					status: "Active",
					renewals: parseInt(reqParts[2])
				};
				const resultRenew = await updateAuthorization(argsUpdate, context)
				if ( resultRenew.isSuccess )
					res.json({Message: "Ok"});
				else
					res.json({Message: resultRenew.errors.map(err => err.message).join(', ')});
			} else {
				return res.status(404).json({Message: "Could not find parent authorisation"});
			}
		}
	);

	app.post("/api/add_chem",
		checkAPICall(
			{
				authorize: (req) => req.user.canEditChemicals,
				required: {
					cas (req) { return req.query.cas; },
					en (req) { return req.query.en; },
					auth (req) { return req.query.auth; }
				},
				validate: {
					cas: singleCAS,
					en: textRegexp,
					fr: textRegexp,
					auth: new RegExp("yes|no|1|0"),
				},
				optional: {
					fr (req) { return req.query.fr; }
				}
			}),
		async (req, res) => {
			const argsChem = {
				auth_chem_en: req.params.en as string,
				cas_auth_chem: req.params.cas as string,
				flag_auth_chem: (req.params.auth as string).toLowerCase() == 'yes' || (req.params.auth as string) == '1' //TODO move into validator
			}
			const resultNewChem = await createChemical(argsChem, context);
			if ( resultNewChem.isSuccess )
				res.json({Message: "Ok"});
			else {
				const error = resultNewChem.errors.map(err => err.message).join(', ');
				res.json({Message: error});
			}
	});

	app.get("/api/get_chem",
		checkAPICall(
			{
				authorize: (req) => req.user.canListChemicals,
				validate: {
					cas: validateCASList
				},
				optional: {
					cas (req) { return req.query.cas; },
				}
			}),
		async (req, res) => {
			const cas = req.params.cas as string;

			const resultNew = await getChemicalWithPagination([], 0, 0, context);
			const all = resultNew.chemicals.map(chem => {
				return {
					cas_auth_chem: chem.cas_auth_chem,
					auth_chem_en: chem.auth_chem_en,
					flag_auth_chem: chem.flag_auth_chem
				}
			});
			if ( cas ) {
				const data = all.filter(chem => cas.includes(chem.cas_auth_chem));
				res.json({Message: "Ok", Data: data});
			} else {
				res.json({Message: "Ok", Data: all});
			}
		});

	app.get("/api/auth_check",
		checkAPICall(
			{
				authorize: (req) => req.user.canListAuthorizations,
				required: {
					sciper (req) { return req.query.sciper },
					cas (req) { return req.query.cas },
				},
				validate: {
					sciper: Number,
					cas: validateCASList
				}
			}),
		async (req, res) => {
			const sciper = (req.params.sciper as string);
			const cas = req.params.cas;

			const argsCheck = {
				take: 0,
				skip: 0,
				search: `Holder=${sciper}`,
				type: "Chemical"
			}
			const result = await getAuthorizationsWithPagination(argsCheck, context);
			const casResult = result.authorizations
				.filter(auth => auth.expiration_date > new Date())
				.flatMap(auth => auth.authorization_has_chemical)
				.flatMap(auth => auth.chemical)
				.filter(chem => chem.flag_auth_chem == 1)
				.flatMap(cas => cas.cas_auth_chem);
			const casAuth = {};
			cas.forEach(c => {
				if ( casResult.includes(c) ) {
					casAuth[c] = 1;
				} else {
					casAuth[c] = 0;
				}
			})
			res.json({Message: "Ok", Data: [casAuth]});
		});

	app.get("/api/get_labs_and_units",
		checkAPICall(
			{
				authorize: (req) => req.user.canListRooms,
				validate: {
					unit: unitNameRegexp,
					room: roomNameRegexp
				},
				optional: {
					unit (req) { return req.query.unit; },
					room (req) { return req.query.room; },
				}
			}),
		async (req, res) => {
			const conditions = [];
			if (req.params.unit) conditions.push(req.params.unit as string);
			if (req.params.room) conditions.push(req.params.room as string);
			const args = {
				search: conditions.join('&'),
				take: 0
			};
			const resultNew = await getRoomsWithPagination(args, context);
			for ( let i = 0; i<resultNew.rooms.length; i++) {
				for ( let j = 0; j<resultNew.rooms[i].unit_has_room.length; j++) {
					resultNew.rooms[i].unit_has_room[j].realID = resultNew.rooms[i].unit_has_room[j].id_unit;
					if ( resultNew.rooms[i].unit_has_room[j].unit.unitId == null) {
						const parentName = resultNew.rooms[i].unit_has_room[j].unit.name.substring(0, resultNew.rooms[i].unit_has_room[j].unit.name.indexOf(' ('));
						const parent = await getParentUnit(parentName, context);
						resultNew.rooms[i].unit_has_room[j].realID = parent.length > 0 ? parent[0].id : null;
					}
				}
			}
			const all = resultNew.rooms.map(r => {
				return {
					id_lab: r.id,
					id_unit: r.unit_has_room.map(uhr => uhr.realID),
					lab_display: r.name
				}
			});
			const flatted = all.flatMap(item =>
				item.id_unit.map(unit => ({
					id_lab: item.id_lab,
					id_unit: unit,
					lab_display: item.lab_display
				}))
			);
			res.json({Message: "Ok", Data: flatted});
		});

	app.get("/api/get_profs_and_cosecs",
		checkAPICall(
			{
				authorize: (req) => req.user.canListUnits,
				validate: {
					unit: unitNameRegexp,
				},
				optional: {
					unit (req) { return req.query.unit; },
				}
			}),
		async (req, res) => {
			const args = {
				search: req.params.unit,
			};
			const resultNew = await getUnitByName(args, context);
			const unitMap: { [unit: string]: {unit: string, id_unit: number, sciper: string[], sciper_cosec: string[], rooms: string[] }; } = {};
			resultNew.forEach(unit => {
				const unitName = unit.name.split(' (')[0];
				const cosecs = unit.unit_has_cosec.map(uhc => {
						return uhc.cosec.sciper;
					}
				);
				const profs = unit.subunpro.map(uhp => {
						return uhp.person.sciper;
					}
				);
				const rooms = unit.unit_has_room.map(uhr => {
						return uhr.id_lab;
					}
				);
				if (!unitMap.hasOwnProperty(unitName)) {
					unitMap[unitName] = {
						sciper_cosec: cosecs,
						sciper: profs,
						unit: `${unit.institute.school.name} ${unit.institute.name} ${unitName}`,
						id_unit: unit.name === unitName ? unit.id : 0,
						rooms: rooms
					};
				} else {
					unitMap[unitName].sciper_cosec = [...new Set([...unitMap[unitName].sciper_cosec, ...cosecs])];
					unitMap[unitName].sciper = [...new Set([...unitMap[unitName].sciper, ...profs])];
					unitMap[unitName].id_unit = unit.name === unitName ? unit.id : unitMap[unitName].id_unit;
					unitMap[unitName].rooms = [...new Set([...unitMap[unitName].rooms, ...rooms])];
				}
			});
			const result = Object.values(unitMap).filter(val => val.rooms.length > 0).map(value => {
				return {unit: value.unit, id_unit: value.id_unit, sciper: value.sciper.join(','), sciper_cosec: value.sciper_cosec.join(',')}
			});
			res.json({Message: "Ok", Data: result});
		});
}
