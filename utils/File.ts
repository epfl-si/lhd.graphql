import * as fs from "fs";
import * as dotenv from "dotenv";
import {stat} from 'fs/promises';

dotenv.config();
const DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
export const fileNameRegexp = /^[\p{L}\p{N} _\-\(\)\.]+\.[A-Za-z0-9]+$/u;
export const pathRegexp = /^[\p{L}\p{N} _\-\(\)\./]+\.[A-Za-z0-9]+$/u;

export function checkFileAttributeByRegexp(fileAttribute, regexp) {
	const validAttribute = new RegExp(regexp);
	if (!validAttribute.test(fileAttribute)) {
		throw new Error("File not permitted");
	}
}

export function saveBase64File(base64Data: string, filePath: string, fileName: string): string {
	checkFileAttributeByRegexp(fileName, fileNameRegexp);
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
