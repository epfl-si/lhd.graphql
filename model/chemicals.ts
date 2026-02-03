import {sendEmailsForChemical} from "../utils/Email/Mailer";

export async function createChemical(args, {prisma, user}) {
	await prisma.$transaction(async (tx) => {

		await tx.auth_chem.create({
			data: {
				cas_auth_chem: args.cas_auth_chem,
				auth_chem_en: args.auth_chem_en,
				flag_auth_chem: args.flag_auth_chem
			}
		});
	});
	await sendEmailsForChemical(prisma, user.username);
}

export async function getChemicalWithPagination(prisma, whereConditionsDict, take, skip) {
	const whereCondition = [];
	if (whereConditionsDict.length == 0) {
		whereCondition.push({ cas_auth_chem: { contains: '' }})
	} else {
		whereConditionsDict.forEach(query => {
			const value = decodeURIComponent(query[1]);
			if (query[0] === 'CAS') {
				whereCondition.push({ cas_auth_chem: { contains: value }})
			} else if (query[0] === 'Name') {
				whereCondition.push({ auth_chem_en : { contains: value }})
			} else if (query[0] === 'Status') {
				whereCondition.push({ flag_auth_chem : 'active'.indexOf(value.toLowerCase()) > -1 })
			}
		})
	}

	const chemicalList = await prisma.auth_chem.findMany({
		where: {
			AND: whereCondition
		},
		orderBy: [
			{
				cas_auth_chem: 'asc',
			},
		]
	});

	const chemicals = take == 0 ? chemicalList : chemicalList.slice(skip, skip + take);
	const totalCount = chemicalList.length;

	return { chemicals, totalCount };
}
