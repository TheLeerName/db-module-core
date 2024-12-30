import { SlashCommand, humanizeDuration } from './../slash-commands';
import { EmbedBuilder } from 'discord.js';

const pingCommand = new SlashCommand()
.setName('ping')
.setDescription('Pings bot')
.setDescriptionLocalization('ru', 'Пингует бота')
.setCallback(async(interaction) => {
	if (interaction.guild == null || !interaction.isChatInputCommand()) return;

	try {
		await interaction.reply({embeds: [new EmbedBuilder()
			.setTitle(`:ping_pong: Понг!`)
			.addFields(
				{name: "Пинг бота", value: humanizeDuration(interaction.createdTimestamp - Date.now())},
				{name: "Пинг от Discord API", value: humanizeDuration(interaction.client.ws.ping)},
				{name: "Аптайм", value: humanizeDuration(interaction.client.uptime)},
			)
			.setColor("#77b255")
		]});
	} catch(e) {
		await interaction.reply({embeds: [new EmbedBuilder()
			.setTitle(`:x: Произошла ошибка при пинге бота!`)
			.setDescription(`\`\`\`\n${e}\n\`\`\``)
			.setColor("#dd2e44")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	}
});

export function main(): SlashCommand[] {
	return [pingCommand];
}