import {checkAPICall} from "./lib/checkedAPICalls";
import {roomNameRegexp} from "./lib/lhdValidators";
import * as express from "express";
import {Request} from "express";
import {errorHandler} from "./lib/errorHandler";
import {auditAPI, setReqPrismaMiddleware} from "./lib/callBacks";

export function makeRESTAxsAPI() {
	const app = express();

	app.use(restAxsAuthenticate);
	app.use(setReqPrismaMiddleware);
	app.use(auditAPI);

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
				search: req.params.room,
			};
			//const resultNew = await get(args, req.prisma);

			res.json({Message: "Ok", Data: {}});
		});

	app.use(errorHandler);

	return app;
}

function restAxsAuthenticate(req: Request, res, next) {
	//CHECK IP and token
/*	if (req.query.axs !== ) {
		res.status(403);
		res.send(`Unauthorized`);
		return;
	}*/

	req.user = {
		username: 'AXS',
		canListRooms: true
	}

	next();
}
