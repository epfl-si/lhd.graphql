import {inputObjectType} from "nexus";

export const OthersMutationType = inputObjectType({
	name: "OthersMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.string('name');
		t.int('id');
	}
});

export const HolderMutationType = inputObjectType({
	name: "HolderMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.int('sciper');
	}
});

export const StringMutationType = inputObjectType({
	name: "StringMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.string('name');
	}
});

export const FileMutationType = inputObjectType({
	name: "FileMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.string('path');
		t.string('base64');
	}
});
