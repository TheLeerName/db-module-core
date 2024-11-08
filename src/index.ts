import fs from 'fs';
import JSON5 from 'json5';
import * as Discord from 'discord.js';
import {ConfigIniParser as INI} from 'config-ini-parser';

import * as L from './logger';

var globalData : any = {};
loadGlobalData();

const modules : string[] = [];
const moduleName = "core";
const appFolder = process.argv[1].substring(0, process.argv[1].lastIndexOf('\\') - 4);

for (let module of fs.readdirSync(`${appFolder}\\modules`)) {
	if (fs.existsSync(`${appFolder}\\modules\\${module}\\src`)) {
		modules.push(module);
	}
}

function loadConfigINI() : INI {
	if (fs.existsSync('config.ini')) {
		var strINIWasChanged = false;
		var strINI = fs.readFileSync('config.ini').toString();
		const ini = new INI().parse(strINI);
		const iniSections = ini.sections();
		for (let module of modules) {
			if (!iniSections.includes(module)) {
				const moduleStrINI = fs.readFileSync(`${module}/src/config.ini.module`).toString();
				strINI += `\n[${module}]\n` + moduleStrINI + '\n';
				strINIWasChanged = true;
				L.info(moduleName, 'Adding missing module config to config.ini', {module});

				const moduleINI = new INI().parse(moduleStrINI);
				for (let option of moduleINI.options(null)) {
					if (option.length == 0) {
						L.error(moduleName, "Parameter isn't specified in config.ini", {module, missingParameter: option});
						process.exit();
					}
				}
			}
		}

		if (strINIWasChanged) fs.writeFileSync('config.ini', strINI);
		return new INI().parse(strINI);
	} else {
		L.info(moduleName, 'Creating config.ini...');

		var ini : string = "";
		ini += `[${moduleName}]\n` + fs.readFileSync(`src/config.ini.module`).toString() + '\n';
		for (let module of modules)
			ini += `\n[${module}]\n` + fs.readFileSync(`${module}/src/config.ini.module`).toString() + '\n';

		fs.writeFileSync('config.ini', ini);
		L.info(moduleName, 'Please specify parameters in config.ini and run app again');
		process.exit();
	}
}

function saveGlobalData() {
	fs.writeFileSync('guildData.json5', JSON5.stringify(globalData, null, '\t'));
}
function loadGlobalData() {
	if (!fs.existsSync('guildData.json5')) return;

	globalData = JSON5.parse(fs.readFileSync('guildData.json5').toString());
}

export function loadGlobalDataOfModule(name: string) : any {
	const json : any = {};
	for (let [guildID, modules] of Object.entries<any>(globalData))
		json[guildID] = modules[name];
	return json;
}
export function saveGlobalDataOfModule(name: string, globalModuleData : any) : any {
	for (let [guildID, guildData] of Object.entries<any>(globalModuleData)) {
		if (globalData[guildID] == null) globalData[guildID] = {};
		globalData[guildID][name] = guildData;
	}
	saveGlobalData();
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

export const configINI : INI = loadConfigINI();

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
	L.info(moduleName, 'Module loaded', {module});
	m.main();
}

//client.on('debug', (m) => console.log(m));
client.on('warn', (m) => console.log(`\x1b[33m${m}\x1b[0m`));
client.on('error', (m) => console.log(`\x1b[31m${m}\x1b[0m`));
client.on("ready", async () => {
	if (configINI.getBoolean('core', 'printInviteLink'))
		L.info(moduleName, `Generated invite link`, {url: generateInviteUrl()});
});
process.on('uncaughtException', (e) => L.error(moduleName, 'Unexpected error', null, e));

client.login(configINI.get('core', 'token')).then((v) => L.info(moduleName, 'Client connected'));