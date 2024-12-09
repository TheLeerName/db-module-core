import { SlashCommand, humanizeDuration, updateSlashCommands } from './../slash-commands';
import { EmbedBuilder } from 'discord.js';

const updateCommand = new SlashCommand()
.setName('update')
.setDescription('Updates slash commands of bot')
.setDescriptionLocalization('ru', "Обновляет слэш-команды бота")
.setCallback(async(interaction) => {
	if (interaction.guild == null || !interaction.isChatInputCommand()) return;

	await interaction.reply({embeds: [new EmbedBuilder()
		.setTitle(`:hourglass_flowing_sand: Обновляю...`)
		.setColor("#ffe8b6")
	]});

	try {
		const count = await updateSlashCommands(interaction.guild);
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: ${count} слэш-команды были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	} catch(e) {
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:x: Произошла ошибка при обновлении слэш-команд!`)
			.setDescription(`\`\`\`\n${e}\n\`\`\``)
			.setColor("#dd2e44")
			.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
		]});
	}
});

export function main(): SlashCommand[] {
	return [updateCommand];
}