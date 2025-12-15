import {checkAPICall} from "./lib/checkedAPICalls";
import {roomNameRegexp} from "./lib/lhdValidators";
import * as express from "express";
import {Request} from "express";
import {errorHandler} from "./lib/errorHandler";
import {auditAPI, setReqPrismaMiddleware} from "./lib/callBacks";
import {getToken} from "./lib/restAuthentication";
import {getRoomByNameForAxs} from "../model/rooms";
import {getHazardLevel} from "../utils/hazardsParser";
import {getGroupMembersFromApi} from "../utils/CallAPI";

export function makeRESTAxsAPI() {
	const app = express();

	app.use(restAxsAuthenticate);
	app.use(setReqPrismaMiddleware);
	app.use(auditAPI);

	/**
	 * Three classes of laboratories in LHD
	 * DSPS Relevant: laboratory with hazard of level high, have at least one hazard=true, might have all training and med_check false
	 * DSPS Irrelevant: laboratory with hazard of level low, have at least one hazard=true, all training and med_check are false
	 * No hazards: laboratory with no hazards, have all hazards/training/medcheck false
	 *
	 * With the current configuration no distinction is made between the laboratories DSPS irrelevant and
	 * the laboratories No hazards => the laboratories DSPS irrelevant are downgraded to No hazards
	 * meaning that they are set with hazard=false
	 *
	 * The distinction between DSPS Irrelevant and No hazards should be made if the signature of Cosec/Prof is
	 * required only for those labs with at least one hazard of low or high level is true and
	 * the labs No hazards would not require a signature
	 */
	type GetAXSParams = {room?: string};
	app.get("/",
		checkAPICall(
			{
				authorize: (req) => req.user.canListRooms,
				validate: {
					room: roomNameRegexp
				},
				required: {
					room (req) { return req.query.room; },
				}
			}),
		async (req: Request<GetAXSParams>, res) => {
			const args = {
				room: req.params.room,
			};
			const roomResult = await getRoomByNameForAxs(args, req.prisma);

			if (!roomResult) {
				res.json({ lhd_room: null, error: "This room is not in the LHD database" });
			} else {
				const bioLevel = getHazardLevel(roomResult.lab_has_hazards, 'Biological');
				const laserLevel = getHazardLevel(roomResult.lab_has_hazards, 'Laser');

				const bioScipers = [];
				if (bioLevel.bio.length > 0) {
					const members = await getGroupMembersFromApi(process.env.AXP_BIO_SIGNATURES_GROUP);
					bioScipers.push(...members.members.map(m => m.id));
				}

				res.json({ lhd_room: {
						room: roomResult.name,
						sciper_prof: [
							...new Set(roomResult.unit_has_room.flatMap(uhr => uhr.unit.subunpro.map(uhp => uhp.person.sciper)))
						],
						sciper_cosec: [
							...new Set(roomResult.unit_has_room.flatMap(uhr => uhr.unit.unit_has_cosec.map(uhc => uhc.cosec.sciper)))
						],
						hazard: {
							bio: bioLevel.bio.length > 0,
							nano: false,
							laser: laserLevel.laser.length > 0,
							irad: false,
							chem: false,
							cryo: false,
							elec: false,
							mag: false,
							noise: false,
							gas: false
						},
						training: {
							bio: bioLevel.bio.length > 0,
							nano: false,
							laser: laserLevel.laser.length > 0,
							irad: false,
							chem: false,
							cryo: false,
							elec: false,
							mag: false,
							noise: false,
							gas: false
						},
						med_check:{
							bio: bioLevel.bio.length > 0,
							nano: false,
							laser: false,
							irad: false,
							chem: false,
							cryo: false,
							elec: false,
							mag: false,
							noise: false,
							gas: false
						},
						dsps_signature: {
							bio: bioScipers.length > 0 ? bioScipers : false,
							nano: false,
							laser: false,
							irad: false,
							chem: false,
							cryo: false,
							elec: false,
							mag: false,
							noise: false,
							gas: false
						}
					}
				});
			}
		});

	app.use(errorHandler);

	return app;
}

function restAxsAuthenticate(req: Request, res, next) {
	const allowedIPs = process.env.ALLOWED_IPS.split(",").map(ip => ip.trim());
	const clientIP = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress;

	const token = getToken(req, 'app');

	if (!allowedIPs.includes(clientIP) || token !== process.env.AXS_TOKEN) {
		return res.status(403).send("Unauthorized");
	}

	req.user = {
		username: 'AXS',
		canListRooms: true
	}

	next();
}
