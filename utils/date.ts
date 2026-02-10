export function getNow() {
	const date = new Date();
	const pad = (num) => String(num).padStart(2, '0');

	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1); // Months are zero-based
	const year = date.getFullYear();

	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());

	return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getFormattedDate(date: Date, split: String = '/') {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = String(date.getFullYear());

	return `${day}${split}${month}${split}${year}`;
}
