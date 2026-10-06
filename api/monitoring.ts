import * as express from "express";
import {Request} from "express";

export function makeRESTHealthAPI() {
	const app = express();

	// TODO Remove this code: it has been replaced by the new backend
	app.get("/",
		async (req: Request, res) => {
			res.json({Message: "Server up"});
		});

	return app;
}
