export async function getExpiredDispensations (prisma) {
	return await prisma.dispensation.findMany({
		where: { date_end: { lt: new Date() }, status: 'Active' }
	});
}

export async function expireDispensation (tx, disp, userInfo) {
	return await tx.dispensation.update({
		where: { id_dispensation: disp.id_dispensation },
		data: {
			status: 'Expired',
			modified_by: userInfo.username,
			modified_on: new Date()
		}
	});
}

export async function setDispensationNotified (tx, disp) {
	return await tx.dispensation.update({
		where: { id_dispensation: disp.id_dispensation },
		data: {
			expiring_notification_sent: true
		}
	});
}

export async function getDispensation (prisma, id) {
	return await prisma.dispensation.findUnique({
		where: { id_dispensation: id },
		include: {
			subject: true,
			dispensation_has_room : { include: { room: true } },
			dispensation_has_holder: { include: { holder: true } },
			dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } }, unit_has_cosec: { include: { cosec: true } } } } } },
			dispensation_has_ticket: true
		}
	});
}

export async function getExpiringDispensations (prisma) {
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

	return await prisma.dispensation.findMany({
		where: {
			date_end: {
				gte: new Date(),           // greater than or equal to now (not expired yet)
				lte: thirtyDaysFromNow     // less than or equal to 30 days from now
			},
			status: 'Active',
			expiring_notification_sent: false
		},
		include: {
			subject: true,
			dispensation_has_room : { include: { room: true } },
			dispensation_has_holder: { include: { holder: true } },
			dispensation_has_unit: { include: { unit: { include: { subunpro: { include: { person: true } }, unit_has_cosec: { include: { cosec: true } } } } } },
			dispensation_has_ticket: true
		}
	});
}
