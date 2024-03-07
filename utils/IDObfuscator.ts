import {encrypt, generateSalt, getSHA256} from "./HashingTools";

export class Data {
	id: number;
	obj: { [key: string]: any };
}

export class IDObfuscator {

	public static obfuscate(data: Data) {
		const salt = generateSalt();
		const eph_id = this.generateId(data.id, JSON.stringify(data.obj), salt);
		return { salt: salt, eph_id: eph_id };
	}

	static generateId(id: number, parentString: string, salt: string) {
		return encrypt(salt + ':' + id) + '-' + getSHA256(parentString);
	}
}
