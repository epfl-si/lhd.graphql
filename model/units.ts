import {Unit} from "nexus-prisma";
import {buildSearchConditions} from "../utils/searchConditionBuilder";

export async function deleteUnitCascade(tx, context, u:Unit) {
	await tx.unit_has_cosec.deleteMany({
		where: {
			id_unit: u.id,
		}
	});

	await tx.unit_has_room.deleteMany({
		where: {
			id_unit: u.id,
		}
	});

	await tx.subunpro.deleteMany({
		where: {
			id_unit: u.id,
		},
	});

	const subUnitList = await tx.Unit.findMany({
		where: {
			name: { startsWith: u.name },
			id: { not: u.id }
		}
	});
	for await (const subUnit of subUnitList) {
		await deleteUnitCascade(tx, context, subUnit);
	}

	await tx.Unit.delete({
		where: {
			id: u.id,
		},
	});
}

export async function getUnitByName(prisma, unitName: string) {
	const search = buildSearchConditions(unitName)
	return await prisma.Unit.findMany({
		where: {
			OR: [
				{ name: search },
				{ institute : { name: search }},
				{ institute : { school: { name: search } }},
			]
		},
		include: { unit_has_cosec: { include: { cosec: true } }, subunpro: { include: { person: true } }, institute: { include: { school: true } }, unit_has_room: { include: true } },
		orderBy: [
			{
				name: 'asc',
			},
		]
	});
}

export async function getParentUnit(prisma, nameParent: string) {
	return await prisma.Unit.findMany({
		where: {name: nameParent},
		orderBy: [
			{
				name: 'asc',
			},
		]
	});
}
