function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Lipseste variabila Railway: ${name}`);
  }

  return value;
}

function getSecretEnv(name: string, minLength: number): string {
  const value = getRequiredEnv(name);

  if (value.length < minLength) {
    throw new Error(`Variabila ${name} trebuie sa aiba minimum ${minLength} caractere.`);
  }

  return value;
}

function getRoleIds(name: string): string[] {
  const ids = getRequiredEnv(name)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error(`Variabila ${name} trebuie sa contina cel putin un role ID.`);
  }

  return ids;
}

export const env = {
  discordToken: getRequiredEnv("DISCORD_TOKEN"),
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  guildId: getRequiredEnv("GUILD_ID"),
  chatIcChannelId: getRequiredEnv("CHAT_IC_CHANNEL_ID"),
  receptieChannelId: getRequiredEnv("RECEPTIE_CHANNEL_ID"),
  invatatChannelId: getRequiredEnv("INVATAT_CHANNEL_ID"),
  transportChannelId: getRequiredEnv("TRANSPORT_CHANNEL_ID"),
  viziteChannelId: getRequiredEnv("VIZITE_CHANNEL_ID"),
  carceraChannelId: getRequiredEnv("CARCERA_CHANNEL_ID"),
  reportsChannelId: getRequiredEnv("RAPOARTE_CHANNEL_ID"),
  logsChannelId: getRequiredEnv("LOGS_CHANNEL_ID"),
  webAccessCode: getSecretEnv("WEB_ACCESS_CODE", 6),
  webSessionSecret: getSecretEnv("WEB_SESSION_SECRET", 32),

  // Ordinea rolurilor conteaza. Primul grad gasit este folosit de bot.
  gradeRoleIds: getRoleIds("GRADE_ROLE_IDS"),

  // Doar gradele de aici pot aproba sau respinge prelungirile.
  carceraApprovalRoleIds: getRoleIds("CARCERA_APPROVAL_ROLE_IDS"),
} as const;
