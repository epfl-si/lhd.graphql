import {arg, extendType, intArg, list, objectType, stringArg} from "nexus";
import {id, IDObfuscator} from "../../utils/IDObfuscator";
import {authorization} from "nexus-prisma";
import {mutationStatusType} from "../statuses";
import {createNewMutationLog} from "../global/mutationLogs";
import {getSHA256} from "../../utils/HashingTools";
import {RoomStruct} from "../global/rooms";
import {PersonStruct} from "../global/people";
import {ChemicalStruct} from "./chemicals";
import {UnitStruct} from "../roomdetails/units";
import {getUsersFromApi} from "../../utils/CallAPI";

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
			type: "String",
			resolve: async (parent, _, context) => {
				const authorizationsAndRadiation = await context.prisma.authorization_has_radiation.findMany({
					where: { id_authorization: parent.id_authorization }
				});
				return authorizationsAndRadiation.map((authorizationAndRadiation) => authorizationAndRadiation.source);
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

function getAuthorizationToString(parent) {
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
			async resolve(parent, args, context) {
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
					throw new Error(`Permission denied`);
				}
				const queryArray = args.search.split("&");
				const dictionary = queryArray.map(query => query.split("="));
				const whereCondition = [];
				whereCondition.push({ type: args.type})
				if (dictionary.length > 0) {
					dictionary.forEach(query => {
						const value = decodeURIComponent(query[1]);
						if (query[0] == 'Unit') {
							whereCondition.push({ unit: { is: {name: {contains: value}} }})
						} else if (query[0] == 'Authorization') {
							whereCondition.push({ authorization: { contains: value }})
						} else if (query[0] == 'Status') {
							whereCondition.push({ status: { contains: value }})
						} else if (query[0] == 'Room') {
							whereCondition.push({ authorization_has_room: { some: {room: {is: {name: {contains: value}}}} }})
						} else if (query[0] == 'Holder') {
							whereCondition.push({
								authorization_has_holder: {
									some: {
										holder: {
											OR: [
												{ name: { contains: value } },
												{ surname: { contains: value } },
												{ email: { contains: value } },
											],
										},
									},
								}
							})
						} else if (query[0] == 'CAS') {
							whereCondition.push({ authorization_has_chemical: { some: {chemical: {
											OR: [
												{ cas_auth_chem: { contains: value } },
												{ auth_chem_en: { contains: value } }
											],
										}} }})
						}
					})
				}

				const authorizationList = await context.prisma.authorization.findMany({
					where: {
						AND: whereCondition
					},
					orderBy: [
						{
							authorization: 'asc',
						},
					]
				});

				const authorizations = args.take == 0 ? authorizationList : authorizationList.slice(args.skip, args.skip + args.take);
				const totalCount = authorizationList.length;

				return { authorizations, totalCount };
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
			async resolve(parent, args, context) {
				if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
					throw new Error(`Permission denied`);
				}
				if (args.roomId) {
					const id: id = JSON.parse(args.roomId);
					if(id && id.eph_id && id.eph_id != '' && id.salt && id.salt != '' && IDObfuscator.checkSalt(id)) {
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const auths = await context.prisma.authorization.findMany({
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
						return auths
					}
				}
				return [];
			}
		});
	},
});

