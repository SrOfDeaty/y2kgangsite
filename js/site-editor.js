import { createAuthClient } from "@neondatabase/neon-js/auth";

const DEFAULT_SETTINGS = {
  palette: "basalto",
  backgroundColor: "#000001",
  accentColor: "#c7c7c7",
  cardColor: "#17171a",
  cardOpacity: 0.78,
  cardFillStyle: "solid",
  cardGradientStart: "#17171a",
  cardGradientEnd: "#3a1a26",
  cardGradientDirection: "to bottom right",
  cardGifUrl: "",
  backgroundImage: "https://i.imgur.com/vMQx7AE.jpeg",
  backgroundShade: 0.16,
  cardWidth: 320,
  cardRadius: 50,
  avatarSize: 146,
  fontFamily: "arial",
  siteEffect: "none",
  cursorStyle: "default",
  musicUrl: "/lil-peep-wanna-be-lyrics_1T09YWa6.mp3",
  musicVolume: 0.08,
};

const CURSOR_VALUES = {
  pointer: "pointer",
  crosshair: "crosshair",
  text: "text",
  wait: "wait",
};

const PALETTES = {
  basalto: { backgroundColor: "#000001", accentColor: "#c7c7c7", cardColor: "#17171a" },
  sangue: { backgroundColor: "#080304", accentColor: "#e04b5a", cardColor: "#211014" },
  violeta: { backgroundColor: "#08050d", accentColor: "#b18cff", cardColor: "#191225" },
  gelo: { backgroundColor: "#03090d", accentColor: "#78dbea", cardColor: "#10191f" },
};

const authBaseUrl = import.meta.env.VITE_NEON_AUTH_URL;
const authClient = authBaseUrl ? createAuthClient(authBaseUrl) : null;
const dialog = document.getElementById("site-editor");
const authView = document.querySelector("[data-auth-view]");
const editorView = document.querySelector("[data-editor-view]");
const authForm = document.getElementById("admin-auth-form");
const verifyForm = document.getElementById("verify-email-form");
const settingsForm = document.getElementById("site-settings-form");
const notice = document.getElementById("editor-notice");
const authSubmit = document.getElementById("auth-submit");
const authModeToggle = document.getElementById("auth-mode-toggle");
const audio = document.getElementById("audio");
const root = document.documentElement;

let authMode = "sign-in";
let verificationEmail = "";
function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.dataset.state = isError ? "error" : "success";
}

function unwrap(result) {
  if (result?.error) throw result.error;
  return result?.data?.data ?? result?.data ?? result;
}

function safeCssUrl(value) {
  return String(value || "").replaceAll('"', "%22").replaceAll("\\", "%5C");
}

function applySettings(settings) {
  const activeSettings = { ...DEFAULT_SETTINGS, ...settings };
  root.style.setProperty("--editor-background", activeSettings.backgroundColor);
  root.style.setProperty("--editor-accent", activeSettings.accentColor);
  root.style.setProperty("--editor-card-color", activeSettings.cardColor);
  root.style.setProperty("--editor-card-opacity", `${activeSettings.cardOpacity * 100}%`);
  root.style.setProperty("--editor-background-shade", activeSettings.backgroundShade);
  root.style.setProperty("--editor-card-width", `${activeSettings.cardWidth}px`);
  root.style.setProperty("--editor-card-radius", `${activeSettings.cardRadius}px`);
  root.style.setProperty("--editor-avatar-size", `${activeSettings.avatarSize}px`);
  root.style.setProperty(
    "--editor-font",
    activeSettings.fontFamily === "yanone" ? '"Yanone Kaffeesatz", sans-serif' : "Arial, sans-serif",
  );
  root.style.setProperty(
    "--editor-background-image",
    activeSettings.backgroundImage ? `url("${safeCssUrl(activeSettings.backgroundImage)}")` : "none",
  );
  root.style.setProperty("--editor-card-gradient-start", activeSettings.cardGradientStart);
  root.style.setProperty("--editor-card-gradient-end", activeSettings.cardGradientEnd);
  root.style.setProperty("--editor-card-gradient-direction", activeSettings.cardGradientDirection);
  root.dataset.cardFillStyle = activeSettings.cardFillStyle;
  root.dataset.siteEffect = activeSettings.siteEffect;

  if (activeSettings.cursorStyle === "default") {
    delete root.dataset.editorCursor;
    root.style.removeProperty("--editor-cursor");
  } else {
    root.dataset.editorCursor = activeSettings.cursorStyle;
    root.style.setProperty("--editor-cursor", CURSOR_VALUES[activeSettings.cursorStyle] || "auto");
  }

  const cardGif = document.querySelector("[data-card-gif]");
  if (cardGif) {
    if (activeSettings.cardGifUrl) {
      cardGif.src = activeSettings.cardGifUrl;
      cardGif.hidden = false;
    } else {
      cardGif.removeAttribute("src");
      cardGif.hidden = true;
    }
  }

  if (audio) {
    if (activeSettings.musicUrl) {
      audio.src = new URL(activeSettings.musicUrl, window.location.href).href;
    } else {
      audio.removeAttribute("src");
    }
    audio.volume = activeSettings.musicVolume;
  }
}

