const EXT = globalThis.browser ?? globalThis.chrome;
const HAS_PROMISE_API = typeof globalThis.browser !== "undefined" && EXT === globalThis.browser;

const DEFAULTS = {
  enabled: true,
  gainDb: 60,
  loudness: 10.0,
  maxBoost: 2000,
  drive: 1.0,
  thresholdDb: -50,
  ratio: 20,
  limiterDb: -0.1,
  presenceDb: 15,
  lowShelfDb: 12,
  highShelfDb: 10
};

const PRESETS = {
  royal: {
    enabled: true,
    gainDb: 24,
    loudness: 4,
    maxBoost: 2000,
    drive: 0.28,
    thresholdDb: -38,
    ratio: 12,
    limiterDb: -2,
    presenceDb: 8,
    lowShelfDb: 4,
    highShelfDb: 6
  },
  lord: {
    enabled: true,
    gainDb: 60,
    loudness: 10,
    maxBoost: 2000,
    drive: 1,
    thresholdDb: -50,
    ratio: 20,
    limiterDb: -0.1,
    presenceDb: 15,
    lowShelfDb: 12,
    highShelfDb: 10
  }
};

const ids = Object.keys(DEFAULTS);

function storageGet(key) {
  if (HAS_PROMISE_API) return EXT.storage.local.get(key);
  return new Promise((resolve) => {
    try {
      EXT.storage.local.get(key, (res) => {
        if (EXT.runtime?.lastError) resolve({});
        else resolve(res || {});
      });
    } catch (_) {
      resolve({});
    }
  });
}

function storageSet(value) {
  if (HAS_PROMISE_API) return EXT.storage.local.set(value);
  return new Promise((resolve) => {
    try {
      EXT.storage.local.set(value, () => resolve(!EXT.runtime?.lastError));
    } catch (_) {
      resolve(false);
    }
  });
}

function sendMessage(message) {
  if (HAS_PROMISE_API) return EXT.runtime.sendMessage(message);
  return new Promise((resolve) => {
    try {
      EXT.runtime.sendMessage(message, (res) => {
        if (EXT.runtime?.lastError) resolve(null);
        else resolve(res || null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

function numberText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Math.abs(n) < 10 && !Number.isInteger(n) ? n.toFixed(1) : String(n);
}

function updateLabels() {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    const label = document.getElementById(`${id}Val`);
    if (label && el?.type !== "checkbox") label.textContent = numberText(el.value);
  });
}

function presetMatches(config, preset) {
  return Object.entries(preset).every(([key, value]) => Number(config[key]) === Number(value) || config[key] === value);
}

function activePreset(config) {
  if (presetMatches(config, PRESETS.royal)) return "royal";
  if (presetMatches(config, PRESETS.lord)) return "lord";
  return "custom";
}

function updatePresetState(config) {
  const active = activePreset(config);
  document.body.dataset.theme = active;

  const royalButton = document.getElementById("royalPreset");
  const lordButton = document.getElementById("lordPreset");

  royalButton?.classList.toggle("active", active === "royal");
  royalButton?.setAttribute("aria-pressed", String(active === "royal"));
  lordButton?.classList.toggle("active", active === "lord");
  lordButton?.setAttribute("aria-pressed", String(active === "lord"));
}

function applyToControls(config) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(config[id]);
    else el.value = config[id];
  });
  updateLabels();
  updatePresetState(config);
}

async function readConfig() {
  const stored = await storageGet("micMaximizerConfig");
  return { ...DEFAULTS, ...(stored.micMaximizerConfig || {}) };
}

async function saveConfig(config) {
  const merged = { ...DEFAULTS, ...config };
  await storageSet({ micMaximizerConfig: merged });
  applyToControls(merged);
}

async function onControlInput(id, el) {
  const merged = await readConfig();
  merged[id] = el.type === "checkbox" ? el.checked : Number(el.value);
  await saveConfig(merged);
}

async function init() {
  applyToControls(await readConfig());

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => onControlInput(id, el));
  });

  document.getElementById("royalPreset")?.addEventListener("click", () => saveConfig(PRESETS.royal));
  document.getElementById("lordPreset")?.addEventListener("click", () => saveConfig(PRESETS.lord));
}

async function refreshHookStatus() {
  const el = document.getElementById("hookStatus");
  if (!el) return;

  try {
    const status = await sendMessage({ type: "MICMAX_STATUS_REQUEST" });
    const ageMs = status?.lastHeartbeat ? Date.now() - status.lastHeartbeat : Infinity;

    if (status?.ok && ageMs < 12000) {
      el.textContent = "Hook status: ACTIVE on Discord";
      el.className = "status ok";
    } else {
      el.textContent = "Hook status: waiting — open or reload Discord Web";
      el.className = "status warn";
    }
  } catch (_) {
    el.textContent = "Hook status: unavailable";
    el.className = "status warn";
  }
}

init();
setInterval(refreshHookStatus, 3000);
refreshHookStatus();