const newAuthorizationType = {
	id: stringArg(),
	authorization: stringArg(),
	id_unit: intArg(),
	expiration_date: stringArg(),
	status: stringArg(),
	rooms: list(intArg()),
	holders: list(stringArg()),
	radiations: list(stringArg()),
	cas: list(stringArg()),
	type: stringArg(),
	authority: stringArg()
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
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						const authorization = await tx.authorization.create({
							data: {
								authorization: args.authorization,
								status: args.status,
								creation_date: new Date(),
								expiration_date: new Date(args.expiration_date),
								id_unit: args.id_unit,
								renewals: 0,
								type: args.type,
								authority: args.authority
							}
						});

						if ( !authorization ) {
							throw new Error(`Authorization not created`);
						} else {
							await createNewMutationLog(tx, context, tx.authorization.name, authorization.id_authorization, '', {}, authorization, 'CREATE');

							for (const holder of args.holders) {
								let p = await tx.Person.findUnique({ where: { sciper: holder }});

								if (!p) {
									try {
										const ldapUsers = await getUsersFromApi(holder);
										const ldapUser = ldapUsers["persons"].find(p => p.sciper == holder);

										p = await tx.Person.create({
											data: {
												surname: ldapUser.lastname,
												name: ldapUser.firstname,
												email: ldapUser.email,
												sciper: ldapUser.id
											}
										});

										if (p) {
											await createNewMutationLog(tx, context, tx.Person.name, p.id_person, '', {}, p, 'CREATE');
										}
									} catch ( e ) {
										throw new Error(`Sciper ${holder} not found`);
									}
								}

								try {
									const relation = {
										id_person: p.id_person,
										id_authorization: authorization.id_authorization
									};
									const relationHolders = await tx.authorization_has_holder.create({
										data: relation
									});
									if ( !relationHolders ) {
										throw new Error(`Relation not update between ${authorization.authorizations} and ${holder}.`);
									} else {
										await createNewMutationLog(tx, context, tx.authorization_has_holder.name, 0,'', {}, relation, 'CREATE');
									}
								} catch ( e ) {
									throw new Error(`Relation not update between ${authorization.authorizations} and ${holder}.`);
								}
							}

							for (const room of args.rooms) {
								try {
									const relation = {
										id_lab: room,
										id_authorization: authorization.id_authorization
									};
									const relationRooms = await tx.authorization_has_room.create({
										data: relation
									});
									if ( !relationRooms ) {
										throw new Error(`Relation not update between ${authorization.authorizations} and ${room}.`);
									} else {
										await createNewMutationLog(tx, context, tx.authorization_has_room.name, 0,'', {}, relation, 'CREATE');
									}
								} catch ( e ) {
									throw new Error(`Relation not update between ${authorization.authorizations} and ${room}.`);
								}
							}

							for (const cas of args.cas) {
								let p = await tx.auth_chem.findUnique({ where: { cas_auth_chem: cas }});

								if (!p) {
									throw new Error(`CAS ${cas} not found`);
								}

								try {
									const relation = {
										id_chemical: p.id_chemical,
										id_authorization: authorization.id_authorization
									};
									const relationChemical = await tx.authorization_has_chemical.create({
										data: relation
									});
									if ( !relationChemical ) {
										throw new Error(`Relation not update between ${authorization.authorizations} and ${cas}.`);
									} else {
										await createNewMutationLog(tx, context, tx.authorization_has_chemical.name, 0,'', {}, relation, 'CREATE');
									}
								} catch ( e ) {
									throw new Error(`Relation not update between ${authorization.authorizations} and ${cas}.`);
								}
							}

							for (const source of args.radiations) {
								try {
									const relation = {
										id_authorization: authorization.id_authorization,
										source: source
									};
									const relationSource = await tx.authorization_has_radiation.create({
										data: relation
									});
									if ( !relationSource ) {
										throw new Error(`Relation not update between ${authorization.authorizations} and ${source}.`);
									} else {
										await createNewMutationLog(tx, context, tx.authorization_has_chemical.name, 0,'', {}, relation, 'CREATE');
									}
								} catch ( e ) {
									throw new Error(`Relation not update between ${authorization.authorizations} and ${source}.`);
								}
							}
						}

						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
		t.nonNull.field('updateAuthorization', {
			description: `Update authorization details.`,
			args: newAuthorizationType,
			type: "AuthorizationStatus",
			async resolve(root, args, context) {
				try {
					if (context.user.groups.indexOf("LHD_acces_lecture") == -1 && context.user.groups.indexOf("LHD_acces_admin") == -1){
						throw new Error(`Permission denied`);
					}

					return await context.prisma.$transaction(async (tx) => {
						if (!args.id) {
							throw new Error(`Not allowed to update authorization`);
						}
						const id: id = JSON.parse(args.id);
						if(id == undefined || id.eph_id == undefined || id.eph_id == '' || id.salt == undefined || id.salt == '') {
							throw new Error(`Not allowed to update authorization`);
						}

						if(!IDObfuscator.checkSalt(id)) {
							throw new Error(`Bad descrypted request`);
						}
						const idDeobfuscated = IDObfuscator.deobfuscateId(id);
						const auth = await tx.authorization.findUnique({where: {id_authorization: idDeobfuscated}});
						if (! auth) {
							throw new Error(`Authorization ${args.authorization} not found.`);
						}
						const authorizationObject =  getSHA256(JSON.stringify(getAuthorizationToString(auth)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== authorizationObject) {
							throw new Error(`Authorization ${args.authorization} has been changed from another user. Please reload the page to make modifications`);
						}

						const updatedAuthorization = await tx.authorization.update(
							{ where: { id_authorization: auth.id_authorization },
								data: {
									status: args.status,
									expiration_date: new Date(args.expiration_date),
									renewals: auth.renewals + 1
								}
							});

						if (!updatedAuthorization) {
							throw new Error(`Authorization ${args.authorization} not updated.`);
						} else {
							await createNewMutationLog(tx, context, tx.authorization.name, updatedAuthorization.id_authorization, '', auth, updatedAuthorization, 'UPDATE');
						}
						return mutationStatusType.success();
					});
				} catch ( e ) {
					return mutationStatusType.error(e.message);
				}
			}
		});
	}
});
