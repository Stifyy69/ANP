import {
  ChannelType,
  type Client,
  type Guild,
  type GuildMember,
} from "discord.js";
import { env } from "../config/env.js";
import {
  formatDossierId,
  getAgentStatsForPeriod,
  getCurrentWeekDailyActivity,
  getCurrentWeekInfo,
  getReportTotalsForPeriod,
  getStoredReportByDossier,
  getStoredReports,
  pingDatabase,
  type AgentStats,
  type ReportType,
  type StatsPeriod,
  type StoredReport,
} from "../database/database.js";
import { getGradeRole } from "../services/gradeService.js";
import { describeStatsPeriod } from "./period.js";

const reportChannelIds: Record<ReportType, string> = {
  transport: env.transportChannelId,
  vizita: env.viziteChannelId,
  carcera: env.carceraChannelId,
};

const reportLabels: Record<ReportType, string> = {
  transport: "Transport",
  vizita: "Vizita",
  carcera: "Carcera",
};

const MEMBER_SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const MEMBER_FALLBACK_TTL_MS = 30 * 1000;

let memberSnapshot: {
  guildId: string;
  expiresAt: number;
  members: Map<string, GuildMember>;
} | null = null;
let memberSnapshotPromise: Promise<Map<string, GuildMember>> | null = null;

function emptyStats(userId: string): AgentStats {
  return {
    userId,
    transporturi: 0,
    vizite: 0,
    carcera: 0,
    total: 0,
  };
}

function createMemberMap(members: Iterable<GuildMember>): Map<string, GuildMember> {
  const result = new Map<string, GuildMember>();

  for (const member of members) {
    result.set(member.id, member);
  }

  return result;
}

function storeMemberSnapshot(
  guild: Guild,
  members: Iterable<GuildMember>,
  ttlMs: number,
): Map<string, GuildMember> {
  const snapshot = createMemberMap(members);
  memberSnapshot = {
    guildId: guild.id,
    expiresAt: Date.now() + ttlMs,
    members: snapshot,
  };
  return snapshot;
}

