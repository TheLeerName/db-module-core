export function info(message: any, values?: any | null, stack?: NodeJS.CallSite) {
	stack ??= getStack();
	values ??= {};

	message = start(stack) + message;

	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m${v}\x1b[0m`;

	console.log(message);
}

export function error(whatHappened: any, values?: any | null, whyItHappened?: any | null, stack?: NodeJS.CallSite) {
	stack ??= getStack();
	values ??= {};

	whatHappened = `\x1b[31m${whatHappened}\x1b[0m`;
	whatHappened = start(stack) + whatHappened;

	for (let [k, v] of Object.entries<any>(values))
		whatHappened += `\n\t${k}: \x1b[32m${v}\x1b[0m`;
	if (whyItHappened != null) {
		const err = `${whyItHappened}`;
		whatHappened += `\n\terror: \x1b[33m${err.includes('\n') ? err.substring(0, err.indexOf('\n')) : err}\x1b[0m`;
	}

	console.log(whatHappened);
}

function start(stack?: NodeJS.CallSite): string {
	stack ??= getStack();

	var fileNameAndLineNumber = getFileNameAndLineNumber(stack);

	var date = new Date(Date.now());
	var h = date.getHours(); var m = date.getMinutes(); var s = date.getSeconds();
	var time = `[\x1b[34m${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}\x1b[0m]`;
	var module = `[\x1b[36m${fileNameAndLineNumber}\x1b[0m]`;
	return `\n${time} ${module} `
}

export function getFileNameAndLineNumber(stack?: NodeJS.CallSite): string {
	stack ??= getStack();

	var fileName = stack.getFileName() ?? "";
	if (fileName.length > 0) {
		if (fileName.startsWith(workingDirectory))
			fileName = '.' + fileName.substring(workingDirectory.length);
		fileName = fileName.replaceAll('\\', '/');
	}
	const lineNumber = stack.getLineNumber();
	if (lineNumber != null) fileName += `:${lineNumber}`;

	return fileName;
}

export function getStack(num: number = 2): NodeJS.CallSite {
	const e = new Error();
	e.stack;
	return stacks[num];
}

export const workingDirectory = __dirname.split('\\').slice(0, __dirname.split('\\').length - 2).join('\\');
export var stacks: NodeJS.CallSite[] = [];
/** https://stackoverflow.com/a/75636363 */
export function init() {
	Error.prepareStackTrace = (_, _stacks) => {
		stacks = [];
		for (let stack of _stacks) stacks.push(stack);
	};

	process.on('uncaughtException', (e) => {
		e.stack;

		var fields: string[] = [];
		for (let stack of stacks.values()) {
			var value = "";

			var fileName = stack.getFileName();
			if (fileName != null) {
				if (fileName.startsWith(workingDirectory))
					fileName = '.' + fileName.substring(workingDirectory.length);
				fileName = fileName.replaceAll('\\', '/');
				fileName = `\x1b[36m${fileName}\x1b[32m`;

				value += fileName;
			}
			const lineNumber = stack.getLineNumber();
			if (lineNumber != null) value += `\x1b[36m:${lineNumber}\x1b[32m`;
			const functionName = stack.getFunctionName();
			if (functionName != null) value += ` => \x1b[33m${functionName}()\x1b[32m`;

			fields.push(value);
		}
		error('Uncaught exception, see stack trace', fields);
	});
}