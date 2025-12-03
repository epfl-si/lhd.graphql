import * as express from "express";
import {Request} from "express";
import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {errorHandler} from "./lib/errorHandler";
import {authenticateFromBarerToken} from "../libs/authentication";
import {checkAPICall} from "./lib/checkedAPICalls";
import {obfuscatedIdValidators} from "./lib/lhdValidators";
import {ID, IDObfuscator} from "../utils/IDObfuscator";
import {getBioOrgToString} from "../schema/bio/bioorg";
import {sendFileResponse} from "../utils/File";

const obfuscatedIdParams = {
	eph_id (req) { return req.params.eph_id },
	salt (req) { return req.query.salt }
};

export function makeRESTFilesAPI() {
	const app = express();

	app.use(restFilesAuthenticate);
	app.use(function setReqPrismaMiddleware (req: Request, _res, next) {
		req.prisma = getPrismaForUser(configFromDotEnv(), req.user);

		next();
	});

	type GetFile = {salt: string, eph_id: string};
	app.get("/organism/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListOrganisms,
				required: {
					...obfuscatedIdParams,
				},
				validate: {
					...obfuscatedIdValidators,
				}
			}),
		async (req: Request<GetFile>, res) => {
			const id: ID = {salt: req.params.salt, eph_id: req.params.eph_id};
			IDObfuscator.checkId(id);
			const org = await IDObfuscator.getObjectByObfuscatedId(id, 'bio_org', 'id_bio_org',
				req.prisma, 'organism', getBioOrgToString);
			sendFileResponse(org.filePath, res);
		});

	app.use(errorHandler);

	return app;
}

async function restFilesAuthenticate(req: Request, res, next) {
	req.user = await authenticateFromBarerToken(req);

	next();
}
