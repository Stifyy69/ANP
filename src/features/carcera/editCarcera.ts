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
import { sanitizeFormText } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";
import { sendEditLog } from "../../services/logService.js";
import {
  getMessageIdFromModal,
  getReportCreatorId,
  getReportDossierId,
  getReportField,
  getReportTimestamp,
  messageHasButton,
} from "../../services/reportMessage.js";
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

function isPending(message: ButtonInteraction["message"]): boolean {
  return messageHasButton(message, ids.carceraApprove) && messageHasButton(message, ids.carceraReject);
}

export async function showCarceraEditModal(interaction: ButtonInteraction): Promise<void> {
  if (interaction.channelId !== env.carceraChannelId) {
    return;
  }

  const creatorId = getReportCreatorId(interaction.message);

  if (!creatorId || creatorId !== interaction.user.id) {
    await interaction.reply({
      content: "Doar persoana care a creat aceasta prelungire o poate modifica.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isPending(interaction.message)) {
    await interaction.reply({
      content: "O prelungire aprobata sau respinsa nu mai poate fi modificata.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const detainee = getReportField(interaction.message, "Detinut");
  const months = getReportField(interaction.message, "Luni adaugate");
  const reason = getReportField(interaction.message, "Motiv");

  if (!detainee || !months || !reason) {
    await interaction.reply({
      content: "Nu am putut citi datele acestei prelungiri.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${ids.carceraEditModalPrefix}${interaction.message.id}`)
    .setTitle("Modifica prelungire")
    .addLabelComponents(
      createTextField({
        label: "Detinut",
        customId: ids.carceraDetainee,
        value: detainee,
      }),
      createTextField({
        label: "Luni adaugate",
        customId: ids.carceraMonths,
        value: months,
      }),
      createTextField({
        label: "Motiv",
        customId: ids.carceraReason,
        value: reason,
        style: TextInputStyle.Paragraph,
      }),
    );

  await interaction.showModal(modal);
}

export async function handleCarceraEditSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messageId = getMessageIdFromModal(interaction.customId, ids.carceraEditModalPrefix);
  const channel = await interaction.client.channels.fetch(env.carceraChannelId).catch(() => null);

  if (!messageId || !channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    await interaction.editReply("Nu am putut gasi prelungirea.");
    return;
  }

  const report = await channel.messages.fetch(messageId).catch(() => null);

  if (!report || getReportCreatorId(report) !== interaction.user.id) {
    await interaction.editReply("Doar persoana care a creat aceasta prelungire o poate modifica.");
    return;
  }

  // Verificam din nou aici, fiindca intre deschiderea formularului si salvare poate fi data o decizie.
  if (!messageHasButton(report, ids.carceraApprove) || !messageHasButton(report, ids.carceraReject)) {
    await interaction.editReply("Prelungirea a fost deja aprobata sau respinsa si nu mai poate fi modificata.");
    return;
  }

  const member = await getMember(interaction);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await interaction.editReply("Nu am putut identifica gradul tau din Discord.");
    return;
  }

  const detainee = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraDetainee));
  const months = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraMonths));
  const reason = sanitizeFormText(interaction.fields.getTextInputValue(ids.carceraReason));
  const embed = createCarceraEmbed({
    dossierId: getReportDossierId(report) ?? undefined,
    gradeName: grade.name,
    memberId: member.id,
    detainee,
    months,
    reason,
    timestamp: getReportTimestamp(report),
  });

  await report.edit({
    embeds: [embed],
    components: [createCarceraPendingRow()],
    allowedMentions: {
      parse: [],
      users: [member.id],
    },
  });

  await sendEditLog(interaction.client, "carcera", member, channel.id, report.url);
  await interaction.editReply("Dosarul disciplinar a fost modificat.");
}
