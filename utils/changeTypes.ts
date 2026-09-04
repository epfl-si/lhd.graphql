type Status = 'New' | 'Deleted';

type HolderChange = {
	status: Status;
	sciper: string;
};

type RoomChange = {
	status: Status;
	name?: string;
	id?: string;
};

type RadiationChange = {
	status: Status;
	name: string;
};

type CasChange = {
	status: Status;
	name: string;
};

type FileChange = {
	status: string;
	path: string;
	base64: string;
}

export type AuthorizationChanges = {
	holders: HolderChange[];
	rooms: RoomChange[];
	radiations: RadiationChange[];
	cas: CasChange[];
	files: FileChange[];
}
