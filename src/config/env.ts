function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Lipseste variabila Railway: ${name}`);
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
  guildId: getRequiredEnv("GUILD_ID"),
  chatIcChannelId: getRequiredEnv("CHAT_IC_CHANNEL_ID"),
  transportChannelId: getRequiredEnv("TRANSPORT_CHANNEL_ID"),
  viziteChannelId: getRequiredEnv("VIZITE_CHANNEL_ID"),
  carceraChannelId: getRequiredEnv("CARCERA_CHANNEL_ID"),
  logsChannelId: getRequiredEnv("LOGS_CHANNEL_ID"),

  // Ordinea rolurilor conteaza. Primul grad gasit este folosit de bot.
  gradeRoleIds: getRoleIds("GRADE_ROLE_IDS"),
} as const;
