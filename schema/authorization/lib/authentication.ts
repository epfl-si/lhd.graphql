export function checkToken (token: string, user) {
	const hasValidToken = token && (token === process.env.SNOW_TOKEN || token === process.env.CATALYSE_TOKEN);

	const hasUserAccess =
		user &&
		(user.groups.includes("LHD_acces_lecture") ||
			user.groups.includes("LHD_acces_admin"));

	if (!hasValidToken && !hasUserAccess){
		throw new Error(`Unauthorized`);
	}
	return hasUserAccess;
}
