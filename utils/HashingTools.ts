const CryptoJS = require("crypto-js");

export function generateSalt(): string {
	return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

export function getSHA256(message: string, salt: string): string {
	return CryptoJS.HmacSHA256(message + salt, 'PASSWORD_LHD').toString(CryptoJS.enc.Hex);
}

export function encrypt(message: string): string {
	return CryptoJS.AES.encrypt(message, 'PASSWORD_LHD').toString();
}

export function decrypt(message: string): string {
	return CryptoJS.AES.decrypt(message, 'PASSWORD_LHD').toString(CryptoJS.enc.Utf8);
}
