export function buildSearchConditions( searchValue: string ) {
	const isLike = !searchValue || searchValue.includes('*');
	return isLike ? {contains: (searchValue ?? '').replaceAll('*', '')} : searchValue;
}
