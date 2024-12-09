import { setCallback, humanizeDuration } from './../slash-commands';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const pingCommand = setCallback(new SlashCommandBuilder()
.setName('ping')
.setDescription('Pings bot')
.setDescriptionLocalization('ru', 'Пингует бота'),
async(interaction) => {
	if (interaction.guild == null || !interaction.isChatInputCommand()) return;

	await interaction.reply({embeds: [new EmbedBuilder()
		.setTitle(`:hourglass_flowing_sand: Пингую...`)
		.setColor("#ffe8b6")
	]});

	try {
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:ping_pong: Понг!`)
			.addFields(
				{name: "Пинг бота", value: humanizeDuration(interaction.createdTimestamp - Date.now())},
				{name: "Пинг от Discord API", value: humanizeDuration(interaction.client.ws.ping)},
				{name: "Аптайм", value: humanizeDuration(interaction.client.uptime)},
			)
			.setColor("#77b255")
		]});
	} catch(e) {
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:x: Произошла ошибка при пинге бота!`)
			.setDescription(`\`\`\`\n${e}\n\`\`\``)
			.setColor("#dd2e44")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	}
});

export function main(): SlashCommandBuilder[] {
	return [pingCommand];
}