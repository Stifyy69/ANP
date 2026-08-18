import {
  ChannelType,
  MessageFlags,
  ModalBuilder,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { env } from "../../config/env.js";
import { sanitizeFormText } from "../../services/discordText.js";
import { getGradeRole } from "../../services/gradeService.js";
import { sendActionLog } from "../../services/logService.js";
import { ids } from "../../ui/ids.js";
import { createTextField, createUserField } from "../../ui/modalFields.js";
import { createTransportEmbed } from "../../ui/reportEmbeds.js";

async function getMember(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<GuildMember | null> {
  if (!interaction.guild) {
    return null;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

export async function showTransportModal(interaction: ButtonInteraction): Promise<void> {
  const member = await getMember(interaction);

  if (!member || !getGradeRole(member)) {
    await interaction.reply({
      content: "Nu ai un grad configurat pentru sistemul de transporturi.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(ids.transportModal)
    .setTitle("Creeaza transport")
    .addLabelComponents(
      createUserField({
        label: "Agent secundar",
        customId: ids.transportSecondary,
        placeholder: "Selecteaza un membru",
        required: false,
      }),
      createTextField({
        label: "Preluat de la",
        customId: ids.transportPickup,
        placeholder: "Ex: Tudor Mihai / IPJ",
      }),
      createTextField({
        label: "Nume detinut",
        customId: ids.transportDetainee,
        placeholder: "Ex: Radu Florin 1010",
      }),
    );

  await interaction.showModal(modal);
}

export async function handleTransportSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    if (!secondary || secondary.user.bot || !getGradeRole(secondary)) {
      await interaction.editReply("Agentul secundar selectat nu este un agent valid.");
      return;
    }
  }

  const pickup = sanitizeFormText(interaction.fields.getTextInputValue(ids.transportPickup));
  const detainee = sanitizeFormText(interaction.fields.getTextInputValue(ids.transportDetainee));
  const channel = await interaction.client.channels.fetch(env.transportChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== env.guildId) {
    await interaction.editReply("Canalul de transporturi nu este configurat corect.");
    return;
  }

  const agents = [`<@${member.id}>`, secondary ? `<@${secondary.id}>` : null].filter(Boolean).join("  ");
  const allowedUsers = [member.id, secondary?.id].filter((id): id is string => Boolean(id));
  const embed = createTransportEmbed({
    gradeName: grade.name,
    memberId: member.id,
    agents,
    pickup,
    detainee,
  });

  await channel.send({
    embeds: [embed],
    allowedMentions: {
      parse: [],
      users: allowedUsers,
    },
  });

  await sendActionLog(interaction.client, "transport", member, channel.id);
  await interaction.editReply("Transportul a fost creat.");
}
