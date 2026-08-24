const state = {
  authenticated: false,
  currentPage: "dashboard",
  dashboard: null,
  members: null,
  reports: null,
  dossiers: null,
  system: null,
  selectedPeriod: "current_week",
};

const pageNames = {
  dashboard: "Dashboard",
  members: "Membri",
  reports: "Rapoarte",
  dossiers: "Dosare",
  system: "Sistem",
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("ro-RO");
}

function initials(name) {
  return String(name ?? "ANP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ANP";
}

function formatDate(value, withTime = false) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function formatUptime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}z ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function statusSlug(status) {
  return normalize(status)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !url.startsWith("/api/auth/")) {
    setAuthState(false);
    throw new Error("Sesiunea a expirat. Autentifica-te din nou.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Cererea nu a putut fi procesata.");
  }

  return data;
}

function setAuthState(authenticated) {
  state.authenticated = authenticated;
  document.body.classList.remove("auth-pending", "auth-guest", "authenticated");
  document.body.classList.add(authenticated ? "authenticated" : "auth-guest");

  if (!authenticated) {
    $("login-code").value = "";
    $("login-message").textContent = "";
    closeDrawer();
  }
}

function memberAvatar(member) {
  if (member?.avatarUrl) {
    return `<img class="member-avatar" src="${escapeHtml(member.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`;
  }

  return `<span class="member-avatar">${escapeHtml(initials(member?.displayName))}</span>`;
}

function memberCell(member) {
  return `
    <div class="member-cell">
      ${memberAvatar(member)}
      <div class="member-copy">
        <strong>${escapeHtml(member?.displayName ?? "Necunoscut")}</strong>
        <span>@${escapeHtml(member?.username ?? member?.userId ?? "-")}</span>
      </div>
    </div>
  `;
}

function gradePill(member) {
  return `
    <span class="grade-pill">
      <i class="grade-dot" style="--grade-color:${escapeHtml(member?.gradeColor ?? "#64748b")}"></i>
      ${escapeHtml(member?.gradeName ?? "Fara grad ANP")}
    </span>
  `;
}

function dossierTypeBadge(dossier) {
  return `<span class="type-badge type-${escapeHtml(dossier.type)}">${escapeHtml(dossier.typeLabel)}</span>`;
}

function statusBadge(status) {
  return `<span class="status-badge status-${statusSlug(status)}">${escapeHtml(status)}</span>`;
}

function dossierRow(dossier) {
  return `
    <tr>
      <td><button class="dossier-link dossier-open" data-type="${escapeHtml(dossier.type)}" data-number="${Number(dossier.dossierNumber)}">${escapeHtml(dossier.dossierId)}</button></td>
      <td>${dossierTypeBadge(dossier)}</td>
      <td>${memberCell(dossier.primary)}</td>
      <td>${dossier.secondary ? memberCell(dossier.secondary) : '<span class="muted-dash">-</span>'}</td>
      <td>${escapeHtml(formatDate(dossier.createdAt, true))}</td>
      <td>${statusBadge(dossier.status)}</td>
      <td><a class="action-link" href="${escapeHtml(dossier.discordUrl)}" target="_blank" rel="noopener noreferrer">Discord ↗</a></td>
    </tr>
  `;
}

function renderDashboardTop(agents) {
  const body = $("dashboard-top-body");

  if (!agents.length) {
    body.innerHTML = '<div class="empty-cell">Nu exista activitate in saptamana curenta.</div>';
    return;
  }

  body.innerHTML = agents.map((agent, index) => `
    <article class="leaderboard-entry rank-${index + 1}">
      <div class="rank-mark"><span>0${index + 1}</span></div>
      ${memberAvatar(agent)}
      <div class="leaderboard-identity">
        <strong>${escapeHtml(agent.displayName ?? "Necunoscut")}</strong>
        <span>${escapeHtml(agent.gradeName ?? "Fara grad ANP")}</span>
      </div>
      <div class="leaderboard-breakdown">
        <span><i>TRN</i>${agent.stats.transporturi}</span>
        <span><i>VIS</i>${agent.stats.vizite}</span>
        <span><i>CRC</i>${agent.stats.carcera}</span>
      </div>
      <div class="leaderboard-total"><strong>${agent.stats.total}</strong><span>total</span></div>
    </article>
  `).join("");
}

