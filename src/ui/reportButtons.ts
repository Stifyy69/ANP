import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ids } from "./ids.js";

export function createEditRow(customId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel("Modifica")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function createCarceraPendingRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.carceraEditButton)
      .setLabel("Modifica")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ids.carceraApprove)
      .setLabel("Aprobat")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ids.carceraReject)
      .setLabel("Respins")
      .setStyle(ButtonStyle.Danger),
  );
}
