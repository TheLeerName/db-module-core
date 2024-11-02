export function info(moduleName: string, message: any, values?: any | null) {
	if (values == null) values = {};

	message = "[" + "]";
	message = `\x1b[36m${message}\x1b[0m`;
	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m"${v}"\x1b[0m`;

	console.log(addTimeAndModuleName(moduleName, message));
}

export function error(moduleName: string, whatHappened: any, values?: any | null, whyItHappened?: any | null) {
	if (values == null) values = {};

	whatHappened = `\x1b[31m${whatHappened}\x1b[0m`;
	for (let [k, v] of Object.entries<any>(values))
		whatHappened += `\n\t${k}: \x1b[32m"${v}"\x1b[0m`;
	if (whyItHappened != null) {
		const err = `${whyItHappened}`;
		whatHappened += `\n\terror: \x1b[31m"${err.includes('\n') ? err.substring(0, err.indexOf('\n')) : err}"\x1b[0m`;
	}

	console.log(addTimeAndModuleName(moduleName, whatHappened));
}

function addTimeAndModuleName(moduleName: string, message: string): string {
	var date = new Date(Date.now());
	var h = date.getHours(); var m = date.getMinutes(); var s = date.getSeconds();
	var time = `\x1b[34m[${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}]\x1b[0m`;
	var module = `\x1b[35m[${moduleName}]\x1b[0m`;
	return `${time} ${module} ${message}`
}