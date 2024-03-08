import {decrypt, encrypt, generateSalt, getSHA256} from "./HashingTools";

export class Data {
	id: number;
	obj: { [key: string]: any };
}

export type id = {
	salt: string, 
	eph_id: string
}

export type data = {
	data: object
}

export type submission = {
	id: id, 
	submission: data
}

export class IDObfuscator {

	static obfuscate(data: Data) {
		const salt = generateSalt();
		const eph_id = this.generateId(data.id, JSON.stringify(data.obj), salt);
		return { salt: salt, eph_id: eph_id };
	}

	static generateId(id: number, parentString: string, salt: string) {
		return encrypt(salt + ':' + id) + '-' + getSHA256(parentString, salt);
	}

	static checkSalt(s: submission) {
		const salt = s.id.salt;
		const firstPart = s.id.eph_id.substring(0,s.id.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		const decryptedSalt = decrypted.substring(0,decrypted.indexOf(':'));
		if(salt != decryptedSalt) {
			return false;
		}
		return true;
	}
	
	static deobfuscateId(s: submission) {
		const firstPart = s.id.eph_id.substring(0,s.id.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		return parseInt(decrypted.substring(decrypted.indexOf(':')+1));
	}

	static getDataSHA256(s: submission) {
		return s.id.eph_id.substring(s.id.eph_id.indexOf('-')+1);
	}
}
