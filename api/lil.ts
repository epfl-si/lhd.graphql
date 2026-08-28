import * as express from "express";
import {Request} from "express";

export function redirectToLIL() {
	const app = express();

	app.get("/",
		async (req: Request, res) => {
			res.redirect(302, process.env.LIL_URL)
		});

	return app;
}
