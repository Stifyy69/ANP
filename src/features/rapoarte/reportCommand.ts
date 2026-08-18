import {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
} from "discord.js";
import { env } from "../../config/env.js";
import {
  getAgentStatsForPeriod,
  getCurrentLocalYear,
  type AgentStats,
  type StatsPeriod,
} from "../../database/database.js";
import { getGradeRole } from "../../services/gradeService.js";

const commandData = new SlashCommandBuilder()
  .setName("raport")
  .setDescription("Genereaza un raport de activitate ANP")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("saptamana")
      .setDescription("Raport pentru o saptamana din anul curent")
      .addIntegerOption((option) =>
        option
          .setName("numar")
          .setDescription("Numarul saptamanii")
          .setMinValue(1)
          .setMaxValue(53)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("luna")
      .setDescription("Raport pentru o luna din anul curent")
      .addIntegerOption((option) =>
        option
          .setName("numar")
          .setDescription("Numarul lunii")
          .setMinValue(1)
          .setMaxValue(12)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("alltime")
      .setDescription("Raport pentru toata perioada"),
  );

function canGenerateReport(member: GuildMember): boolean {
  return env.carceraApprovalRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function splitLines(lines: string[], maxLength = 3600): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;

    if (next.length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : ["Nu exista membri pentru afisare."];
}

function statsFor(statsMap: Map<string, AgentStats>, userId: string): AgentStats {
  return statsMap.get(userId) ?? {
    userId,
    transporturi: 0,
    vizite: 0,
    carcera: 0,
    total: 0,
  };
}

function periodTitle(period: StatsPeriod, year: number): string {
  if (period.type === "week") {
    return `Saptamana ${period.week} / ${period.year}`;
  }

  if (period.type === "month") {
    return `Luna ${period.month} / ${period.year}`;
  }

  if (period.type === "alltime") {
    return "All-time";
  }

  return `Anul ${year}`;
}

export async function registerReportCommand(guild: Guild): Promise<void> {
  const commands = await guild.commands.fetch();
  const existing = commands.find((command) => command.name === commandData.name);

  if (existing) {
    await existing.delete();
  }

  await guild.commands.create(commandData);
}

export async function handleReportCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.commandName !== commandData.name || !interaction.guild) {
    return;
  }

  if (interaction.channelId !== env.logsChannelId) {
    await interaction.reply({
      content: "Comanda /raport poate fi folosita doar in canalul de logs.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member || !canGenerateReport(member)) {
    await interaction.reply({
      content: "Nu ai gradul necesar pentru a genera rapoarte de activitate.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const year = await getCurrentLocalYear();
  const subcommand = interaction.options.getSubcommand(true);
  let period: StatsPeriod;

  if (subcommand === "saptamana") {
    period = {
      type: "week",
      year,
      week: interaction.options.getInteger("numar", true),
    };
  } else if (subcommand === "luna") {
    period = {
      type: "month",
      year,
      month: interaction.options.getInteger("numar", true),
    };
  } else {
    period = { type: "alltime" };
  }

  const [stats, members] = await Promise.all([
    getAgentStatsForPeriod(period),
    interaction.guild.members.fetch(),
  ]);
  const statsMap = new Map(stats.map((agent) => [agent.userId, agent]));
  const humans = [...members.values()]
    .filter((guildMember) => !guildMember.user.bot)
    .sort((a, b) => {
      const aStats = statsFor(statsMap, a.id);
      const bStats = statsFor(statsMap, b.id);
      return bStats.total - aStats.total
        || bStats.transporturi - aStats.transporturi
        || bStats.vizite - aStats.vizite
        || bStats.carcera - aStats.carcera
        || a.displayName.localeCompare(b.displayName);
    });

  const lines = humans.map((guildMember) => {
    const memberStats = statsFor(statsMap, guildMember.id);
    const grade = getGradeRole(guildMember)?.name ?? "Fara grad ANP";

    return `**${grade}** | <@${guildMember.id}> • **${memberStats.total} total** | T ${memberStats.transporturi} V ${memberStats.vizite} C ${memberStats.carcera}`;
  });
  const chunks = splitLines(lines);
  const title = periodTitle(period, year);

  for (let index = 0; index < chunks.length; index += 1) {
    const embed = new EmbedBuilder()
      .setColor(0x334155)
      .setTitle(`Raport activitate ANP | ${title}`)
      .setDescription(chunks[index]!)
      .setFooter({
        text: `T = Transporturi | V = Vizite | C = Carcera aprobata | Pagina ${index + 1}/${chunks.length}`,
      })
      .setTimestamp();

    const payload = {
      embeds: [embed],
      allowedMentions: { parse: [] as never[] },
    };

    if (index === 0) {
      await interaction.editReply(payload);
    } else {
      await interaction.followUp(payload);
    }
  }
}
