import * as fs from "fs";
import * as dotenv from "dotenv";
import {stat} from 'fs/promises';
import {IDObfuscator} from "./IDObfuscator";
import {getBioOrgToString} from "../schema/bio/bioorg";
import {getLabHasHazardChildToString} from "../schema/hazards/labHazardChild";
import {getLabHasHazardsAdditionalInfoToString} from "../schema/hazards/hazardsAdditionalInfo";
import {getUnitToString} from "../schema/roomdetails/units";
import * as path from "node:path";

dotenv.config();
const DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
export const fileNameRegexp = /^[\p{L}\p{N} _\-\(\)\.]+\.[A-Za-z0-9]+$/u;

export function checkFileAttributeByRegexp(fileAttribute, regexp) {
	const validAttribute = new RegExp(regexp);
	if (!validAttribute.test(fileAttribute)) {
		const err = new Error("Filename not permitted");
		(err as any).code = "FNP";
		throw err;
	}
}

export function saveBase64File(base64Data: string, filePath: string, fileName: string): string {
	checkFileAttributeByRegexp(fileName, fileNameRegexp); //TODO retester erreur qui ne s'affiche pas
	// Remove the data URL part if present
	const base64Content = base64Data.split(';base64,').pop() || base64Data;
	// Decode base64 string to buffer
	const fileBuffer = Buffer.from(base64Content, 'base64');
	fs.mkdirSync(DOCUMENTS_PATH + "/" + filePath, {recursive: true});
	// Write the buffer to a file
	fs.writeFileSync(DOCUMENTS_PATH + "/" + filePath + fileName, fileBuffer);
	return filePath + fileName;
}

export async function isDirectory(path: string) {
	try {
		return (await stat(path)).isDirectory();
	} catch (e) {
		if (e.code === 'ENOENT') { // No such file or directory
			return false;
		} else {
			throw e;
		}
	}
}

export async function getFilePathFromResource (prisma: any, body: any) {
	const id = body.id as string;
	const model = body.model as string;
	switch (model) {
		case 'organism':
			const org = await IDObfuscator.ensureDBObjectIsTheSame(id,
				'bio_org', 'id_bio_org',
				prisma, 'organism', getBioOrgToString);
			return org.filePath;
		case 'organismByFormIO':
			const orgByFIO = await prisma.bio_org.findUnique({where: {id_bio_org: Number(id)}});
			if (orgByFIO) {
				return orgByFIO.filePath;
			}
			break;
		case 'labHasHazardsChild':
			const child = await IDObfuscator.ensureDBObjectIsTheSame(id,
				'lab_has_hazards_child', 'id_lab_has_hazards_child',
				prisma, 'hazard child', getLabHasHazardChildToString);
			const submission = JSON.parse(child.submission);
			return submission.data.fileLink;
		case 'hazardAdditionalInfo':
			const info = await IDObfuscator.ensureDBObjectIsTheSame(id,
				'lab_has_hazards_additional_info', 'id_lab_has_hazards_additional_info',
				prisma, 'hazard child', getLabHasHazardsAdditionalInfoToString);
			return info.filePath;
		case 'reportFile':
			const fileNameFromArgs = body.fileName as string;
			checkFileAttributeByRegexp(fileNameFromArgs, fileNameRegexp); // TODO check if the current user is a cosec of that unit, do the same for the `getReportfiles`
			const unit = await IDObfuscator.ensureDBObjectIsTheSame(id,
				'Unit', 'id',
				prisma, 'unit', getUnitToString);
			const reportFiles = await getReportFilesByUnit(unit);
			const file = reportFiles.find(file => file.name == fileNameFromArgs);
			return file ? file.path : '';
	}
	return '';
}

export async function getReportFilesByUnit (unit: any) {
	const encryptedID = IDObfuscator.obfuscate({id: unit.id, obj: getUnitToString(unit)});
	const reportFolder = "report_audits/pdf/" + unit.id + "/";
	const folderPath = process.env.DOCUMENTS_PATH + "/" + reportFolder;
	if (await isDirectory(folderPath)) {
		const files = fs.readdirSync(folderPath);
		const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
		return pdfFiles.map(file =>
		{
			return {
				id: JSON.stringify(encryptedID),
				name: path.basename(file),
				path: reportFolder + file,
				unitName: unit.name
			};
		});
	} else {
		return [];
	}
}
