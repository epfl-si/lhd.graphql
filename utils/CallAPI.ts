import * as dotenv from "dotenv";

dotenv.config();

export async function getUsersFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/persons?query=${search}`);
}

export async function getUnitsFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/units?query=${search}`);
}

export async function getRoomsFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/rooms?query=${search}`);
}

async function callAPI(url: string) {
	const headers: Headers = new Headers()
	headers.set('Content-Type', 'application/json')
	headers.set('Accept', 'application/json')
	headers.set('Authorization', 'Basic ' + Buffer.from("lhd:" + process.env.LHD_IMAP_PASSWORD).toString('base64'));
	const request: RequestInfo = new Request(url, {
		method: 'GET',
		headers: headers
	})

	const result = await fetch(request);
	return result.json();
}
