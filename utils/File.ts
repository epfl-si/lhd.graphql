import * as fs from "fs";

export function saveBase64File(base64Data: string, filePath: string, fileName: string): string {
	try {
		// Remove the data URL part if present
		const base64Content = base64Data.split(';base64,').pop() || base64Data;
		// Decode base64 string to buffer
		const fileBuffer = Buffer.from(base64Content, 'base64');
		fs.mkdirSync(filePath, {recursive: true});
		// Write the buffer to a file
		fs.writeFileSync(filePath + fileName, fileBuffer);
		return filePath + fileName;
	} catch ( e ) {
		return '';
	}
}
