export type UserInfo = {
	sub: string;
	given_name: string;
	family_name: string;
	groups: string[];
};

export type loginResponse = {
	loggedIn: boolean;
	httpCode: number;
	message: string;
};
