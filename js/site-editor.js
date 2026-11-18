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
  cardHeight: 620,
  cardPositionX: 50,
  cardPositionY: 50,
  cardRadius: 50,
  avatarSize: 146,
  fontFamily: "arial",
  customFontFamily: "",
  customFontUrl: "",
  profileNameOverride: "",
  profileUsernameOverride: "",
  presenceNameOverride: "",
  presenceNoteOverride: "",
  profileNameSize: 16,
  profileUsernameSize: 14,
  presenceNameSize: 14,
  presenceBodySize: 12,
  profileNameX: 0,
  profileNameY: 0,
  profileUsernameX: 0,
  profileUsernameY: 0,
  presenceTextX: 0,
  presenceTextY: 0,
  siteEffect: "none",
  cursorStyle: "default",
  cursorImageUrl: "",
  presencePositionMode: "inline",
  presenceX: 50,
  presenceY: 50,
  presenceWidth: 360,
  presenceHeight: 112,
  presenceBackground: "#17171d",
  presenceTextColor: "#f5f5f7",
  presenceBorderColor: "#ffffff",
  presenceOpacity: 0.82,
  presenceRadius: 24,
  presenceBorderWidth: 1,
  presencePadding: 12,
  presenceAvatarSize: 50,
  presenceCoverSize: 88,
  presenceBlur: 18,
  presenceBackgroundImage: "",
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
const previewStage = document.getElementById("editor-preview");

let previewDrag = null;

function renderEditorPreview(settings) {
  if (!previewStage) return;
  previewStage.dataset.presencePosition = settings.presencePositionMode;
  const originalCard = document.querySelector(".discord-profile");
  if (!originalCard) return;
  const previewCard = originalCard.cloneNode(true);
  previewCard.dataset.editorPreviewCard = "";

  const moveCard = document.createElement("span");
  moveCard.className = "editor-drag-handle";
  moveCard.textContent = "Mover card";
  moveCard.setAttribute("aria-hidden", "true");
  previewCard.append(moveCard, createResizeHandle("card"));

  const presenceCard = previewCard.querySelector(".discord-presence");
  if (presenceCard) {
    presenceCard.dataset.editorPreviewPresence = "";
    const movePresence = document.createElement("span");
    movePresence.className = "editor-drag-handle editor-drag-handle--presence";
    movePresence.textContent = "";
    movePresence.setAttribute("aria-hidden", "true");
    presenceCard.append(movePresence, createResizeHandle("presence"));
    if (settings.presencePositionMode === "floating") presenceCard.remove();
  }
  previewStage.replaceChildren(
    previewCard,
    ...(settings.presencePositionMode === "floating" && presenceCard ? [presenceCard] : []),
  );
}

function createResizeHandle(target) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = `editor-resize-handle editor-resize-handle--${target}`;
  handle.dataset.editorResize = target;
  handle.setAttribute("aria-label", `Redimensionar ${target === "card" ? "card principal" : "cartão do Discord"}`);
  handle.title = "Arraste para redimensionar";
  return handle;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function updatePreviewDrag(event) {
  if (!previewDrag || event.pointerId !== previewDrag.pointerId) return;
  const bounds = previewStage.getBoundingClientRect();
  const deltaX = event.clientX - previewDrag.startX;
  const deltaY = event.clientY - previewDrag.startY;
  const fields = settingsForm.elements;

  if (previewDrag.target === "card") {
    if (previewDrag.mode === "move") {
      fields.namedItem("cardPositionX").value = String(clamp(previewDrag.startValueX + (deltaX / bounds.width) * 100, 5, 95));
      fields.namedItem("cardPositionY").value = String(clamp(previewDrag.startValueY + (deltaY / bounds.height) * 100, 5, 95));
    } else {
      fields.namedItem("cardWidth").value = String(clamp(previewDrag.startWidth + deltaX, 260, 420));
      fields.namedItem("cardHeight").value = String(clamp(previewDrag.startHeight + deltaY, 360, 760));
    }
  } else {
    fields.namedItem("presencePositionMode").value = "floating";
    if (previewDrag.mode === "move") {
      fields.namedItem("presenceX").value = String(clamp(previewDrag.startValueX + (deltaX / bounds.width) * 100, 5, 95));
      fields.namedItem("presenceY").value = String(clamp(previewDrag.startValueY + (deltaY / bounds.height) * 100, 5, 95));
    } else {
      fields.namedItem("presenceWidth").value = String(clamp(previewDrag.startWidth + deltaX, 240, 520));
      fields.namedItem("presenceHeight").value = String(clamp(previewDrag.startHeight + deltaY, 90, 320));
    }
  }

  const settings = readSettings();
  updateOutputs(settings);
  applySettings(settings);
}

