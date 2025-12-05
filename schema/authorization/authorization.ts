import {extendType, inputObjectType, intArg, list, objectType, stringArg} from "nexus";
import {ID, IDObfuscator} from "../../utils/IDObfuscator";
import {authorization} from "nexus-prisma";
import {mutationStatusType} from "../statuses";
import {RoomStruct} from "../global/rooms";
import {PersonStruct} from "../global/people";
import {ChemicalStruct} from "./chemicals";
import {getUnitToString, UnitStruct} from "../roomdetails/units";
import {RadiationStruct} from "./radiation";
import {createAuthorization, getAuthorizationsWithPagination, updateAuthorization} from "../../model/authorization";

export const AuthorizationStruct = objectType({
	name: authorization.$name,
	description: `Authorization entity.`,
	definition(t) {
		t.field(authorization.authorization);
		t.field(authorization.expiration_date);
		t.field(authorization.status);
		t.field(authorization.renewals);
		t.field(authorization.type);
		t.field(authorization.creation_date);
		t.field(authorization.authority);


		t.nonNull.list.nonNull.field('authorization_rooms', {
			type: RoomStruct,
			resolve: async (parent, _, context) => {
				const authorizationsAndRooms = await context.prisma.authorization_has_room.findMany({
					where: { id_authorization: parent.id_authorization }
				});
				const roomIDs = new Set(authorizationsAndRooms.map((authorizationAndRoom) => authorizationAndRoom.id_lab));
				return await context.prisma.Room.findMany({
					where: { id: { in: [...roomIDs] }}
				})
			},
		});

		t.nonNull.list.nonNull.field('authorization_holders', {
			type: PersonStruct,
			resolve: async (parent, _, context) => {
				const authorizationsAndPeople = await context.prisma.authorization_has_holder.findMany({
					where: { id_authorization: parent.id_authorization }
				});
				const peopleIDs = new Set(authorizationsAndPeople.map((authorizationAndPerson) => authorizationAndPerson.id_person));
				return await context.prisma.Person.findMany({
					where: { id_person: { in: [...peopleIDs] }}
				})
			},
		});

		t.nonNull.list.nonNull.field('authorization_chemicals', {
			type: ChemicalStruct,
			resolve: async (parent, _, context) => {
				const authorizationsAndChemical = await context.prisma.authorization_has_chemical.findMany({
					where: { id_authorization: parent.id_authorization }
				});
				const chemicalIDs = new Set(authorizationsAndChemical.map((authorizationAndChemical) => authorizationAndChemical.id_chemical));
				return await context.prisma.auth_chem.findMany({
					where: { id_auth_chem: { in: [...chemicalIDs] }}
				})
			},
		});

		t.nonNull.list.nonNull.field('authorization_radiations', {
			type: RadiationStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.authorization_has_radiation.findMany({
					where: { id_authorization: parent.id_authorization }
				});
			},
		});

		t.field('unit', {
			type: UnitStruct,
			resolve: async (parent, _, context) => {
				return await context.prisma.unit.findUnique({
					where: { id: parent.id_unit ?? 0 }
				});
			},
		});

		t.string('id', {
			resolve: async (parent, _, context) => {
				const encryptedID = IDObfuscator.obfuscate({id: parent.id_authorization, obj: getAuthorizationToString(parent)});
				return JSON.stringify(encryptedID);
			},
		});
	},
});

export function getAuthorizationToString(parent) {
	return {
		id: parent.id_authorization,
		authorization: parent.authorization,
		id_unit: parent.id_unit,
		expiration_date: parent.expiration_date,
		status: parent.status,
		creation_date: parent.creation_date,
		renewals: parent. renewals,
		type: parent.type
	};
}

export const AuthorizationQuery = extendType({
	type: 'Query',
	definition(t) {
		t.crud.authorizations({ filtering: true });
	},
});

export const AuthorizationsWithPaginationStruct = objectType({
	name: 'AuthorizationsWithPagination',
	definition(t) {
		t.list.field('authorizations', { type: 'authorization' });
		t.int('totalCount');
	},
});

export const AuthorizationsWithPaginationQuery = extendType({
	type: 'Query',
	definition(t) {
		t.field("authorizationsWithPagination", {
			type: "AuthorizationsWithPagination",
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				search: stringArg(),
				type: stringArg()
			},
			authorize: (parent, args, context) => context.user?.canListAuthorizations,
			async resolve(parent, args, context) {
				return await getAuthorizationsWithPagination(args, context.prisma);
			}
		});
	},
});

