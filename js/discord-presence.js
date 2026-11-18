const presenceCard = document.querySelector("[data-discord-presence]");

if (presenceCard) {
  const statusNode = presenceCard.querySelector("[data-discord-status]");
  const statusDot = presenceCard.querySelector("[data-discord-status-dot]");
  const noteNode = presenceCard.querySelector("[data-discord-note]");
  const trackNode = presenceCard.querySelector("[data-discord-track]");
  const trackTitleNode = presenceCard.querySelector("[data-discord-track-title]");
  const trackArtistNode = presenceCard.querySelector("[data-discord-track-artist]");
  const trackCoverNode = presenceCard.querySelector("[data-discord-cover]");
  const displayNameNodes = document.querySelectorAll("[data-discord-display-name]");
  const usernameNode = document.querySelector("[data-discord-username]");
  const avatarNodes = document.querySelectorAll("[data-discord-avatar]");
  const statusLabels = {
    online: "Online",
    idle: "Ausente",
    dnd: "Não perturbe",
    offline: "Offline",
  };

  function setText(node, value) {
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  }

  function setStatus(label, status = "unknown") {
    setText(statusNode, label);
    statusDot.dataset.status = status;
  }

  function setNote(message) {
    setText(noteNode, message);
    noteNode.hidden = false;
    trackNode.hidden = true;
    trackCoverNode.hidden = true;
    trackCoverNode.removeAttribute("src");
  }

  function renderPresenceResponse(payload) {
    if (payload.state === "setup_required") {
      setStatus("Bot ainda não configurado");
      setNote("A presença aparecerá após ativar o bot oficial no Vercel.");
      return;
    }

    if (payload.state === "bot_disconnected") {
      setStatus("Bot desconectado");
      setNote("Aguardando reconexão com o Discord.");
      return;
    }

    if (payload.state === "awaiting_presence") {
      setStatus("Aguardando presença");
      setNote("Confirme que a conta está no servidor configurado.");
      return;
    }

    if (payload.state !== "ready" || !payload.presence) {
      setStatus("Presença indisponível");
      setNote("Não foi possível consultar o status do Discord agora.");
      return;
    }

    const presence = payload.presence;
    const status = statusLabels[presence.status] ? presence.status : "unknown";
    setStatus(statusLabels[status] ?? "Status desconhecido", status);

    if (presence.displayName) {
      displayNameNodes.forEach((node) => setText(node, presence.displayName));
    }

    if (presence.username) {
      setText(usernameNode, `@${presence.username}`);
    }

    if (presence.avatarUrl) {
      try {
        const avatarUrl = new URL(presence.avatarUrl);
        if (avatarUrl.protocol === "https:" && avatarUrl.hostname === "cdn.discordapp.com") {
          avatarNodes.forEach((avatarNode) => {
            avatarNode.src = avatarUrl.href;
            avatarNode.alt = `Avatar de ${presence.displayName || presence.username || "Discord"}`;
          });
        }
      } catch {
        // Ignore invalid avatar URLs returned by an unavailable or stale payload.
      }
    }

    if (presence.activity?.title) {
      trackNode.hidden = false;
      noteNode.hidden = true;
      setText(trackTitleNode, presence.activity.title);
      setText(trackArtistNode, presence.activity.artist || "Artista não informado");

      trackCoverNode.hidden = true;
      trackCoverNode.removeAttribute("src");

      try {
        const coverUrl = new URL(presence.activity.coverUrl);
        if (coverUrl.protocol === "https:" && coverUrl.hostname === "i.scdn.co") {
          trackCoverNode.src = coverUrl.href;
          trackCoverNode.alt = `Capa do álbum ${presence.activity.album || presence.activity.title}`;
          trackCoverNode.hidden = false;
        }
      } catch {
        // Ignore missing or invalid Spotify cover URLs.
      }

      return;
    }

    setNote("Nenhuma música do Spotify compartilhada no momento.");
  }

  async function refreshPresence() {
    try {
      const response = await fetch("/api/discord-presence", {
        signal: AbortSignal.timeout(8_000),
      });
      const payload = await response.json();
      renderPresenceResponse(payload);
    } catch {
      setStatus("Presença indisponível");
      setNote("Aguardando a API de presença do Discord.");
    }
  }

  void refreshPresence();
  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void refreshPresence();
    }
  }, 15_000);
}
