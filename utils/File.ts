import * as fs from "fs";
import * as dotenv from "dotenv";
import {stat} from 'fs/promises';
import {IDObfuscator} from "./IDObfuscator";
import {getLabHasHazardChildToString} from "../schema/hazards/labHazardChild";
import {getLabHasHazardsAdditionalInfoToString} from "../schema/hazards/hazardsAdditionalInfo";
import {getUnitToString} from "../schema/roomdetails/units";
import * as path from "node:path";
import {fileNameRegexp} from "../api/lib/lhdValidators";

dotenv.config();
const DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;

export function checkFileAttributeByRegexp(fileAttribute, regexp) {
	if (!regexp.test(fileAttribute)) {
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

export function sendFileResponse (filePath, res) {
	const fileName = path.basename(filePath);
	const fullFilePath = path.join(process.env.DOCUMENTS_PATH, filePath);
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.sendFile(fullFilePath, (err) => {
		if ( err ) {
			console.error('Error sending file:', err);
			res.status(500).send(err.message);
		} else {
			console.log('Getting file success', fullFilePath);
		}
	});
}
