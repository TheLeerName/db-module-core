import fs from 'fs';
import JSON5 from 'json5';
import * as Discord from 'discord.js';
import {ConfigIniParser as INI} from 'config-ini-parser';

import * as L from './logger';
L.init();

const currentDataVersion = 1;

var globalData: {version: number, guildData: any} = fs.existsSync('data.json5') ? JSON5.parse(fs.readFileSync('data.json5').toString()) : {version: currentDataVersion, guildData: {}};

const modules: string[] = [];
const moduleName = "core";
const appFolder = process.argv[1].substring(0, process.argv[1].lastIndexOf('\\') - 4);

for (let module of fs.readdirSync(`${appFolder}\\modules`)) {
	if (fs.existsSync(`${appFolder}\\modules\\${module}\\src`)) {
		modules.push(module);
	}
}

function checkForNonexistentOptions(strINI: string) {
	const ini = new INI().parse(strINI);
	const iniSections = ini.sections();
	for (let module of modules) {
		if (iniSections.includes(module)) {
			const moduleINI = new INI().parse(fs.readFileSync(`modules/${module}/src/config.ini.module`).toString());
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
		var strINIWasChanged = false;
		var strINI = fs.readFileSync('config.ini').toString();

		const ini = new INI().parse(strINI);
		const iniSections = ini.sections();
		for (let module of modules) {
			if (!iniSections.includes(module)) {
				L.info('Adding missing module config to config.ini', {module});
				const moduleStrINI = fs.readFileSync(`modules/${module}/src/config.ini.module`).toString();
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
		return new INI().parse(strINI);
	} else {
		L.info('Creating config.ini...');

		var ini: string = "";
		ini += `[${moduleName}]\n` + fs.readFileSync(`src/config.ini.module`).toString() + '\n';
		for (let module of modules)
			ini += `\n[${module}]\n` + fs.readFileSync(`modules/${module}/src/config.ini.module`).toString() + '\n';

		fs.writeFileSync('config.ini', ini);
		L.info('Please specify parameters in config.ini or take them from config-old.ini and run app again');
		process.exit();
	}
}

export function loadModuleData(name: string): any {
	const json: any = {};
	for (let [guildID, modules] of Object.entries<any>(globalData.guildData))
		json[guildID] = modules[name];
	return json;
}
export function saveModuleData(name: string, moduleData: any) {
	for (let [guildID, guildData] of Object.entries<any>(moduleData)) {
		if (globalData.guildData[guildID] == null) globalData.guildData[guildID] = {};
		globalData.guildData[guildID][name] = guildData;
	}
	fs.writeFileSync('data.json5', JSON5.stringify(globalData, null, '\t'));
}

export function generateInviteUrl(): string {
	return client.generateInvite({
		scopes: [Discord.OAuth2Scopes.Bot],
		permissions: [
			Discord.PermissionFlagsBits.ViewChannel,
			Discord.PermissionFlagsBits.SendMessages,
			Discord.PermissionFlagsBits.ReadMessageHistory
		],
	});
}

export const configINI: INI = loadConfigINI();

export const client = new Discord.Client<true>({
	failIfNotExists: false,
	intents: [Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent, Discord.IntentsBitField.Flags.Guilds],
	presence: {
		activities: [
			{
				type: Discord.ActivityType.Custom,
				name: configINI.get('core', 'activity')
			},
		],
	},
});

for (let module of modules) {
	const m = require(`../modules/${module}/src/index`);
	m.main();
}
if (modules.length > 0) L.info('Modules loaded', {modules: modules.join(', ')});

//client.on('debug', (m) => console.log(m));
client.on('warn', (m) => console.log(`\x1b[33m${m}\x1b[0m`));
client.on('error', (e) => {
	e.stack;
	L.error('Unexpected error', null, e, L.stacks[0]);
});
client.on("ready", async () => {
	if (configINI.getBoolean('core', 'printInviteLink'))
		L.info(`Generated invite link`, {url: generateInviteUrl()});
});
process.on('uncaughtException', (e) => {
	e.stack;
	L.error('Unexpected error', null, e, L.stacks[3]);
});

const token: string = configINI.get('core', 'token');
client.login(token).then((v) => L.info('Client connected', {token}));