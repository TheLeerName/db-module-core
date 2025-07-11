export function info(message: any, values?: any | null) {
	const stack = getStack();
	values ??= {};

	message = start(stack) + message;

	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m${v}\x1b[0m`;

	console.log(message);
}

export function error(whatHappened: any, values?: any | null, whyItHappened?: string | Error) {
	const stack = getStack((whyItHappened && isError(whyItHappened)) ? whyItHappened : undefined);
	values ??= {};

	whatHappened = `\x1b[31m${whatHappened}\x1b[0m`;
	whatHappened = start(stack) + whatHappened;

	for (let [k, v] of Object.entries<any>(values))
		whatHappened += `\n\t${k}: \x1b[32m${v}\x1b[0m`;
	if (whyItHappened != null) {
		if (isError(whyItHappened)) {
			whatHappened += `\n\terror: \x1b[33m${whyItHappened.message.includes('\n') ? whyItHappened.message.substring(0, whyItHappened.message.indexOf('\n')) : whyItHappened.message}\x1b[0m`;

			var i = 0;
			for (const stack of stacks) {
				whatHappened += `\x1b[0m\n\t${i}: `;
				var fn = stack.getFileName();
				if (fn != null) {
					if (fn.startsWith(workingDirectory))
						fn = '.' + fn.substring(workingDirectory.length);
					fn = fn.replaceAll('\\', '/');
					fn = `\x1b[36m${fn}\x1b[32m`;
					whatHappened += fn;
				}
				const l = stack.getLineNumber();
				if (l != null)whatHappened += `\x1b[36m:${l}\x1b[32m`;
				const f = stack.getFunctionName();
				if (f != null) whatHappened += ` => \x1b[33m${f}()\x1b[32m`;
				i++;
			}
		}
		else
			whatHappened += `\n\terror: \x1b[33m${whyItHappened.includes('\n') ? whyItHappened.substring(0, whyItHappened.indexOf('\n')) : whyItHappened}\x1b[0m`;
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

export function isError(error: string | Error): error is Error {
	return (error as any).message != null;
}

export function getStack(err?: Error): NodeJS.CallSite {
	const e = err ?? new Error();
	e.stack;
	return stacks[2];
}

export const workingDirectory = __dirname.split('\\').slice(0, __dirname.split('\\').length - 2).join('\\');
export var stacks: NodeJS.CallSite[] = [];
export var error_message: string = "";
/** https://stackoverflow.com/a/75636363 */
export function init() {
	Error.prepareStackTrace = (_, _stacks) => {
		stacks = _stacks;
		return JSON.stringify({ m: _.message, s: stacks.map(v => { return { n: v.getFileName(), l: v.getLineNumber(), f: v.getFunctionName() } }) });
	};
	process.on('uncaughtException', (e) => {
		var fields: string[] = [];
		const json = JSON.parse((e.stack ?? `{"m":null,"s":[]}`));
		for (let stack of Object.values<{n: string | undefined, l: number | null, f: string | null}>(json.s)) {
			var value = "";

			if (stack.n != null) {
				if (stack.n.startsWith(workingDirectory))
					stack.n = '.' + stack.n.substring(workingDirectory.length);
				stack.n = stack.n.replaceAll('\\', '/');
				stack.n = `\x1b[36m${stack.n}\x1b[32m`;

				value += stack.n;
			}
			if (stack.l != null) value += `\x1b[36m:${stack.l}\x1b[32m`;
			if (stack.f != null) value += ` => \x1b[33m${stack.f}()\x1b[32m`;

			fields.push(value);
		}
		error(json.m ?? "Uncaught exception", fields);
	});
}