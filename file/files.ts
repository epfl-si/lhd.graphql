import * as express from "express";
import {Request} from "express";
import {errorHandler} from "../api/lib/errorHandler";
import {authenticateFromBearerToken} from "../libs/authentication";
import {checkAPICall} from "../api/lib/checkedAPICalls";
import {fileNameRegexp, obfuscatedIdValidators} from "../api/lib/lhdValidators";
import {ID, IDObfuscator} from "../utils/IDObfuscator";
import {getBioOrgToString} from "../schema/bio/bioorg";
import {getReportFilesByUnit, sendFileResponse} from "../utils/File";
import {getUnitToString} from "../schema/roomdetails/units";
import {getLabHasHazardsAdditionalInfoToString} from "../schema/hazards/hazardsAdditionalInfo";
import {getLabHasHazardChildToString} from "../schema/hazards/labHazardChild";
import {setReqPrismaMiddleware} from "../api/lib/rest";
import {getDispensationToString} from "../schema/dispensation/dispensation";

const obfuscatedIdParams = {
	eph_id (req) { return req.params.eph_id },
	salt (req) { return req.query.salt }
};

export function makeRESTFilesAPI() {
	const app = express();

	app.use(restFilesAuthenticate);
	app.use(setReqPrismaMiddleware);

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

	app.get("/hazardAdditionalInfo/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListHazards,
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
			const info = await IDObfuscator.getObjectByObfuscatedId(id,
				'lab_has_hazards_additional_info', 'id_lab_has_hazards_additional_info',
				req.prisma, 'hazard info', getLabHasHazardsAdditionalInfoToString);
			sendFileResponse(info.filePath, res);
		});

	app.get("/labHasHazardsChild/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListHazards,
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
			const child = await IDObfuscator.getObjectByObfuscatedId(id,
				'lab_has_hazards_child', 'id_lab_has_hazards_child',
				req.prisma, 'hazard child', getLabHasHazardChildToString);
			const submission = JSON.parse(child.submission);
			sendFileResponse(submission.data.fileLink, res);
		});

	type GetReportFile = {salt: string, eph_id: string, fileName: string};
	app.get("/reportFile/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListReportFiles,
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

	type GetFileById = {id: number};
	app.get("/organismByFormIO/:id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListOrganisms,
				required: {
					id (req) { return req.params.id }
				},
				validate: {
					id: Number
				}
			}),
		async (req: Request<GetFileById>, res) => {
		let filePath = '';
			const orgByFIO = await req.prisma.bio_org.findUnique({where: {id_bio_org: Number(req.params.id)}});
			if (orgByFIO) {
				filePath = orgByFIO.filePath;
			}
			sendFileResponse(filePath, res);
		});

	app.get("/dispensation/:eph_id",
		checkAPICall(
			{
				authorize: (req) => req.user.canListHazards,
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
			const info = await IDObfuscator.getObjectByObfuscatedId(id,
				'Dispensation', 'id_dispensation',
				req.prisma, 'Dispensation', getDispensationToString);
			sendFileResponse(info.file_path, res);
		});

	app.use(errorHandler);

	return app;
}

async function restFilesAuthenticate(req: Request, res, next) {
	req.user = await authenticateFromBearerToken(req);

	next();
}
