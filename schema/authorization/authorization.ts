import {arg, extendType, inputObjectType, intArg, list, objectType, stringArg} from "nexus";
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
import {RadiationStruct} from "./radiation";

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
						} else if (query[0] == 'Source') {
							whereCondition.push({ authorization_has_radiation: { some: {source: {contains: value}} }})
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

const OthersMutationType = inputObjectType({
	name: "OthersMutationType",
	definition(t) {
		t.nonNull.string('status');
		t.nonNull.string('name');
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

					const id = IDObfuscator.getId(args.id_unit);
					const idDeobfuscatedForUnit = IDObfuscator.getIdDeobfuscated(id);
					const unit = await context.prisma.Unit.findUnique({where: {id: idDeobfuscatedForUnit}})
					if (!unit) throw new Error(`Authorization not created`);

					return await context.prisma.$transaction(async (tx) => {
						const [dayCrea, monthCrea, yearCrea] = args.creation_date.split("/").map(Number);
						const [day, month, year] = args.expiration_date.split("/").map(Number);
						const authorization = await tx.authorization.create({
							data: {
								authorization: args.authorization,
								status: args.status,
								creation_date: new Date(yearCrea, monthCrea - 1, dayCrea, 12),
								expiration_date: new Date(year, month - 1, day, 12),
								id_unit: unit.id,
								renewals: 0,
								type: args.type,
								authority: args.authority
							}
						});

						if ( !authorization ) {
							throw new Error(`Authorization not created`);
						} else {
							await createNewMutationLog(tx, context, tx.authorization.name, authorization.id_authorization, '', {}, authorization, 'CREATE');
							await checkRelations(tx, context, args, authorization);
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
						const id = IDObfuscator.getId(args.id);
						const idDeobfuscated = IDObfuscator.getIdDeobfuscated(id);
						const auth = await tx.authorization.findUnique({where: {id_authorization: idDeobfuscated}});
						if (! auth) {
							throw new Error(`Authorization ${args.authorization} not found.`);
						}
						const authorizationObject =  getSHA256(JSON.stringify(getAuthorizationToString(auth)), id.salt);
						if (IDObfuscator.getDataSHA256(id) !== authorizationObject) {
							throw new Error(`Authorization ${args.authorization} has been changed from another user. Please reload the page to make modifications`);
						}

						const idunit = IDObfuscator.getId(args.id_unit);
						const idDeobfuscatedForUnit = IDObfuscator.getIdDeobfuscated(idunit);
						const unit = await context.prisma.Unit.findUnique({where: {id: idDeobfuscatedForUnit}})
						if (!unit) throw new Error(`Authorization not created`);

						const [day, month, year] = args.expiration_date.split("/").map(Number);
						const updatedAuthorization = await tx.authorization.update(
							{ where: { id_authorization: auth.id_authorization },
								data: {
									status: args.status,
									expiration_date: new Date(year, month - 1, day),
									id_unit: unit.id,
									authority: args.authority,
									renewals: auth.renewals + 1
								}
							});

						if (!updatedAuthorization) {
							throw new Error(`Authorization ${args.authorization} not updated.`);
						} else {
							await createNewMutationLog(tx, context, tx.authorization.name, updatedAuthorization.id_authorization, '', auth, updatedAuthorization, 'UPDATE');
							await checkRelations(tx, context, args, updatedAuthorization);
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

async function checkRelations(tx, context, args, authorization) {
	const errors: string[] = [];
	for (const holder of args.holders) {
		if (holder.status == 'New') {
			let p = await tx.Person.findUnique({ where: { sciper: holder.sciper }});

			if (!p) {
				try {
					const ldapUsers = await getUsersFromApi(holder.sciper + "");
					const ldapUser = ldapUsers["persons"].find(p => p.id == holder.sciper + "");

					p = await tx.Person.create({
						data: {
							surname: ldapUser.lastname,
							name: ldapUser.firstname,
							email: ldapUser.email,
							sciper: Number(ldapUser.id)
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
					id_person: Number(p.id_person),
					id_authorization: Number(authorization.id_authorization)
				};
				const relationHolders = await tx.authorization_has_holder.create({
					data: relation
				});
				if ( !relationHolders ) {
					throw new Error(`Relation not update between ${authorization.authorization} and ${holder.sciper}.`);
				} else {
					await createNewMutationLog(tx, context, tx.authorization_has_holder.name, 0,'', {}, relation, 'CREATE');
				}
			} catch ( e ) {
				throw new Error(`Relation not update between ${authorization.authorization} and ${holder}.`);
			}
		} else if (holder.status == 'Deleted') {
			let p = await tx.Person.findUnique({ where: { sciper: holder.sciper }});
			if (!p) {
				errors.push(`Person ${holder.sciper} not found.`);
				continue;
			}
			try {
				const whereCondition = {
					id_authorization: authorization.id_authorization,
					id_person: p.id_person
				};
				const del = await tx.authorization_has_holder.deleteMany({
					where: whereCondition
				});
				if (!del) {
					errors.push(`Relation authorization-holder not deleted between ${authorization.authorizations} and ${holder.sciper}.`)
				} else {
					await createNewMutationLog(tx, context, tx.authorization_has_holder.name, 0,'', whereCondition, {}, 'DELETE');
				}
			} catch ( e ) {
				errors.push(`DB error: relation authorization-holder not deleted between ${authorization.authorizations} and ${holder.sciper}.`)
			}
		}
	}

	for (const room of args.rooms) {
		if (room.status == 'New') {
			const r = await tx.Room.findFirst({where: {name: room.name}})
			if (!r) throw new Error(`Authorization not created`);
			try {
				const relation = {
					id_lab: Number(r.id),
					id_authorization: Number(authorization.id_authorization)
				};
				const relationRooms = await tx.authorization_has_room.create({
					data: relation
				});
				if ( !relationRooms ) {
					throw new Error(`Relation not update between ${authorization.authorization} and ${room.name}.`);
				} else {
					await createNewMutationLog(tx, context, tx.authorization_has_room.name, 0,'', {}, relation, 'CREATE');
				}
			} catch ( e ) {
				throw new Error(`Relation not update between ${authorization.authorization} and ${room.name}.`);
			}
		} else if (room.status == 'Deleted') {
			let p = await tx.Room.findFirst({ where: { name: room.name}});
			if (!p) {
				errors.push(`Room ${room.name} not found.`);
				continue;
			}
			try {
				const whereCondition = {
					id_authorization: authorization.id_authorization,
					id_lab: p.id_lab
				};
				const del = await tx.authorization_has_room.deleteMany({
					where: whereCondition
				});
				if (!del) {
					errors.push(`Relation authorization-room not deleted between ${authorization.authorizations} and ${room.name}.`)
				} else {
					await createNewMutationLog(tx, context, tx.authorization_has_room.name, 0,'', whereCondition, {}, 'DELETE');
				}
			} catch ( e ) {
				errors.push(`DB error: relation authorization-room not deleted between ${authorization.authorizations} and ${room.name}.`)
			}
		}
	}

	if (args.radiations) {
		for ( const source of args.radiations ) {
			if ( source.status == 'New' ) {
				try {
					const relation = {
						id_authorization: Number(authorization.id_authorization),
						source: source.name
					};
					const relationSource = await tx.authorization_has_radiation.create({
						data: relation
					});
					if ( !relationSource ) {
						throw new Error(`Relation not update between ${authorization.authorization} and ${source.name}.`);
					} else {
						await createNewMutationLog(tx, context, tx.authorization_has_radiation.name, 0, '', {}, relation, 'CREATE');
					}
				} catch ( e ) {
					throw new Error(`Relation not update between ${authorization.authorization} and ${source.name}.`);
				}
			} else if ( source.status == 'Deleted' ) {
				try {
					const whereCondition = {
						id_authorization: authorization.id_authorization,
						source: source.name
					};
					const del = await tx.authorization_has_radiation.deleteMany({
						where: whereCondition
					});
					if ( !del ) {
						errors.push(`Relation authorization-radiation not deleted between ${authorization.authorizations} and ${source.name}.`)
					} else {
						await createNewMutationLog(tx, context, tx.authorization_has_radiation.name, 0, '', whereCondition, {}, 'DELETE');
					}
				} catch ( e ) {
					errors.push(`DB error: relation authorization-radiation not deleted between ${authorization.authorizations} and ${source.name}.`)
				}
			}
		}
	}

	if (args.cas) {
		for ( const cas of args.cas ) {
			let p = await tx.auth_chem.findUnique({where: {cas_auth_chem: cas}});

			if ( !p ) {
				throw new Error(`CAS ${cas} not found`);
			}

			try {
				const relation = {
					id_chemical: Number(p.id_chemical),
					id_authorization: Number(authorization.id_authorization)
				};
				const relationChemical = await tx.authorization_has_chemical.create({
					data: relation
				});
				if ( !relationChemical ) {
					throw new Error(`Relation not update between ${authorization.authorizations} and ${cas}.`);
				} else {
					await createNewMutationLog(tx, context, tx.authorization_has_chemical.name, 0, '', {}, relation, 'CREATE');
				}
			} catch ( e ) {
				throw new Error(`Relation not update between ${authorization.authorizations} and ${cas}.`);
			}
		}
	}
	
	if (errors.length > 0) {
		throw new Error(`${errors.join('\n')}`);
	}
}
