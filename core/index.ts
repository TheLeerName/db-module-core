import fs from 'fs';
import * as Discord from 'discord.js';
import {ConfigIniParser as INI} from 'config-ini-parser';

import * as L from './logger';
import { main as SlashCommandsMain } from './slash-commands';
L.init();

const currentDataVersion = 1;

var data: {version: number, guildsData: any, modulesData: any} = {version: currentDataVersion, guildsData: {}, modulesData: {}};

export const modules: string[] = [];
export const moduleName = "core";

function checkForNonexistentOptions(strINI: string) {
	const ini = new INI().parse(strINI);
	const iniSections = ini.sections();
	for (let module of modules) {
		if (iniSections.includes(module)) {
			const moduleINI = new INI().parse(fs.readFileSync(`modules/${module}/config.ini.module`).toString());
			for (let option of moduleINI.options(null))
				if (!ini.options(module).includes(option)) {
					L.info('Found new option for module, please do these steps:\n\t1. run app again\n\t2. move values from config-old.ini to new created config.ini\n\t3. remove config-old.ini\n\t4. run app again\n\t5. PROFIT');
					fs.writeFileSync('config-old.ini', strINI);
					fs.rmSync('config.ini');
					process.exit();
				}
		}
	}
}

function loadConfigINI(): INI {
	if (fs.existsSync('config.ini')) {
		var strINI = fs.readFileSync('config.ini').toString();
		if (fs.existsSync('modules')) {
			var strINIWasChanged = false;

			const ini = new INI().parse(strINI);
			const iniSections = ini.sections();
			for (let module of modules) {
				if (!iniSections.includes(module)) {
					L.info('Adding missing module config to config.ini', {module});
					const moduleStrINI = fs.readFileSync(`modules/${module}/config.ini.module`).toString();
					strINI += `\n[${module}]\n` + moduleStrINI + '\n';
					strINIWasChanged = true;

					const moduleINI = new INI().parse(moduleStrINI);
					for (let option of moduleINI.options(null)) {
						if (option.length == 0) {
							L.error("Parameter isn't specified in config.ini", {module, missingParameter: option});
							process.exit();
						}
					}
				}
			}

			if (strINIWasChanged) fs.writeFileSync('config.ini', strINI);
			checkForNonexistentOptions(strINI);
		} else
			L.error(`Can\'t check options of config.ini`, null, `./modules folder is not exists`);

		return new INI().parse(strINI);
	} else {
		L.info('Creating config.ini...');

		var ini: string = "";
		ini += `[${moduleName}]\n` + fs.readFileSync(`${moduleName}/config.ini.module`).toString() + '\n';
		if (fs.existsSync('modules')) {
			for (let module of modules)
				ini += `\n[${module}]\n` + fs.readFileSync(`modules/${module}/config.ini.module`).toString() + '\n';
		} else
			L.error(`Can\'t check options of config.ini`, null, `./modules folder is not exists`);

		fs.writeFileSync('config.ini', ini);
		L.info('Please specify parameters in config.ini or take them from config-old.ini and run app again');
		process.exit();
	}
}

export function getModuleData(name: string): any {
	return data.modulesData[name];
}

export function getModuleGuildsData(name: string): any {
	const json: any = {};
	for (let [guildID, modules] of Object.entries<any>(data.guildsData))
		json[guildID] = modules[name];
	return json;
}
export function saveModuleData(name: string, guildsData?: any, moduleData?: any) {
	if (moduleData != null) data.modulesData[name] = moduleData;

	if (guildsData != null) for (let [guildID, guildData] of Object.entries<any>(guildsData)) {
		if (data.guildsData[guildID] == null) data.guildsData[guildID] = {};
		data.guildsData[guildID][name] = guildData;
	}
	fs.writeFileSync('data.json', JSON.stringify(data, null, '\t'));
}

export function generateInviteUrl(): string {
	return client.generateInvite({
		scopes: [Discord.OAuth2Scopes.Bot],
		permissions: [
			Discord.PermissionFlagsBits.Administrator
		],
	});
}

export const configINI: INI = loadConfigINI();

export const client = new Discord.Client<true>({
	failIfNotExists: false,
	intents: [
		Discord.IntentsBitField.Flags.GuildMessages,
		Discord.IntentsBitField.Flags.MessageContent,
		Discord.IntentsBitField.Flags.GuildVoiceStates,
		Discord.IntentsBitField.Flags.GuildMessageReactions,
		Discord.IntentsBitField.Flags.GuildModeration,
		Discord.IntentsBitField.Flags.Guilds,
		Discord.IntentsBitField.Flags.GuildMembers,
	],
	partials: [
		Discord.Partials.Channel,
		Discord.Partials.Message,
		Discord.Partials.Reaction,
	],
	presence: {
		activities: [
			{
				type: Discord.ActivityType.Custom,
				name: configINI.get(moduleName, 'activity')
			},
		],
	},
});

export function main() {
	if (fs.existsSync('data.json')) data = JSON.parse(fs.readFileSync('data.json').toString());

	for (let module of fs.readdirSync(`dist/modules`))
		modules.push(module);

	for (let module of modules) {
		const m = require(`../modules/${module}/index`);
		m.main();
	}
	if (modules.length > 0) L.info('Modules loaded', {modules: modules.join(', ')});

	SlashCommandsMain();

	const token: string = configINI.get(moduleName, 'token');
	client.login(token).then((v) => L.info('Client connected', {token}));
}

//client.on('debug', (m) => console.log(m));
client.on('warn', (m) => console.log(`\x1b[33m${m}\x1b[0m`));
client.on('error', (e) => {
	e.stack;

	var fields: any = {};
	for (let [i, stack] of L.stacks.entries()) fields[(i + 1) + '. ' + stack.getFunctionName()] = stack.getFileName() + ':' + stack.getLineNumber();
	L.error('Error!', null, fields);
});
client.on("ready", async () => {
	if (configINI.getBoolean(moduleName, 'printInviteLink'))
		L.info(`Generated invite link`, {url: generateInviteUrl()});
});
process.on('uncaughtException', (e) => {
	e.stack;

	var fields: any = {};
	for (let [i, stack] of L.stacks.entries()) fields[(i + 1) + '. ' + stack.getFunctionName()] = stack.getFileName() + ':' + stack.getLineNumber();
	L.error('Uncaught exception', fields);
});