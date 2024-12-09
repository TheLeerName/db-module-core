import { setCallback, humanizeDuration, updateSlashCommands } from './../slash-commands';
import * as Discord from 'discord.js';

const updateCommand = setCallback(new Discord.SlashCommandBuilder()
.setName('update')
.setDescription('Updates slash commands of bot')
.setDescriptionLocalization('ru', "Обновляет слэш-команды бота"),
async(interaction) => {
	if (!interaction.isChatInputCommand() || interaction.guild == null) return;

	await interaction.reply({embeds: [new Discord.EmbedBuilder()
		.setTitle(`:hourglass_flowing_sand: Обновляю...`)
		.setColor("#ffe8b6")
	]});

	try {
		const count = await updateSlashCommands(interaction.guild);
		await interaction.editReply({embeds: [new Discord.EmbedBuilder()
			.setTitle(`:white_check_mark: ${count} слэш-команды были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	} catch(e) {
		await interaction.editReply({embeds: [new Discord.EmbedBuilder()
			.setTitle(`:x: Произошла ошибка при обновлении слэш-команд!`)
			.setDescription(`\`\`\`\n${e}\n\`\`\``)
			.setColor("#dd2e44")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	}
});

export function main(): Discord.SlashCommandBuilder[] {
	return [updateCommand];
}