import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();
const DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;

export function saveBase64File(base64Data: string, filePath: string, fileName: string): string {
	const regex = /^[\p{L}\p{N} _\-\(\)\.]+\.[A-Za-z0-9]+$/u;
	const validFileName = new RegExp(regex);
	if (!validFileName.test(fileName)) {
		throw new Error("File name not permitted");
	}
	// Remove the data URL part if present
	const base64Content = base64Data.split(';base64,').pop() || base64Data;
	// Decode base64 string to buffer
	const fileBuffer = Buffer.from(base64Content, 'base64');
	fs.mkdirSync(DOCUMENTS_PATH + "/" + filePath, {recursive: true});
	// Write the buffer to a file
	fs.writeFileSync(DOCUMENTS_PATH + "/" + filePath + fileName, fileBuffer);
	return filePath + fileName;
}
