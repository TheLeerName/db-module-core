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

export async function getDiscordChannelByID(discord_channel_id: string): Promise<Discord.Channel | null> {
	try { return await client.channels.fetch(discord_channel_id) }
	catch(e) { return null }
}
export async function getDiscordUserByID(user_id: string) {
	try { return await client.users.fetch(user_id) }
	catch(e) { return null }
}
/** gets Discord.DMChannel or creates it if it not exists */
export async function getDiscordDMChannelFromUser(user: Discord.User): Promise<Discord.DMChannel | null> {
	if (user.dmChannel) return user.dmChannel;
	try { return await user.createDM() }
	catch(e) { return null }
}

function loadConfig() {
	if (fs.existsSync('config.ini')) {
		config.fromString(fs.readFileSync('config.ini').toString());
		const coreSect = config.getSection();

		var prevVersion: number = config.header != null ? parseInt(config.header.substring('INI version '.length)) : 0;
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
	.addValue('printInviteLink', true, 'if true, invite bot link will be printed in console')
	.addValue('botCreatorDiscordID', '', 'discord profile id of person who created/hosting a bot (you!), allows to access some features by this user')
	.addValue('sendLogToDM', false, 'sends logs to botCreatorDiscordID in dm');
	loadConfig();
	var config_version_current = config.header && config.header.length > 12 ? parseInt(config.header.substring(12)) : null;
	const config_version_original = config_version_current;
	if (!config_version_current || config_version_current === 1 || config_version_current === 2) {
		config_version_current = 3;
		const twitch_section = config.sections.get("twitch-notifications");
		if (twitch_section) {
			const botCreatorDiscordID = twitch_section.getValue<string>("botCreatorDiscordID");
			if (botCreatorDiscordID) {
				coreSection.setValue("botCreatorDiscordID", botCreatorDiscordID);
				twitch_section.removeValue("botCreatorDiscordID");
			}
		}
	}
	if (config_version_original != config_version) {
		config.header = `INI version ${config_version}`;
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
	client.login(token).then(async(v) => {
		const bot_creator_id = coreSection.getValue<string>("botCreatorDiscordID");
		if (bot_creator_id && coreSection.getValue<boolean>("sendLogToDM"))
			await L.initDiscordLogging(bot_creator_id);

		L.info('Bot connected', {token});

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