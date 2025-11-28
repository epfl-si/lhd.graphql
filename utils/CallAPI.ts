import * as dotenv from "dotenv";

dotenv.config();

export async function getUsersFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/persons?query=${search}&isaccredited=1`, "GET");
}

export async function getUnitsFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/units?query=${search}`, "GET");
}

export async function getRoomsFromApi(search: string): Promise<any[]> {
	return callAPI(`https://${process.env.API_EPFL_CH_URL}/v1/rooms?query=${search}`, "GET");
}

export async function getDoorPlugFromApi(roomName: string): Promise<any[]> {
	return callAPI(`https://${process.env.CRISTAL_URL}/archibus/api/v1/data?dataSource=Rest_EPFL_fiches_de_porte`, "GET");
}

async function callAPI(url: string, method: "GET" | "POST") {
	const headers: Headers = new Headers()
	headers.set('Content-Type', 'application/json')
	headers.set('Accept', 'application/json')
	headers.set('Authorization', 'Basic ' + Buffer.from("lhd:" + process.env.LHD_API_PASSWORD).toString('base64'));

	const requestInit: RequestInit = {
		method: method,
		headers: headers
	};
	if (method === 'POST') {
		requestInit.body = JSON.stringify({ids: "13030,13630", endopoint: "/v1/units"});
	}
	const request: RequestInfo = new Request(url, requestInit)

	const result = await fetch(request);
	return result.json();
}

export async function getUserInfoFromAPI(username: string) {
	let userFullName = username;
	let userEmail = '';
	let sciper = '';
	const ldapUsers = await getUsersFromApi(username);
	const ldapUser = ldapUsers && ldapUsers["persons"] ? ldapUsers["persons"].filter(u => u.account && u.account.username == username) : [];
	if (ldapUser.length == 1) {
		userFullName = ldapUser[0].display;
		userEmail = ldapUser[0].email;
		sciper = ldapUser[0].id;
	}
	return {userFullName, userEmail, sciper};
}