async function getGuildMembers(guild: Guild): Promise<Map<string, GuildMember>> {
  const now = Date.now();

  if (
    memberSnapshot
    && memberSnapshot.guildId === guild.id
    && memberSnapshot.expiresAt > now
  ) {
    return memberSnapshot.members;
  }

  if (guild.members.cache.size > 0 && guild.members.cache.size >= guild.memberCount) {
    return storeMemberSnapshot(guild, guild.members.cache.values(), MEMBER_SNAPSHOT_TTL_MS);
  }

  if (memberSnapshotPromise) {
    return memberSnapshotPromise;
  }

  memberSnapshotPromise = (async () => {
    try {
      const fetched = await guild.members.fetch();
      return storeMemberSnapshot(guild, fetched.values(), MEMBER_SNAPSHOT_TTL_MS);
    } catch (error) {
      if (guild.members.cache.size > 0) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Discord members fetch limitat, folosesc cache-ul local temporar: ${message}`);
        return storeMemberSnapshot(guild, guild.members.cache.values(), MEMBER_FALLBACK_TTL_MS);
      }

      throw error;
    } finally {
      memberSnapshotPromise = null;
    }
  })();

  return memberSnapshotPromise;
}

async function getGuild(client: Client<true>): Promise<Guild> {
  const cached = client.guilds.cache.get(env.guildId);

  if (cached) {
    return cached;
  }

  return client.guilds.fetch(env.guildId);
}

function memberIdentity(member: GuildMember | undefined, userId: string) {
  const grade = member ? getGradeRole(member) : null;

  return {
    userId,
    displayName: member?.displayName ?? `Utilizator ${userId}`,
    username: member?.user.username ?? userId,
    avatarUrl: member?.displayAvatarURL({ size: 128 }) ?? null,
    gradeName: grade?.name ?? "Fara grad ANP",
    gradeColor: grade && grade.color !== 0 ? grade.hexColor : "#64748b",
  };
}

function reportUrl(report: StoredReport): string {
  return `https://discord.com/channels/${env.guildId}/${reportChannelIds[report.reportType]}/${report.messageId}`;
}

async function resolveReportStatus(client: Client<true>, report: StoredReport): Promise<string> {
  if (report.reportType !== "carcera") {
    return "Inregistrat";
  }

  if (report.approved) {
    return "Aprobat";
  }

  const channel = await client.channels.fetch(reportChannelIds.carcera).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return "Neaprobat";
  }

  const message = await channel.messages.fetch(report.messageId).catch(() => null);
  const footer = message?.embeds[0]?.footer?.text?.toLowerCase() ?? "";

  if (footer.includes("respinsa")) {
    return "Respins";
  }

  if (message && message.components.length > 0) {
    return "In asteptare";
  }

  return "Neaprobat";
}

function serializeReport(
  report: StoredReport,
  members: Map<string, GuildMember>,
  status: string,
) {
  return {
    dossierId: formatDossierId(report.reportType, report.dossierNumber),
    dossierNumber: report.dossierNumber,
    type: report.reportType,
    typeLabel: reportLabels[report.reportType],
    primary: memberIdentity(members.get(report.primaryUserId), report.primaryUserId),
    secondary: report.secondaryUserId
      ? memberIdentity(members.get(report.secondaryUserId), report.secondaryUserId)
      : null,
    status,
    approved: report.approved,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    discordUrl: reportUrl(report),
  };
}

function serializeAgent(
  stats: AgentStats,
  members: Map<string, GuildMember>,
) {
  return {
    ...memberIdentity(members.get(stats.userId), stats.userId),
    stats: {
      transporturi: stats.transporturi,
      vizite: stats.vizite,
      carcera: stats.carcera,
      total: stats.total,
    },
  };
}

export async function getDashboardData(client: Client<true>) {
  const guild = await getGuild(client);
  const [members, week, totals, stats, daily, storedReports] = await Promise.all([
    getGuildMembers(guild),
    getCurrentWeekInfo(),
    getReportTotalsForPeriod({ type: "current_week" }),
    getAgentStatsForPeriod({ type: "current_week" }),
    getCurrentWeekDailyActivity(),
    getStoredReports({ limit: 8 }),
  ]);
  const humans = [...members.values()].filter((member) => !member.user.bot);
  const activeAgentIds = new Set(stats.filter((agent) => agent.total > 0).map((agent) => agent.userId));
  const activeAgents = humans.filter((member) => activeAgentIds.has(member.id)).length;
  const configuredAgents = humans.filter((member) => getGradeRole(member) !== null).length;
  const recent = await Promise.all(
    storedReports.map(async (report) =>
      serializeReport(report, members, await resolveReportStatus(client, report)),
    ),
  );

  return {
    guild: {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL({ size: 128 }),
    },
    week,
    totals,
    activeAgents,
    configuredAgents,
    totalMembers: humans.length,
    topAgents: stats.slice(0, 5).map((agent) => serializeAgent(agent, members)),
    daily,
    recent,
    generatedAt: new Date().toISOString(),
  };
}

export async function getMembersData(client: Client<true>, period: StatsPeriod) {
  const guild = await getGuild(client);
  const [memberMap, stats] = await Promise.all([
    getGuildMembers(guild),
    getAgentStatsForPeriod(period),
  ]);
  const statsMap = new Map<string, AgentStats>(
    stats.map((agent) => [agent.userId, agent] as const),
  );
  const members = [...memberMap.values()]
    .filter((member) => !member.user.bot)
    .filter((member) => getGradeRole(member) !== null || (statsMap.get(member.id)?.total ?? 0) > 0)
    .map((member) => {
      const agentStats = statsMap.get(member.id) ?? emptyStats(member.id);
      const singleMemberMap = new Map<string, GuildMember>([[member.id, member]]);

      return serializeAgent(agentStats, singleMemberMap);
    })
    .sort((a, b) =>
      b.stats.total - a.stats.total
      || b.stats.transporturi - a.stats.transporturi
      || b.stats.vizite - a.stats.vizite
      || b.stats.carcera - a.stats.carcera
      || a.displayName.localeCompare(b.displayName),
    );

  return {
    period: describeStatsPeriod(period),
    members,
    total: members.length,
  };
}

export async function getReportsData(client: Client<true>, period: StatsPeriod) {
  const guild = await getGuild(client);
  const [memberMap, stats, totals] = await Promise.all([
    getGuildMembers(guild),
    getAgentStatsForPeriod(period),
    getReportTotalsForPeriod(period),
  ]);
  const statsMap = new Map<string, AgentStats>(
    stats.map((agent) => [agent.userId, agent] as const),
  );
  const members = [...memberMap.values()]
    .filter((member) => !member.user.bot)
    .map((member) => {
      const agentStats = statsMap.get(member.id) ?? emptyStats(member.id);
      const singleMemberMap = new Map<string, GuildMember>([[member.id, member]]);

      return serializeAgent(agentStats, singleMemberMap);
    })
    .sort((a, b) =>
      b.stats.total - a.stats.total
      || b.stats.transporturi - a.stats.transporturi
      || b.stats.vizite - a.stats.vizite
      || b.stats.carcera - a.stats.carcera
      || a.displayName.localeCompare(b.displayName),
    );

  return {
    period: describeStatsPeriod(period),
    totals,
    members,
    generatedAt: new Date().toISOString(),
  };
}

export async function getDossiersData(
  client: Client<true>,
  reportType?: ReportType,
) {
  const guild = await getGuild(client);
  const [members, reports] = await Promise.all([
    getGuildMembers(guild),
    getStoredReports({ reportType, limit: 250 }),
  ]);

  return {
    dossiers: reports.map((report) => serializeReport(
      report,
      members,
      report.reportType === "carcera"
        ? report.approved ? "Aprobat" : "Neaprobat"
        : "Inregistrat",
    )),
  };
}

export async function getDossierDetails(
  client: Client<true>,
  reportType: ReportType,
  dossierNumber: number,
) {
  const report = await getStoredReportByDossier(reportType, dossierNumber);

  if (!report) {
    return null;
  }

  const guild = await getGuild(client);
  const members = await getGuildMembers(guild);
  const channel = await client.channels.fetch(reportChannelIds[report.reportType]).catch(() => null);
  const message = channel && channel.type === ChannelType.GuildText
    ? await channel.messages.fetch(report.messageId).catch(() => null)
    : null;
  const embed = message?.embeds[0];

  return {
    ...serializeReport(report, members, await resolveReportStatus(client, report)),
    title: embed?.title ?? formatDossierId(report.reportType, report.dossierNumber),
    description: embed?.description ?? null,
    fields: embed?.fields.map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline,
    })) ?? [],
    footer: embed?.footer?.text ?? null,
  };
}

export async function getSystemData(client: Client<true>) {
  const guild = await getGuild(client);
  const [members, databaseOnline] = await Promise.all([
    getGuildMembers(guild),
    pingDatabase(),
  ]);
  const humans = [...members.values()].filter((member) => !member.user.bot);
  const configuredAgents = humans.filter((member) => getGradeRole(member) !== null).length;

  return {
    bot: {
      tag: client.user.tag,
      id: client.user.id,
      avatarUrl: client.user.displayAvatarURL({ size: 128 }),
      online: client.isReady(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    guild: {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL({ size: 128 }),
      members: humans.length,
      configuredAgents,
      channels: guild.channels.cache.size,
    },
    databaseOnline,
    webVersion: "1.0.0",
  };
}
