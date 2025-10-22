export type UserInfo = {
	sub?: string;
	given_name?: string;
	family_name?: string;
	groups: string[];
	preferred_username: string;
	canEditHazards?: boolean;
	canEditRooms?: boolean;
	canListUnits?: boolean;
	canListHazards?: boolean;
	canListRooms?: boolean;
	isAdmin?: boolean;
	canEditUnits ?: boolean;
	canListOrganisms?: boolean;
	canEditOrganisms?: boolean;
	canListChemicals?: boolean;
	canEditChemicals?: boolean;
	canListAuthorizations?: boolean;
	canEditAuthorizations?: boolean;
	canListPersons?: boolean;
	canCallAPIToGetChemicals?: boolean;
	canCallAPIToPostChemicals?: boolean;
	canCallAPIToPostAuthorization?: boolean;
	canCallAPIToRenewAuthorization?: boolean;
	canCallAPIToCheckAuthorization?: boolean;
};

export type loginResponse = {
	loggedIn: boolean;
	user: object;
	httpCode: number;
	message: string;
};