function readSettings() {
  const values = new FormData(settingsForm);
  return {
    palette: values.get("palette"),
    backgroundColor: values.get("backgroundColor"),
    accentColor: values.get("accentColor"),
    cardColor: values.get("cardColor"),
    cardOpacity: Number(values.get("cardOpacity")),
    cardFillStyle: values.get("cardFillStyle"),
    cardGradientStart: values.get("cardGradientStart"),
    cardGradientEnd: values.get("cardGradientEnd"),
    cardGradientDirection: values.get("cardGradientDirection"),
    cardGifUrl: String(values.get("cardGifUrl") || "").trim(),
    backgroundImage: String(values.get("backgroundImage") || "").trim(),
    backgroundShade: Number(values.get("backgroundShade")),
    cardWidth: Number(values.get("cardWidth")),
    cardRadius: Number(values.get("cardRadius")),
    avatarSize: Number(values.get("avatarSize")),
    fontFamily: values.get("fontFamily"),
    siteEffect: values.get("siteEffect"),
    cursorStyle: values.get("cursorStyle"),
    musicUrl: String(values.get("musicUrl") || "").trim(),
    musicVolume: Number(values.get("musicVolume")),
  };
}

function updateOutputs(settings) {
  const values = {
    backgroundShade: `${Math.round(settings.backgroundShade * 100)}%`,
    cardWidth: `${settings.cardWidth} px`,
    cardRadius: `${settings.cardRadius} px`,
    avatarSize: `${settings.avatarSize} px`,
    cardOpacity: `${Math.round(settings.cardOpacity * 100)}%`,
    musicVolume: `${Math.round(settings.musicVolume * 100)}%`,
  };

  Object.entries(values).forEach(([name, value]) => {
    const output = settingsForm.querySelector(`[data-output="${name}"]`);
    if (output) output.value = value;
  });
}

function fillForm(settings) {
  Object.entries({ ...DEFAULT_SETTINGS, ...settings }).forEach(([name, value]) => {
    const field = settingsForm.elements.namedItem(name);
    if (field) field.value = String(value);
  });
  updateOutputs({ ...DEFAULT_SETTINGS, ...settings });
}

async function getSessionToken() {
  if (!authClient) throw new Error("Neon Auth não está configurado.");
  const session = unwrap(await authClient.getSession());
  const token = session?.session?.token;
  return typeof token === "string" && token ? token : null;
}

async function fetchSettings(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch("/api/site-settings", { headers, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "settings_unavailable");
  return payload;
}

async function showEditorForSession() {
  try {
    const token = await getSessionToken();
    if (!token) {
      authView.hidden = false;
      editorView.hidden = true;
      showNotice("Entre com sua conta para abrir o editor.");
      return;
    }

    const payload = await fetchSettings(token);
    if (!payload.isAdmin) {
      authView.hidden = false;
      editorView.hidden = true;
      showNotice(
        payload.adminConfigured
          ? "Esta conta não tem permissão para editar o site."
          : "O email administrador ainda precisa ser configurado no projeto.",
        true,
      );
      return;
    }

    fillForm(payload.settings);
    applySettings(payload.settings);
    authView.hidden = true;
    editorView.hidden = false;
    showNotice("Acesso administrativo confirmado.");
  } catch {
    authView.hidden = false;
    editorView.hidden = true;
    showNotice("Não foi possível validar a sessão. Entre novamente.", true);
  }
}

async function openEditor() {
  if (!dialog.open) dialog.showModal();
  await showEditorForSession();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignUp = mode === "sign-up";
  authSubmit.textContent = isSignUp ? "Criar conta" : "Entrar";
  authModeToggle.textContent = isSignUp ? "Já tenho uma conta" : "Primeiro acesso? Criar conta";
  document.getElementById("admin-password").autocomplete = isSignUp ? "new-password" : "current-password";
  showNotice(
    isSignUp
      ? "Use o email autorizado do administrador. A confirmação será enviada por código."
      : "Entre com sua conta administrativa para personalizar o site.",
  );
}

function handleAuthError(error) {
  const code = error?.code || error?.status;
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === 401) {
    showNotice("Email ou senha inválidos.", true);
    return;
  }
  showNotice("Não foi possível autenticar. Confira os dados e tente novamente.", true);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!authClient) {
    showNotice("A autenticação Neon ainda não está configurada.", true);
    return;
  }

  const formData = new FormData(authForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  authSubmit.disabled = true;

  try {
    if (authMode === "sign-up") {
      unwrap(
        await authClient.signUp.email({
          email,
          password,
          name: "Administrador Y2KGANG",
          callbackURL: window.location.origin,
        }),
      );
      verificationEmail = email;
      document.getElementById("admin-otp").value = "";
      verifyForm.hidden = false;
      authForm.hidden = true;
      authModeToggle.hidden = true;
      showNotice("Enviamos um código para seu email. Digite-o para ativar a conta.");
      return;
    }

    unwrap(await authClient.signIn.email({ email, password, rememberMe: true }));
    await showEditorForSession();
  } catch (error) {
    handleAuthError(error);
  } finally {
    authSubmit.disabled = false;
  }
}

