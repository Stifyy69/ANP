function setRpText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function applyRoleplayCopy() {
  document.body.classList.add("rp-ui");
  document.title = "ANP | Bolingbroke Command";

  setRpText(".login-security-line span:nth-child(2)", "OG LAND // BOLINGBROKE PENITENTIARY");
  setRpText(".login-security-line span:last-child", "AUTHORIZED PERSONNEL ONLY");
  setRpText(".login-kicker", "OG LAND CORRECTIONAL NETWORK");
  const loginTitle = document.querySelector(".login-copy h1");
  if (loginTitle) loginTitle.innerHTML = "ANP Secure <span>Access</span>";
  setRpText(".login-copy p", "Portal intern Bolingbroke. Acces rezervat personalului ANP autorizat din OG LAND.");
  setRpText(".login-form > label", "Cod de autorizare ANP");
  setRpText("#login-button span:first-child", "OPEN ANP SECURE WEBSITE");

  const loginMeta = document.querySelectorAll(".login-meta span");
  const metaCopy = [
    "BOLINGBROKE PENITENTIARY",
    "OG LAND GOVERNMENT NETWORK",
    "MANAGEMENT CLEARANCE",
  ];
  loginMeta.forEach((element, index) => {
    const dot = element.querySelector("i");
    element.textContent = metaCopy[index] ?? "ANP INTERNAL";
    if (dot) element.prepend(dot);
  });

  setRpText(".login-footer span:first-child", "OG LAND // ADMINISTRATIA NATIONALA A PENITENCIARELOR");
  setRpText(".login-footer span:last-child", "BOLINGBROKE // INTERNAL ACCESS");

  const loginCard = document.querySelector(".login-card");
  if (loginCard && !loginCard.querySelector(".facility-stamp")) {
    loginCard.insertAdjacentHTML(
      "afterbegin",
      '<div class="facility-stamp"><span>OG LAND</span><strong>BOLINGBROKE</strong><small>PENITENTIARY // ANP</small></div>',
    );
  }

  setRpText(".brand-subtitle", "BOLINGBROKE // OG LAND");
  const navCodes = ["01", "02", "03", "04", "05"];
  document.querySelectorAll(".nav-icon").forEach((icon, index) => {
    icon.textContent = navCodes[index] ?? "--";
  });

  setRpText(".connection-card span:last-child", "Legatura operationala");
  setRpText(".server-copy span", "Bolingbroke Penitentiary");
  setRpText(".online-pill", "OPERATIV");

  setRpText("#page-dashboard .eyebrow", "BOLINGBROKE // COMMAND CENTER");
  setRpText("#page-dashboard .page-heading p", "Situatia operationala ANP pentru orasul OG LAND.");
  setRpText("#page-dashboard .top-panel .eyebrow", "PERSONAL // PERFORMANCE");
  setRpText("#page-dashboard .chart-panel .eyebrow", "OPERATIONS // WEEKLY FLOW");
  setRpText("#page-dashboard .recent-panel .eyebrow", "BOLINGBROKE CENTRAL REGISTRY");

  setRpText("#page-members .eyebrow", "BOLINGBROKE PERSONNEL");
  setRpText("#page-members .page-heading p", "Evidenta personalului ANP si activitatea operationala.");
  setRpText("#page-members .panel .eyebrow", "CURRENT DUTY PERIOD");

  setRpText("#page-reports .eyebrow", "OPERATIONAL REVIEW");
  setRpText("#page-reports .page-heading p", "Analiza activitatii personalului ANP din Bolingbroke.");

  setRpText("#page-dossiers .eyebrow", "CENTRAL ARCHIVE");
  setRpText("#page-dossiers .page-heading p", "Registrul operational pentru transporturi, vizite si masuri disciplinare.");
  setRpText("#page-dossiers .panel .eyebrow", "BOLINGBROKE RECORDS");

  setRpText("#page-system .eyebrow", "FACILITY CONTROL");
  setRpText("#page-system .page-heading p", "Starea centrului operational si a registrelor interne Bolingbroke.");

  const systemLabels = document.querySelectorAll("#page-system .system-card > div > span");
  const systemCopy = ["Retea ANP", "Arhiva centrala", "Timp operare", "Agenti inregistrati"];
  systemLabels.forEach((element, index) => {
    element.textContent = systemCopy[index] ?? element.textContent;
  });

  const systemInfoLabels = document.querySelectorAll("#page-system .info-grid > div > span");
  const infoCopy = ["Centru operational", "Unitate ANP", "Personal prezent", "Canale operative", "Versiune terminal", "Nivel acces"];
  systemInfoLabels.forEach((element, index) => {
    element.textContent = infoCopy[index] ?? element.textContent;
  });
  setRpText("#page-system .info-grid > div:last-child strong", "ANP MANAGEMENT CLEARANCE");

  setRpText(".footer span:first-child", "OG LAND // BOLINGBROKE PENITENTIARY");
  setRpText(".footer span:last-child", "ANP INTERNAL MANAGEMENT NETWORK");
  setRpText(".drawer-header .eyebrow", "BOLINGBROKE CENTRAL ARCHIVE");
}

applyRoleplayCopy();
