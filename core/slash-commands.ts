import { client, modules } from './index';
import * as L from './logger';

import fs from 'fs';
import hD from 'humanize-duration';
import * as Discord from 'discord.js';

export class SlashCommand extends Discord.SlashCommandBuilder {
	callback: SlashCommandCallback | null = null;
	subcommands: SlashSubcommand[] = [];

	setCallback(callback: SlashCommandCallback) {
		this.callback = callback;
		return this;
	}

	addSubcommands(...subcommands: SlashSubcommand[]) {
		for (let subcommand of subcommands) {
			this.addSubcommand(subcommand);
			this.subcommands.push(subcommand);
		}
		return this;
	}
}

export class SlashSubcommand extends Discord.SlashCommandSubcommandBuilder {
	callback: SlashCommandCallback;

	setCallback(callback: SlashCommandCallback) {
		this.callback = callback;
		return this;
	}
}

export type SlashCommandCallback = (interaction: Discord.ChatInputCommandInteraction<Discord.CacheType> | Discord.AutocompleteInteraction<Discord.CacheType>)=>Promise<void>;
export const slashCommands: SlashCommand[] = [];

export function humanizeDuration(n: number) {
	return hD(n, {language: "ru", units: ["d", "h", "m", "s", "ms"]});
}

export async function updateSlashCommands(guild: Discord.Guild): Promise<number> {
	const commandsJSON = [];
	for (let slashCommand of slashCommands) commandsJSON.push(slashCommand.toJSON());
	await guild.commands.set(commandsJSON);

	L.info(`Successfully updated ${commandsJSON.length} slash commands`);
	return commandsJSON.length;
}

function loadSlashCommandsScriptsFromFolder(folder: string) {
	folder = __dirname.replaceAll('\\', '/') + '/' + folder;
	if (fs.existsSync(folder)) for (let commandScript of fs.readdirSync(folder))
		if (commandScript.endsWith('.js')) {
			const m = require(folder + '/' + commandScript.substring(0, commandScript.lastIndexOf('.')));
			if (m.main != null) slashCommands.push(...m.main());
		}
}

export function main() {
	for (let module of modules) loadSlashCommandsScriptsFromFolder('../modules/' + module + '/slash-commands');
	loadSlashCommandsScriptsFromFolder('slash-commands');

	if (slashCommands.length > 0) {
		//client.on('ready', client => { for (let guild of client.guilds.cache.values()) updateSlashCommands(guild); });
		client.on('guildCreate', updateSlashCommands);
		client.on('interactionCreate', interactionCreate);

		var commands = []; for (let command of slashCommands) commands.push(command.name);
		L.info('Slash commands loaded', {commands: commands.join(', ')});
	}
}

async function interactionCreate(interaction: Discord.Interaction) {
	if (interaction.isChatInputCommand() || interaction.isAutocomplete())
		for (let slashCommand of slashCommands)
			if (slashCommand.name == interaction.commandName) {
				slashCommand.callback?.(interaction);
				for (let slashSubcommand of slashCommand.subcommands)
					if (slashSubcommand.name == interaction.options.getSubcommand())
						slashSubcommand.callback?.(interaction);
			}
}