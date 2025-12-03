import * as express from "express";
import {Request} from "express";
import {getPrismaForUser} from "../libs/auditablePrisma";
import {configFromDotEnv} from "../libs/config";
import {errorHandler} from "./lib/errorHandler";
import {authenticateFromBarerToken} from "../libs/authentication";
import {checkAPICall} from "./lib/checkedAPICalls";
import {fileNameRegexp, obfuscatedIdValidators} from "./lib/lhdValidators";
import {ID, IDObfuscator} from "../utils/IDObfuscator";
import {getBioOrgToString} from "../schema/bio/bioorg";
import {getReportFilesByUnit, sendFileResponse} from "../utils/File";
import {getUnitToString} from "../schema/roomdetails/units";

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

	type GetReportFile = {salt: string, eph_id: string, fileName: string};
	app.get("/reportFile/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListOrganisms,
				required: {
					...obfuscatedIdParams,
					fileName (req) { return req.query.fileName }
				},
				validate: {
					...obfuscatedIdValidators,
					fileName: fileNameRegexp
				}
			}),
		async (req: Request<GetReportFile>, res) => {
			const id: ID = {salt: req.params.salt, eph_id: req.params.eph_id};
			IDObfuscator.checkId(id);
			// TODO check if the current user is a cosec of that unit, do the same for the `getReportfiles`
			const unit = await IDObfuscator.getObjectByObfuscatedId(id, 'Unit', 'id',
				req.prisma, 'unit', getUnitToString);
			const reportFiles = await getReportFilesByUnit(unit);
			const file = reportFiles.find(file => file.name == req.params.fileName);
			sendFileResponse(file ? file.path : '', res);
		});

	app.use(errorHandler);

	return app;
}

async function restFilesAuthenticate(req: Request, res, next) {
	req.user = await authenticateFromBarerToken(req);

	next();
}
