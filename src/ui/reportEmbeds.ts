import { EmbedBuilder } from "discord.js";

function baseReport(title: string, color: number, gradeName: string, memberId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`**${gradeName}**  |  <@${memberId}>`)
    .setTimestamp();
}

export function createTransportEmbed(options: {
  gradeName: string;
  memberId: string;
  agents: string;
  pickup: string;
  detainee: string;
}): EmbedBuilder {
  return baseReport("🚓 Transport penitenciar", 0x3b82f6, options.gradeName, options.memberId)
    .addFields(
      { name: "Agent responsabil", value: options.agents },
      { name: "Preluat de la", value: options.pickup, inline: true },
      { name: "Nume detinut", value: options.detainee, inline: true },
    )
    .setFooter({ text: "Raport transport" });
}

export function createVizitaEmbed(options: {
  gradeName: string;
  memberId: string;
  visitor: string;
  agents: string;
  detainee: string;
  dateTime: string;
}): EmbedBuilder {
  return baseReport("👀 Vizita detinut", 0x8b5cf6, options.gradeName, options.memberId)
    .addFields(
      { name: "Nume vizitator", value: options.visitor, inline: true },
      { name: "Nume detinut", value: options.detainee, inline: true },
      { name: "Agent operativ responsabil", value: options.agents },
      { name: "Data si ora", value: options.dateTime },
    )
    .setFooter({ text: "Raport vizita" });
}

export function createCarceraEmbed(options: {
  gradeName: string;
  memberId: string;
  detainee: string;
  months: string;
  reason: string;
}): EmbedBuilder {
  return baseReport("⛓️ Prelungire carcera", 0xf59e0b, options.gradeName, options.memberId)
    .addFields(
      { name: "Agent responsabil", value: `<@${options.memberId}>` },
      { name: "Detinut", value: options.detainee, inline: true },
      { name: "Luni adaugate", value: options.months, inline: true },
      { name: "Motiv", value: options.reason },
    )
    .setFooter({ text: "Asteapta aprobarea unui grad autorizat" });
}
