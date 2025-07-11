import { SlashCommand, humanizeDuration } from './../slash-commands';
import { EmbedBuilder } from 'discord.js';
import * as L from './../logger';

const pingCommand = new SlashCommand()
.setName('ping')
.setDescription('Pings bot')
.setDescriptionLocalization('ru', 'Пингует бота')
.setChatInput(async(interaction) => {
	const ping_bot = interaction.createdTimestamp - Date.now();
	const ping_api = interaction.client.ws.ping;
	const uptime = interaction.client.uptime;

	L.info(`Command ping success`, {
		user: interaction.user.username + (interaction.guild ? ` (${interaction.guild.name})` : ""),
		ping_bot: `${ping_bot}ms`,
		ping_discord_api: `${ping_api}ms`,
		uptime: `${uptime / 1000}s`
	});

	await interaction.reply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг бота", value: humanizeDuration(ping_bot)},
			{name: "Пинг от Discord API", value: humanizeDuration(ping_api)},
			{name: "Аптайм", value: humanizeDuration(interaction.client.uptime)},
		)
		.setColor("#77b255")
	]});
});

export function main(): SlashCommand[] {
	return [pingCommand];
}