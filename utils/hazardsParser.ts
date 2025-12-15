export function getHazardLevel (submissions: any[], category: string) {
	const laser = [];
	const bio = [];
	submissions.forEach(haz => {
		const submission = JSON.parse(haz.submission);
		if (category === 'Laser' && submission.data.laserClass && ['3B', '4'].includes(submission.data.laserClass.toString())) {
			laser.push(submission.data.laserClass);
		} else if (category === 'Biological' && submission.data.biosafetyLevel >= 2) {
			bio.push(submission.data.biosafetyLevel);
		}
	});
	return {laser, bio};
}
