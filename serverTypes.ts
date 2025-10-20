export type UserInfo = {
	sub: string;
	given_name: string;
	family_name: string;
	groups: string[];
};

export type loginResponse = {
	loggedIn: boolean;
	user: object;
	httpCode: number;
	message: string;
};
