import { client, modules } from './index';
import * as L from './logger';

import fs from 'fs';
import hD from 'humanize-duration';
import * as Discord from 'discord.js';

export class SlashCommand extends Discord.SlashCommandBuilder {
	chatInput: SlashCommandChatInput | null = null;
	autocomplete: SlashCommandAutocomplete | null = null;
	subcommands: SlashSubcommand[] = [];

	setChatInput(chatInput: SlashCommandChatInput) {
		this.chatInput = chatInput;
		return this;
	}
	setAutocomplete(autocomplete: SlashCommandAutocomplete) {
		this.autocomplete = autocomplete;
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
	chatInput: SlashCommandChatInput | null = null;
	autocomplete: SlashCommandAutocomplete | null = null;

	setChatInput(chatInput: SlashCommandChatInput) {
		this.chatInput = chatInput;
		return this;
	}
	setAutocomplete(autocomplete: SlashCommandAutocomplete) {
		this.autocomplete = autocomplete;
		return this;
	}
}

export type SlashCommandChatInput = (interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>)=>Promise<any | void>;
export type SlashCommandAutocomplete = (interaction: Discord.AutocompleteInteraction<Discord.CacheType>)=>Promise<any | void>;
//export const globalSlashCommands: SlashCommand[] = []; // for future
export const guildSlashCommands: SlashCommand[] = [];

export function humanizeDuration(n: number) {
	return hD(n, {language: "ru", units: ["d", "h", "m", "s", "ms"]});
}

export async function updateSlashCommands(guild: Discord.Guild) {
	await guild.commands.set(guildSlashCommands.map(v => v.toJSON()));
}

function loadSlashCommandsScriptsFromFolder(folder: string) {
	folder = __dirname.replaceAll('\\', '/') + '/' + folder;
	if (fs.existsSync(folder)) for (let commandScript of fs.readdirSync(folder))
		if (commandScript.endsWith('.js')) {
			const m = require(folder + '/' + commandScript.substring(0, commandScript.lastIndexOf('.')));
			if (m.main != null) guildSlashCommands.push(...m.main());
		}
}

export function main() {
	for (let module of modules) loadSlashCommandsScriptsFromFolder('../modules/' + module + '/slash-commands'); // dist/modules/<module>/slash-commands
	loadSlashCommandsScriptsFromFolder('slash-commands'); // dist/core/slash-commands

	if (guildSlashCommands.length > 0) {
		//client.on('ready', client => { for (let guild of client.guilds.cache.values()) updateSlashCommands(guild); });
		client.on('guildCreate', updateSlashCommands);
		client.on('interactionCreate', interactionCreate);

		var commands = []; for (let command of guildSlashCommands) commands.push(command.name);
		L.info('Slash commands loaded', {commands: commands.join(', ')});
	}
}

async function interactionCreate(interaction: Discord.Interaction) {
	if (interaction.isChatInputCommand() || interaction.isAutocomplete())
		for (let slashCommand of guildSlashCommands)
			if (slashCommand.name == interaction.commandName) {
				if (interaction.isChatInputCommand()) slashCommand.chatInput?.(interaction);
				else if (interaction.isAutocomplete()) slashCommand.autocomplete?.(interaction);
				for (let slashSubcommand of slashCommand.subcommands)
					if (slashSubcommand.name == interaction.options.getSubcommand()) {
						if (interaction.isChatInputCommand()) slashSubcommand.chatInput?.(interaction);
						else if (interaction.isAutocomplete()) slashSubcommand.autocomplete?.(interaction);
					}
			}
}