function endPreviewDrag(event) {
  if (!previewDrag || event.pointerId !== previewDrag.pointerId) return;
  previewDrag = null;
  previewStage.classList.remove("is-dragging");
  if (previewStage.hasPointerCapture(event.pointerId)) previewStage.releasePointerCapture(event.pointerId);
}

const IMAGE_EXTENSIONS = new Set([
  "avif", "bmp", "gif", "heic", "heif", "ico", "jfif", "jpe", "jpeg", "jpg",
  "jxl", "png", "svg", "tif", "tiff", "webp",
]);

function isImageFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension);
}

async function uploadMedia(input, settingName, acceptedTypes) {
  const file = input.files?.[0];
  if (!file) return;
  const isAccepted = acceptedTypes.includes("image/*")
    ? isImageFile(file)
    : acceptedTypes.includes(file.type);
  if (!isAccepted) {
    showNotice("Formato de arquivo não aceito para este campo.", true);
    input.value = "";
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showNotice("O arquivo deve ter no máximo 4 MB.", true);
    input.value = "";
    return;
  }

  input.disabled = true;
  let uploadSucceeded = false;
  showNotice("Enviando arquivo para o armazenamento…");
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("session_required");
    const data = new FormData();
    data.append("file", file);
    const response = await fetch("/api/site-upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "upload_failed");
    if (typeof payload.url !== "string" || !payload.url) throw new Error("upload_failed");
    const field = settingsForm.elements.namedItem(settingName);
    field.value = payload.url;
    uploadSucceeded = true;
    if (settingName === "cursorImageUrl") {
      settingsForm.elements.namedItem("cursorStyle").value = "custom";
    }
    const settings = readSettings();
    updateOutputs(settings);
    applySettings(settings);
    if (await saveSettings()) showNotice("Imagem enviada, salva e publicada no site.");
  } catch (error) {
    const messages = {
      admin_access_required: "Sua sessão administrativa expirou. Entre novamente para enviar imagens.",
      blob_not_configured: "O armazenamento de imagens não está configurado no projeto.",
      file_too_large: "O arquivo deve ter no máximo 4 MB.",
      unsupported_file_type: "Este formato de arquivo não é suportado.",
      upload_failed: "O armazenamento não conseguiu salvar o arquivo. Tente novamente.",
    };
    showNotice(messages[error?.message] || "Não foi possível enviar a imagem. Verifique sua sessão e tente novamente.", true);
  } finally {
    input.disabled = false;
    if (!uploadSucceeded) input.value = "";
  }
}

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
  root.style.setProperty("--editor-card-height", `${activeSettings.cardHeight}px`);
  root.style.setProperty("--editor-card-x", `${activeSettings.cardPositionX}%`);
  root.style.setProperty("--editor-card-y", `${activeSettings.cardPositionY}%`);
  root.style.setProperty("--editor-card-margin-x", `${-activeSettings.cardWidth / 2}px`);
  root.style.setProperty("--editor-card-margin-y", `${-activeSettings.cardHeight / 2}px`);
  root.style.setProperty("--editor-card-radius", `${activeSettings.cardRadius}px`);
  root.style.setProperty("--editor-avatar-size", `${activeSettings.avatarSize}px`);
  root.style.setProperty(
    "--editor-font",
    activeSettings.fontFamily === "custom" && activeSettings.customFontFamily
      ? `"${activeSettings.customFontFamily.replace(/["\\\\]/g, "")}", sans-serif`
      : activeSettings.fontFamily === "yanone" ? '"Yanone Kaffeesatz", sans-serif' : "Arial, sans-serif",
  );
  const customFontStyle = document.getElementById("custom-site-font");
  if (activeSettings.customFontUrl) {
    const fontUrl = new URL(activeSettings.customFontUrl);
    if (fontUrl.protocol === "https:" && fontUrl.hostname === "fonts.googleapis.com") {
      const style = customFontStyle || Object.assign(document.createElement("link"), { id: "custom-site-font", rel: "stylesheet" });
      style.href = fontUrl.href;
      if (!style.isConnected) document.head.append(style);
    }
  } else {
    customFontStyle?.remove();
  }
  root.style.setProperty("--profile-name-size", `${activeSettings.profileNameSize}px`);
  root.style.setProperty("--profile-username-size", `${activeSettings.profileUsernameSize}px`);
  root.style.setProperty("--presence-name-size", `${activeSettings.presenceNameSize}px`);
  root.style.setProperty("--presence-body-size", `${activeSettings.presenceBodySize}px`);
  root.style.setProperty("--profile-name-x", `${activeSettings.profileNameX}px`);
  root.style.setProperty("--profile-name-y", `${activeSettings.profileNameY}px`);
  root.style.setProperty("--profile-username-x", `${activeSettings.profileUsernameX}px`);
  root.style.setProperty("--profile-username-y", `${activeSettings.profileUsernameY}px`);
  root.style.setProperty("--presence-text-x", `${activeSettings.presenceTextX}px`);
  root.style.setProperty("--presence-text-y", `${activeSettings.presenceTextY}px`);
  window.siteCardTextOverrides = activeSettings;
  document.querySelectorAll(".discord-profile > .profile > .nickr").forEach((node) => {
    if (activeSettings.profileNameOverride) node.textContent = activeSettings.profileNameOverride;
  });
  document.querySelectorAll(".discord-profile > .profile > .subnick").forEach((node) => {
    if (activeSettings.profileUsernameOverride) node.textContent = activeSettings.profileUsernameOverride;
  });
  document.querySelectorAll(".discord-presence-name").forEach((node) => {
    if (activeSettings.presenceNameOverride) node.textContent = activeSettings.presenceNameOverride;
  });
  document.querySelectorAll(".discord-presence-note").forEach((node) => {
    if (activeSettings.presenceNoteOverride) node.textContent = activeSettings.presenceNoteOverride;
  });
  root.style.setProperty(
    "--editor-background-image",
    activeSettings.backgroundImage ? `url("${safeCssUrl(activeSettings.backgroundImage)}")` : "none",
  );
  root.style.setProperty("--editor-card-gradient-start", activeSettings.cardGradientStart);
  root.style.setProperty("--editor-card-gradient-end", activeSettings.cardGradientEnd);
  root.style.setProperty("--editor-card-gradient-direction", activeSettings.cardGradientDirection);
  root.dataset.cardFillStyle = activeSettings.cardFillStyle;
  root.dataset.siteEffect = activeSettings.siteEffect;
  root.dataset.presencePosition = activeSettings.presencePositionMode;
  root.style.setProperty("--presence-x", `${activeSettings.presenceX}%`);
  root.style.setProperty("--presence-y", `${activeSettings.presenceY}%`);
  root.style.setProperty("--presence-width", `${activeSettings.presenceWidth}px`);
  root.style.setProperty("--presence-height", `${activeSettings.presenceHeight}px`);
  root.style.setProperty("--presence-background", activeSettings.presenceBackground);
  root.style.setProperty("--presence-text-color", activeSettings.presenceTextColor);
  root.style.setProperty("--presence-border-color", activeSettings.presenceBorderColor);
  root.style.setProperty("--presence-opacity", `${activeSettings.presenceOpacity * 100}%`);
  root.style.setProperty("--presence-radius", `${activeSettings.presenceRadius}px`);
  root.style.setProperty("--presence-border-width", `${activeSettings.presenceBorderWidth}px`);
  root.style.setProperty("--presence-padding", `${activeSettings.presencePadding}px`);
  root.style.setProperty("--presence-avatar-size", `${activeSettings.presenceAvatarSize}px`);
  root.style.setProperty("--presence-cover-size", `${activeSettings.presenceCoverSize}px`);
  root.style.setProperty("--presence-blur", `${activeSettings.presenceBlur}px`);
  root.style.setProperty(
    "--presence-background-image",
    activeSettings.presenceBackgroundImage
      ? `url("${safeCssUrl(activeSettings.presenceBackgroundImage)}")`
      : "none",
  );

  if (activeSettings.cursorStyle === "custom" && activeSettings.cursorImageUrl) {
    root.dataset.editorCursor = "custom";
    root.style.setProperty("--editor-cursor", `url("${safeCssUrl(activeSettings.cursorImageUrl)}") 4 4, auto`);
  } else if (activeSettings.cursorStyle === "default") {
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
      const nextAudioUrl = new URL(activeSettings.musicUrl, window.location.href).href;
      if (audio.src !== nextAudioUrl) audio.src = nextAudioUrl;
    } else {
      audio.removeAttribute("src");
    }
    audio.volume = activeSettings.musicVolume;
  }
  renderEditorPreview(activeSettings);
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
    cardHeight: Number(values.get("cardHeight")),
    cardPositionX: Number(values.get("cardPositionX")),
    cardPositionY: Number(values.get("cardPositionY")),
    cardRadius: Number(values.get("cardRadius")),
    avatarSize: Number(values.get("avatarSize")),
    fontFamily: values.get("fontFamily"),
    customFontFamily: String(values.get("customFontFamily") || "").trim(),
    customFontUrl: String(values.get("customFontUrl") || "").trim(),
    profileNameOverride: String(values.get("profileNameOverride") || "").trim(),
    profileUsernameOverride: String(values.get("profileUsernameOverride") || "").trim(),
    presenceNameOverride: String(values.get("presenceNameOverride") || "").trim(),
    presenceNoteOverride: String(values.get("presenceNoteOverride") || "").trim(),
    profileNameSize: Number(values.get("profileNameSize")),
    profileUsernameSize: Number(values.get("profileUsernameSize")),
    presenceNameSize: Number(values.get("presenceNameSize")),
    presenceBodySize: Number(values.get("presenceBodySize")),
    profileNameX: Number(values.get("profileNameX")),
    profileNameY: Number(values.get("profileNameY")),
    profileUsernameX: Number(values.get("profileUsernameX")),
    profileUsernameY: Number(values.get("profileUsernameY")),
    presenceTextX: Number(values.get("presenceTextX")),
    presenceTextY: Number(values.get("presenceTextY")),
    siteEffect: values.get("siteEffect"),
    cursorStyle: values.get("cursorStyle"),
    cursorImageUrl: String(values.get("cursorImageUrl") || "").trim(),
    presencePositionMode: values.get("presencePositionMode"),
    presenceX: Number(values.get("presenceX")),
    presenceY: Number(values.get("presenceY")),
    presenceWidth: Number(values.get("presenceWidth")),
    presenceHeight: Number(values.get("presenceHeight")),
    presenceBackground: values.get("presenceBackground"),
    presenceTextColor: values.get("presenceTextColor"),
    presenceBorderColor: values.get("presenceBorderColor"),
    presenceOpacity: Number(values.get("presenceOpacity")),
    presenceRadius: Number(values.get("presenceRadius")),
    presenceBorderWidth: Number(values.get("presenceBorderWidth")),
    presencePadding: Number(values.get("presencePadding")),
    presenceAvatarSize: Number(values.get("presenceAvatarSize")),
    presenceCoverSize: Number(values.get("presenceCoverSize")),
    presenceBlur: Number(values.get("presenceBlur")),
    presenceBackgroundImage: String(values.get("presenceBackgroundImage") || "").trim(),
    musicUrl: String(values.get("musicUrl") || "").trim(),
    musicVolume: Number(values.get("musicVolume")),
  };
}

