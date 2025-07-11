import { SlashCommand, humanizeDuration, updateSlashCommands } from './../slash-commands';
import { EmbedBuilder } from 'discord.js';
import * as L from './../logger';

const updateCommand = new SlashCommand()
.setName('update')
.setDescription('Updates slash commands of bot')
.setDescriptionLocalization('ru', "Обновляет слэш-команды бота")
.setChatInput(async(interaction) => {
	if (interaction.guild == null) return;

	await updateSlashCommands(interaction.guild);
	L.info(`Command update success`, { user: `${interaction.user.username} (${interaction.guild.name})` });
	await interaction.reply({embeds: [new EmbedBuilder()
		.setTitle(`:white_check_mark: Слэш-команды были успешно обновлены`)
		.setColor("#77b255")
		.setFooter({text: `Пинг: ${humanizeDuration(interaction.createdTimestamp - Date.now())}`})
	]});
});

export function main(): SlashCommand[] {
	return [updateCommand];
}