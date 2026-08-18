import { Pool } from "pg";
import { env } from "../config/env.js";

export type ReportType = "transport" | "vizita" | "carcera";

export type AgentStats = {
  userId: string;
  transporturi: number;
  vizite: number;
  carcera: number;
  total: number;
  rank?: number;
};

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 5,
});

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

export async function initDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS anp_dossier_sequences (
      report_type TEXT PRIMARY KEY,
      current_value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS anp_reports (
      message_id TEXT PRIMARY KEY,
      report_type TEXT NOT NULL CHECK (report_type IN ('transport', 'vizita', 'carcera')),
      dossier_number INTEGER NOT NULL,
      primary_user_id TEXT NOT NULL,
      secondary_user_id TEXT,
      approved BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (report_type, dossier_number)
    );

    CREATE INDEX IF NOT EXISTS anp_reports_primary_user_idx ON anp_reports(primary_user_id);
    CREATE INDEX IF NOT EXISTS anp_reports_secondary_user_idx ON anp_reports(secondary_user_id);
  `);
}

export async function nextDossierNumber(reportType: ReportType): Promise<number> {
  const result = await pool.query<{ current_value: number }>(`
    INSERT INTO anp_dossier_sequences (report_type, current_value)
    VALUES ($1, 1)
    ON CONFLICT (report_type)
    DO UPDATE SET current_value = anp_dossier_sequences.current_value + 1
    RETURNING current_value
  `, [reportType]);

  const value = result.rows[0]?.current_value;

  if (!value) {
    throw new Error("Nu am putut genera numarul de dosar.");
  }

  return value;
}

export function formatDossierId(reportType: ReportType, dossierNumber: number): string {
  const prefix: Record<ReportType, string> = {
    transport: "T",
    vizita: "V",
    carcera: "C",
  };

  return `${prefix[reportType]}-${String(dossierNumber).padStart(3, "0")}`;
}

export async function registerReport(options: {
  messageId: string;
  reportType: ReportType;
  dossierNumber: number;
  primaryUserId: string;
  secondaryUserId?: string | null;
  approved: boolean;
}): Promise<void> {
  await pool.query(`
    INSERT INTO anp_reports (
      message_id,
      report_type,
      dossier_number,
      primary_user_id,
      secondary_user_id,
      approved
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (message_id) DO UPDATE SET
      primary_user_id = EXCLUDED.primary_user_id,
      secondary_user_id = EXCLUDED.secondary_user_id,
      approved = EXCLUDED.approved,
      updated_at = NOW()
  `, [
    options.messageId,
    options.reportType,
    options.dossierNumber,
    options.primaryUserId,
    options.secondaryUserId ?? null,
    options.approved,
  ]);
}

export async function updateReportParticipants(
  messageId: string,
  primaryUserId: string,
  secondaryUserId?: string | null,
): Promise<void> {
  await pool.query(`
    UPDATE anp_reports
    SET primary_user_id = $2,
        secondary_user_id = $3,
        updated_at = NOW()
    WHERE message_id = $1
  `, [messageId, primaryUserId, secondaryUserId ?? null]);
}

export async function setCarceraApproval(messageId: string, approved: boolean): Promise<void> {
  await pool.query(`
    UPDATE anp_reports
    SET approved = $2,
        updated_at = NOW()
    WHERE message_id = $1 AND report_type = 'carcera'
  `, [messageId, approved]);
}

const statsQuery = `
  WITH participari AS (
    SELECT primary_user_id AS user_id, report_type
    FROM anp_reports
    WHERE approved = TRUE

    UNION ALL

    SELECT secondary_user_id AS user_id, report_type
    FROM anp_reports
    WHERE approved = TRUE AND secondary_user_id IS NOT NULL
  ), statistici AS (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE report_type = 'transport') AS transporturi,
      COUNT(*) FILTER (WHERE report_type = 'vizita') AS vizite,
      COUNT(*) FILTER (WHERE report_type = 'carcera') AS carcera,
      COUNT(*) AS total
    FROM participari
    GROUP BY user_id
  )
`;

export async function getTopAgentStats(limit = 10): Promise<AgentStats[]> {
  const result = await pool.query(`${statsQuery}
    SELECT user_id, transporturi, vizite, carcera, total
    FROM statistici
    ORDER BY total DESC, transporturi DESC, vizite DESC, carcera DESC, user_id ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row) => ({
    userId: String(row.user_id),
    transporturi: toNumber(row.transporturi),
    vizite: toNumber(row.vizite),
    carcera: toNumber(row.carcera),
    total: toNumber(row.total),
  }));
}

export async function getAgentStats(userId: string): Promise<AgentStats | null> {
  const result = await pool.query(`${statsQuery}, clasament AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          ORDER BY total DESC, transporturi DESC, vizite DESC, carcera DESC, user_id ASC
        ) AS rank
      FROM statistici
    )
    SELECT user_id, transporturi, vizite, carcera, total, rank
    FROM clasament
    WHERE user_id = $1
  `, [userId]);

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id),
    transporturi: toNumber(row.transporturi),
    vizite: toNumber(row.vizite),
    carcera: toNumber(row.carcera),
    total: toNumber(row.total),
    rank: toNumber(row.rank),
  };
}
