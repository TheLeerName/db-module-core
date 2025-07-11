import fs from 'fs';
import * as Discord from 'discord.js';

import * as L from './logger';
import { INI } from './ini-parser';
import { Data, config_version } from './data';
import { main as SlashCommandsMain } from './slash-commands';

L.init();

export const all_data = new Data();
export const config = new INI();
export const version = "__VERSION__";
export const modules: string[] = [];
export const moduleName = "core";

export async function getDiscordChannelByID(discord_channel_id: string): Promise<Discord.Channel | false> {
	var channel = client.channels.cache.get(discord_channel_id) ?? null;
	if (!channel) {
		channel = await client.channels.fetch(discord_channel_id);
		if (channel) client.channels.cache.set(discord_channel_id, channel);
	}
	if (channel == null) return false;
	return channel;
}

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
	L.info(`Running version ${version}`);

	if (fs.existsSync(`dist/modules`)) for (let module of fs.readdirSync(`dist/modules`))
		modules.push(module);

	const modules_require = [];
	for (let module of modules) {
		const m = require(`../modules/${module}/index`);
		modules_require.push(m);
		m.main?.();
	}

	const coreSection = config.getSection();
	coreSection
	.addValue('token', '', 'discord bot token: https://discord.com/developers/applications')
	.addValue('activity', 'ᗜˬᗜ', 'this will appear as activity of discord bot')
	.addValue('printInviteLink', true, 'if true, invite bot link will be printed in console');
	loadConfig();
	const header = `INI version ${config_version}`;
	if (config.header !== header) {
		config.header = header;
		config.save("config.ini");
		L.info(`File config.ini was updated to version ${config_version}, check new options and run then app again`);
		process.exit(0);
	}

	const args = process.argv.slice(2);
	for (let m of modules_require) {
		if (m.terminalCommands?.(args) === true) return process.exit(0);
	}

	if (modules.length > 0) L.info('Modules loaded', {modules: modules.join(', ')});

	SlashCommandsMain();

	const token = coreSection.getValue<string>('token')!;
	client.login(token).then((v) => {
		L.info('Client connected', {token});
		client.user.setPresence({activities: [{
			type: Discord.ActivityType.Custom,
			name: (coreSection.getValue<string>('activity') ?? "").replaceAll("%version%", version)
		}]});
	});
}

//client.on('debug', (m) => console.log(m));
client.on('warn', (m) => console.log(`\x1b[33m${m}\x1b[0m`));
client.on('error', (e) => { throw e; });
client.on("ready", async () => {
	if (config.getSection(moduleName).getValue<boolean>('printInviteLink')!)
		L.info(`Generated invite link`, {url: generateInviteUrl()});
});