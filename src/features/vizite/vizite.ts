import {
  ChannelType,
  MessageFlags,
  ModalBuilder,
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
import { ensureReportsPanel } from "../rapoarte/reportsPanel.js";
import { sanitizeFormText } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";
import { sendActionLog } from "../../services/logService.js";
import { ids } from "../../ui/ids.js";
import { createTextField, createUserField } from "../../ui/modalFields.js";
import { createEditRow } from "../../ui/reportButtons.js";
import { createVizitaEmbed } from "../../ui/reportEmbeds.js";

async function getMember(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

export async function showVizitaModal(interaction: ButtonInteraction): Promise<void> {
  const member = await getMember(interaction);

  if (!member || !getGradeRole(member)) {
    await interaction.reply({
      content: "Nu ai un grad configurat pentru sistemul de vizite.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(ids.vizitaModal)
    .setTitle("Creeaza vizita")
    .addLabelComponents(
      createUserField({
        label: "Agent secundar",
        customId: ids.vizitaSecondary,
        placeholder: "Selecteaza un membru",
        required: false,
      }),
      createTextField({
        label: "Nume vizitator",
        customId: ids.vizitaVisitor,
        placeholder: "Ex: Marus Malius 57255",
      }),
      createTextField({
        label: "Nume detinut",
        customId: ids.vizitaDetainee,
        placeholder: "Ex: Radu Florin 1010",
      }),
      createTextField({
        label: "Data si ora",
        customId: ids.vizitaDateTime,
        placeholder: "Ex: 18.08.2026 20:10-20:20",
      }),
    );

  await interaction.showModal(modal);
}

export async function handleVizitaSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = await getMember(interaction);
  const grade = member ? getGradeRole(member) : null;

  if (!member || !grade) {
    await interaction.editReply("Nu am putut identifica gradul tau din Discord.");
    return;
  }

  const selectedUser = interaction.fields.getSelectedUsers(ids.vizitaSecondary, false)?.first();
  let secondary: GuildMember | null = null;

  if (selectedUser) {
    if (selectedUser.id === member.id) {
      await interaction.editReply("Agentul secundar trebuie sa fie o alta persoana.");
      return;
    }

    secondary = await interaction.guild?.members.fetch(selectedUser.id).catch(() => null) ?? null;

    // Botii pot fi folositi ca tag de rezerva, oamenii trebuie sa aiba grad configurat.
    if (!secondary || (!secondary.user.bot && !getGradeRole(secondary))) {
      await interaction.editReply("Agentul secundar selectat nu este un agent valid.");
      return;
    }
  }

  const visitor = sanitizeFormText(interaction.fields.getTextInputValue(ids.vizitaVisitor));
  const detainee = sanitizeFormText(interaction.fields.getTextInputValue(ids.vizitaDetainee));
  const dateTime = sanitizeFormText(interaction.fields.getTextInputValue(ids.vizitaDateTime));
  const channel = await interaction.client.channels.fetch(env.viziteChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    await interaction.editReply("Canalul de vizite nu este configurat corect.");
    return;
  }

  let dossierNumber: number;

  try {
    dossierNumber = await nextDossierNumber("vizita");
  } catch (error) {
    console.error("Nu am putut genera dosarul de vizita:", error);
    await interaction.editReply("Registrul ANP nu este disponibil momentan. Vizita nu a fost inregistrata.");
    return;
  }

  const dossierId = formatDossierId("vizita", dossierNumber);
  const agents = [`<@${member.id}>`, secondary ? `<@${secondary.id}>` : null].filter(Boolean).join("  ");
  const allowedUsers = [member.id, secondary?.id].filter((id): id is string => Boolean(id));
  const embed = createVizitaEmbed({
    dossierId,
    gradeName: grade.name,
    memberId: member.id,
    visitor,
    agents,
    detainee,
    dateTime,
  });

  const report = await channel.send({
    embeds: [embed],
    components: [createEditRow(ids.vizitaEditButton)],
    allowedMentions: {
      parse: [],
      users: allowedUsers,
    },
  });

  try {
    await registerReport({
      messageId: report.id,
      reportType: "vizita",
      dossierNumber,
      primaryUserId: member.id,
      secondaryUserId: secondary && !secondary.user.bot ? secondary.id : null,
      approved: true,
    });
  } catch (error) {
    console.error("Nu am putut arhiva vizita in baza de date:", error);
    await report.delete().catch(() => null);
    await interaction.editReply("Vizita nu a putut fi arhivata in registrul ANP.");
    return;
  }

  await ensureReportsPanel(interaction.client).catch((error) => {
    console.error("Nu am putut actualiza panoul de rapoarte:", error);
  });
  await sendActionLog(interaction.client, "vizita", member, channel.id, dossierId, report.url);
  await interaction.editReply(`Vizita a fost inregistrata in registrul **${dossierId}**.`);
}
