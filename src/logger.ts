export function info(message: any, values?: any | null) {
	if (values == null) values = {};

	message = `\x1b[36m${message}\x1b[0m`;
	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m"${v}"\x1b[0m`;

	console.log(message);
}

export function error(whatHappened: any, values?: any | null, whyItHappened?: any | null) {
	if (values == null) values = {};

	whatHappened = `\x1b[31m${whatHappened}\x1b[0m`;
	for (let [k, v] of Object.entries<any>(values))
		whatHappened += `\n\t${k}: \x1b[32m"${v}"\x1b[0m`;
	if (whyItHappened != null) {
		const err = `${whyItHappened}`;
		whatHappened += `\n\terror: \x1b[31m"${err.includes('\n') ? err.substring(0, err.indexOf('\n')) : err}"\x1b[0m`;
	}

	console.log(whatHappened);
}