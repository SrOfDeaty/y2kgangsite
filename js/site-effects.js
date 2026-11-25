const audio = document.getElementById("audio");
const player = document.querySelector("[data-music-player]");
const playButton = document.querySelector("[data-music-toggle]");
const progressInput = document.querySelector("[data-music-progress]");
const volumeInput = document.querySelector("[data-music-volume]");
const currentTimeLabel = document.querySelector("[data-music-current]");
const durationLabel = document.querySelector("[data-music-duration]");
const coverImage = document.querySelector("[data-music-cover]");
const playerStatus = document.querySelector("[data-music-status]");
const visitorCounter = document.querySelector("[data-visitor-counter]");
const visitorCount = document.querySelector("[data-visitor-count]");
const visitorLabel = document.querySelector("[data-visitor-label]");
let visitorRequestStarted = false;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

const waveform = document.querySelector(".music-player__waveform");
if (waveform) {
  const bars = document.createDocumentFragment();
  for (let index = 0; index < 44; index += 1) {
    const bar = document.createElement("span");
    bar.style.setProperty("--bar-height", `${2 + Math.random() * 10}px`);
    bars.append(bar);
  }
  waveform.append(bars);
}

function updatePlaybackState() {
  if (!audio || !playButton) return;
  const isPlaying = !audio.paused;
  playButton.dataset.playing = String(isPlaying);
  playButton.setAttribute("aria-pressed", String(isPlaying));
  playButton.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproduzir música");
}

function updateProgress() {
  if (!audio || !progressInput) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const fraction = duration > 0 ? audio.currentTime / duration : 0;
  progressInput.value = String(Math.round(fraction * Number(progressInput.max)));
  progressInput.style.setProperty("--progress", `${fraction * 100}%`);
  if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
  if (durationLabel) durationLabel.textContent = formatTime(duration);
}

function updateVolume() {
  if (!audio || !volumeInput) return;
  volumeInput.value = String(audio.volume);
  volumeInput.style.setProperty("--progress", `${audio.volume * 100}%`);
}

async function recordUniqueVisitor() {
  if (!visitorCounter || visitorRequestStarted) return;
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)) return;
  visitorRequestStarted = true;

  try {
    const response = await fetch("/api/site-visitors", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("visitor_counter_unavailable");

    const payload = await response.json();
    const count = Number(payload.count);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("invalid_visitor_count");
    visitorCount.textContent = new Intl.NumberFormat("pt-BR").format(count);
  } catch {
    visitorCount.textContent = "—";
  }
}

function syncSettings(settings) {
  if (!settings || typeof settings !== "object") return;

  if (player) {
    player.hidden = !settings.musicPlayerEnabled;
    const title = document.querySelector("[data-music-title]");
    const artist = document.querySelector("[data-music-artist]");
    if (title) title.textContent = settings.musicTitle || "";
    if (artist) artist.textContent = settings.musicArtist || "";
    if (coverImage) {
      coverImage.src = settings.musicCoverUrl || "/mwa-music-cover.png";
      coverImage.alt = [settings.musicTitle, settings.musicArtist].filter(Boolean).join(" — ")
        ? `Capa de ${[settings.musicTitle, settings.musicArtist].filter(Boolean).join(" — ")}`
        : "Capa da música";
    }
  }

  if (visitorCounter) {
    const isEnabled = Boolean(settings.visitorCounterEnabled);
    visitorCounter.hidden = !isEnabled;
    if (visitorLabel) visitorLabel.textContent = settings.visitorCounterLabel || "VISITAS";
    if (isEnabled) void recordUniqueVisitor();
  }
}

if (audio && playButton) {
  playButton.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        if (playerStatus) playerStatus.textContent = "Música reproduzindo.";
      } catch {
        if (playerStatus) playerStatus.textContent = "Não foi possível reproduzir a música.";
      }
    } else {
      audio.pause();
      if (playerStatus) playerStatus.textContent = "Música pausada.";
    }
    updatePlaybackState();
  });

  audio.addEventListener("play", updatePlaybackState);
  audio.addEventListener("pause", updatePlaybackState);
  audio.addEventListener("ended", updatePlaybackState);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("volumechange", updateVolume);

  progressInput?.addEventListener("input", () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (duration <= 0) return;
    audio.currentTime = (Number(progressInput.value) / Number(progressInput.max)) * duration;
    updateProgress();
  });

  volumeInput?.addEventListener("input", () => {
    audio.volume = Math.min(1, Math.max(0, Number(volumeInput.value)));
    updateVolume();
  });

  updatePlaybackState();
  updateProgress();
  updateVolume();
}

window.addEventListener("site:settings-applied", (event) => syncSettings(event.detail));

const glyphContainer = document.querySelector(".site-floating-glyphs");
const glyphs = ["私", "キ", "ヨ", "ユ", "メ", "ヌ", "ジ", "ン", "夢", "夜", "シ", "ガ", "セ", "リ"];

if (glyphContainer) {
  for (let index = 0; index < 8; index += 1) {
    const glyph = document.createElement("span");
    const glyphCount = 3 + Math.floor(Math.random() * 5);
    const phrase = Array.from({ length: glyphCount }, () => glyphs[Math.floor(Math.random() * glyphs.length)]);
    glyph.className = "site-floating-glyph";
    glyph.textContent = phrase.join(" ");
    glyph.style.left = `${5 + Math.random() * 86}%`;
    glyph.style.top = `${10 + Math.random() * 76}%`;
    glyph.style.setProperty("--glyph-duration", `${18 + Math.random() * 18}s`);
    glyph.style.setProperty("--glyph-delay", `${-Math.random() * 24}s`);
    glyph.style.setProperty("--glyph-drift", `${-36 + Math.random() * 72}px`);
    glyphContainer.append(glyph);
  }
}
