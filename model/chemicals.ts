import {sendEmailsForChemical} from "../utils/email/mailer";

export async function createChemical(chemical, {prisma, user}) {
	await prisma.$transaction(async (tx) => {

		await tx.auth_chem.create({
			data: {
				cas_auth_chem: chemical.cas_auth_chem,
				auth_chem_en: chemical.auth_chem_en,
				flag_auth_chem: chemical.flag_auth_chem
			}
		});
	});
	await sendEmailsForChemical(prisma, user.username);
}

export async function getChemicals(prisma, opts?: Partial<{
	name: string;
	status: boolean;
	cas: string;
	take: number;
	skip: number;
}>) {
	const { name, status, cas, take, skip } = opts || {};
	const whereCondition = [];
	if (cas) {
		whereCondition.push({ cas_auth_chem: { contains: cas }})
	}
	if (name) {
		whereCondition.push({ auth_chem_en : { contains: name }})
	}
	if (status !== undefined) {
		whereCondition.push({ flag_auth_chem : status })
	}
	if (! whereCondition) {
		whereCondition.push({ cas_auth_chem: { contains: '' }})
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

	const chemicals = take == 0 || !take ? chemicalList : chemicalList.slice(skip, skip + take);
	const totalCount = chemicalList.length;

	return { chemicals, totalCount };
}
