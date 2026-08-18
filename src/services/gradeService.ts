import type { GuildMember, Role } from "discord.js";
import { env } from "../config/env.js";

export function getGradeRole(member: GuildMember): Role | null {
  for (const roleId of env.gradeRoleIds) {
    const role = member.roles.cache.get(roleId);

    if (role) {
      return role;
    }
  }

  return null;
}

export function hasConfiguredGrade(member: GuildMember): boolean {
  return getGradeRole(member) !== null;
}
