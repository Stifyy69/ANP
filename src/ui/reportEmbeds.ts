import { EmbedBuilder } from "discord.js";

function baseReport(
  title: string,
  color: number,
  gradeName: string,
  memberId: string,
  timestamp?: Date,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`**Intocmit de:** **${gradeName}** | <@${memberId}>`)
    .setTimestamp(timestamp ?? new Date());
}

export function createTransportEmbed(options: {
  dossierId?: string;
  gradeName: string;
  memberId: string;
  agents: string;
  pickup: string;
  detainee: string;
  timestamp?: Date;
}): EmbedBuilder {
  const title = options.dossierId
    ? `DOSAR ${options.dossierId} | Transport penitenciar`
    : "Transport penitenciar";

  return baseReport(title, 0x3b82f6, options.gradeName, options.memberId, options.timestamp)
    .addFields(
      { name: "Agent responsabil", value: options.agents },
      { name: "Preluat de la", value: options.pickup, inline: true },
      { name: "Nume detinut", value: options.detainee, inline: true },
    )
    .setFooter({ text: "Inregistrat in registrul operational de transport ANP" });
}

export function createVizitaEmbed(options: {
  dossierId?: string;
  gradeName: string;
  memberId: string;
  visitor: string;
  agents: string;
  detainee: string;
  dateTime: string;
  timestamp?: Date;
}): EmbedBuilder {
  const title = options.dossierId
    ? `REGISTRU ${options.dossierId} | Vizita detinut`
    : "Vizita detinut";

  return baseReport(title, 0x8b5cf6, options.gradeName, options.memberId, options.timestamp)
    .addFields(
      { name: "Nume vizitator", value: options.visitor, inline: true },
      { name: "Nume detinut", value: options.detainee, inline: true },
      { name: "Agent operativ responsabil", value: options.agents },
      { name: "Data si ora", value: options.dateTime },
    )
    .setFooter({ text: "Inregistrat in registrul de vizite ANP" });
}

export function createCarceraEmbed(options: {
  dossierId?: string;
  gradeName: string;
  memberId: string;
  detainee: string;
  months: string;
  reason: string;
  timestamp?: Date;
}): EmbedBuilder {
  const title = options.dossierId
    ? `DOSAR DISCIPLINAR ${options.dossierId}`
    : "Prelungire carcera";

  return baseReport(title, 0xf59e0b, options.gradeName, options.memberId, options.timestamp)
    .addFields(
      { name: "Agent responsabil", value: `<@${options.memberId}>` },
      { name: "Detinut", value: options.detainee, inline: true },
      { name: "Luni adaugate", value: options.months, inline: true },
      { name: "Motiv", value: options.reason },
    )
    .setFooter({ text: "Dosar in asteptarea avizului unui grad autorizat" });
}
