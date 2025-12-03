import {decrypt, encrypt, generateSalt, getSHA256} from "./HashingTools";

export class Data {
	id: number;
	obj: { [key: string]: any };
}

export type ID = {
	salt: string,
	eph_id: string
}

export type submission = {
	id: ID,
	submission: { data: object },
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

	static checkId(id) {
		if (id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
			throw new Error(`Not allowed to update`);
		}
	}

	static checkSalt(s: ID) {
		const salt = s.salt;
		const firstPart = s.eph_id.substring(0,s.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		const decryptedSalt = decrypted.substring(0,decrypted.indexOf(':'));
		if (salt != decryptedSalt) {
			throw new Error(`Bad descrypted request`);
		}
	}

	static deobfuscateId(s: ID) {
		const firstPart = s.eph_id.substring(0,s.eph_id.indexOf('-'));
		const decrypted = decrypt(firstPart);
		return parseInt(decrypted.substring(decrypted.indexOf(':')+1));
	}

	static getDataSHA256(s: ID) {
		return s.eph_id.substring(s.eph_id.indexOf('-')+1);
	}

	static getId (argId: string) {
		if (!argId) {
			throw new Error(`Not allowed to update`);
		}
		return JSON.parse(argId);
	}

	static getIdDeobfuscated (id: ID) {
		IDObfuscator.checkId(id);
		IDObfuscator.checkSalt(id);
		return IDObfuscator.deobfuscateId(id);
	}

	static async ensureDBObjectIsTheSame (argId: string | undefined,
																				modelName: string,
																				idName: string,
																				tx,
																				objectName: string,
																				convertObjectToString: (obj: any) => any
	) {
		const id = this.getId(argId);
		IDObfuscator.checkId(id);
		return await this.getObjectByObfuscatedId(id, modelName, idName, tx, objectName, convertObjectToString);
	}

	static async getObjectByObfuscatedId(id,
																			 modelName: string,
																			 idName: string,
																			 tx,
																			 objectName: string,
																			 convertObjectToString: (obj: any) => any) {
		IDObfuscator.checkSalt(id);
		const idDeobfuscated = IDObfuscator.deobfuscateId(id);
		const obj = await tx[modelName].findUnique({where: {[idName]: idDeobfuscated}});
		if (! obj) {
			throw new Error(`${objectName} not found.`);
		}
		const object =  getSHA256(JSON.stringify(convertObjectToString(obj)), id.salt);
		if (IDObfuscator.getDataSHA256(id) !== object) {
			throw new Error(`${objectName} has been changed from another user. Please reload the page to make modifications`);
		}
		return obj;
	}
}
