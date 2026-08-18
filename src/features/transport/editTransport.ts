import {
  ChannelType,
  MessageFlags,
  ModalBuilder,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { env } from "../../config/env.js";
import { updateReportParticipants } from "../../database/database.js";
import { ensureReportsPanel } from "../rapoarte/reportsPanel.js";
import { sanitizeFormText } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";
import { sendEditLog } from "../../services/logService.js";
import {
  getMentionIds,
  getMessageIdFromModal,
  getReportCreatorId,
  getReportDossierId,
  getReportField,
  getReportTimestamp,
} from "../../services/reportMessage.js";
import { ids } from "../../ui/ids.js";
import { createTextField, createUserField } from "../../ui/modalFields.js";
import { createEditRow } from "../../ui/reportButtons.js";
import { createTransportEmbed } from "../../ui/reportEmbeds.js";

async function getMember(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

export async function showTransportEditModal(interaction: ButtonInteraction): Promise<void> {
  if (interaction.channelId !== env.transportChannelId) {
    return;
  }

  const creatorId = getReportCreatorId(interaction.message);

  if (!creatorId || creatorId !== interaction.user.id) {
    await interaction.reply({
      content: "Doar persoana care a creat acest transport il poate modifica.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const agents = getReportField(interaction.message, "Agent responsabil");
  const pickup = getReportField(interaction.message, "Preluat de la");
  const detainee = getReportField(interaction.message, "Nume detinut");

  if (!agents || !pickup || !detainee) {
    await interaction.reply({
      content: "Nu am putut citi datele acestui transport.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const secondaryId = getMentionIds(agents).find((userId) => userId !== creatorId);
  const modal = new ModalBuilder()
    .setCustomId(`${ids.transportEditModalPrefix}${interaction.message.id}`)
    .setTitle("Modifica transport")
    .addLabelComponents(
      createUserField({
        label: "Agent secundar",
        customId: ids.transportSecondary,
        placeholder: "Selecteaza un membru",
        defaultUserId: secondaryId,
        required: false,
      }),
      createTextField({
        label: "Preluat de la",
        customId: ids.transportPickup,
        value: pickup,
      }),
      createTextField({
        label: "Nume detinut",
        customId: ids.transportDetainee,
        value: detainee,
      }),
    );

  await interaction.showModal(modal);
}

export async function handleTransportEditSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messageId = getMessageIdFromModal(interaction.customId, ids.transportEditModalPrefix);
  const channel = await interaction.client.channels.fetch(env.transportChannelId).catch(() => null);

  if (!messageId || !channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    await interaction.editReply("Nu am putut gasi raportul de transport.");
    return;
  }

  const report = await channel.messages.fetch(messageId).catch(() => null);

  if (!report || getReportCreatorId(report) !== interaction.user.id) {
    await interaction.editReply("Doar persoana care a creat acest transport il poate modifica.");
    return;
  }

  const member = await getMember(interaction);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await interaction.editReply("Nu am putut identifica gradul tau din Discord.");
    return;
  }

  const selectedUser = interaction.fields.getSelectedUsers(ids.transportSecondary, false)?.first();
  let secondary: GuildMember | null = null;

  if (selectedUser) {
    if (selectedUser.id === member.id) {
      await interaction.editReply("Agentul secundar trebuie sa fie o alta persoana.");
      return;
    }

    secondary = await interaction.guild?.members.fetch(selectedUser.id).catch(() => null) ?? null;

    if (!secondary || (!secondary.user.bot && !getGradeRole(secondary))) {
      await interaction.editReply("Agentul secundar selectat nu este un agent valid.");
      return;
    }
  }

  const pickup = sanitizeFormText(interaction.fields.getTextInputValue(ids.transportPickup));
  const detainee = sanitizeFormText(interaction.fields.getTextInputValue(ids.transportDetainee));
  const agents = [`<@${member.id}>`, secondary ? `<@${secondary.id}>` : null].filter(Boolean).join("  ");
  const allowedUsers = [member.id, secondary?.id].filter((id): id is string => Boolean(id));
  const dossierId = getReportDossierId(report) ?? undefined;
  const embed = createTransportEmbed({
    dossierId,
    gradeName: grade.name,
    memberId: member.id,
    agents,
    pickup,
    detainee,
    timestamp: getReportTimestamp(report),
  });

  await report.edit({
    embeds: [embed],
    components: [createEditRow(ids.transportEditButton)],
    allowedMentions: {
      parse: [],
      users: allowedUsers,
    },
  });

  await updateReportParticipants(
    report.id,
    member.id,
    secondary && !secondary.user.bot ? secondary.id : null,
  );
  await ensureReportsPanel(interaction.client).catch((error) => {
    console.error("Nu am putut actualiza panoul de rapoarte:", error);
  });
  await sendEditLog(interaction.client, "transport", member, channel.id, dossierId, report.url);
  await interaction.editReply("Transportul a fost modificat si evidenta a fost actualizata.");
}
