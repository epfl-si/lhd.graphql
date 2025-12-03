import {getNow} from "../libs/date";
import {checkAPICall} from "./lib/checkedAPICalls";
import {
	reqRegexp,
	reqRenewRegexp,
	roomNameRegexp,
	singleCAS,
	chemicalNameRegexp,
	unitNameRegexp,
	validateAuth,
	validateCASList,
	validateCommaSeparatedNumbers
} from "./lib/lhdValidators";
import * as express from "express";
import {Request} from "express";
import {restAuthenticate} from "./lib/restAuthentication";
import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {errorHandler} from "./lib/errorHandler";
import {
	createAuthorization,
	getAuthorizationsWithPagination,
	getTheAuthorization,
	updateAuthorization
} from "../model/authorization";
import {createChemical, getChemicalWithPagination} from "../model/chemicals";
import {getRoomsWithPagination} from "../model/rooms";
import {getParentUnit, getUnitByName} from "../model/units";

export function makeRESTAPI() {
	const app = express();

	app.use(restAuthenticate);
	app.use(function setReqPrismaMiddleware (req: Request, _res, next) {
		req.prisma = getPrismaForUser(configFromDotEnv(), req.user);

		next();
	});

	app.use('/api', function auditAPI (req, res, next) {
		console.log(`API CALL - [${getNow()}] - ${req.method} - ${req.protocol}://${req.hostname}${req.originalUrl}`);

		//TODO delete when Catalyse and SNOW have migrated to the new URLs
		if (req.url.indexOf(".php") > -1) {
			const method = req.query.m as string;
			if (!method) return res.status(400).json({ Message: "missing <m> command (e.g. m=auth_req)." });
		}

		next();
	});


	//TODO delete when Catalyse and SNOW have migrated to the new URLs
	app.post("/api/snow.php", async (req: any, res) => {
		try {
			const method = req.query.m as string;
			const request = req.query.req as string;

			if (!request && method !== 'auth_chem') return res.status(400).json({ Message: "missing <req> string for request+authorisation number of the form req=AUTH_SST-AUTH_REQ" });
			if (!req.query.date && method !== 'auth_chem') return res.status(400).json({ Message: "missing authorisation expiration <date>" });
			const expirationDate = new Date(req.query.date as string);

			switch (method) {
				case "auth_req":
					if ( !req.user.canEditAuthorizations ) {
						res.status(403).json({Message: 'Unauthorized'});
						break;
					}

					const idUnit = parseInt(req.query.id_unit as string);
					if (!idUnit) return res.status(400).json({ Message: "missing <id_unit>" });

					if (!req.query.room_ids) return res.status(400).json({ Message: "missing <room_ids> list of lab ids" });
					const roomIds = (req.query.room_ids as string).split(',');

					if (!req.query.scipers) return res.status(400).json({ Message: "missing <scipers> list of authorisation holders" });
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
					await createAuthorization(args, args.id_unit, req.prisma);
					res.json({Message: "Ok"});
					break;
				case "auth_renew":
					if ( !req.user.canEditAuthorizations ) {
						res.status(403).json({Message: 'Unauthorized'});
						break;
					}

					const reqParts = request.split("-");
					const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
					const argsRenew = {
						search: requestNumber,
						type: "Chemical"
					}

					const auth = await getTheAuthorization(argsRenew, req.prisma);
					const argsUpdate = {
						expiration_date: (new Date(expirationDate)).toLocaleDateString("en-GB"),
						status: "Active",
						renewals: parseInt(reqParts[2])
					};
					await updateAuthorization(argsUpdate, auth, req.prisma)
					res.json({Message: "Ok"});
					break;
				case "auth_chem":
					if ( !req.user.canEditChemicals ) {
						res.status(403).json({Message: 'Unauthorized'});
						break;
					}

					if ( !req.query.cas ) return res.status(400).json({Message: "missing <cas> code for chemical product"});
					if ( !req.query.en ) return res.status(400).json({Message: "missing <en> english translation of the chemical name or description"});
					if ( !req.query.auth ) return res.status(400).json({Message: "missing <auth> flag for setting if the new chemical requires authorisation"});

					const argsChem = {
						auth_chem_en: req.query.en as string,
						cas_auth_chem: req.query.cas as string,
						flag_auth_chem: (req.query.auth as string).toLowerCase() === 'yes' || (req.query.auth as string) === '1'
					}
					await createChemical(argsChem, req);
					res.json({Message: "Ok"});
					break;
				default:
					res.status(404).json({Message: 'Not Found'});
					break;
			}
		} catch (err: any) {
			res.status(500).json({Message: err.message});
		}
	});
	app.get("/api/catalyse.php", async (req: any, res) => {
		try {
			switch (req.query.m as string) {
				case "auth_check":
					if ( !req.user.canListAuthorizations ) {
						res.status(403).json({Message: 'Unauthorized'});
						break;
					}

					if ( !req.query.sciper ) return res.status(400).json({Message: "Missing sciper number"});
					if ( !req.query.cas ) return res.status(400).json({Message: "Missing cas number"});
					const sciper = (req.query.sciper as string);
					const cas = (req.query.cas as string).split(',');

					const argsCheck = {
						take: 0,
						skip: 0,
						search: `Holder=${sciper}`,
						type: "Chemical"
					}
					const result = await getAuthorizationsWithPagination(argsCheck, req.prisma);
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
					break;
				default:
					res.status(404).json({Message: 'Not Found'});
					break;
			}
		} catch (err: any) {
			res.status(500).json({Message: err.message});
		}
	});


	type AuthReqParams = {id_unit: number, req: string, date: Date, scipers: number[], cas: string[], room_ids: number[]};
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
		async (req: Request<AuthReqParams>, res) => {
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
			await createAuthorization(args, args.id_unit, req.prisma);
			res.json({Message: "Ok"});
		}
	);

	type AuthRenewParams = {req: string, date: Date};
	app.post("/api/auth_renew",
		checkAPICall(
			{
				authorize: (req) => req.user.canEditAuthorizations,
				required: {
					req (req) { return req.query.req; },
					date (req) { return req.query.date; }
				},
				validate: {
					req: reqRenewRegexp,
					date: Date
				}
			}),
		async (req: Request<AuthRenewParams>, res) => {
			const reqParts = req.params.req.split("-");
			const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
			const argsRenew = {
				search: requestNumber,
				type: "Chemical"
			}

			const auth = await getTheAuthorization(argsRenew, req.prisma);
			const argsUpdate = {
				expiration_date: (new Date(req.params.date)).toLocaleDateString("en-GB"),
				status: "Active",
				renewals: parseInt(reqParts[2])
			};
			await updateAuthorization(argsUpdate, auth, req.prisma)
			res.json({Message: "Ok"});
		}
	);

	type AddChemParams = {cas: string, en: string, auth: boolean, fr?: string};
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
					en: chemicalNameRegexp,
					fr: chemicalNameRegexp,
					auth: validateAuth,
				},
				optional: {
					fr (req) { return req.query.fr; }
				}
			}),
		async (req: Request<AddChemParams>, res) => {
			const argsChem = {
				auth_chem_en: req.params.en,
				cas_auth_chem: req.params.cas,
				flag_auth_chem: req.params.auth
			}
			await createChemical(argsChem, req);
			res.json({Message: "Ok"});
	});

	type GetChemParams = {cas?: string[]};
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
		async (req: Request<GetChemParams>, res) => {
			const resultNew = await getChemicalWithPagination([], 0, 0, req.prisma);
			const all = resultNew.chemicals.map(chem => {
				return {
					cas_auth_chem: chem.cas_auth_chem,
					auth_chem_en: chem.auth_chem_en,
					flag_auth_chem: chem.flag_auth_chem
				}
			});
			if ( req.params.cas ) {
				const data = all.filter(chem => req.params.cas.includes(chem.cas_auth_chem));
				res.json({Message: "Ok", Data: data});
			} else {
				res.json({Message: "Ok", Data: all});
			}
		});

	type AuthCheckParams = {cas: string[], sciper: Number};
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
		async (req: Request<AuthCheckParams>, res) => {
			const argsCheck = {
				take: 0,
				skip: 0,
				search: `Holder=${req.params.sciper}`,
				type: "Chemical"
			}
			const result = await getAuthorizationsWithPagination(argsCheck, req.prisma);
			const casResult = result.authorizations
				.filter(auth => auth.expiration_date > new Date())
				.flatMap(auth => auth.authorization_has_chemical)
				.flatMap(auth => auth.chemical)
				.filter(chem => chem.flag_auth_chem == 1)
				.flatMap(cas => cas.cas_auth_chem);
			const casAuth = {};
			req.params.cas.forEach(c => {
				if ( casResult.includes(c) ) {
					casAuth[c] = 1;
				} else {
					casAuth[c] = 0;
				}
			})
			res.json({Message: "Ok", Data: [casAuth]});
		});

	type GetLabsAndUnitsParams = {unit?: string, room?: string};
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
		async (req: Request<GetLabsAndUnitsParams>, res) => {
			const conditions = [];
			if (req.params.unit) conditions.push(['Unit', req.params.unit]);
			if (req.params.room) conditions.push(['Room', req.params.room]);
			const args = {
				take: 0
			};
			const resultNew = await getRoomsWithPagination(args, conditions, req.prisma);
			for ( let i = 0; i<resultNew.rooms.length; i++) {
				for ( let j = 0; j<resultNew.rooms[i].unit_has_room.length; j++) {
					resultNew.rooms[i].unit_has_room[j].realID = resultNew.rooms[i].unit_has_room[j].id_unit;
					if ( resultNew.rooms[i].unit_has_room[j].unit.unitId == null) {
						const parentName = resultNew.rooms[i].unit_has_room[j].unit.name.substring(0, resultNew.rooms[i].unit_has_room[j].unit.name.indexOf(' ('));
						const parent = await getParentUnit(parentName, req.prisma);
						resultNew.rooms[i].unit_has_room[j].realID = parent.length > 0 ? parent[0].id : null;
					}
				}
			}
			const all = resultNew.rooms.map(r => {
				return {
					id_lab: r.id,
					units: r.unit_has_room.filter(uhr => uhr.unit.name.indexOf(req.params.unit ?? '') > -1).map(uhr => uhr.realID),
					lab_display: r.name
				}
			});
			const flattened = all.flatMap(item =>
				item.units.map(unit => ({
					id_lab: item.id_lab,
					id_unit: unit,
					lab_display: item.lab_display
				}))
			);
			res.json({Message: "Ok", Data: flattened});
		});

	type GetProfsAndCosecsParams = {unit?: string};
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
		async (req: Request<GetProfsAndCosecsParams>, res) => {
			const args = {
				search: req.params.unit,
			};
			const resultNew = await getUnitByName(args, req.prisma);
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

	app.use(errorHandler);

	return app;
}

function restAuthenticate(req: Request, res, next) {
	const token = getToken(req);
	const isSnow = token === process.env.SNOW_TOKEN;
	const isCatalyse = token === process.env.CATALYSE_TOKEN;

	if (!isSnow && ! isCatalyse) {
		res.status(403);
		res.send(`Unauthorized`);
		return;
	}

	req.user = {
		username: isSnow ? 'SNOW' : 'CATALYSE',
		canListRooms: isSnow,
		canListUnits: isSnow,
		canListChemicals: isSnow,
		canEditChemicals: isSnow,
		canListAuthorizations: isCatalyse,
		canEditAuthorizations: isSnow,
	}

	next();
}
