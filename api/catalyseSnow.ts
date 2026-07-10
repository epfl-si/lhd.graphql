import {todayDate} from "../utils/date";
import {getBearerToken} from "../utils/authentication";
import {checkAPICall} from "./lib/checkedAPICalls";
import {
	reqRegexp,
	reqRenewRegexp,
	roomNameRegexp,
	unitNameRegexp,
	validateCASList,
	validateCommaSeparatedNumbers
} from "./lib/lhdValidators";
import * as express from "express";
import {Request} from "express";
import {errorHandler} from "./lib/errorHandler";
import {createAuthorization, getAuthorizations, getTheAuthorization, updateAuthorization} from "../model/authorization";
import {getChemicals} from "../model/chemicals";
import {getRooms} from "../model/rooms";
import {getUnitByName} from "../model/units";
import {auditAPI, setReqPrismaMiddleware} from "./lib/rest";

export function makeRESTAPI() {
	const app = express();

	app.use(restAuthenticateBearer);
	app.use(setReqPrismaMiddleware);
	app.use(auditAPI);

	type AuthReqParams = {id_unit: number, req: string, date: Date, scipers: number[], cas: string[], room_ids: number[]};
	app.post<AuthReqParams>("/auth_req",
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
			const exp = new Date(req.params.date);
			exp.setHours(12, 0, 0, 0);
			const args = {
				id_unit: req.params.id_unit,
				authorization: req.params.req,
				creation_date: todayDate(),
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

	app.get<{cas?: string[]}>("/get_chem",
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
					flag_auth_chem: chem.flag_auth_chem,
					auth_code: chem.auth_code,
					fastway: chem.fastway
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
			const result = await getAuthorizations(req.prisma, "Chemical", {holder: `${req.params.sciper}`});
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

			const all = resultNew.rooms.map(r => {
				return {
					id_lab: r.id,
					units: req.params.unit ? r.unit_has_room.filter(uhr =>  uhr.unit.name === req.params.unit).map(uhr => uhr.id_unit) : r.unit_has_room.map(uhr => uhr.id_unit),
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
			const list = resultNew.map(unit => {
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
				return {
					sciper_cosec: cosecs,
					sciper: profs,
					unit: `${unit.institute.school.name} ${unit.institute.name} ${unit.name}`,
					id_unit: unit.id,
					rooms: rooms
				};
			});
			const result = list.filter(val => val.rooms.length > 0).map(value => {
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
