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
	submission: data,
	formName?: string,
	children?: submission[]
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

	static checkSalt(s: id) {
		const salt = s.salt;
		const firstPart = s.eph_id.substring(0,s.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		const decryptedSalt = decrypted.substring(0,decrypted.indexOf(':'));
		if(salt != decryptedSalt) {
			return false;
		}
		return true;
	}
	
	static deobfuscateId(s: id) {
		const firstPart = s.eph_id.substring(0,s.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		return parseInt(decrypted.substring(decrypted.indexOf(':')+1));
	}

	static getDataSHA256(s: id) {
		return s.eph_id.substring(s.eph_id.indexOf('-')+1);
	}
}