export const AuthorizationsByRoom = extendType({
	type: 'Query',
	definition(t) {
		t.field("authorizationsByRoom", {
			type: list('authorization'),
			args: {
				skip: intArg({ default: 0 }),
				take: intArg({ default: 20 }),
				roomId: stringArg(),
				type: stringArg()
			},
			authorize: (parent, args, context) => context.user?.canListAuthorizations,
			async resolve(parent, args, context) {
				if (args.roomId) {
					const id: ID = JSON.parse(args.roomId);
					IDObfuscator.checkId(id);
					IDObfuscator.checkSalt(id)
					const idDeobfuscated = IDObfuscator.deobfuscateId(id);
					return await context.prisma.authorization.findMany({
							where: {
								AND: [
									{type: args.type},
									{
										authorization_has_room: {
											some: {
												room: {
													is: {
														id: idDeobfuscated
													}
												}
											}
										}
									}
								]
							},
							orderBy: [
								{
									authorization: 'asc',
								},
							]
						});
				}
				return [];
			}
		});
	},
});

const OthersMutationType = inputObjectType({
	name: "OthersMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.string('name');
		t.int('id');
	}
});

const HolderMutationType = inputObjectType({
	name: "HolderMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.int('sciper');
	}
});

const newAuthorizationType = {
	id: stringArg(),
	authorization: stringArg(),
	id_unit: stringArg(),
	creation_date: stringArg(),
	expiration_date: stringArg(),
	status: stringArg(),
	rooms: list(OthersMutationType),
	holders: list(HolderMutationType),
	radiations: list(OthersMutationType),
	cas: list(OthersMutationType),
	type: stringArg(),
	authority: stringArg(),
	renewals: intArg()
};

export const AuthorizationStatus = mutationStatusType({
	name: "AuthorizationStatus",
	definition(t) {
		t.string('name', { description: `A string representation of the authorization mutation.`});
	}
});

export const AuthorizationMutations = extendType({
	type: 'Mutation',
	definition(t) {
		t.nonNull.field('addAuthorization', {
			description: `Add a new authorization`,
			args: newAuthorizationType,
			type: "AuthorizationStatus",
			authorize: (parent, args, context) => context.user?.canEditAuthorizations,
			async resolve(root, args, context) {

				const id = IDObfuscator.getId(args.id_unit);
				const idDeobfuscatedForUnit = IDObfuscator.getIdDeobfuscated(id);
				const unit = await context.prisma.Unit.findUnique({where: {id: idDeobfuscatedForUnit}})
				if (!unit) throw new Error(`Authorization not created`);

				await createAuthorization(args, unit.id, context.prisma);
				return mutationStatusType.success();
			}
		});
		t.nonNull.field('updateAuthorization', {
			description: `Update authorization details.`,
			args: newAuthorizationType,
			type: "AuthorizationStatus",
			authorize: (parent, args, context) => context.user?.canEditAuthorizations,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const auth = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'authorization', 'id_authorization',
						tx, 'Authorization', getAuthorizationToString);

					const unit = await IDObfuscator.ensureDBObjectIsTheSame(args.id_unit,
						'Unit', 'id',
						tx, 'Authorization', getUnitToString);
					await updateAuthorization({ ...args, id_unit: unit.id}, auth, context.prisma, tx);
					return mutationStatusType.success();
				});
			}
		});
		t.nonNull.field('deleteAuthorization', {
			description: `Delete authorization details.`,
			args: newAuthorizationType,
			type: "AuthorizationStatus",
			authorize: (parent, args, context) => context.user?.canEditAuthorizations,
			async resolve(root, args, context) {
				return await context.prisma.$transaction(async (tx) => {
					const auth = await IDObfuscator.ensureDBObjectIsTheSame(args.id,
						'authorization', 'id_authorization',
						tx, 'Authorization', getAuthorizationToString);

					await tx.authorization_has_room.deleteMany({ where: { id_authorization: auth.id_authorization }});
					await tx.authorization_has_chemical.deleteMany({ where: { id_authorization: auth.id_authorization }});
					await tx.authorization_has_holder.deleteMany({ where: { id_authorization: auth.id_authorization }});
					await tx.authorization_has_radiation.deleteMany({ where: { id_authorization: auth.id_authorization }});
					await tx.authorization.delete({ where: { id_authorization: auth.id_authorization }});

					return mutationStatusType.success();
				});
			}
		});
	}
});

