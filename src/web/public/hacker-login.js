const LOGIN_SEQUENCE_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createHackSequence() {
  const card = document.querySelector(".login-card");
  const existing = document.getElementById("hack-sequence");

  if (existing) {
    existing.remove();
  }

  const sequence = document.createElement("div");
  sequence.id = "hack-sequence";
  sequence.className = "hack-sequence";
  sequence.innerHTML = `
    <div class="hack-head">
      <div>
        <span class="hack-kicker">ANP SECURE NODE</span>
        <strong>INITIALIZARE SESIUNE</strong>
      </div>
      <span class="hack-status">ENCRYPTED</span>
    </div>
    <div class="hack-terminal" id="hack-terminal" aria-live="polite"></div>
    <div class="hack-progress-row">
      <div class="hack-progress-track"><span id="hack-progress-bar"></span></div>
      <strong id="hack-progress-value">0%</strong>
    </div>
    <div class="hack-signature">
      <span>NODE: ANP-MGMT-01</span>
      <span id="hack-clock">00:00:00</span>
    </div>
  `;

  card.append(sequence);
  return sequence;
}

function addTerminalLine(text, kind = "normal") {
  const terminal = document.getElementById("hack-terminal");

  if (!terminal) {
    return;
  }

  const line = document.createElement("div");
  line.className = `hack-line ${kind}`;
  line.textContent = text;
  terminal.append(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function startClock() {
  const update = () => {
    const clock = document.getElementById("hack-clock");

    if (!clock) {
      return;
    }

    clock.textContent = new Intl.DateTimeFormat("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  };

  update();
  return window.setInterval(update, 1000);
}

async function runHackSequence() {
  document.body.classList.add("auth-unlocking");
  createHackSequence();

  const start = performance.now();
  const progressBar = document.getElementById("hack-progress-bar");
  const progressValue = document.getElementById("hack-progress-value");
  const clockTimer = startClock();
  let animationFrame = 0;

  const animateProgress = (now) => {
    const progress = Math.min(1, (now - start) / LOGIN_SEQUENCE_MS);
    const percent = Math.floor(progress * 100);

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (progressValue) {
      progressValue.textContent = `${percent}%`;
    }

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateProgress);
    }
  };

  animationFrame = requestAnimationFrame(animateProgress);

  const events = [
    [0, "> validare credentiale management...", "normal"],
    [620, "[OK] token privat acceptat", "ok"],
    [1250, "[OK] handshake criptografic stabilit", "ok"],
    [2050, "[OK] registru PostgreSQL conectat", "ok"],
    [2850, "[OK] Discord gateway sincronizat", "ok"],
    [3550, "[OK] arhiva operationala deblocata", "ok"],
    [4200, "[OK] nivel acces: MANAGEMENT", "accent"],
    [4680, "> autorizare finala...", "normal"],
  ];

  let elapsed = 0;

  for (const [at, text, kind] of events) {
    const wait = Math.max(0, at - elapsed);
    await sleep(wait);
    elapsed = at;
    addTerminalLine(text, kind);
  }

  await sleep(Math.max(0, LOGIN_SEQUENCE_MS - elapsed));
  cancelAnimationFrame(animationFrame);
  window.clearInterval(clockTimer);

  if (progressBar) {
    progressBar.style.width = "100%";
  }

  if (progressValue) {
    progressValue.textContent = "100%";
  }

  addTerminalLine("ACCESS GRANTED // BINE AI VENIT", "granted");
  document.body.classList.add("auth-granted");
  await sleep(280);
  window.location.reload();
}

async function submitHackerLogin(event) {
  const form = event.target;

  if (!(form instanceof HTMLFormElement) || form.id !== "login-form") {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const codeInput = document.getElementById("login-code");
  const button = document.getElementById("login-button");
  const message = document.getElementById("login-message");

  if (!(codeInput instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement) || !message) {
    return;
  }

  const code = codeInput.value;
  button.disabled = true;
  codeInput.disabled = true;
  message.classList.remove("success");
  message.textContent = "Verificare canal securizat...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Acces refuzat.");
    }

    message.classList.add("success");
    message.textContent = "Credentiale acceptate. Pornire protocol...";
    await runHackSequence();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "Acces refuzat.";
    codeInput.disabled = false;
    button.disabled = false;
    codeInput.focus();
    codeInput.select();
  }
}

document.addEventListener("submit", (event) => {
  void submitHackerLogin(event);
}, true);
