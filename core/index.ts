import fs from 'fs';
import * as Discord from 'discord.js';

import * as L from './logger';
import { INI } from './ini-parser';
import { main as SlashCommandsMain } from './slash-commands';

L.init();

const currentDataVersion = 1;

var data: {version: number, guildsData: any, modulesData: any} = {version: currentDataVersion, guildsData: {}, modulesData: {}};

export const config = new INI();
export const modules: string[] = [];
export const moduleName = "core";

function loadConfig() {
	if (fs.existsSync('config.ini')) {
		config.fromString(fs.readFileSync('config.ini').toString());
		const coreSect = config.getSection();

		var prevVersion: number = config.header != null ? parseInt(config.header.substring('INI version '.length)) : 0
		var version: number = prevVersion;
		if (version == 0) {
			version++;

			const oldCoreSect = config.getSection('core');
			for (let param of ['token', 'activity', 'printInviteLink'])
				coreSect.setValue(param, oldCoreSect.getValue(param));
			config.deleteSection('core');
		}
		// add ini version changes here
		if (prevVersion != version) {
			L.info(`Updated config.ini version from ${prevVersion} to ${version}`);
			config.header = 'INI version ' + version;
			config.save('config.ini');
		}

		if (coreSect.getValue<string>('token')!.length < 1) {
			L.error(`Parameter isn't specified in config.ini`, {missingParameter: "token"});
			process.exit();
		}
	} else {
		L.info('Creating config.ini...');

		fs.writeFileSync('config.ini', config.toString());
		L.info('Please specify parameters in config.ini and run app again');
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
});

export function main() {
	if (fs.existsSync('data.json')) data = JSON.parse(fs.readFileSync('data.json').toString());

	if (fs.existsSync(`dist/modules`)) for (let module of fs.readdirSync(`dist/modules`))
		modules.push(module);

	for (let module of modules) {
		const m = require(`../modules/${module}/index`);
		m.main?.();
	}

	const coreSection = config.getSection();
	coreSection
	.addValue('token', '', 'discord bot token: https://discord.com/developers/applications')
	.addValue('activity', 'ᗜˬᗜ', 'this will appear as activity of discord bot')
	.addValue('printInviteLink', true, 'if true, invite bot link will be printed in console');
	loadConfig();
	/*client.user.setPresence({activities: [{
		type: Discord.ActivityType.Custom,
		name: coreSection.getValue('activity') ?? ""
	}]});*/

	if (modules.length > 0) L.info('Modules loaded', {modules: modules.join(', ')});

	SlashCommandsMain();

	const token = coreSection.getValue<string>('token')!;
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
	if (config.getSection(moduleName).getValue<boolean>('printInviteLink')!)
		L.info(`Generated invite link`, {url: generateInviteUrl()});
});