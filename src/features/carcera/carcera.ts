import {
  ChannelType,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { env } from "../../config/env.js";
import {
  formatDossierId,
  nextDossierNumber,
  registerReport,
} from "../../database/database.js";
import { sanitizeFormText } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";
import { sendActionLog } from "../../services/logService.js";
import { ids } from "../../ui/ids.js";
import { createTextField } from "../../ui/modalFields.js";
import { createCarceraPendingRow } from "../../ui/reportButtons.js";
import { createCarceraEmbed } from "../../ui/reportEmbeds.js";

async function getMember(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

export async function showCarceraModal(interaction: ButtonInteraction): Promise<void> {
  const member = await getMember(interaction);

  if (!member || !getGradeRole(member)) {
    await interaction.reply({
      content: "Nu ai un grad configurat pentru sistemul de carcera.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(ids.carceraModal)
    .setTitle("Creeaza prelungire")
    .addLabelComponents(
      createTextField({
        label: "Detinut",
        customId: ids.carceraDetainee,
        placeholder: "Ex: Radu Florin 1010",
      }),
      createTextField({
        label: "Luni adaugate",
        customId: ids.carceraMonths,
        placeholder: "Ex: 20",
      }),
      createTextField({
        label: "Motiv",
        customId: ids.carceraReason,
        placeholder: "Motivul prelungirii",
        style: TextInputStyle.Paragraph,
      }),
    );

  await interaction.showModal(modal);
}

export async function handleCarceraSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = await getMember(interaction);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await interaction.editReply("Nu am putut identifica gradul tau din Discord.");
    return;
  }

  const detainee = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraDetainee));
  const months = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraMonths));
  const reason = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraReason));
  const channel = await interaction.client.channels.fetch(env.carceraChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    await interaction.editReply("Canalul de carcera nu este configurat corect.");
    return;
  }

  let dossierNumber: number;

  try {
    dossierNumber = await nextDossierNumber("carcera");
  } catch (error) {
    console.error("Nu am putut genera dosarul disciplinar:", error);
    await interaction.editReply("Registrul ANP nu este disponibil momentan. Dosarul nu a fost inregistrat.");
    return;
  }

  const dossierId = formatDossierId("carcera", dossierNumber);
  const embed = createCarceraEmbed({
    dossierId,
    gradeName: grade.name,
    memberId: member.id,
    detainee,
    months,
    reason,
  });

  const report = await channel.send({
    embeds: [embed],
    components: [createCarceraPendingRow()],
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });

  try {
    await registerReport({
      messageId: report.id,
      reportType: "carcera",
      dossierNumber,
      primaryUserId: member.id,
      approved: false,
    });
  } catch (error) {
    console.error("Nu am putut arhiva dosarul disciplinar:", error);
    await report.delete().catch(() => null);
    await interaction.editReply("Dosarul disciplinar nu a putut fi arhivat in registrul ANP.");
    return;
  }

  await sendActionLog(interaction.client, "carcera", member, channel.id, dossierId, report.url);
  await interaction.editReply(`Dosarul disciplinar **${dossierId}** a fost inaintat spre aprobare.`);
}
