import * as dotenv from "dotenv";

const CryptoJS = require("crypto-js");
dotenv.config();
const LHD_ENCRYPTION_KEY = process.env.LHD_ENCRYPTION_KEY;

export function generateSalt(): string {
	return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

export function getSHA256(message: string, salt: string): string {
	return CryptoJS.HmacSHA256(message + salt, LHD_ENCRYPTION_KEY).toString(CryptoJS.enc.Hex);
}

export function encrypt(message: string): string {
	return CryptoJS.AES.encrypt(message, LHD_ENCRYPTION_KEY).toString();
}

export function decrypt(message: string): string {
	return CryptoJS.AES.decrypt(message, LHD_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
}
