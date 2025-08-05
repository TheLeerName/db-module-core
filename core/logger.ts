import { getDiscordDMChannelFromUser, getDiscordUserByID } from ".";
import * as Discord from 'discord.js';

export const on_info: ((stack: NodeJS.CallSite, message: string, values: Record<string, any>) => void)[] = [];
export const on_error: ((stack: NodeJS.CallSite, message: string, values: Record<string, any>, error?: string | Error) => void)[] = [];

export function info(message: string, values?: Record<string, any>) {
	const stack = getStack();
	values ??= {};
	for (const c of on_info) c(stack, message, values);

	message = start(stack) + message;

	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m${typeof v === "object" ? JSON.stringify(v) : v}\x1b[0m`;

	console.log(message);
}

export function error(message: string, values?: Record<string, any>, error?: string | Error) {
	const stack = getStack((error && isError(error)) ? error : undefined);
	values ??= {};
	for (const c of on_error) c(stack, message, values);

	message = `\x1b[31m${message}\x1b[0m`;
	message = start(stack) + message;

	for (let [k, v] of Object.entries<any>(values))
		message += `\n\t${k}: \x1b[32m${typeof v === "object" ? JSON.stringify(v) : v}\x1b[0m`;
	if (error != null) {
		if (isError(error)) {
			message += `\n\terror: \x1b[33m${error.message.includes('\n') ? error.message.substring(0, error.message.indexOf('\n')) : error.message}\x1b[0m`;

			var i = 0;
			for (const stack of stacks) {
				message += `\x1b[0m\n\t${i}: `;
				var fn = stack.getFileName();
				if (fn != null) {
					if (fn.startsWith(workingDirectory))
						fn = '.' + fn.substring(workingDirectory.length);
					fn = fn.replaceAll('\\', '/');
					fn = `\x1b[36m${fn}\x1b[32m`;
					message += fn;
				}
				const l = stack.getLineNumber();
				if (l != null)message += `\x1b[36m:${l}\x1b[32m`;
				const f = stack.getFunctionName();
				if (f != null) message += ` => \x1b[33m${f}()\x1b[32m`;
				i++;
			}
		}
		else
			message += `\n\terror: \x1b[33m${error.includes('\n') ? error.substring(0, error.indexOf('\n')) : error}\x1b[0m`;
	}

	console.log(message);
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

export async function initDiscordLogging(bot_creator_id: string) {
	const bot_creator = await getDiscordUserByID(bot_creator_id);
	if (!bot_creator) return error("Getting user from botCreatorDiscordID failed, logging to dm is disabled", {id: bot_creator_id});

	const dm = await getDiscordDMChannelFromUser(bot_creator);
	if (!dm) return error("Getting DMChannel from bot creator failed, logging to dm is disabled", {username: bot_creator.username});
	on_info.push((stack, message, values) => {
		var fn = stack.getFileName();
		if (fn) {
			if (fn.startsWith(workingDirectory))
				fn = '.' + fn.substring(workingDirectory.length);
			fn = fn.replaceAll('\\', '/');
		}
		const ln = stack.getLineNumber();
		if (fn && ln) fn += `:${ln}`;

		const embed = new Discord.EmbedBuilder()
		.setColor("Aqua")
		.setTitle(message)
		.setFields(...Object.entries(values).map(([name, value]) => { return { name, value: `\`${typeof value === "object" ? JSON.stringify(value) : value}\`` }}));
		if (fn) embed.setAuthor({name: fn});
		dm.send({ embeds: [embed] });
	});
	on_error.push((stack, message, values) => {
		var fn = stack.getFileName();
		if (fn) {
			if (fn.startsWith(workingDirectory))
				fn = '.' + fn.substring(workingDirectory.length);
			fn = fn.replaceAll('\\', '/');
		}
		const ln = stack.getLineNumber();
		if (fn && ln) fn += `:${ln}`;

		const embed = new Discord.EmbedBuilder()
		.setColor("Red")
		.setTitle(message)
		.setFields(...Object.entries(values).map(([name, value]) => { return { name, value: `\`${typeof value === "object" ? JSON.stringify(value) : value}\`` }}));
		if (fn) embed.setAuthor({name: fn});
		dm.send({ embeds: [embed] });
	});
}

export const workingDirectory = __dirname.split('\\').slice(0, __dirname.split('\\').length - 2).join('\\');
export var stacks: NodeJS.CallSite[] = [];
export var error_message: string = "";

export function init() {
	/** https://stackoverflow.com/a/75636363 */
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