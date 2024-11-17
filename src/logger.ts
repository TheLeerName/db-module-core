export function info(message: any, values?: any | null, stack?: NodeJS.CallSite) {
	stack ??= getStack();

	message = start(stack) + message;
	if (values == null) values = {};

	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m"${v}"\x1b[0m`;

	console.log(message);
}

export function error(whatHappened: any, values?: any | null, whyItHappened?: any | null, stack?: NodeJS.CallSite) {
	stack ??= getStack();

	whatHappened = start(stack) + whatHappened;
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

function start(stack?: NodeJS.CallSite): string {
	stack ??= getStack();

	var fileNameAndLineNumber = getFileNameAndLineNumber(stack);

	var date = new Date(Date.now());
	var h = date.getHours(); var m = date.getMinutes(); var s = date.getSeconds();
	var time = `\x1b[34m[${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}]`;
	var module = `\x1b[36m[${fileNameAndLineNumber}]\x1b[0m`;
	return `\n${time} ${module} `
}

export function getFileNameAndLineNumber(stack?: NodeJS.CallSite): string {
	stack ??= getStack();

	return (stack.getFileName() ?? "") + ':' + stack.getLineNumber();
}

export function getStack(num: number = 2): NodeJS.CallSite {
	const e = new Error();
	e.stack;
	return stacks[num];
}

export var stacks: NodeJS.CallSite[] = [];
/** https://stackoverflow.com/a/75636363 */
export function init() {
	Error.prepareStackTrace = (_, _stacks) => {
		stacks = [];
		for (let stack of _stacks) stacks.push(stack);
	};
}