function updateOutputs(settings) {
  const values = {
    backgroundShade: `${Math.round(settings.backgroundShade * 100)}%`,
    cardWidth: `${settings.cardWidth} px`,
    cardHeight: `${settings.cardHeight} px`,
    cardPositionX: `${Math.round(settings.cardPositionX)}%`,
    cardPositionY: `${Math.round(settings.cardPositionY)}%`,
    cardRadius: `${settings.cardRadius} px`,
    avatarSize: `${settings.avatarSize} px`,
    cardOpacity: `${Math.round(settings.cardOpacity * 100)}%`,
    musicVolume: `${Math.round(settings.musicVolume * 100)}%`,
    profileNameSize: `${settings.profileNameSize} px`,
    profileUsernameSize: `${settings.profileUsernameSize} px`,
    presenceNameSize: `${settings.presenceNameSize} px`,
    presenceBodySize: `${settings.presenceBodySize} px`,
    profileNameX: `${settings.profileNameX} px`,
    profileNameY: `${settings.profileNameY} px`,
    profileUsernameX: `${settings.profileUsernameX} px`,
    profileUsernameY: `${settings.profileUsernameY} px`,
    presenceTextX: `${settings.presenceTextX} px`,
    presenceTextY: `${settings.presenceTextY} px`,
    presenceX: `${settings.presenceX}%`,
    presenceY: `${settings.presenceY}%`,
    presenceWidth: `${settings.presenceWidth} px`,
    presenceHeight: `${settings.presenceHeight} px`,
    presenceOpacity: `${Math.round(settings.presenceOpacity * 100)}%`,
    presenceRadius: `${settings.presenceRadius} px`,
    presenceBorderWidth: `${settings.presenceBorderWidth} px`,
    presencePadding: `${settings.presencePadding} px`,
    presenceAvatarSize: `${settings.presenceAvatarSize} px`,
    presenceCoverSize: `${settings.presenceCoverSize} px`,
    presenceBlur: `${settings.presenceBlur} px`,
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
    authView.hidden = true;
    editorView.hidden = false;
    applySettings(payload.settings);
    showNotice("Acesso administrativo confirmado.");
  } catch {
    authView.hidden = false;
    editorView.hidden = true;
    showNotice("Não foi possível validar a sessão. Entre novamente.", true);
  }
}

