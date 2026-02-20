import {getNow} from "../utils/date";
import {getBearerToken} from "../utils/authentication";
import {checkAPICall} from "./lib/checkedAPICalls";
import {
	chemicalNameRegexp,
	reqRegexp,
	reqRenewRegexp,
	roomNameRegexp,
	singleCAS,
	unitNameRegexp,
	validateAuth,
	validateCASList,
	validateCommaSeparatedNumbers
} from "./lib/lhdValidators";
import * as express from "express";
import {Request} from "express";
import {errorHandler} from "./lib/errorHandler";
import {createAuthorization, getAuthorizations, getTheAuthorization, updateAuthorization} from "../model/authorization";
import {createChemical, getChemicals} from "../model/chemicals";
import {getRooms} from "../model/rooms";
import {getParentUnit, getUnitByName} from "../model/units";
import {setReqPrismaMiddleware} from "./lib/rest";

export function makeRESTAPI() {
	const app = express();

	app.use(setReqPrismaMiddleware);

	app.use(function auditAPI (req, res, next) {
		console.log(`API CALL - [${getNow()}] - ${req.method} - ${req.protocol}://${req.hostname}${req.originalUrl}`);

		//TODO delete when Catalyse and SNOW have migrated to the new URLs
		if (req.url.indexOf(".php") > -1) {
			const method = req.query.m as string;
			if (!method) return res.status(400).json({ Message: "missing <m> command (e.g. m=auth_req)." });
		}

		next();
	});


	// OBSOLETE; will be removed once ServiceNow migrates over to the new API.
	app.post("/snow.php",
		restAuthenticateByTokenQueryParam,
		async (req: any, res) => {
		const method = req.query.m as string;
		const request = req.query.req as string;

		if (!request && method !== 'auth_chem') return res.status(400).json({ Message: "missing <req> string for request+authorisation number of the form req=AUTH_SST-AUTH_REQ" });
		if (!req.query.date && method !== 'auth_chem') return res.status(400).json({ Message: "missing authorisation expiration <date>" });
		const expirationDate = new Date(req.query.date as string);
		expirationDate.setHours(12, 0, 0, 0);

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


				const now = new Date();
				now.setHours(12, 0, 0, 0);
				const cas = (req.query.cas as string).split(',');
				const args = {
					id_unit: idUnit,
					authorization: request,
					creation_date: now,
					expiration_date: expirationDate,
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
				await createAuthorization(req.prisma, args, args.id_unit, args.holders);
				res.json({Message: "Ok"});
				break;
			case "auth_renew":
				if ( !req.user.canEditAuthorizations ) {
					res.status(403).json({Message: 'Unauthorized'});
					break;
				}

				const reqParts = request.split("-");
				const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
				const auth = await getTheAuthorization(req.prisma, requestNumber, "Chemical");
				const exp = new Date(expirationDate);
				exp.setHours(12, 0, 0, 0);
				const argsUpdate = {
					expiration_date: exp,
					status: "Active",
					renewals: parseInt(reqParts[2])
				};
				await updateAuthorization(req.prisma, argsUpdate, auth)
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
	});

	type AuthReqParams = {id_unit: number, req: string, date: Date, scipers: number[], cas: string[], room_ids: number[]};
	app.post<AuthReqParams>("/auth_req",
		restAuthenticateBearer,   // TODO: factor all these out with `app.use()` once the obsolete API is gone.
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
			const now = new Date();
			now.setHours(12, 0, 0, 0);
			const exp = new Date(req.params.date);
			exp.setHours(12, 0, 0, 0);
			const args = {
				id_unit: req.params.id_unit,
				authorization: req.params.req,
				creation_date: now,
				expiration_date: exp,
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
			await createAuthorization(req.prisma, args, args.id_unit, args.holders);
			res.json({Message: "Ok"});
		}
	);

	app.post<{req: string, date: Date}>("/auth_renew",
		restAuthenticateBearer,
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
		async (req, res) => {
			const reqParts = req.params.req.split("-");
			const requestNumber = `${reqParts[0]}-${reqParts[1]}`;
			const auth = await getTheAuthorization(req.prisma, requestNumber, "Chemical");
			const exp = new Date(req.params.date);
			exp.setHours(12, 0, 0, 0);
			const argsUpdate = {
				expiration_date: exp,
				status: "Active",
				renewals: parseInt(reqParts[2])
			};
			await updateAuthorization(req.prisma, argsUpdate, auth)
			res.json({Message: "Ok"});
		}
	);

	/* Will replace /auth_chem endpoint */
	app.post<{cas: string, en: string, auth: boolean, fr?: string}>("/add_chem",
		restAuthenticateBearer,
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
		async (req, res) => {
			const argsChem = {
				auth_chem_en: req.params.en,
				cas_auth_chem: req.params.cas,
				flag_auth_chem: req.params.auth
			}
			await createChemical(argsChem, req);
			res.json({Message: "Ok"});
	});

	app.get<{cas?: string[]}>("/get_chem",
		restAuthenticateBearer,
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
			const resultNew = await getChemicals(req.prisma);
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

	app.get<{cas: string[], sciper: Number}>("/auth_check",
		restAuthenticateBearer,
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
			const result = await getAuthorizations(req.prisma, "Chemical", {holder: req.params.sciper});
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

	app.get<{unit?: string, room?: string}>("/get_labs_and_units",
		restAuthenticateBearer,
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
			const resultNew = await getRooms(req.prisma, {unit: req.params.unit, room: req.params.room});
			for ( let i = 0; i<resultNew.rooms.length; i++) {
				for ( let j = 0; j<resultNew.rooms[i].unit_has_room.length; j++) {
					resultNew.rooms[i].unit_has_room[j].realID = resultNew.rooms[i].unit_has_room[j].id_unit;
					if ( resultNew.rooms[i].unit_has_room[j].unit.unitId == null) {
						const parentName = resultNew.rooms[i].unit_has_room[j].unit.name.substring(0, resultNew.rooms[i].unit_has_room[j].unit.name.indexOf(' ('));
						const parent = await getParentUnit(req.prisma, parentName);
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

	app.get<{unit?: string}>("/get_profs_and_cosecs",
		restAuthenticateBearer,
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
			const resultNew = await getUnitByName(req.prisma, req.params.unit);
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

const snowApiUser = {
	username: 'SNOW',
	canListRooms: true,
	canListUnits: true,
	canListChemicals: true,
	canEditChemicals: true,
	canEditAuthorizations: true
}

const catalyseApiUser = {
	username: 'CATALYSE',
	canListAuthorizations: true
}

function restAuthenticateByTokenQueryParam(req: Request, res, next) {
	const token = req.query.token;

	if (token === process.env.SNOW_TOKEN) {
		req.user = snowApiUser;
		next();
	} else if (token === process.env.CATALYSE_TOKEN) {
		req.user = catalyseApiUser;
		next();
	} else {
		res.status(403);
		res.send(`Unauthorized`);
		return;
	}
}

function restAuthenticateBearer(req: Request, res, next) {
	const token = getBearerToken(req);

	if (token === process.env.SNOW_TOKEN) {
		req.user = snowApiUser;
		next();
	} else if (token === process.env.CATALYSE_TOKEN) {
		req.user = catalyseApiUser;
		next();
	} else {
		res.status(403);
		res.send(`Unauthorized`);
		return;
	}
}