function renderActivityChart(days) {
  const container = $("activity-chart");
  const width = 760;
  const height = 260;
  const padding = { top: 16, right: 20, bottom: 34, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = days.flatMap((day) => [day.transporturi, day.vizite, day.carcera]);
  const maxValue = Math.max(5, ...values);
  const niceMax = Math.ceil(maxValue / 5) * 5;
  const tickCount = 5;
  const xFor = (index) => padding.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth);
  const yFor = (value) => padding.top + plotHeight - (value / niceMax) * plotHeight;
  const colors = {
    transporturi: "#b79a68",
    vizite: "#6f947e",
    carcera: "#9b5d5d",
  };

  const grid = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = Math.round((niceMax / tickCount) * index);
    const y = yFor(value);
    return `
      <line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />
      <text class="chart-axis-label" x="${padding.left - 9}" y="${y + 3}" text-anchor="end">${value}</text>
    `;
  }).join("");

  const xLabels = days.map((day, index) => `
    <text class="chart-axis-label" x="${xFor(index)}" y="${height - 10}" text-anchor="middle">${escapeHtml(day.label)}</text>
  `).join("");

  const series = Object.entries(colors).map(([key, color]) => {
    const points = days.map((day, index) => `${xFor(index)},${yFor(day[key])}`).join(" ");
    const circles = days.map((day, index) => `
      <circle class="chart-point" cx="${xFor(index)}" cy="${yFor(day[key])}" r="4" fill="${color}">
        <title>${escapeHtml(day.label)}: ${day[key]}</title>
      </circle>
    `).join("");

    return `<polyline class="chart-line" points="${points}" stroke="${color}" />${circles}`;
  }).join("");

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Activitate pe zile">
      ${grid}
      ${xLabels}
      ${series}
    </svg>
  `;
}

function applyServerIdentity(guild) {
  if (!guild) {
    return;
  }

  $("server-name").textContent = guild.name;
  $("sidebar-guild").textContent = guild.name;
  const avatar = $("server-avatar");

  if (guild.iconUrl) {
    avatar.style.backgroundImage = `url("${guild.iconUrl.replaceAll('"', "")}")`;
    avatar.textContent = "";
  } else {
    avatar.style.backgroundImage = "none";
    avatar.textContent = initials(guild.name);
  }
}

async function loadDashboard(force = false) {
  if (state.dashboard && !force) {
    renderDashboard(state.dashboard);
    return;
  }

  const data = await api("/api/dashboard");
  state.dashboard = data;
  renderDashboard(data);
}

function renderDashboard(data) {
  applyServerIdentity(data.guild);
  $("dashboard-period").textContent = `Saptamana ${data.week.week} | ${data.week.startDate} - ${data.week.endDate}`;
  $("sidebar-week").textContent = `${data.week.startDate} - ${data.week.endDate}`;
  $("stat-transport").textContent = data.totals.transporturi;
  $("stat-vizite").textContent = data.totals.vizite;
  $("stat-carcera").textContent = data.totals.carcera;
  $("stat-total").textContent = data.totals.total;
  $("stat-active").textContent = data.activeAgents;
  $("stat-agents-sub").textContent = `din ${data.configuredAgents} agenti configurati`;
  renderDashboardTop(data.topAgents);
  renderActivityChart(data.daily);

  const body = $("recent-dossiers-body");
  body.innerHTML = data.recent.length
    ? data.recent.map(dossierRow).join("")
    : '<tr><td colspan="7" class="empty-cell">Nu exista dosare inregistrate.</td></tr>';
  wireDossierButtons(body);
}

