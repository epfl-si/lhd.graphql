export function diffObjects(obj1: any, obj2: any, excludedField: string) {
	const excludedFieldList = excludedField.split(',');
	const diffs = {};

	const allKeys = new Set([
		...Object.keys(obj1),
		...Object.keys(obj2),
	]);

	for (const key of allKeys) {
		if (excludedFieldList.indexOf(key) == -1) {
			if ( obj1[key] instanceof Date && obj2[key] instanceof Date ) {
				if ( obj1[key].getTime() !== obj2[key].getTime() ) {
					diffs[key] = {
						before: obj1[key],
						after: obj2[key],
					};
				}
			} else {
				if ( obj1[key] !== obj2[key] ) {
					diffs[key] = {
						before: obj1[key],
						after: obj2[key],
					};
				}
			}
		}
	}

	return diffs;
}
