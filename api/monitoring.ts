import * as express from "express";
import {Request} from "express";

export function makeRESTMonitoringAPI() {
	const app = express();

	type GetAXSParams = {room?: string};
	app.get("/",
		async (req: Request<GetAXSParams>, res) => {
			res.json({Message: "Server up"});
		});

	return app;
}
