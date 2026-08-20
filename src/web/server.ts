import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import type { Client } from "discord.js";
import type { ReportType } from "../database/database.js";
import {
  getDashboardData,
  getDossierDetails,
  getDossiersData,
  getMembersData,
  getReportsData,
  getSystemData,
} from "./dashboardService.js";
import { parseStatsPeriod } from "./period.js";

let serverStarted = false;

const sourcePublicDirectory = path.resolve(process.cwd(), "src", "web", "public");
const distPublicDirectory = path.resolve(process.cwd(), "dist", "web", "public");
const publicDirectory = existsSync(sourcePublicDirectory)
  ? sourcePublicDirectory
  : distPublicDirectory;

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function setCommonHeaders(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "same-origin");
}

function sendJson(response: ServerResponse, statusCode: number, data: unknown): void {
  setCommonHeaders(response);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(data));
}

async function sendFile(response: ServerResponse, fileName: string): Promise<void> {
  const filePath = path.join(publicDirectory, fileName);
  const content = await readFile(filePath);

  setCommonHeaders(response);
  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypes[path.extname(fileName)] ?? "application/octet-stream");
  response.setHeader("Cache-Control", fileName === "index.html" ? "no-store" : "public, max-age=300");
  response.end(content);
}

function isReportType(value: string | null): value is ReportType {
  return value === "transport" || value === "vizita" || value === "carcera";
}

async function handleApi(
  client: Client<true>,
  requestUrl: URL,
  response: ServerResponse,
): Promise<boolean> {
  if (!requestUrl.pathname.startsWith("/api/")) {
    return false;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      discord: client.isReady(),
      uptime: Math.floor(process.uptime()),
    });
    return true;
  }

  if (requestUrl.pathname === "/api/dashboard") {
    sendJson(response, 200, await getDashboardData(client));
    return true;
  }

  if (requestUrl.pathname === "/api/members") {
    sendJson(response, 200, await getMembersData(client, parseStatsPeriod(requestUrl.searchParams)));
    return true;
  }

  if (requestUrl.pathname === "/api/reports") {
    sendJson(response, 200, await getReportsData(client, parseStatsPeriod(requestUrl.searchParams)));
    return true;
  }

  if (requestUrl.pathname === "/api/dossiers") {
    const typeValue = requestUrl.searchParams.get("type");
    const type = isReportType(typeValue) ? typeValue : undefined;
    sendJson(response, 200, await getDossiersData(client, type));
    return true;
  }

  if (requestUrl.pathname === "/api/dossier") {
    const typeValue = requestUrl.searchParams.get("type");
    const number = Number(requestUrl.searchParams.get("number"));

    if (!isReportType(typeValue) || !Number.isInteger(number) || number < 1) {
      sendJson(response, 400, { error: "Dosarul cerut nu este valid." });
      return true;
    }

    const dossier = await getDossierDetails(client, typeValue, number);

    if (!dossier) {
      sendJson(response, 404, { error: "Dosarul nu a fost gasit." });
      return true;
    }

    sendJson(response, 200, dossier);
    return true;
  }

  if (requestUrl.pathname === "/api/system") {
    sendJson(response, 200, await getSystemData(client));
    return true;
  }

  sendJson(response, 404, { error: "Ruta API nu exista." });
  return true;
}

async function handleRequest(
  client: Client<true>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Metoda nu este permisa." });
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "http://localhost");

  try {
    if (await handleApi(client, requestUrl, response)) {
      return;
    }

    if (requestUrl.pathname === "/styles.css") {
      await sendFile(response, "styles.css");
      return;
    }

    if (requestUrl.pathname === "/app.js") {
      await sendFile(response, "app.js");
      return;
    }

    if (requestUrl.pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }

    await sendFile(response, "index.html");
  } catch (error) {
    console.error("Eroare in management web:", error);

    if (!response.headersSent) {
      sendJson(response, 500, { error: "A aparut o eroare la incarcarea datelor." });
    } else {
      response.end();
    }
  }
}

export async function startManagementWebServer(client: Client<true>): Promise<void> {
  if (serverStarted) {
    return;
  }

  const port = Number(process.env.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT pentru management web nu este valid.");
  }

  const server = createServer((request, response) => {
    void handleRequest(client, request, response);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", onError);
      resolve();
    });
  });

  serverStarted = true;
  console.log(`Management web pornit pe portul ${port}.`);
}
