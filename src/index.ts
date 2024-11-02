import fs from 'fs';
import JSON5 from 'json5';
import * as Discord from 'discord.js';
import {ConfigIniParser as INI} from 'config-ini-parser';

import * as L from './logger';

console.log(new INI().parse(fs.readFileSync('src/config.ini.module').toString()).get(null, 'activity'));

const modules : string[] = [];
for (let dir of fs.readdirSync(process.argv[1].substring(0, process.argv[1].lastIndexOf('\\') - 4))) {
	if (dir.startsWith('db-module-')) {
		modules.push(dir);
	}
}

function loadConfigINI() : INI {
	if (fs.existsSync('config.ini')) {
		var strINIWasChanged = false;
		var strINI = fs.readFileSync('config.ini').toString();
		const ini = new INI().parse(strINI);
		const iniSections = ini.sections();
		for (let module of modules) {
			const moduleName = module.substring('db-module-'.length, module.length);
			if (!iniSections.includes(moduleName)) {
				const moduleStrINI = fs.readFileSync(`${module}/src/config.ini.module`).toString();
				strINI += `\n[${moduleName}]\n` + moduleStrINI + '\n';
				strINIWasChanged = true;
				L.info('Adding missing module config to config.ini', {moduleName});

				const moduleINI = new INI().parse(moduleStrINI);
				for (let option of moduleINI.options(null)) {
					if (option.length == 0) {
						L.error("Parameter isn't specified in config.ini", {moduleName, missingParameter: option});
						process.exit();
					}
				}
			}
		}

		if (strINIWasChanged) fs.writeFileSync('config.ini', strINI);
		return new INI().parse(strINI);
	} else {
		L.info('Creating config.ini...');

		var ini : string = "";
		const module = "db-module-core";
		const moduleName = module.substring('db-module-'.length, module.length);
		ini += `[${moduleName}]\n` + fs.readFileSync(`src/config.ini.module`).toString() + '\n';
		for (let module of modules) {
			const moduleName = module.substring('db-module-'.length, module.length);
			ini += `\n[${moduleName}]\n` + fs.readFileSync(`${module}/src/config.ini.module`).toString() + '\n';
		}

		fs.writeFileSync('config.ini', ini);
		L.info('Please specify parameters in config.ini and run app again');
		process.exit();
	}
}

var globalData : any = {};
function saveGlobalData() {
	fs.writeFileSync('guildData.json5', JSON5.stringify(globalData, null, '\t'));
}
function loadGlobalData() {
	if (fs.existsSync('guildData.json5')) return;

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

loadGlobalData();

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

//client.on('debug', (m) => console.log(m));
client.on('warn', (m) => console.log(`\x1b[33m${m}\x1b[0m`));
client.on('error', (m) => console.log(`\x1b[31m${m}\x1b[0m`));
client.on("ready", async () => {
	if (configINI.getBoolean('core', 'printInviteLink'))
		L.info(`Generated invite link`, {url: generateInviteUrl()});
});

client.login(configINI.get('core', 'token'));