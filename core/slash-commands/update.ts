import { SlashCommand, humanizeDuration, updateSlashCommands } from './../slash-commands';
import { EmbedBuilder } from 'discord.js';
import * as L from './../logger';

const updateCommand = new SlashCommand()
.setName('update')
.setDescription('Updates slash commands of bot')
.setDescriptionLocalization('ru', "Обновляет слэш-команды бота")
.setChatInput(async(interaction) => {
	if (interaction.guild == null) return;

	const start = Date.now();
	await interaction.deferReply();
	await updateSlashCommands(interaction.guild);
	L.info(`Command update success`, { user: `${interaction.user.username} (${interaction.guild.name})` });
	await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:white_check_mark: Слэш-команды были успешно обновлены`)
		.setColor("#77b255")
		.setFooter({text: `Время обработки: ${humanizeDuration(Date.now() - start)}`})
	]});
});

export function main(): SlashCommand[] {
	return [updateCommand];
}