async function handleVerification(event) {
  event.preventDefault();
  if (!authClient) return;
  const otp = String(new FormData(verifyForm).get("otp") || "").trim();
  const email = verificationEmail || String(document.getElementById("admin-email").value || "").trim();

  try {
    unwrap(await authClient.emailOtp.verifyEmail({ email, otp }));
    verifyForm.hidden = true;
    authForm.hidden = false;
    authModeToggle.hidden = false;
    setAuthMode("sign-in");
    await showEditorForSession();
  } catch {
    showNotice("Código inválido ou expirado. Confira o email e tente novamente.", true);
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const saveButton = settingsForm.querySelector('[type="submit"]');
  saveButton.disabled = true;

  try {
    const token = await getSessionToken();
    if (!token) throw new Error("session_required");
    const settings = readSettings();
    const response = await fetch("/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "save_failed");
    }
    fillForm(payload.settings);
    applySettings(payload.settings);
    showNotice("Alterações salvas e publicadas no site.");
  } catch (error) {
    showNotice(
      error?.message === "admin_access_required"
        ? "Sua conta não está autorizada para salvar."
        : "Não foi possível salvar. Verifique a conexão e tente novamente.",
      true,
    );
  } finally {
    saveButton.disabled = false;
  }
}

async function signOut() {
  if (!authClient) return;
  try {
    unwrap(await authClient.signOut());
    authView.hidden = false;
    editorView.hidden = true;
    verifyForm.hidden = true;
    authForm.hidden = false;
    authModeToggle.hidden = false;
    setAuthMode("sign-in");
    showNotice("Você saiu da conta.");
  } catch {
    showNotice("Não foi possível encerrar a sessão. Tente novamente.", true);
  }
}

function connectFormPreview() {
  settingsForm.addEventListener("input", (event) => {
    if (["backgroundColor", "accentColor", "cardColor"].includes(event.target.name)) {
      settingsForm.elements.namedItem("palette").value = "custom";
    }
    const settings = readSettings();
    updateOutputs(settings);
    applySettings(settings);
  });

  settingsForm.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement) || event.target.name === "palette") return;
    const settings = readSettings();
    updateOutputs(settings);
    applySettings(settings);
  });

  settingsForm.elements.namedItem("palette").addEventListener("change", (event) => {
    const palette = PALETTES[event.target.value];
    if (!palette) return;
    Object.entries(palette).forEach(([name, value]) => {
      settingsForm.elements.namedItem(name).value = value;
    });
    const settings = readSettings();
    updateOutputs(settings);
    applySettings(settings);
  });

  document.getElementById("reset-settings").addEventListener("click", () => {
    fillForm(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    showNotice("Padrões restaurados na prévia. Salve para publicar.");
  });

  document.getElementById("test-music").addEventListener("click", async () => {
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
        document.getElementById("test-music").textContent = "Pausar música";
      } else {
        audio.pause();
        document.getElementById("test-music").textContent = "Testar música";
      }
    } catch {
      showNotice("Não foi possível reproduzir este áudio. Confira o link.", true);
    }
  });
}

async function loadPublicSettings() {
  try {
    const payload = await fetchSettings();
    applySettings(payload.settings);
  } catch {
    applySettings(DEFAULT_SETTINGS);
  }
}

document.querySelector(".site-admin-trigger").addEventListener("click", () => void openEditor());
document.querySelector("[data-close-editor]").addEventListener("click", () => dialog.close());
authForm.addEventListener("submit", handleAuthSubmit);
verifyForm.addEventListener("submit", handleVerification);
authModeToggle.addEventListener("click", () => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in"));
settingsForm.addEventListener("submit", saveSettings);
document.getElementById("admin-sign-out").addEventListener("click", () => void signOut());
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    void openEditor();
  }
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

connectFormPreview();
fillForm(DEFAULT_SETTINGS);
void loadPublicSettings();
