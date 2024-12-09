import { setCallback, humanizeDuration } from './../slash-commands';
import * as Discord from 'discord.js';

const pingCommand = setCallback(new Discord.SlashCommandBuilder()
.setName('ping')
.setDescription('Pings bot')
.setDescriptionLocalization('ru', 'Пингует бота'),
async(interaction) => {
	if (!interaction.isChatInputCommand() || interaction.guild == null) return;

	await interaction.reply({embeds: [new Discord.EmbedBuilder()
		.setTitle(`:hourglass_flowing_sand: Пингую...`)
		.setColor("#ffe8b6")
	]});

	await interaction.editReply({embeds: [new Discord.EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг бота", value: humanizeDuration(interaction.createdTimestamp - Date.now())},
			{name: "Пинг от Discord API", value: humanizeDuration(interaction.client.ws.ping)},
			{name: "Аптайм", value: humanizeDuration(interaction.client.uptime)},
		)
		.setColor("#77b255")
	]});
});

export function main(): Discord.SlashCommandBuilder[] {
	return [pingCommand];
}