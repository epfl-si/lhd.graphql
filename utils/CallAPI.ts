import * as dotenv from "dotenv";

dotenv.config();
const headers: Headers = new Headers()
headers.set('Content-Type', 'application/json')
headers.set('Accept', 'application/json')

export async function getUsersSearchApi(search: string): Promise<any[]> {
	return callAPI(`https://search-api.epfl.ch/api/ldap?q=${search}`);
}

export async function getNewUnitFromApi(search: string): Promise<any[]> {
	headers.set('Authorization', 'Basic ' + Buffer.from("lhd:" + process.env.LHD_IMAP_PASSWORD).toString('base64'));
	return callAPI(`https://api.epfl.ch/v1/units?query=${search}`);
}

export async function getNewRoomFromApi(search: string): Promise<any[]> {
	headers.set('Authorization', 'Basic ' + Buffer.from("lhd:" + process.env.LHD_IMAP_PASSWORD).toString('base64'));
	return callAPI(`https://api.epfl.ch/v1/rooms?query=${search}`);
}

async function callAPI(url: string) {
	const request: RequestInfo = new Request(url, {
		method: 'GET',
		headers: headers
	})

	const result = await fetch(request);
	return result.json();
}