function renderMembers() {
  const search = normalize($("members-search").value);
  const members = (state.members?.members ?? []).filter((member) =>
    !search
    || normalize(member.displayName).includes(search)
    || normalize(member.username).includes(search)
    || normalize(member.gradeName).includes(search),
  );
  $("members-count").textContent = `${members.length} membri`;
  $("members-table-body").innerHTML = members.length
    ? members.map((member) => `
      <tr>
        <td>${memberCell(member)}</td>
        <td>${gradePill(member)}</td>
        <td class="metric-t">${member.stats.transporturi}</td>
        <td class="metric-v">${member.stats.vizite}</td>
        <td class="metric-c">${member.stats.carcera}</td>
        <td class="metric-total">${member.stats.total}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty-cell">Nu am gasit membri.</td></tr>';
}

async function loadMembers(force = false) {
  if (!state.members || force) {
    state.members = await api("/api/members?period=current_week");
  }

  renderMembers();
}

function reportQuery() {
  const year = Number($("period-year").value);

  if (state.selectedPeriod === "week") {
    const week = Number($("period-week").value);
    return `period=week&year=${year}&week=${week}`;
  }

  if (state.selectedPeriod === "month") {
    const month = Number($("period-month").value);
    return `period=month&year=${year}&month=${month}`;
  }

  return `period=${state.selectedPeriod}`;
}

function renderReports() {
  const data = state.reports;

  if (!data) {
    return;
  }

  $("report-total-t").textContent = data.totals.transporturi;
  $("report-total-v").textContent = data.totals.vizite;
  $("report-total-c").textContent = data.totals.carcera;
  $("report-total-all").textContent = data.totals.total;
  $("reports-period-label").textContent = data.period.toUpperCase();

  const search = normalize($("reports-search").value);
  const members = data.members.filter((member) =>
    !search
    || normalize(member.displayName).includes(search)
    || normalize(member.username).includes(search)
    || normalize(member.gradeName).includes(search),
  );

  $("reports-table-body").innerHTML = members.length
    ? members.map((member, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${memberCell(member)}</td>
        <td>${gradePill(member)}</td>
        <td class="metric-t">${member.stats.transporturi}</td>
        <td class="metric-v">${member.stats.vizite}</td>
        <td class="metric-c">${member.stats.carcera}</td>
        <td class="metric-total">${member.stats.total}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="7" class="empty-cell">Nu am gasit membri pentru filtrul ales.</td></tr>';
}

async function loadReports() {
  $("reports-table-body").innerHTML = '<tr><td colspan="7" class="empty-cell">Se incarca raportul...</td></tr>';
  state.reports = await api(`/api/reports?${reportQuery()}`);
  renderReports();
}

function renderDossiers() {
  const search = normalize($("dossier-search").value);
  const dossiers = (state.dossiers?.dossiers ?? []).filter((dossier) =>
    !search
    || normalize(dossier.dossierId).includes(search)
    || normalize(dossier.typeLabel).includes(search)
    || normalize(dossier.primary.displayName).includes(search)
    || normalize(dossier.secondary?.displayName).includes(search)
    || normalize(dossier.status).includes(search),
  );

  $("dossiers-count").textContent = `${dossiers.length} dosare`;
  const body = $("dossiers-table-body");
  body.innerHTML = dossiers.length
    ? dossiers.map(dossierRow).join("")
    : '<tr><td colspan="7" class="empty-cell">Nu am gasit dosare.</td></tr>';
  wireDossierButtons(body);
}

async function loadDossiers(force = false) {
  if (!state.dossiers || force) {
    const type = $("dossier-type").value;
    state.dossiers = await api(`/api/dossiers${type ? `?type=${encodeURIComponent(type)}` : ""}`);
  }

  renderDossiers();
}

async function loadSystem(force = false) {
  if (!state.system || force) {
    state.system = await api("/api/system");
  }

  const data = state.system;
  $("system-bot-status").textContent = data.bot.online ? "Online" : "Offline";
  $("system-db-status").textContent = data.databaseOnline ? "Conectat" : "Indisponibil";
  $("system-uptime").textContent = formatUptime(data.bot.uptimeSeconds);
  $("system-agents").textContent = data.guild.configuredAgents;
  $("system-guild").textContent = data.guild.name;
  $("system-bot").textContent = data.bot.tag;
  $("system-members").textContent = data.guild.members;
  $("system-channels").textContent = data.guild.channels;
  $("system-version").textContent = data.webVersion;
}

async function navigate(page) {
  if (!pageNames[page]) {
    return;
  }

  state.currentPage = page;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });
  $("topbar-page").textContent = pageNames[page];
  $("sidebar").classList.remove("mobile-open");

  try {
    if (page === "dashboard") await loadDashboard();
    if (page === "members") await loadMembers();
    if (page === "reports") await loadReports();
    if (page === "dossiers") await loadDossiers();
    if (page === "system") await loadSystem();
  } catch (error) {
    showToast(error.message);
  }
}

function wireDossierButtons(container) {
  container.querySelectorAll(".dossier-open").forEach((button) => {
    button.addEventListener("click", () => {
      void openDossier(button.dataset.type, button.dataset.number);
    });
  });
}

async function openDossier(type, number) {
  const drawer = $("detail-drawer");
  const backdrop = $("drawer-backdrop");
  drawer.classList.add("open");
  backdrop.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  $("drawer-title").textContent = "Dosar";
  $("drawer-content").innerHTML = '<div class="drawer-loading">Se incarca dosarul...</div>';

  try {
    const dossier = await api(`/api/dossier?type=${encodeURIComponent(type)}&number=${encodeURIComponent(number)}`);
    $("drawer-title").textContent = dossier.dossierId;
    const fields = dossier.fields.length
      ? dossier.fields.map((field) => `
        <div class="drawer-field">
          <span>${escapeHtml(field.name)}</span>
          <p>${escapeHtml(field.value)}</p>
        </div>
      `).join("")
      : '<div class="drawer-field"><span>Informatii</span><p>Mesajul Discord nu mai este disponibil sau nu contine campuri.</p></div>';

    $("drawer-content").innerHTML = `
      <div class="drawer-summary">
        <div><span>Tip</span><strong>${escapeHtml(dossier.typeLabel)}</strong></div>
        <div><span>Status</span><strong>${escapeHtml(dossier.status)}</strong></div>
        <div><span>Agent principal</span><strong>${escapeHtml(dossier.primary.displayName)}</strong></div>
        <div><span>Agent secundar</span><strong>${escapeHtml(dossier.secondary?.displayName ?? "-")}</strong></div>
        <div><span>Creat</span><strong>${escapeHtml(formatDate(dossier.createdAt, true))}</strong></div>
        <div><span>Actualizat</span><strong>${escapeHtml(formatDate(dossier.updatedAt, true))}</strong></div>
      </div>
      <div class="drawer-fields">
        ${dossier.description ? `<div class="drawer-field"><span>Document</span><p>${escapeHtml(dossier.description)}</p></div>` : ""}
        ${fields}
        ${dossier.footer ? `<div class="drawer-field"><span>Status document</span><p>${escapeHtml(dossier.footer)}</p></div>` : ""}
      </div>
      <div class="drawer-actions">
        <a href="${escapeHtml(dossier.discordUrl)}" target="_blank" rel="noopener noreferrer">Deschide mesajul in Discord ↗</a>
      </div>
    `;
  } catch (error) {
    $("drawer-content").innerHTML = `<div class="drawer-loading">${escapeHtml(error.message)}</div>`;
  }
}

function closeDrawer() {
  $("detail-drawer").classList.remove("open");
  $("drawer-backdrop").classList.remove("open");
  $("detail-drawer").setAttribute("aria-hidden", "true");
}

function updatePeriodControls(period) {
  state.selectedPeriod = period;
  document.querySelectorAll(".period-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.period === period);
  });

  const fields = $("period-fields");
  const needsFields = period === "week" || period === "month";
  fields.classList.toggle("visible", needsFields);
  $("week-field").classList.toggle("hidden", period !== "week");
  $("month-field").classList.toggle("hidden", period !== "month");
}

async function handleLogin(event) {
  event.preventDefault();
  const code = $("login-code").value;
  const button = $("login-button");
  const message = $("login-message");
  button.disabled = true;
  message.classList.remove("success");
  message.textContent = "Se verifica accesul...";

  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    message.classList.add("success");
    message.textContent = "Acces confirmat.";
    setAuthState(true);
    await navigate("dashboard");
  } catch (error) {
    message.textContent = error.message;
    $("login-code").select();
  } finally {
    button.disabled = false;
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Sesiunea locala este inchisa chiar daca requestul de logout esueaza.
  }

  state.dashboard = null;
  state.members = null;
  state.reports = null;
  state.dossiers = null;
  state.system = null;
  setAuthState(false);
}

function wireEvents() {
  $("login-form").addEventListener("submit", (event) => void handleLogin(event));
  $("secret-toggle").addEventListener("click", () => {
    const input = $("login-code");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    $("secret-toggle").textContent = visible ? "VEZI" : "ASCUNDE";
    input.focus();
  });
  $("logout-button").addEventListener("click", () => void handleLogout());
  $("mobile-menu").addEventListener("click", () => $("sidebar").classList.toggle("mobile-open"));
  $("drawer-close").addEventListener("click", closeDrawer);
  $("drawer-backdrop").addEventListener("click", closeDrawer);

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => void navigate(item.dataset.page));
  });
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => void navigate(button.dataset.go));
  });

  $("members-search").addEventListener("input", renderMembers);
  $("reports-search").addEventListener("input", renderReports);
  $("dossier-search").addEventListener("input", renderDossiers);
  $("dossier-type").addEventListener("change", () => {
    state.dossiers = null;
    void loadDossiers(true).catch((error) => showToast(error.message));
  });

  document.querySelectorAll(".period-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const period = button.dataset.period;
      updatePeriodControls(period);

      if (period === "current_week" || period === "alltime") {
        void loadReports().catch((error) => showToast(error.message));
      }
    });
  });

  $("apply-period").addEventListener("click", () => {
    void loadReports().catch((error) => showToast(error.message));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      $("sidebar").classList.remove("mobile-open");
    }
  });
}

async function bootstrap() {
  wireEvents();
  const now = new Date();
  $("period-year").value = String(now.getFullYear());
  $("period-month").value = String(now.getMonth() + 1);

  try {
    const auth = await api("/api/auth/status");
    setAuthState(Boolean(auth.authenticated));

    if (auth.authenticated) {
      await navigate("dashboard");
    } else {
      $("login-code").focus();
    }
  } catch (error) {
    setAuthState(false);
    $("login-message").textContent = "Managementul web nu este disponibil momentan.";
  }
}

void bootstrap();
