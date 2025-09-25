import {authenticate} from "../../../api/libs/authentication";

export function checkToken (token: string, user) {
	const hasValidToken = token && authenticate(token);

	const hasUserAccess =
		user &&
		(user.groups.includes("LHD_acces_lecture") ||
			user.groups.includes("LHD_acces_admin"));

	if (!hasValidToken && !hasUserAccess){
		throw new Error(`Unauthorized`);
	}
	return hasUserAccess;
}