async function openEditor() {
  if (!document.body.dataset.adminPage) {
    window.open("/admin.html", "_blank", "noopener,noreferrer");
    return;
  }
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
  event?.preventDefault();
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
    if (event) showNotice("Alterações salvas e publicadas no site.");
    return true;
  } catch (error) {
    showNotice(
      error?.message === "admin_access_required"
        ? "Sua conta não está autorizada para salvar."
        : "Não foi possível salvar. Verifique a conexão e tente novamente.",
      true,
    );
    return false;
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

function createEditorTabs() {
  const groups = [
    { id: "appearance", label: "Aparência", description: "Fundo, cores e dimensões" },
    { id: "text", label: "Textos", description: "Conteúdo e tipografia" },
    { id: "discord", label: "Discord", description: "Cartão de presença" },
    { id: "music", label: "Música", description: "Áudio e volume" },
  ];
  const form = settingsForm;
  const fieldsets = [...form.querySelectorAll(":scope > .site-editor__group")];
  if (!fieldsets.length) return;
  const navigation = document.createElement("div");
  navigation.className = "site-editor__tabs";
  navigation.setAttribute("role", "tablist");
  navigation.setAttribute("aria-label", "Categorias de personalização");
  const panels = new Map();

  groups.forEach((group, index) => {
    const button = document.createElement("button");
    button.className = "site-editor__tab";
    button.type = "button";
    button.id = `editor-tab-${group.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `editor-panel-${group.id}`);
    button.setAttribute("aria-selected", String(index === 0));
    button.tabIndex = index === 0 ? 0 : -1;
    button.innerHTML = `<span>${group.label}</span><small>${group.description}</small>`;
    navigation.append(button);

    const panel = document.createElement("section");
    panel.className = "site-editor__tab-panel";
    panel.id = `editor-panel-${group.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
    panel.hidden = index !== 0;
    panels.set(group.id, panel);
    const activateTab = () => {
      navigation.querySelectorAll('[role="tab"]').forEach((tab) => {
        const active = tab === button;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach((item) => { item.hidden = item !== panel; });
    };
    button.addEventListener("click", activateTab);
    button.addEventListener("keydown", (event) => {
      const tabs = [...navigation.querySelectorAll('[role="tab"]')];
      const currentIndex = tabs.indexOf(button);
      const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length
        : event.key === "ArrowLeft" ? (currentIndex - 1 + tabs.length) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });

  fieldsets.forEach((fieldset) => {
    const legend = fieldset.querySelector("legend")?.textContent || "";
    const group = legend.includes("Textos") ? "text"
      : legend.includes("integração") ? "discord"
      : legend === "Música" ? "music" : "appearance";
    panels.get(group).append(fieldset);
  });
  form.prepend(navigation, ...panels.values());
}

function connectFormPreview() {
  previewStage.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element) || event.button !== 0) return;
    const resizeHandle = event.target.closest("[data-editor-resize]");
    const presence = event.target.closest("[data-editor-preview-presence]");
    const card = event.target.closest("[data-editor-preview-card]");
    const target = resizeHandle?.dataset.editorResize || (presence ? "presence" : card ? "card" : null);
    if (!target) return;

    const settings = readSettings();
    previewDrag = {
      pointerId: event.pointerId,
      target,
      mode: resizeHandle ? "resize" : "move",
      startX: event.clientX,
      startY: event.clientY,
      startWidth: target === "card" ? settings.cardWidth : settings.presenceWidth,
      startHeight: target === "card" ? settings.cardHeight : settings.presenceHeight,
      startValueX: target === "card" ? settings.cardPositionX : settings.presenceX,
      startValueY: target === "card" ? settings.cardPositionY : settings.presenceY,
    };
    event.preventDefault();
    previewStage.setPointerCapture(event.pointerId);
    previewStage.classList.add("is-dragging");
  });
  previewStage.addEventListener("pointermove", updatePreviewDrag);
  previewStage.addEventListener("pointerup", endPreviewDrag);
  previewStage.addEventListener("pointercancel", endPreviewDrag);

  settingsForm.addEventListener("input",  (event) => {
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

  const uploadFields = [
    ["upload-background-image", "backgroundImage", ["image/*"]],
    ["upload-card-media", "cardGifUrl", ["image/*"]],
    ["upload-presence-background", "presenceBackgroundImage", ["image/*"]],
    ["upload-cursor-image", "cursorImageUrl", ["image/*"]],
    ["upload-music", "musicUrl", ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac"]],
  ];
  uploadFields.forEach(([inputId, settingName, acceptedTypes]) => {
    document.getElementById(inputId).addEventListener("change", (event) => {
      void uploadMedia(event.currentTarget, settingName, acceptedTypes);
    });
  });

  document.getElementById("test-music").addEventListener("click", async () => {
    if (document.body.dataset.adminPage) {
      showNotice("A música toca apenas na página do perfil.");
      return;
    }
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
  const isAdminPage = Boolean(document.body.dataset.adminPage);
  let userInteracted = false;
  let settingsLoaded = false;
  const handleFirstInteraction = () => {
    userInteracted = true;
    if (settingsLoaded) void attemptPlayback();
  };
  const attemptPlayback = async () => {
    if (!audio || isAdminPage || !audio.src) return;
    try {
      await audio.play();
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    } catch {}
  };

  if (audio && !isAdminPage) {
    audio.autoplay = false;
    document.addEventListener("pointerdown", handleFirstInteraction, { passive: true });
    document.addEventListener("keydown", handleFirstInteraction);
  }

  try {
    const payload = await fetchSettings();
    applySettings(payload.settings);
  } catch {
    applySettings(DEFAULT_SETTINGS);
  }

  settingsLoaded = true;
  if (audio && !isAdminPage) await attemptPlayback();
}

document.querySelector(".site-admin-trigger")?.addEventListener("click", () => void openEditor());
document.querySelector("[data-close-editor]").addEventListener("click", () => {
  if (document.body.dataset.adminPage) window.location.assign("/");
  else dialog.close();
});
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
  if (event.target === dialog && !document.body.dataset.adminPage) dialog.close();
});

if (document.body.dataset.adminPage) {
  document.title = "Y2KGANG — painel ADM";
  void openEditor();
}

createEditorTabs();
connectFormPreview();
fillForm(DEFAULT_SETTINGS);
void loadPublicSettings();
