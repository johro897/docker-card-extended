/*
 * Docker Card
 * A minimal Lovelace custom card to monitor and control Docker containers.
 * Inspired by vineetchoudhary/lovelace-docker-card but fully re-written
 * Extended with WUD Monitor integration (update_entity, wud_last_poll, wud_scan)
 * Extended with pause/resume support per container and paused count in overview
 * Extended with optional CPU/Memory sparkline graphs (graphs: true)
 */
(function () {
  const CARD_NAME = "docker-card";
  const CARD_DESCRIPTION = "Modern Docker container overview with start/stop toggles, pause/resume, restart actions and WUD update tracking.";
  const DEFAULT_LANGUAGE = "en";

  // Every UI string this card renders, keyed by BCP-47 primary language
  // subtag, then by dotted namespace path (looked up via _getValue()).
  // Bundled inline (not fetched from separate translations/<lang>.json
  // files) — see root CLAUDE.md's Kortkonventioner for why: HACS's plugin
  // category only ever distributes the one file named in hacs.json, so
  // extra files never reach a real install. This card used to fetch
  // translations/<lang>.json at runtime; those files never shipped, so
  // only English ever actually rendered — this replaces that with the
  // same inline pattern already proven in the other five cards.
  const TRANSLATIONS = {
    en: {
      common: {
        card_title: "Docker Card",
        container: "container",
        containers: "Containers",
      },
      placeholders: {
        waiting: "Waiting for Home Assistant…",
        no_containers: "No containers configured.",
      },
      overview: {
        running_total: "Running / Total",
        running_paused_stopped: "Running · Paused · Stopped",
        images: "Images",
        docker: "Docker",
        os: "OS",
        wud_last_poll: "Last WUD Scan",
        wud_scan: "Force Scan",
        running_total_aria: "Open running containers details",
        images_aria: "Open Docker images details",
        docker_aria: "Open Docker version details",
        os_aria: "Open operating system details",
        wud_last_poll_aria: "Open WUD last poll details",
        wud_scan_aria: "Trigger WUD scan now",
        updates_available: "Updates available",
        container_disk: "Container Disk",
        container_disk_aria: "Open container disk usage details",
        image_disk: "Image Disk",
        image_disk_aria: "Open image disk usage details",
        volume_disk: "Volume Disk",
        volume_disk_aria: "Open volume disk usage details",
        prune_images: "Prune Images",
        prune_now: "Prune now",
        prune_pending: "Pruning…",
        prune_confirm_text: "Remove unused images?",
        prune_confirm: "Confirm",
        prune_cancel: "Cancel",
        prune_aria: "Prune unused Docker images",
        prune_volumes: "Prune Volumes",
        prune_volumes_now: "Prune now",
        prune_volumes_pending: "Pruning…",
        prune_volumes_confirm_text: "Remove unused volumes?",
        prune_volumes_aria: "Prune unused Docker volumes",
        prune_networks: "Prune Networks",
        prune_networks_now: "Prune now",
        prune_networks_pending: "Pruning…",
        prune_networks_confirm_text: "Remove unused networks?",
        prune_networks_aria: "Prune unused Docker networks",
      },
      container: { image: "Image" },
      aria: {
        open_status_details: "Open Docker status details",
        collapse_containers: "Collapse container list",
        expand_containers: "Expand container list",
      },
      resources: { cpu: "CPU", memory: "Memory", network: "Network", no_history: "no history" },
      actions: {
        start: "start",
        stop: "stop",
        pause: "pause",
        resume: "resume",
        restart: "Restart",
        start_container: "Start container",
        stop_container: "Stop container",
        pause_container: "Pause container",
        resume_container: "Resume container",
        recreate: "Recreate",
        recreate_container: "Recreate container",
        recreate_confirm_text: "Recreate container?",
        recreating: "Recreating…",
        confirm: "Confirm",
        cancel: "Cancel",
      },
      notifications: {
        starting: "Starting {name}…",
        stopping: "Stopping {name}…",
        failed_start: "Failed to start {name}. Check logs.",
        failed_stop: "Failed to stop {name}. Check logs.",
        restarting: "Restarting {name}…",
        failed_restart: "Failed to restart {name}.",
        pausing: "Pausing {name}…",
        resuming: "Resuming {name}…",
        failed_pause: "Failed to pause {name}. Check logs.",
        failed_resume: "Failed to resume {name}. Check logs.",
        missing_toggle: "No service configured to {action} {name}.",
        missing_restart: "No restart service configured for {name}.",
        missing_pause: "No pause service configured for {name}.",
        missing_resume: "No resume service configured for {name}.",
        missing_recreate: "No recreate service configured for {name}.",
        recreating: "Recreating {name}…",
        failed_recreate: "Failed to recreate {name}.",
        wud_scan_triggered: "WUD scan triggered.",
        wud_scan_failed: "WUD scan failed.",
        prune_triggered: "Prune started.",
        prune_failed: "Prune failed.",
        prune_volumes_triggered: "Volume prune started.",
        prune_volumes_failed: "Volume prune failed.",
        prune_networks_triggered: "Network prune started.",
        prune_networks_failed: "Network prune failed.",
      },
      status: {
        online: "Online", offline: "Offline", idle: "Idle",
        running: "Running", stopped: "Stopped", unknown: "Unknown",
        starting: "Starting", degraded: "Degraded", paused: "Paused",
      },
      update: {
        available: "Update available",
        current: "Current",
        new: "New",
        days: "d ago",
        release_notes: "Release notes",
      },
    },
    sv: {
      common: {
        card_title: "Docker-kort",
        container: "container",
        containers: "Containrar",
      },
      placeholders: {
        waiting: "Väntar på Home Assistant…",
        no_containers: "Inga containrar konfigurerade.",
      },
      overview: {
        running_total: "Igång / Totalt",
        running_paused_stopped: "Igång · Pausad · Stoppad",
        images: "Images",
        docker: "Docker",
        os: "OS",
        wud_last_poll: "Senaste WUD-skanning",
        wud_scan: "Tvinga skanning",
        running_total_aria: "Öppna detaljer för körande containrar",
        images_aria: "Öppna detaljer för Docker-images",
        docker_aria: "Öppna detaljer för Docker-version",
        os_aria: "Öppna detaljer för operativsystem",
        wud_last_poll_aria: "Öppna detaljer för senaste WUD-poll",
        wud_scan_aria: "Utlös WUD-skanning nu",
        updates_available: "Uppdateringar tillgängliga",
        container_disk: "Containerdisk",
        container_disk_aria: "Öppna detaljer för containerns diskanvändning",
        image_disk: "Image-disk",
        image_disk_aria: "Öppna detaljer för images diskanvändning",
        volume_disk: "Volymdisk",
        volume_disk_aria: "Öppna detaljer för volymens diskanvändning",
        prune_images: "Rensa images",
        prune_now: "Rensa nu",
        prune_pending: "Rensar…",
        prune_confirm_text: "Ta bort oanvända images?",
        prune_confirm: "Bekräfta",
        prune_cancel: "Avbryt",
        prune_aria: "Rensa oanvända Docker-images",
        prune_volumes: "Rensa volymer",
        prune_volumes_now: "Rensa nu",
        prune_volumes_pending: "Rensar…",
        prune_volumes_confirm_text: "Ta bort oanvända volymer?",
        prune_volumes_aria: "Rensa oanvända Docker-volymer",
        prune_networks: "Rensa nätverk",
        prune_networks_now: "Rensa nu",
        prune_networks_pending: "Rensar…",
        prune_networks_confirm_text: "Ta bort oanvända nätverk?",
        prune_networks_aria: "Rensa oanvända Docker-nätverk",
      },
      container: { image: "Image" },
      aria: {
        open_status_details: "Öppna detaljer för Docker-status",
        collapse_containers: "Fäll ihop containerlistan",
        expand_containers: "Expandera containerlistan",
      },
      resources: { cpu: "CPU", memory: "Minne", network: "Nätverk", no_history: "ingen historik" },
      actions: {
        start: "starta",
        stop: "stoppa",
        pause: "pausa",
        resume: "återuppta",
        restart: "Starta om",
        start_container: "Starta container",
        stop_container: "Stoppa container",
        pause_container: "Pausa container",
        resume_container: "Återuppta container",
        recreate: "Återskapa",
        recreate_container: "Återskapa container",
        recreate_confirm_text: "Återskapa container?",
        recreating: "Återskapar…",
        confirm: "Bekräfta",
        cancel: "Avbryt",
      },
      notifications: {
        starting: "Startar {name}…",
        stopping: "Stoppar {name}…",
        failed_start: "Kunde inte starta {name}. Kontrollera loggarna.",
        failed_stop: "Kunde inte stoppa {name}. Kontrollera loggarna.",
        restarting: "Startar om {name}…",
        failed_restart: "Kunde inte starta om {name}.",
        pausing: "Pausar {name}…",
        resuming: "Återupptar {name}…",
        failed_pause: "Kunde inte pausa {name}. Kontrollera loggarna.",
        failed_resume: "Kunde inte återuppta {name}. Kontrollera loggarna.",
        missing_toggle: "Ingen tjänst konfigurerad för att {action} {name}.",
        missing_restart: "Ingen omstartstjänst konfigurerad för {name}.",
        missing_pause: "Ingen paustjänst konfigurerad för {name}.",
        missing_resume: "Ingen återupptagningstjänst konfigurerad för {name}.",
        missing_recreate: "Ingen återskapandetjänst konfigurerad för {name}.",
        recreating: "Återskapar {name}…",
        failed_recreate: "Kunde inte återskapa {name}.",
        wud_scan_triggered: "WUD-skanning utlöst.",
        wud_scan_failed: "WUD-skanning misslyckades.",
        prune_triggered: "Rensning startad.",
        prune_failed: "Rensning misslyckades.",
        prune_volumes_triggered: "Volymrensning startad.",
        prune_volumes_failed: "Volymrensning misslyckades.",
        prune_networks_triggered: "Nätverksrensning startad.",
        prune_networks_failed: "Nätverksrensning misslyckades.",
      },
      status: {
        online: "Online", offline: "Offline", idle: "Inaktiv",
        running: "Igång", stopped: "Stoppad", unknown: "Okänd",
        starting: "Startar", degraded: "Försämrad", paused: "Pausad",
      },
      update: {
        available: "Uppdatering tillgänglig",
        current: "Nuvarande",
        new: "Ny",
        days: "d sedan",
        release_notes: "Versionsinformation",
      },
    },
    de: {
      common: {
        card_title: "Docker-Karte",
        container: "Container",
        containers: "Container",
      },
      placeholders: {
        waiting: "Warte auf Home Assistant…",
        no_containers: "Keine Container konfiguriert.",
      },
      overview: {
        running_total: "Laufend / Gesamt",
        running_paused_stopped: "Laufend · Pausiert · Gestoppt",
        images: "Images",
        docker: "Docker",
        os: "Betriebssystem",
        wud_last_poll: "Letzter WUD-Scan",
        wud_scan: "Scan erzwingen",
        running_total_aria: "Details zu laufenden Containern öffnen",
        images_aria: "Details zu Docker-Images öffnen",
        docker_aria: "Details zur Docker-Version öffnen",
        os_aria: "Details zum Betriebssystem öffnen",
        wud_last_poll_aria: "Details zum letzten WUD-Abruf öffnen",
        wud_scan_aria: "WUD-Scan jetzt auslösen",
        updates_available: "Updates verfügbar",
        container_disk: "Container-Speicher",
        container_disk_aria: "Details zur Container-Speichernutzung öffnen",
        image_disk: "Image-Speicher",
        image_disk_aria: "Details zur Image-Speichernutzung öffnen",
        volume_disk: "Volume-Speicher",
        volume_disk_aria: "Details zur Volume-Speichernutzung öffnen",
        prune_images: "Images bereinigen",
        prune_now: "Jetzt bereinigen",
        prune_pending: "Wird bereinigt…",
        prune_confirm_text: "Ungenutzte Images entfernen?",
        prune_confirm: "Bestätigen",
        prune_cancel: "Abbrechen",
        prune_aria: "Ungenutzte Docker-Images bereinigen",
        prune_volumes: "Volumes bereinigen",
        prune_volumes_now: "Jetzt bereinigen",
        prune_volumes_pending: "Wird bereinigt…",
        prune_volumes_confirm_text: "Ungenutzte Volumes entfernen?",
        prune_volumes_aria: "Ungenutzte Docker-Volumes bereinigen",
        prune_networks: "Netzwerke bereinigen",
        prune_networks_now: "Jetzt bereinigen",
        prune_networks_pending: "Wird bereinigt…",
        prune_networks_confirm_text: "Ungenutzte Netzwerke entfernen?",
        prune_networks_aria: "Ungenutzte Docker-Netzwerke bereinigen",
      },
      container: { image: "Image" },
      aria: {
        open_status_details: "Docker-Statusdetails öffnen",
        collapse_containers: "Containerliste einklappen",
        expand_containers: "Containerliste ausklappen",
      },
      resources: { cpu: "CPU", memory: "Arbeitsspeicher", network: "Netzwerk", no_history: "kein Verlauf" },
      actions: {
        start: "starten",
        stop: "stoppen",
        pause: "pausieren",
        resume: "fortsetzen",
        restart: "Neu starten",
        start_container: "Container starten",
        stop_container: "Container stoppen",
        pause_container: "Container pausieren",
        resume_container: "Container fortsetzen",
        recreate: "Neu erstellen",
        recreate_container: "Container neu erstellen",
        recreate_confirm_text: "Container neu erstellen?",
        recreating: "Wird neu erstellt…",
        confirm: "Bestätigen",
        cancel: "Abbrechen",
      },
      notifications: {
        starting: "{name} wird gestartet…",
        stopping: "{name} wird gestoppt…",
        failed_start: "{name} konnte nicht gestartet werden. Protokolle prüfen.",
        failed_stop: "{name} konnte nicht gestoppt werden. Protokolle prüfen.",
        restarting: "{name} wird neu gestartet…",
        failed_restart: "{name} konnte nicht neu gestartet werden.",
        pausing: "{name} wird pausiert…",
        resuming: "{name} wird fortgesetzt…",
        failed_pause: "{name} konnte nicht pausiert werden. Protokolle prüfen.",
        failed_resume: "{name} konnte nicht fortgesetzt werden. Protokolle prüfen.",
        missing_toggle: "Kein Dienst konfiguriert, um {name} zu {action}.",
        missing_restart: "Kein Neustart-Dienst für {name} konfiguriert.",
        missing_pause: "Kein Pausier-Dienst für {name} konfiguriert.",
        missing_resume: "Kein Fortsetzungs-Dienst für {name} konfiguriert.",
        missing_recreate: "Kein Neuerstellungs-Dienst für {name} konfiguriert.",
        recreating: "{name} wird neu erstellt…",
        failed_recreate: "{name} konnte nicht neu erstellt werden.",
        wud_scan_triggered: "WUD-Scan ausgelöst.",
        wud_scan_failed: "WUD-Scan fehlgeschlagen.",
        prune_triggered: "Bereinigung gestartet.",
        prune_failed: "Bereinigung fehlgeschlagen.",
        prune_volumes_triggered: "Volume-Bereinigung gestartet.",
        prune_volumes_failed: "Volume-Bereinigung fehlgeschlagen.",
        prune_networks_triggered: "Netzwerk-Bereinigung gestartet.",
        prune_networks_failed: "Netzwerk-Bereinigung fehlgeschlagen.",
      },
      status: {
        online: "Online", offline: "Offline", idle: "Leerlauf",
        running: "Läuft", stopped: "Gestoppt", unknown: "Unbekannt",
        starting: "Startet", degraded: "Beeinträchtigt", paused: "Pausiert",
      },
      update: {
        available: "Update verfügbar",
        current: "Aktuell",
        new: "Neu",
        days: "Tag(e) her",
        release_notes: "Versionshinweise",
      },
    },
    fr: {
      common: {
        card_title: "Carte Docker",
        container: "conteneur",
        containers: "Conteneurs",
      },
      placeholders: {
        waiting: "En attente de Home Assistant…",
        no_containers: "Aucun conteneur configuré.",
      },
      overview: {
        running_total: "Actifs / Total",
        running_paused_stopped: "Actif · En pause · Arrêté",
        images: "Images",
        docker: "Docker",
        os: "OS",
        wud_last_poll: "Dernier scan WUD",
        wud_scan: "Forcer le scan",
        running_total_aria: "Ouvrir les détails des conteneurs actifs",
        images_aria: "Ouvrir les détails des images Docker",
        docker_aria: "Ouvrir les détails de la version Docker",
        os_aria: "Ouvrir les détails du système d'exploitation",
        wud_last_poll_aria: "Ouvrir les détails du dernier scan WUD",
        wud_scan_aria: "Déclencher un scan WUD maintenant",
        updates_available: "Mises à jour disponibles",
        container_disk: "Disque du conteneur",
        container_disk_aria: "Ouvrir les détails d'utilisation disque du conteneur",
        image_disk: "Disque des images",
        image_disk_aria: "Ouvrir les détails d'utilisation disque des images",
        volume_disk: "Disque des volumes",
        volume_disk_aria: "Ouvrir les détails d'utilisation disque des volumes",
        prune_images: "Nettoyer les images",
        prune_now: "Nettoyer maintenant",
        prune_pending: "Nettoyage…",
        prune_confirm_text: "Supprimer les images inutilisées ?",
        prune_confirm: "Confirmer",
        prune_cancel: "Annuler",
        prune_aria: "Nettoyer les images Docker inutilisées",
        prune_volumes: "Nettoyer les volumes",
        prune_volumes_now: "Nettoyer maintenant",
        prune_volumes_pending: "Nettoyage…",
        prune_volumes_confirm_text: "Supprimer les volumes inutilisés ?",
        prune_volumes_aria: "Nettoyer les volumes Docker inutilisés",
        prune_networks: "Nettoyer les réseaux",
        prune_networks_now: "Nettoyer maintenant",
        prune_networks_pending: "Nettoyage…",
        prune_networks_confirm_text: "Supprimer les réseaux inutilisés ?",
        prune_networks_aria: "Nettoyer les réseaux Docker inutilisés",
      },
      container: { image: "Image" },
      aria: {
        open_status_details: "Ouvrir les détails du statut Docker",
        collapse_containers: "Réduire la liste des conteneurs",
        expand_containers: "Développer la liste des conteneurs",
      },
      resources: { cpu: "CPU", memory: "Mémoire", network: "Réseau", no_history: "aucun historique" },
      actions: {
        start: "démarrer",
        stop: "arrêter",
        pause: "mettre en pause",
        resume: "reprendre",
        restart: "Redémarrer",
        start_container: "Démarrer le conteneur",
        stop_container: "Arrêter le conteneur",
        pause_container: "Mettre le conteneur en pause",
        resume_container: "Reprendre le conteneur",
        recreate: "Recréer",
        recreate_container: "Recréer le conteneur",
        recreate_confirm_text: "Recréer le conteneur ?",
        recreating: "Recréation…",
        confirm: "Confirmer",
        cancel: "Annuler",
      },
      notifications: {
        starting: "Démarrage de {name}…",
        stopping: "Arrêt de {name}…",
        failed_start: "Échec du démarrage de {name}. Vérifiez les journaux.",
        failed_stop: "Échec de l'arrêt de {name}. Vérifiez les journaux.",
        restarting: "Redémarrage de {name}…",
        failed_restart: "Échec du redémarrage de {name}.",
        pausing: "Mise en pause de {name}…",
        resuming: "Reprise de {name}…",
        failed_pause: "Échec de la mise en pause de {name}. Vérifiez les journaux.",
        failed_resume: "Échec de la reprise de {name}. Vérifiez les journaux.",
        missing_toggle: "Aucun service configuré pour {action} {name}.",
        missing_restart: "Aucun service de redémarrage configuré pour {name}.",
        missing_pause: "Aucun service de pause configuré pour {name}.",
        missing_resume: "Aucun service de reprise configuré pour {name}.",
        missing_recreate: "Aucun service de recréation configuré pour {name}.",
        recreating: "Recréation de {name}…",
        failed_recreate: "Échec de la recréation de {name}.",
        wud_scan_triggered: "Scan WUD déclenché.",
        wud_scan_failed: "Échec du scan WUD.",
        prune_triggered: "Nettoyage démarré.",
        prune_failed: "Échec du nettoyage.",
        prune_volumes_triggered: "Nettoyage des volumes démarré.",
        prune_volumes_failed: "Échec du nettoyage des volumes.",
        prune_networks_triggered: "Nettoyage des réseaux démarré.",
        prune_networks_failed: "Échec du nettoyage des réseaux.",
      },
      status: {
        online: "En ligne", offline: "Hors ligne", idle: "Inactif",
        running: "Actif", stopped: "Arrêté", unknown: "Inconnu",
        starting: "Démarrage", degraded: "Dégradé", paused: "En pause",
      },
      update: {
        available: "Mise à jour disponible",
        current: "Actuelle",
        new: "Nouvelle",
        days: "j",
        release_notes: "Notes de version",
      },
    },
  };
  if (typeof window !== "undefined") {
    window.customCards = window.customCards || [];
    if (!window.customCards.some((c) => c.type === CARD_NAME)) {
      window.customCards.push({ type: CARD_NAME, name: "Docker Card", description: CARD_DESCRIPTION, preview: false });
    }
  }
  const TOGGLE_SERVICE_MAP = {
    switch: { on: "turn_on", off: "turn_off" },
    input_boolean: { on: "turn_on", off: "turn_off" },
    automation: { on: "turn_on", off: "turn_off" },
    script: { on: "turn_on", off: "turn_off" },
    light: { on: "turn_on", off: "turn_off" },
    fan: { on: "turn_on", off: "turn_off" },
  };
  const RESTART_SERVICE_MAP = {
    button: { service: "press" },
    switch: { service: "turn_on" },
    script: { service: "turn_on" },
    automation: { service: "trigger" },
  };
  // Pause/unpause entity domains. A button entity press is used for both
  // pause and resume (two separate button entities), or explicit services.
  const PAUSE_SERVICE_MAP = {
    button: { service: "press" },
    script: { service: "turn_on" },
    automation: { service: "trigger" },
  };
  const RECREATE_SERVICE_MAP = {
    button: { service: "press" },
    script: { service: "turn_on" },
    automation: { service: "trigger" },
  };
  const domainFromEntityId = (entityId) => {
    if (typeof entityId !== "string") return undefined;
    const i = entityId.indexOf(".");
    return i > 0 ? entityId.slice(0, i) : undefined;
  };
  const cryptoRandom = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const a = new Uint32Array(4);
      crypto.getRandomValues(a);
      return Array.from(a, (n) => n.toString(16)).join("");
    }
    return `dc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };
  if (customElements.get(CARD_NAME)) return;
  class DockerCard extends HTMLElement {
    constructor() {
      super();
      this._pending = new Map();
      this._expanded = false;
      this._listId = `dc-list-${cryptoRandom()}`;
      this._columns = 1;
      this._wudScanPending = false;
      // Maintenance actions (Prune Images/Volumes/Networks) — keyed by action id
      // ("images"/"volumes"/"networks") so several can be armed/pending independently.
      this._maintConfirming = new Set();
      this._maintPending = new Set();
      this._recreateConfirming = new Set(); // container keys currently showing the recreate confirm step
      // History cache for sparkline graphs: entityId -> { points, fetchedAt, promise }
      this._history = new Map();
      this._renderQueued = false;
      // CSS selector for the element to focus after the next render() call —
      // set by a handler right before a keyboard-triggered state change that
      // will tear down and rebuild innerHTML, so focus isn't dropped to <body>.
      this._pendingFocusSelector = null;
    }
    setConfig(config) {
      if (!config) throw new Error("Missing configuration for docker-card");
      const nc = { ...config };
      if (nc.stopped_color && !nc.not_running_color) nc.not_running_color = nc.stopped_color;
      const containers = this._normalizeContainers(nc.containers ?? nc.container);
      this.config = {
        running_states: ["running", "on", "started", "up"],
        stopped_states: ["stopped", "off", "exited", "down", "inactive"],
        paused_states: ["paused", "pause"],
        running_color: "var(--state-active-color, #2e8f57)",
        not_running_color: "var(--state-error-color, #c22040)",
        paused_color: "var(--state-warning-color, #f4b942)",
        // ── Graph options (opt-in) ──
        graphs: false,                 // enable CPU/Memory sparklines (card-level default)
        graph_hours: 2,                // history window in hours
        graph_height: 34,              // graph height in px
        graph_refresh: 300,            // seconds between history refetches per entity
        graph_cpu_color: "var(--primary-color, #03a9f4)",
        graph_memory_color: "var(--accent-color, #ff9800)",
        graph_network_rx_color: "var(--info-color, #039be5)",
        graph_network_tx_color: "var(--warning-color, #ff9800)",
        ...nc,
        containers,
      };
      // Drop cached history when any requested window changes, otherwise a new
      // graph_hours value would keep drawing the previously cached range until
      // the graph_refresh TTL expired.
      const windowKey = [this.config.graph_hours, ...containers.map((c) => c.graph_hours)].join("|");
      if (this._graphWindowKey !== undefined && this._graphWindowKey !== windowKey) {
        this._history.clear();
      }
      this._graphWindowKey = windowKey;
      if (typeof this.config.containers_expanded === "boolean") {
        this._expanded = this.config.containers_expanded;
      }
      this._columns = Math.max(1, parseInt(this.config.columns) || 1);
      if (!this.config.docker_overview || typeof this.config.docker_overview !== "object") {
        this.config.docker_overview = {};
      }
      this.render();
    }
    connectedCallback() { this.render(); }
    set hass(hass) {
      const prevHass = this._hass;
      const dirty = this._isDirty(prevHass, hass);
      this._hass = hass;
      if (dirty) this.render();
    }
    getCardSize() { return 4; }
    static getConfigElement() { return document.createElement(CARD_NAME + "-editor"); }
    static getStubConfig() { return { title: "Docker Card", containers: [] }; }
    // ── CSS ──────────────────────────────────────────────────────────────────
    _css() {
      const graphHeight = Math.max(16, parseInt(this.config?.graph_height) || 34);
      return `
        .dc-card {
          display: block;
          width: 100%;
          box-sizing: border-box;
          padding: 1rem 1.25rem;
          border-radius: var(--ha-card-border-radius, 12px);
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, none);
          color: var(--primary-text-color);
          font-family: var(--primary-font-family, inherit);
        }
        .dc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }
        .dc-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .dc-pill {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.28rem 0.7rem;
          border-radius: 999px;
          background: var(--primary-color);
          color: #fff;
          white-space: nowrap;
        }
        .dc-pill.running  { background: var(--dc-rc); }
        .dc-pill.offline,
        .dc-pill.not-running { background: var(--dc-nrc); }
        .dc-pill.idle {
          background: var(--state-warning-color, #f4b942);
          color: var(--primary-text-color);
        }
        .dc-pill.actionable { cursor: pointer; }
        .dc-pill.actionable:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        /* ── Overview ── */
        .dc-overview {
          display: grid;
          grid-template-columns: repeat(var(--dc-max-cols), minmax(0, 1fr));
          gap: 0.4rem;
          margin-bottom: 0.85rem;
        }
        .dc-ov-item {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.4rem 0.65rem;
          border-radius: var(--ha-card-border-radius, 8px);
          background: var(--secondary-background-color, rgba(128,128,128,0.08));
          border: 1px solid var(--divider-color, rgba(128,128,128,0.15));
          min-height: 48px;
          box-sizing: border-box;
        }
        .dc-ov-item.actionable {
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .dc-ov-item.actionable:hover { border-color: var(--primary-color); }
        .dc-ov-item.actionable:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        /* WUD scan button tile */
        .dc-ov-item.wud-scan {
          cursor: pointer;
          border-color: rgba(var(--rgb-primary-color, 3,169,244), 0.3);
          transition: border-color 0.15s ease, opacity 0.15s ease;
        }
        .dc-ov-item.wud-scan:hover { border-color: var(--primary-color); }
        .dc-ov-item.wud-scan.pending { opacity: 0.5; cursor: progress; pointer-events: none; }
        .dc-ov-item.wud-scan:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        /* Maintenance tile: WUD scan + Prune images share one tile when both are configured */
        .dc-ov-item.dc-maint { padding: 0; }
        .dc-maint-row { display: flex; align-items: stretch; width: 100%; }
        .dc-maint-half {
          flex: 1 1 50%;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
          padding: 0.4rem 0.65rem;
          cursor: pointer;
        }
        .dc-maint-half:hover { background: rgba(128,128,128,0.06); }
        .dc-maint-half.pending { opacity: 0.5; cursor: progress; pointer-events: none; }
        .dc-maint-half:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
        .dc-maint-divider { width: 1px; background: var(--divider-color, rgba(128,128,128,0.2)); flex-shrink: 0; margin: 0.5rem 0; }
        .dc-ov-badge.prune { background: rgba(46,143,87,0.14); color: var(--dc-rc, #2e8f57); }
        .dc-ov-value.prune-action { color: var(--dc-rc, #2e8f57); font-size: 0.78rem; }
        /* Inline confirm step (Prune) */
        .dc-confirm-row { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; flex-wrap: wrap; }
        .dc-confirm-text { color: var(--primary-text-color); white-space: nowrap; }
        .dc-confirm-btn {
          border: none; border-radius: 999px; font: inherit; font-size: 0.66rem; font-weight: 700;
          padding: 0.2rem 0.55rem; cursor: pointer; white-space: nowrap;
        }
        .dc-confirm-btn.yes { background: var(--dc-nrc, #c22040); color: #fff; }
        .dc-confirm-btn.no {
          background: transparent; color: var(--secondary-text-color);
          border: 1px solid var(--divider-color, rgba(128,128,128,0.3));
        }
        .dc-confirm-btn:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        @media (max-width: 520px) {
          .dc-maint-row { flex-direction: column; }
          .dc-maint-divider { width: auto; height: 1px; margin: 0 0.65rem; }
        }
        .dc-ov-badge {
          width: 1.9rem;
          height: 1.9rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--divider-color, rgba(128,128,128,0.15));
          color: var(--secondary-text-color);
          flex-shrink: 0;
        }
        .dc-ov-badge.wud { background: rgba(var(--rgb-primary-color, 3,169,244), 0.15); color: var(--primary-color); }
        .dc-ov-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          line-height: 1.2;
          min-width: 0;
        }
        .dc-ov-label {
          font-size: 0.58rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--secondary-text-color);
        }
        .dc-ov-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dc-ov-value.running   { color: var(--dc-rc); }
        .dc-ov-value.not-running { color: var(--dc-nrc); }
        .dc-ov-value.wud-action { color: var(--primary-color); font-size: 0.78rem; }
        /* Running · Paused · Stopped breakdown */
        .dc-ov-counts {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: nowrap;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .dc-ov-count { white-space: nowrap; }
        .dc-ov-count.running  { color: var(--dc-rc); }
        .dc-ov-count.paused   { color: var(--dc-pc); }
        .dc-ov-count.stopped  { color: var(--dc-nrc); }
        .dc-ov-sep { color: var(--divider-color, rgba(128,128,128,0.5)); font-weight: 400; }
        /* ── Section header ── */
        .dc-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0;
          margin: 0 0 0.5rem 0;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font: inherit;
        }
        .dc-section-header:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        .dc-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--secondary-text-color);
          flex: 1 1 auto;
          text-align: left;
        }
        .dc-chevron {
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0.32rem 0.27rem 0 0.27rem;
          border-color: var(--secondary-text-color) transparent transparent transparent;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .dc-section.collapsed .dc-section-header { margin-bottom: 0; }
        .dc-section.collapsed .dc-chevron { transform: rotate(-90deg); }
        .dc-section.collapsed .dc-list { display: none; }
        /* ── Container list ── */
        .dc-list {
          display: grid;
          grid-template-columns: repeat(var(--dc-max-cols), minmax(0, 1fr));
          gap: 0.5rem;
        }
        /* ── Container row ── */
        .dc-row {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;   /* lets .dc-graphs break to its own full-width line */
          gap: 0.6rem 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: var(--ha-card-border-radius, 10px);
          background: var(--secondary-background-color, rgba(128,128,128,0.05));
          border: 1px solid var(--divider-color, rgba(128,128,128,0.15));
          transition: border-color 0.15s ease;
          box-sizing: border-box;
          min-width: 0;
        }
        .dc-row.running  { border-color: var(--dc-rc); }
        .dc-row.paused   { border-color: var(--dc-pc); }
        .dc-row.stopped,
        .dc-row.unknown  { border-color: var(--dc-nrc); }
        .dc-row.pending  { opacity: 0.6; cursor: progress; }
        .dc-row.actionable { cursor: pointer; }
        .dc-row.actionable:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        .dc-info {
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
          flex: 1 1 0;
          min-width: 0;
        }
        .dc-name {
          font-weight: 600;
          font-size: 0.92rem;
          color: var(--primary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .dc-state-row {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .dc-status {
          font-size: 0.78rem;
          text-transform: capitalize;
          color: var(--secondary-text-color);
        }
        .dc-status.running  { color: var(--dc-rc); }
        .dc-status.paused   { color: var(--dc-pc); }
        .dc-status.stopped,
        .dc-status.unknown  { color: var(--dc-nrc); }
        .dc-image {
          font-size: 0.68rem;
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dc-resources {
          display: flex;
          flex-wrap: wrap;
          gap: 0.15rem 0.6rem;
          font-size: 0.68rem;
          color: var(--secondary-text-color);
        }
        .dc-res-item {
          display: flex;
          align-items: center;
          gap: 0.18rem;
        }
        .dc-res-label { font-weight: 500; }
        /* ── Resource graphs (sparklines) ── */
        /* Rendered as a row-level child (not inside .dc-info) so the graphs
           span the full card width below the name/status and action buttons. */
        .dc-graphs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.4rem;
          margin-top: 0.5rem;
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .dc-graph {
          border-radius: 6px;
          background: var(--secondary-background-color, rgba(128,128,128,0.06));
          border: 1px solid var(--divider-color, rgba(128,128,128,0.12));
          padding: 0.3rem 0.45rem 0.2rem;
          box-sizing: border-box;
          min-width: 0;
        }
        .dc-graph-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.4rem;
          margin-bottom: 0.15rem;
        }
        .dc-graph-label {
          font-size: 0.58rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--secondary-text-color);
        }
        .dc-graph-value {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap;
        }
        /* Network graph header: RX/TX shown as two colored values side by side (#19) */
        .dc-graph-dual-value {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .dc-graph-svg {
          display: block;
          width: 100%;
          height: ${graphHeight}px;
        }
        /* Time axis under each graph */
        .dc-graph-axis {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.1rem;
          font-size: 0.55rem;
          line-height: 1;
          color: var(--secondary-text-color);
          opacity: 0.8;
          font-variant-numeric: tabular-nums;
        }
        .dc-graph-axis span { white-space: nowrap; }
        .dc-graph-axis .dc-axis-mid { opacity: 0.75; }
        /* Day-break variant: labels are pinned to their midnight gridlines */
        .dc-graph-axis.positioned {
          display: block;
          position: relative;
          height: 0.72rem;
        }
        .dc-graph-axis.positioned span { position: absolute; top: 0; }
        .dc-graph-axis.positioned .dc-axis-start { left: 0; }
        .dc-graph-axis.positioned .dc-axis-end { right: 0; }
        .dc-graph-axis.positioned .dc-axis-day {
          transform: translateX(-50%);
          font-weight: 600;
          opacity: 0.9;
        }
        .dc-graph-empty {
          height: ${graphHeight}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          color: var(--secondary-text-color);
          opacity: 0.7;
        }
        /* ── Update badge ── */
        .dc-update {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.25rem;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
          background: rgba(244, 185, 66, 0.12);
          border: 1px solid rgba(244, 185, 66, 0.35);
          width: fit-content;
          max-width: 100%;
        }
        .dc-update-dot {
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 50%;
          background: var(--dc-pc, #f4b942);
          flex-shrink: 0;
        }
        .dc-update-text {
          font-size: 0.68rem;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dc-update-arrow {
          color: var(--dc-pc, #f4b942);
          font-size: 0.68rem;
          flex-shrink: 0;
        }
        .dc-update-days {
          font-size: 0.62rem;
          color: var(--secondary-text-color);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .dc-update-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--dc-pc, #f4b942);
          flex-shrink: 0;
          text-decoration: none;
          opacity: 0.85;
        }
        .dc-update-link:hover { opacity: 1; }
        /* WUD check-failed variant — same slot as the update badge, styled as an error */
        .dc-update.dc-update-error {
          background: rgba(194, 32, 64, 0.1);
          border-color: rgba(194, 32, 64, 0.35);
        }
        .dc-update-dot.error { background: var(--dc-nrc, #c22040); }
        .dc-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          padding-top: 0.1rem;
        }
        .dc-restart {
          border: 1px solid var(--divider-color, rgba(128,128,128,0.3));
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.75rem;
          border-radius: 999px;
          padding: 0.28rem 0.75rem;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .dc-restart:hover  { border-color: var(--primary-color); color: var(--primary-color); }
        .dc-restart:active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
        .dc-restart:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-restart:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        /* Pause / Resume button — amber accent to match paused state */
        .dc-pause {
          border: 1px solid var(--divider-color, rgba(128,128,128,0.3));
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 0.75rem;
          border-radius: 999px;
          padding: 0.28rem 0.75rem;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .dc-pause:hover  { border-color: var(--dc-pc); color: var(--dc-pc); }
        .dc-pause:active { background: var(--dc-pc); color: #fff; border-color: var(--dc-pc); }
        .dc-pause:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-pause:focus-visible { outline: 2px solid var(--dc-pc); outline-offset: 2px; }
        /* Recreate button — teal-ish accent, distinct from the neutral Restart/Pause pills */
        .dc-recreate {
          border: 1px solid rgba(46,143,87,0.4);
          background: rgba(46,143,87,0.08);
          color: var(--dc-rc, #2e8f57);
          font: inherit; font-size: 0.75rem; border-radius: 999px;
          padding: 0.28rem 0.75rem; cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .dc-recreate:hover { background: rgba(46,143,87,0.16); }
        .dc-recreate:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-recreate:focus-visible { outline: 2px solid var(--dc-rc, #2e8f57); outline-offset: 2px; }
        ha-switch[disabled] { opacity: 0.5; }
        ha-switch:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 8px; }
        .dc-empty {
          font-size: 0.82rem;
          color: var(--secondary-text-color);
          text-align: center;
          padding: 0.6rem 0;
        }
        .dc-placeholder {
          padding: 1rem;
          color: var(--secondary-text-color);
          font-size: 0.9rem;
        }
        @media (max-width: 600px) {
          .dc-overview, .dc-list {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .dc-overview, .dc-list {
            grid-template-columns: repeat(min(2, var(--dc-max-cols)), minmax(0, 1fr));
          }
        }
      `;
    }
    // ── Render ───────────────────────────────────────────────────────────────
    render() {
      if (!this.config) return;
      if (!this._hass) {
        this.innerHTML = `<div class="dc-card"><style>${this._css()}</style><div class="dc-placeholder">${this._t("placeholders.waiting")}</div></div>`;
        return;
      }
      const rc = this.config.running_color;
      const nrc = this.config.not_running_color;
      const pc = this.config.paused_color;
      const cols = this._columns;
      const status = this._computeOverallStatus();
      const pillClasses = ["dc-pill", status.cssClass, status.tone === "not_running" ? "not-running" : "", status.entityId ? "actionable" : ""].filter(Boolean).join(" ");
      this.innerHTML = `
        <div class="dc-card" style="--dc-rc:${rc};--dc-nrc:${nrc};--dc-pc:${pc};--dc-max-cols:${cols}">
          <style>${this._css()}</style>
          <div class="dc-header">
            <div class="dc-title">${this._esc(this.config.title || this._t("common.card_title"))}</div>
            <div class="${pillClasses}"
              ${status.entityId ? `role="button" tabindex="0" aria-label="${this._t("aria.open_status_details")}" data-more-info="${status.entityId}"` : ""}>
              ${this._esc(status.label)}
            </div>
          </div>
          ${this._renderOverview()}
          ${this._renderSection()}
        </div>
      `;
      this._bindEvents();
      this._restorePendingFocus();
    }
    /** Focuses the element matching _pendingFocusSelector (set by a handler just before render()), if any. */
    _restorePendingFocus() {
      if (!this._pendingFocusSelector) return;
      const selector = this._pendingFocusSelector;
      this._pendingFocusSelector = null;
      const el = this.querySelector(selector);
      if (el) el.focus();
    }
    // ── Overview ─────────────────────────────────────────────────────────────
    _renderOverview() {
      const oc = this.config.docker_overview;
      if (!oc || typeof oc !== "object") return "";
      const get = (key) => {
        const id = oc[key];
        const e = id ? this._getEntity(id) : undefined;
        return { entityId: id, state: e?.state };
      };
      const items = [];
      // Running · Paused · Stopped breakdown
      // Uses containers_running, containers_paused (optional), containers_stopped (optional),
      // and container_count as fallback total.
      const running = get("containers_running");
      const paused = get("containers_paused");
      const stopped = get("containers_stopped");
      const total = get("container_count");
      const rv = this._parseIntState(running.state);
      const pv = this._parseIntState(paused.state);
      const sv = this._parseIntState(stopped.state);
      const tv = this._parseIntState(total.state);
      const hasCounts = typeof rv === "number" || typeof pv === "number" || typeof sv === "number";
      if (hasCounts || typeof tv === "number") {
        // Build inline count display: "2 running · 1 paused · 0 stopped"
        // Falls back to "running / total" if only running+total are available (legacy).
        const hasPausedOrStopped = typeof pv === "number" || typeof sv === "number";
        let countHtml;
        if (hasPausedOrStopped) {
          const parts = [];
          if (typeof rv === "number") parts.push(`<span class="dc-ov-count running">${rv} running</span>`);
          if (typeof pv === "number") parts.push(`<span class="dc-ov-count paused">${pv} paused</span>`);
          if (typeof sv === "number") parts.push(`<span class="dc-ov-count stopped">${sv} stopped</span>`);
          countHtml = parts.join('<span class="dc-ov-sep"> · </span>');
        } else {
          // Legacy: running / total
          const rStr = this._fmtState(running.state);
          const tStr = this._fmtState(total.state);
          const cls = (typeof rv === "number" && typeof tv === "number" && rv !== tv) ? "not-running" : "running";
          countHtml = `<span class="dc-ov-count ${cls}">${rStr} / ${tStr}</span>`;
        }
        items.push({
          label: hasPausedOrStopped ? this._t("overview.running_paused_stopped") : this._t("overview.running_total"),
          customValueHtml: `<div class="dc-ov-counts">${countHtml}</div>`,
          badge: "RT",
          entityId: running.entityId,
          aria: this._t("overview.running_total_aria"),
        });
      }
      // Images
      const images = get("image_count");
      const iv = this._fmtState(images.state);
      if (!this._isBlank(iv)) items.push({ label: this._t("overview.images"), value: iv, badge: "IMG", entityId: images.entityId, aria: this._t("overview.images_aria") });
      // Docker version
      const docker = get("docker_version");
      const dv = this._fmtState(docker.state);
      if (!this._isBlank(dv)) items.push({ label: this._t("overview.docker"), value: dv, badge: "DOC", entityId: docker.entityId, aria: this._t("overview.docker_aria") });
      // OS
      const osn = get("operating_system");
      const osv = get("operating_system_version");
      const osl = this._fmtState(osn.state);
      const osvl = this._fmtState(osv.state);
      const osVal = osl !== "—" && osvl !== "—" ? `${osl} · ${osvl}` : osl !== "—" ? osl : osvl !== "—" ? osvl : "";
      if (!this._isBlank(osVal)) items.push({ label: this._t("overview.os"), value: osVal, badge: "OS", entityId: osv.entityId || osn.entityId, aria: this._t("overview.os_aria") });
      // Disk usage (container / image / volume)
      const diskFields = [
        ["container_disk_usage", "container_disk", "CD"],
        ["image_disk_usage", "image_disk", "ID"],
        ["volume_disk_usage", "volume_disk", "VD"],
      ];
      diskFields.forEach(([key, labelKey, badge]) => {
        if (!oc[key]) return;
        const e = this._getEntity(oc[key]);
        const val = this._fmtStateWithUnit(e);
        if (this._isBlank(val)) return;
        items.push({ label: this._t(`overview.${labelKey}`), value: val, badge, entityId: oc[key], aria: this._t(`overview.${labelKey}_aria`) });
      });
      // WUD last poll
      if (oc.wud_last_poll) {
        const e = this._getEntity(oc.wud_last_poll);
        const val = this._fmtState(e?.state);
        items.push({
          label: this._t("overview.wud_last_poll"),
          value: val,
          badge: "WUD",
          badgeCls: "wud",
          entityId: oc.wud_last_poll,
          aria: this._t("overview.wud_last_poll_aria"),
        });
      }
      // Aggregate "N updates available" tile — opt-in via docker_overview.updates_summary: true
      // (lives here, not as a card-level option, since it's an overview-grid
      // tile like every other docker_overview entry). Counts containers whose
      // update_entity currently reports an available update (same detection
      // _getUpdateInfo already does per row).
      if (oc.updates_summary) {
        const updateCount = (this.config.containers || [])
          .filter((c) => {
            const info = this._getUpdateInfo(c);
            return info && !info.error;
          }).length;
        if (updateCount > 0) {
          items.push({ label: this._t("overview.updates_available"), value: String(updateCount), badge: "UPD" });
        }
      }
      const maintActions = this._maintenanceActions();
      const imagesAction = maintActions.find((a) => a.id === "images");
      // Prune Images only shares a tile with WUD scan when it's the ONLY
      // configured maintenance action — with Volumes/Networks (#17) also
      // configured, sharing would be inconsistent (Images gets a shortcut
      // the others don't), so all maintenance actions render standalone
      // instead and WUD scan gets its own tile too.
      const shareImagesWithWud = Boolean(oc.wud_scan && imagesAction && maintActions.length === 1);
      if (!items.length && !oc.wud_scan && !maintActions.length) return "";
      let html = `<div class="dc-overview">`;
      html += items.map((item) => `
        <div class="dc-ov-item${item.entityId ? " actionable" : ""}"
          ${item.entityId ? `role="button" tabindex="0" aria-label="${this._esc(item.aria || "")}" data-more-info="${item.entityId}"` : ""}>
          <div class="dc-ov-badge${item.badgeCls ? " " + item.badgeCls : ""}">${item.badge}</div>
          <div class="dc-ov-text">
            <div class="dc-ov-label">${this._esc(item.label)}</div>
            ${item.customValueHtml
              ? item.customValueHtml
              : `<div class="dc-ov-value${item.cls ? " " + item.cls : ""}">${this._esc(item.value)}</div>`}
          </div>
        </div>`).join("");
      if (shareImagesWithWud) {
        html += `
          <div class="dc-ov-item dc-maint">
            <div class="dc-maint-row">
              ${this._renderWudScanHalf(oc.wud_scan)}
              <div class="dc-maint-divider"></div>
              ${this._renderMaintenanceHalf(imagesAction)}
            </div>
          </div>`;
      } else if (oc.wud_scan) {
        html += `<div class="dc-ov-item wud-scan${this._wudScanPending ? " pending" : ""}">${this._renderWudScanHalf(oc.wud_scan)}</div>`;
      }
      const standaloneMaintActions = shareImagesWithWud ? [] : maintActions;
      html += standaloneMaintActions.map((action) => `<div class="dc-ov-item">${this._renderMaintenanceHalf(action)}</div>`).join("");
      html += `</div>`;
      return html;
    }
    /** WUD scan content — identical markup whether shown standalone or as one half of the combined maintenance tile. */
    _renderWudScanHalf(entityId) {
      return `
        <div class="dc-maint-half${this._wudScanPending ? " pending" : ""}"
          role="button" tabindex="0"
          aria-label="${this._t("overview.wud_scan_aria")}"
          data-wud-scan="${this._esc(entityId)}">
          <div class="dc-ov-badge wud">
            <ha-icon icon="mdi:refresh" style="--mdc-icon-size:1rem"></ha-icon>
          </div>
          <div class="dc-ov-text">
            <div class="dc-ov-label">${this._t("overview.wud_scan")}</div>
            <div class="dc-ov-value wud-action">${this._wudScanPending ? "Scanning…" : "Scan now"}</div>
          </div>
        </div>`;
    }
    /**
     * Configured maintenance actions (Prune Images/Volumes/Networks), derived
     * fresh from docker_overview each call. Each shares the same idle → inline
     * confirm → pending flow, generalized from the original Prune Images-only
     * implementation (#7) to also cover Portainer's volume/network prune
     * buttons (#17). "images" keeps its original data-prune-* attribute names
     * for backward compatibility; the others get their own dataPrefix.
     */
    _maintenanceActions() {
      const oc = this.config.docker_overview || {};
      const defs = [
        { id: "images", entityId: oc.prune_images, dataPrefix: "prune", icon: "mdi:broom",
          labelKey: "overview.prune_images", nowKey: "overview.prune_now", pendingKey: "overview.prune_pending",
          confirmTextKey: "overview.prune_confirm_text", ariaKey: "overview.prune_aria",
          triggeredKey: "notifications.prune_triggered", failedKey: "notifications.prune_failed" },
        { id: "volumes", entityId: oc.prune_volumes, dataPrefix: "prune-volumes", icon: "mdi:database-off-outline",
          labelKey: "overview.prune_volumes", nowKey: "overview.prune_volumes_now", pendingKey: "overview.prune_volumes_pending",
          confirmTextKey: "overview.prune_volumes_confirm_text", ariaKey: "overview.prune_volumes_aria",
          triggeredKey: "notifications.prune_volumes_triggered", failedKey: "notifications.prune_volumes_failed" },
        { id: "networks", entityId: oc.prune_networks, dataPrefix: "prune-networks", icon: "mdi:lan-disconnect",
          labelKey: "overview.prune_networks", nowKey: "overview.prune_networks_now", pendingKey: "overview.prune_networks_pending",
          confirmTextKey: "overview.prune_networks_confirm_text", ariaKey: "overview.prune_networks_aria",
          triggeredKey: "notifications.prune_networks_triggered", failedKey: "notifications.prune_networks_failed" },
      ];
      return defs.filter((d) => d.entityId);
    }
    /** Maintenance action content — idle → inline confirm → pending. Same markup standalone or combined. */
    _renderMaintenanceHalf(action) {
      const badge = `<div class="dc-ov-badge prune"><ha-icon icon="${action.icon}" style="--mdc-icon-size:1rem"></ha-icon></div>`;
      if (this._maintPending.has(action.id)) {
        return `
          <div class="dc-maint-half pending">
            ${badge}
            <div class="dc-ov-text">
              <div class="dc-ov-label">${this._t(action.labelKey)}</div>
              <div class="dc-ov-value prune-action">${this._t(action.pendingKey)}</div>
            </div>
          </div>`;
      }
      if (this._maintConfirming.has(action.id)) {
        return `
          <div class="dc-maint-half" style="cursor:default">
            ${badge}
            <div class="dc-confirm-row">
              <span class="dc-confirm-text">${this._t(action.confirmTextKey)}</span>
              <button class="dc-confirm-btn yes" data-${action.dataPrefix}-confirm="${this._esc(action.entityId)}">${this._t("overview.prune_confirm")}</button>
              <button class="dc-confirm-btn no" data-${action.dataPrefix}-cancel>${this._t("overview.prune_cancel")}</button>
            </div>
          </div>`;
      }
      return `
        <div class="dc-maint-half"
          role="button" tabindex="0"
          aria-label="${this._t(action.ariaKey)}"
          data-${action.dataPrefix}-arm="${this._esc(action.entityId)}">
          ${badge}
          <div class="dc-ov-text">
            <div class="dc-ov-label">${this._t(action.labelKey)}</div>
            <div class="dc-ov-value prune-action">${this._t(action.nowKey)}</div>
          </div>
        </div>`;
    }
    _renderSection() {
      const expanded = this._expanded;
      const containers = this.config.containers || [];
      const rowsHtml = containers.length
        ? containers.map((c) => this._renderRow(c)).join("")
        : `<div class="dc-empty">${this._t("placeholders.no_containers")}</div>`;
      return `
        <div class="dc-section${expanded ? "" : " collapsed"}">
          <button type="button" class="dc-section-header"
            aria-expanded="${expanded}"
            aria-controls="${this._listId}"
            aria-label="${expanded ? this._t("aria.collapse_containers") : this._t("aria.expand_containers")}">
            <span class="dc-section-title">${this._t("common.containers")}</span>
            <span class="dc-chevron"></span>
          </button>
          <div class="dc-list" id="${this._listId}" ${expanded ? "" : "hidden"}>
            ${rowsHtml}
          </div>
        </div>`;
    }
    // ── WUD update helpers ────────────────────────────────────────────────────
    _getUpdateInfo(container) {
      if (!container.update_entity) return null;
      const entity = this._getEntity(container.update_entity);
      if (!entity) return null;
      // WUD's own reported error for this container (e.g. registry rate limit,
      // auth failure) — shown regardless of update_available, via WUD Monitor's
      // "error" attribute (WUD Monitor 2.2+).
      const errorMessage = entity.attributes?.error || null;
      const updateAvailable = entity.state === "Yes" ||
        entity.attributes?.update_available === true;
      if (!updateAvailable) {
        return errorMessage ? { error: errorMessage } : null;
      }
      const currentVersion = entity.attributes?.current_version || null;
      const newVersion = entity.attributes?.new_version || null;
      const daysAvailable = entity.attributes?.days_available ?? null;
      // Release notes link — WUD Monitor 2.2+ "release_notes" attribute, only
      // present when the container has a wud.link.template label set in WUD.
      const releaseNotes = entity.attributes?.release_notes || null;
      if (!newVersion || newVersion === "–") {
        return errorMessage ? { error: errorMessage } : null;
      }
      return { currentVersion, newVersion, daysAvailable, releaseNotes };
    }
    _renderUpdateBadge(updateInfo) {
      if (!updateInfo) return "";
      if (updateInfo.error) {
        return `
          <div class="dc-update dc-update-error">
            <span class="dc-update-dot error"></span>
            <span class="dc-update-text">${this._esc(updateInfo.error)}</span>
          </div>`;
      }
      const { currentVersion, newVersion, daysAvailable, releaseNotes } = updateInfo;
      let versionHtml = "";
      if (currentVersion && newVersion) {
        versionHtml = `
          <span class="dc-update-text">${this._esc(currentVersion)}</span>
          <span class="dc-update-arrow">→</span>
          <span class="dc-update-text">${this._esc(newVersion)}</span>`;
      } else if (newVersion) {
        versionHtml = `<span class="dc-update-text">${this._esc(newVersion)}</span>`;
      }
      const daysHtml = (daysAvailable !== null && daysAvailable !== undefined)
        ? `<span class="dc-update-days">${daysAvailable}${this._t("update.days")}</span>`
        : "";
      const safeReleaseNotesUrl = this._safeHttpUrl(releaseNotes);
      const linkHtml = safeReleaseNotesUrl ? `
          <a class="dc-update-link" href="${this._esc(safeReleaseNotesUrl)}" target="_blank" rel="noreferrer" title="${this._t("update.release_notes")}">
            <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size:0.68rem"></ha-icon>
          </a>` : "";
      return `
        <div class="dc-update">
          <span class="dc-update-dot"></span>
          ${versionHtml}
          ${daysHtml}
          ${linkHtml}
        </div>`;
    }
    // ── Resource graph helpers (sparklines) ──────────────────────────────────
    /**
     * Returns cached history points for an entity and (re)fetches in the
     * background when the cache is stale. Points: [[epochMs, number], ...]
     * Stale-while-revalidate: old points are returned while a fetch runs.
     */
    _historyPoints(entityId, hours, refreshSec) {
      if (!entityId || !this._hass) return undefined;
      const ttlMs = Math.max(30, parseInt(refreshSec) || 300) * 1000;
      // Cache per entity *and* window, so containers with different
      // graph_hours don't overwrite each other's data.
      const cacheKey = `${entityId}|${hours}`;
      const rec = this._history.get(cacheKey);
      const now = Date.now();
      if (rec && rec.points && now - rec.fetchedAt < ttlMs) return rec.points;
      if (rec && rec.promise) return rec.points; // fetch already underway
      const start = new Date(now - hours * 3600 * 1000).toISOString();
      const url = `history/period/${start}?filter_entity_id=${encodeURIComponent(entityId)}&minimal_response&no_attributes`;
      const promise = this._hass.callApi("GET", url)
        .then((resp) => {
          const arr = Array.isArray(resp) && Array.isArray(resp[0]) ? resp[0] : [];
          const points = arr
            .map((p) => [Date.parse(p.last_changed || p.last_updated || p.lu), parseFloat(p.state ?? p.s)])
            .filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v));
          this._history.set(cacheKey, { points, fetchedAt: Date.now() });
          this._scheduleRender();
        })
        .catch((err) => {
          console.warn("docker-card: history fetch failed for", entityId, err);
          // Keep stale points (if any) and back off until next TTL window.
          this._history.set(cacheKey, { points: rec?.points || [], fetchedAt: Date.now() });
        });
      this._history.set(cacheKey, { points: rec?.points, fetchedAt: rec?.fetchedAt || 0, promise });
      return rec?.points;
    }
    /** Debounced re-render so several resolved history fetches paint once. */
    _scheduleRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      setTimeout(() => { this._renderQueued = false; this.render(); }, 50);
    }
    /** Builds an inline SVG sparkline for the given points. */
    _sparklineSvg(points, color) {
      const W = 200, H = 40;
      let pts = points;
      // Downsample to keep the DOM light.
      const maxPts = 120;
      if (pts.length > maxPts) {
        const step = pts.length / maxPts;
        const ds = [];
        for (let i = 0; i < maxPts; i++) ds.push(pts[Math.floor(i * step)]);
        ds.push(pts[pts.length - 1]);
        pts = ds;
      }
      const t0 = pts[0][0];
      const t1 = pts[pts.length - 1][0];
      const span = Math.max(1, t1 - t0);
      const values = pts.map((p) => p[1]);
      const vMin = 0;
      const vMax = Math.max(...values, 0.1) * 1.1;
      const x = (t) => (((t - t0) / span) * W);
      const y = (v) => H - ((v - vMin) / (vMax - vMin)) * (H - 3) - 1.5;
      const line = pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const area = `0,${H} ${line} ${W},${H}`;
      // Gridlines: one per local midnight when the window spans days,
      // otherwise a single line at the midpoint to anchor the axis labels.
      const bounds = this._dayBoundaries(t0, t1);
      const gridAt = (bounds.length && bounds.length <= 6)
        ? bounds.map((b) => x(b))
        : [W / 2];
      const grid = gridAt.map((gx) => `<line x1="${gx.toFixed(1)}" y1="0" x2="${gx.toFixed(1)}" y2="${H}"
        stroke="var(--divider-color, rgba(128,128,128,0.35))" stroke-width="1"
        stroke-dasharray="2 3" vector-effect="non-scaling-stroke" opacity="0.6"></line>`).join("");
      return `<svg class="dc-graph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${grid}
        <polygon points="${area}" fill="${color}" opacity="0.12"></polygon>
        <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline>
      </svg>`;
    }
    /**
     * Two-series variant of _sparklineSvg, for Network I/O (#19): draws RX and
     * TX as two lines sharing one y-scale, no area fill (an overlapping fill
     * per line would just muddy which line is which). Used only when BOTH
     * network_rx_entity and network_tx_entity have history — a single
     * configured direction still uses the plain single-line _sparklineSvg.
     */
    _dualSparklineSvg(pointsA, pointsB, colorA, colorB) {
      const W = 200, H = 40;
      const maxPts = 120;
      const downsample = (points) => {
        if (points.length <= maxPts) return points;
        const step = points.length / maxPts;
        const ds = [];
        for (let i = 0; i < maxPts; i++) ds.push(points[Math.floor(i * step)]);
        ds.push(points[points.length - 1]);
        return ds;
      };
      const a = downsample(pointsA);
      const b = downsample(pointsB);
      const allPts = a.concat(b);
      const t0 = Math.min(...allPts.map((p) => p[0]));
      const t1 = Math.max(...allPts.map((p) => p[0]));
      const span = Math.max(1, t1 - t0);
      const vMin = 0;
      const vMax = Math.max(...allPts.map((p) => p[1]), 0.1) * 1.1;
      const x = (t) => (((t - t0) / span) * W);
      const y = (v) => H - ((v - vMin) / (vMax - vMin)) * (H - 3) - 1.5;
      const lineOf = (pts) => pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const bounds = this._dayBoundaries(t0, t1);
      const gridAt = (bounds.length && bounds.length <= 6)
        ? bounds.map((gb) => x(gb))
        : [W / 2];
      const grid = gridAt.map((gx) => `<line x1="${gx.toFixed(1)}" y1="0" x2="${gx.toFixed(1)}" y2="${H}"
        stroke="var(--divider-color, rgba(128,128,128,0.35))" stroke-width="1"
        stroke-dasharray="2 3" vector-effect="non-scaling-stroke" opacity="0.6"></line>`).join("");
      const lineA = a.length >= 2
        ? `<polyline points="${lineOf(a)}" fill="none" stroke="${colorA}" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline>` : "";
      const lineB = b.length >= 2
        ? `<polyline points="${lineOf(b)}" fill="none" stroke="${colorB}" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline>` : "";
      return `<svg class="dc-graph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${grid}
        ${lineA}
        ${lineB}
      </svg>`;
    }
    _locale() {
      return this._hass?.locale?.language || this._hass?.language || undefined;
    }
    /** Formats an epoch-ms timestamp as a short local clock time (HH:MM). */
    _fmtTime(ms) {
      try {
        return new Date(ms).toLocaleTimeString(this._locale(), { hour: "2-digit", minute: "2-digit" });
      } catch {
        const d = new Date(ms);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    /**
     * Day label for a midnight boundary: weekday for short spans
     * ("Tue"), day + month once the window grows past a week ("29 Jul").
     */
    _fmtDay(ms, spanMs) {
      const opts = spanMs > 7 * 864e5 ? { day: "numeric", month: "short" } : { weekday: "short" };
      try {
        return new Date(ms).toLocaleDateString(this._locale(), opts);
      } catch {
        const d = new Date(ms);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }
    }
    /** Local midnights strictly between two timestamps. */
    _dayBoundaries(t0, t1) {
      const out = [];
      const d = new Date(t0);
      d.setHours(24, 0, 0, 0); // next local midnight
      // Guard against pathological ranges producing an unbounded loop.
      while (d.getTime() < t1 && out.length < 400) {
        out.push(d.getTime());
        d.setDate(d.getDate() + 1);
      }
      return out;
    }
    /**
     * Time axis under a sparkline.
     * When the window spans one or more midnights, day labels are placed at
     * the day breaks (matching the gridlines); otherwise a plain
     * start · middle · end clock axis is used.
     */
    _axisHtml(points) {
      if (!points || points.length < 2) return "";
      const t0 = points[0][0];
      const t1 = points[points.length - 1][0];
      const span = Math.max(1, t1 - t0);
      const bounds = this._dayBoundaries(t0, t1);
      if (bounds.length && bounds.length <= 6) {
        // Drop boundaries too close to the edges to avoid overlapping labels.
        const marks = bounds
          .map((b) => ({ t: b, pct: ((b - t0) / span) * 100 }))
          .filter((m) => m.pct > 12 && m.pct < 88);
        const dayHtml = marks.map((m) =>
          `<span class="dc-axis-day" style="left:${m.pct.toFixed(2)}%">${this._esc(this._fmtDay(m.t, span))}</span>`
        ).join("");
        return `<div class="dc-graph-axis positioned">
          <span class="dc-axis-start">${this._esc(this._fmtTime(t0))}</span>
          ${dayHtml}
          <span class="dc-axis-end">${this._esc(this._fmtTime(t1))}</span>
        </div>`;
      }
      const tm = t0 + span / 2;
      const fmt = span > 864e5 ? (t) => `${this._fmtDay(t, span)} ${this._fmtTime(t)}` : (t) => this._fmtTime(t);
      return `<div class="dc-graph-axis">
        <span>${this._esc(fmt(t0))}</span>
        <span class="dc-axis-mid">${this._esc(fmt(tm))}</span>
        <span>${this._esc(fmt(t1))}</span>
      </div>`;
    }
    /** Renders the CPU/Memory graph blocks for a container row. */
    _renderResourceGraphs(container, cpuValue, memValue) {
      const blocks = [];
      // Window / refresh / height may be overridden per container.
      const pick = (key, fallback, parse) => {
        const raw = container[key] !== undefined ? container[key] : this.config[key];
        const n = parse(raw);
        return Number.isFinite(n) ? n : fallback;
      };
      const hours = Math.max(0.25, pick("graph_hours", 2, parseFloat));
      const refreshSec = Math.max(30, pick("graph_refresh", 300, parseInt));
      const height = Math.max(16, pick("graph_height", 34, parseInt));
      // Only emit an inline height when it differs from the card-level CSS.
      const cardHeight = Math.max(16, parseInt(this.config.graph_height) || 34);
      const hStyle = height !== cardHeight ? ` style="height:${height}px"` : "";
      const make = (entityId, label, valueText, color) => {
        let pts = this._historyPoints(entityId, hours, refreshSec);
        // Append the live state so the graph is always current.
        const e = this._getEntity(entityId);
        const live = e ? parseFloat(e.state) : NaN;
        if (pts && Number.isFinite(live)) pts = pts.concat([[Date.now(), live]]);
        const hasData = pts && pts.length >= 2;
        const body = hasData
          ? this._sparklineSvg(pts, color).replace("<svg ", `<svg${hStyle} `)
          : `<div class="dc-graph-empty"${hStyle}>${this._t("resources.no_history")}</div>`;
        const axis = hasData ? this._axisHtml(pts) : "";
        return `
          <div class="dc-graph">
            <div class="dc-graph-head">
              <span class="dc-graph-label">${this._esc(label)}</span>
              <span class="dc-graph-value">${this._esc(valueText || "—")}</span>
            </div>
            ${body}
            ${axis}
          </div>`;
      };
      if (container.cpu_entity) {
        const color = container.graph_cpu_color || this.config.graph_cpu_color;
        blocks.push(make(container.cpu_entity, this._t("resources.cpu"), cpuValue, color));
      }
      if (container.memory_entity) {
        const color = container.graph_memory_color || this.config.graph_memory_color;
        blocks.push(make(container.memory_entity, this._t("resources.memory"), memValue, color));
      }
      // Network I/O (#19): download (RX) and upload (TX) are two directions of
      // one metric, so — unlike CPU/Memory — both entities are optional and
      // independent. Which one(s) to show is controlled purely by which
      // entities you configure: only network_rx_entity → a single RX line
      // (same look as CPU/Memory); both → one graph with two lines sharing a
      // y-scale, via _dualSparklineSvg.
      if (container.network_rx_entity || container.network_tx_entity) {
        const rxColor = container.graph_network_rx_color || this.config.graph_network_rx_color;
        const txColor = container.graph_network_tx_color || this.config.graph_network_tx_color;
        const rxEntityId = container.network_rx_entity;
        const txEntityId = container.network_tx_entity;
        const rxE = rxEntityId ? this._getEntity(rxEntityId) : undefined;
        const txE = txEntityId ? this._getEntity(txEntityId) : undefined;
        let rxPts = rxEntityId ? this._historyPoints(rxEntityId, hours, refreshSec) : undefined;
        let txPts = txEntityId ? this._historyPoints(txEntityId, hours, refreshSec) : undefined;
        const rxLive = rxE ? parseFloat(rxE.state) : NaN;
        const txLive = txE ? parseFloat(txE.state) : NaN;
        if (rxPts && Number.isFinite(rxLive)) rxPts = rxPts.concat([[Date.now(), rxLive]]);
        if (txPts && Number.isFinite(txLive)) txPts = txPts.concat([[Date.now(), txLive]]);
        const rxHas = rxPts && rxPts.length >= 2;
        const txHas = txPts && txPts.length >= 2;
        const rxVal = rxE ? this._fmtResourceValue(rxE) : null;
        const txVal = txE ? this._fmtResourceValue(txE) : null;
        let body, axis;
        if (rxHas && txHas) {
          body = this._dualSparklineSvg(rxPts, txPts, rxColor, txColor).replace("<svg ", `<svg${hStyle} `);
          const t0 = Math.min(rxPts[0][0], txPts[0][0]);
          const t1 = Math.max(rxPts[rxPts.length - 1][0], txPts[txPts.length - 1][0]);
          axis = this._axisHtml([[t0, 0], [t1, 0]]);
        } else if (rxHas) {
          body = this._sparklineSvg(rxPts, rxColor).replace("<svg ", `<svg${hStyle} `);
          axis = this._axisHtml(rxPts);
        } else if (txHas) {
          body = this._sparklineSvg(txPts, txColor).replace("<svg ", `<svg${hStyle} `);
          axis = this._axisHtml(txPts);
        } else {
          body = `<div class="dc-graph-empty"${hStyle}>${this._t("resources.no_history")}</div>`;
          axis = "";
        }
        const valueHtml = (rxEntityId && txEntityId)
          ? `<span class="dc-graph-dual-value">
               <span class="dc-graph-value" style="color:${rxColor}">&darr; ${this._esc(rxVal || "—")}</span>
               <span class="dc-graph-value" style="color:${txColor}">&uarr; ${this._esc(txVal || "—")}</span>
             </span>`
          : `<span class="dc-graph-value">${this._esc((rxVal || txVal) || "—")}</span>`;
        blocks.push(`
          <div class="dc-graph">
            <div class="dc-graph-head">
              <span class="dc-graph-label">${this._t("resources.network")}</span>
              ${valueHtml}
            </div>
            ${body}
            ${axis}
          </div>`);
      }
      if (!blocks.length) return "";
      return `<div class="dc-graphs">${blocks.join("")}</div>`;
    }
    // ── Row render ────────────────────────────────────────────────────────────
    _renderRow(c) {
      const key = this._containerKey(c);
      const escKey = this._esc(key);
      const si = this._containerStatus(c);
      const pending = this._pending.has(key);
      const rc = c.running_color || this.config.running_color;
      const nrc = c.not_running_color || c.stopped_color || this.config.not_running_color;
      const pc = c.paused_color || this.config.paused_color;
      const name = this._esc(c.name || this._friendlyName(c.status_entity || c.switch_entity));
      const iconHtml = c.icon
        ? `<ha-icon icon="${this._esc(c.icon)}" style="--mdc-icon-size:0.95rem;flex-shrink:0"></ha-icon>`
        : "";
      let healthHtml = "";
      if (c.health_entity) {
        const he = this._getEntity(c.health_entity);
        const hv = he?.state?.toLowerCase();
        if (hv && hv !== "unknown" && hv !== "unavailable") {
          const iconMap = {
            healthy:   { icon: "mdi:heart-pulse",     color: "var(--dc-rc, #2e8f57)" },
            unhealthy: { icon: "mdi:heart-broken",    color: "var(--dc-nrc, #c22040)" },
            starting:  { icon: "mdi:heart-half-full", color: "var(--dc-pc, #f4b942)" },
          };
          const cfg = iconMap[hv] ?? { icon: "mdi:help-circle-outline", color: "gray" };
          healthHtml = `<ha-icon icon="${cfg.icon}" style="--mdc-icon-size:0.85rem;color:${cfg.color};flex-shrink:0"></ha-icon>`;
        }
      }
      let imageHtml = "";
      if (c.image_version_entity) {
        const ie = this._getEntity(c.image_version_entity);
        const iv = ie?.state;
        if (iv && iv !== "unknown" && iv !== "unavailable") {
          imageHtml = `<div class="dc-image">${this._t("container.image")}: ${this._esc(iv)}</div>`;
        }
      }
      // Resource display: either inline text (inside .dc-info) or full-width
      // graphs rendered as a row-level sibling below the info/actions columns.
      let resHtml = "";
      let graphHtml = "";
      const cpuE = c.cpu_entity ? this._getEntity(c.cpu_entity) : undefined;
      const memE = c.memory_entity ? this._getEntity(c.memory_entity) : undefined;
      const cpuV = cpuE ? this._fmtResourceValue(cpuE) : null;
      const memV = memE ? this._fmtResourceValue(memE) : null;
      // graphs: per-container override, falls back to card-level config
      const graphsEnabled = c.graphs !== undefined ? Boolean(c.graphs) : Boolean(this.config.graphs);
      if (graphsEnabled && (c.cpu_entity || c.memory_entity || c.network_rx_entity || c.network_tx_entity)) {
        graphHtml = this._renderResourceGraphs(c, cpuV, memV);
      } else if (cpuV || memV) {
        resHtml = `<div class="dc-resources">
          ${cpuV ? `<div class="dc-res-item"><span class="dc-res-label">${this._t("resources.cpu")}:</span><span>${cpuV}</span></div>` : ""}
          ${memV ? `<div class="dc-res-item"><span class="dc-res-label">${this._t("resources.memory")}:</span><span>${memV}</span></div>` : ""}
        </div>`;
      }
      const updateInfo = this._getUpdateInfo(c);
      const updateHtml = this._renderUpdateBadge(updateInfo);
      const tapAction = this._normalizeAction(c.tap_action);
      const holdAction = this._normalizeAction(c.hold_action);
      const isActionable = (tapAction?.action && tapAction.action !== "none") || (holdAction?.action && holdAction.action !== "none");
      // Pause button label: show "Resume" when paused, "Pause" when running.
      // Hidden entirely when container is stopped/unknown.
      const showPauseBtn = si.isRunning || si.isPaused;
      const pauseBtnLabel = si.isPaused ? this._t("actions.resume") : this._t("actions.pause");
      const pauseBtnTitle = si.isPaused ? this._t("actions.resume_container") : this._t("actions.pause_container");
      const pauseBtnDisabled = !si.canPause || pending;
      const pauseBtnHtml = showPauseBtn
        ? `<button class="dc-pause" data-key="${escKey}" data-pause-action="${si.isPaused ? "resume" : "pause"}"
            ${pauseBtnDisabled ? "disabled" : ""}
            title="${pauseBtnTitle}">
            ${pauseBtnLabel}
           </button>`
        : "";
      // Recreate button: idle → inline "are you sure?" confirm → pending.
      // Hidden entirely when no recreate_entity is configured.
      const recreateConfirming = this._recreateConfirming.has(key);
      let recreateHtml = "";
      if (si.canRecreate) {
        if (recreateConfirming) {
          recreateHtml = `
            <span class="dc-confirm-row">
              <span class="dc-confirm-text">${this._t("actions.recreate_confirm_text")}</span>
              <button class="dc-confirm-btn yes" data-recreate-confirm="${escKey}">${this._t("actions.confirm")}</button>
              <button class="dc-confirm-btn no" data-recreate-cancel="${escKey}">${this._t("actions.cancel")}</button>
            </span>`;
        } else {
          recreateHtml = `
            <button class="dc-recreate" data-recreate-arm="${escKey}" ${pending ? "disabled" : ""}
              title="${this._t("actions.recreate_container")}">
              ${pending && this._pending.get(key) === "recreate" ? this._t("actions.recreating") : this._t("actions.recreate")}
            </button>`;
        }
      }
      return `
        <div class="dc-row ${si.cssClass}${pending ? " pending" : ""}${isActionable ? " actionable" : ""}"
          data-key="${escKey}"
          style="--dc-rc:${rc};--dc-nrc:${nrc};--dc-pc:${pc}"
          ${isActionable ? `role="button" tabindex="0" aria-label="${name}"` : ""}>
          <div class="dc-info">
            <div class="dc-name">${iconHtml}<span>${name}</span></div>
            <div class="dc-state-row">
              <div class="dc-status ${si.cssClass}">${this._esc(si.label)}</div>
              ${healthHtml}
            </div>
            ${imageHtml}
            ${resHtml}
            ${updateHtml}
          </div>
          <div class="dc-actions">
            <ha-switch data-key="${escKey}"
              ${si.isRunning ? "checked" : ""}
              ${!si.canToggle || pending || si.isPaused ? "disabled" : ""}
              title="${si.isRunning ? this._t("actions.stop_container") : this._t("actions.start_container")}"
              aria-label="${si.isRunning ? this._t("actions.stop_container") : this._t("actions.start_container")} ${name}">
            </ha-switch>
            ${pauseBtnHtml}
            <button class="dc-restart" data-key="${escKey}" ${!si.canRestart || pending ? "disabled" : ""}>
              ${this._t("actions.restart")}
            </button>
            ${recreateHtml}
          </div>
          ${graphHtml}
        </div>`;
    }
    // ── Event binding ────────────────────────────────────────────────────────
    _bindEvents() {
      this.querySelector(".dc-section-header")?.addEventListener("click", () => {
        this._expanded = !this._expanded;
        this.render();
      });
      this.querySelectorAll("[data-more-info]").forEach((el) => {
        const entityId = el.dataset.moreInfo;
        if (!entityId) return;
        el.addEventListener("click", () => this._showMoreInfo(entityId));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._showMoreInfo(entityId); }
        });
      });
      // WUD scan button
      this.querySelectorAll("[data-wud-scan]").forEach((el) => {
        const entityId = el.dataset.wudScan;
        const handler = async () => {
          if (this._wudScanPending || !entityId || !this._hass) return;
          this._wudScanPending = true;
          this.render();
          try {
            await this._hass.callService("button", "press", { entity_id: entityId });
            this._notify(this._t("notifications.wud_scan_triggered"));
          } catch (err) {
            console.error("docker-card: WUD scan failed", err);
            this._notify(this._t("notifications.wud_scan_failed"));
          } finally {
            setTimeout(() => { this._wudScanPending = false; this.render(); }, 3000);
          }
        };
        el.addEventListener("click", handler);
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
        });
      });
      // Maintenance actions (Prune Images/Volumes/Networks) — arm the inline
      // confirm step, cancel it, or actually run it. Generalized (#17) from
      // the original Prune Images-only handlers; each configured action gets
      // its own arm/cancel/confirm selectors via its dataPrefix.
      this._maintenanceActions().forEach((action) => {
        const armSel = `[data-${action.dataPrefix}-arm]`;
        const cancelSel = `[data-${action.dataPrefix}-cancel]`;
        const confirmSel = `[data-${action.dataPrefix}-confirm]`;
        const confirmDatasetKey = `${action.dataPrefix.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Confirm`;
        this.querySelectorAll(armSel).forEach((el) => {
          const arm = () => {
            this._maintConfirming.add(action.id);
            this._pendingFocusSelector = cancelSel;
            this.render();
          };
          el.addEventListener("click", arm);
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); arm(); }
          });
        });
        this.querySelector(cancelSel)?.addEventListener("click", () => {
          this._maintConfirming.delete(action.id);
          this._pendingFocusSelector = armSel;
          this.render();
        });
        this.querySelector(confirmSel)?.addEventListener("click", async (e) => {
          const entityId = e.currentTarget.dataset[confirmDatasetKey];
          if (this._maintPending.has(action.id) || !entityId || !this._hass) return;
          this._maintConfirming.delete(action.id);
          this._maintPending.add(action.id);
          this.render();
          try {
            await this._hass.callService("button", "press", { entity_id: entityId });
            this._notify(this._t(action.triggeredKey));
          } catch (err) {
            console.error(`docker-card: ${action.id} prune failed`, err);
            this._notify(this._t(action.failedKey));
          } finally {
            setTimeout(() => { this._maintPending.delete(action.id); this.render(); }, 3000);
          }
        });
      });
      // Recreate container — same arm / cancel / confirm pattern as Prune, keyed per container.
      this.querySelectorAll("[data-recreate-arm]").forEach((el) => {
        const key = el.dataset.recreateArm;
        const arm = () => {
          this._recreateConfirming.add(key);
          this._pendingFocusSelector = `[data-recreate-cancel="${CSS.escape(key)}"]`;
          this.render();
        };
        el.addEventListener("click", arm);
      });
      this.querySelectorAll("[data-recreate-cancel]").forEach((el) => {
        const key = el.dataset.recreateCancel;
        el.addEventListener("click", () => {
          this._recreateConfirming.delete(key);
          this._pendingFocusSelector = `[data-recreate-arm="${CSS.escape(key)}"]`;
          this.render();
        });
      });
      this.querySelectorAll("[data-recreate-confirm]").forEach((el) => {
        const key = el.dataset.recreateConfirm;
        el.addEventListener("click", () => {
          const container = this._findContainer(key);
          if (container) this._handleRecreate(container);
        });
      });
      this.querySelectorAll("ha-switch[data-key]").forEach((sw) => {
        sw.addEventListener("change", (e) => {
          e.stopPropagation();
          if (sw.disabled) return;
          const c = this._findContainer(sw.dataset.key);
          if (c) this._handleToggle(c, sw.checked, sw);
        });
      });
      this.querySelectorAll(".dc-restart[data-key]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const c = this._findContainer(btn.dataset.key);
          if (c) this._handleRestart(c, btn);
        });
      });
      // Pause / Resume buttons
      this.querySelectorAll(".dc-pause[data-key]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const c = this._findContainer(btn.dataset.key);
          const action = btn.dataset.pauseAction; // "pause" or "resume"
          if (c) this._handlePause(c, action === "resume", btn);
        });
      });
      this.querySelectorAll(".dc-row.actionable[data-key]").forEach((row) => {
        const c = this._findContainer(row.dataset.key);
        if (!c) return;
        let tapAction = this._normalizeAction(c.tap_action);
        let holdAction = this._normalizeAction(c.hold_action);
        if (tapAction?.action === "none") tapAction = undefined;
        if (holdAction?.action === "none") holdAction = undefined;
        const defaultEntity = this._containerStatus(c).entityId;
        const holdDelay = typeof c.hold_delay === "number" ? c.hold_delay : 500;
        let holdTimer = null;
        let holdActivated = false;
        const clearHold = () => { clearTimeout(holdTimer); holdTimer = null; };
        row.addEventListener("pointerdown", (e) => {
          if (this._isInteractive(e) || (typeof e.button === "number" && e.button !== 0)) return;
          holdActivated = false; clearHold();
          if (!holdAction) return;
          holdTimer = setTimeout(() => { holdActivated = true; this._handleAction(holdAction, defaultEntity); }, holdDelay);
        });
        row.addEventListener("pointerup", (e) => { if (this._isInteractive(e)) { clearHold(); return; } clearHold(); });
        row.addEventListener("pointercancel", () => { clearHold(); holdActivated = false; });
        row.addEventListener("pointerleave", () => { clearHold(); holdActivated = false; });
        row.addEventListener("click", (e) => {
          if (this._isInteractive(e)) return;
          if (holdActivated) { holdActivated = false; return; }
          if (tapAction) this._handleAction(tapAction, defaultEntity);
        });
        row.addEventListener("keydown", (e) => {
          if (this._isInteractive(e)) return;
          if ((e.key === "Enter" || e.key === " ") && tapAction) { e.preventDefault(); this._handleAction(tapAction, defaultEntity); }
        });
      });
    }
    // ── Helpers ──────────────────────────────────────────────────────────────
    _findContainer(key) {
      return (this.config.containers || []).find((c) => this._containerKey(c) === key);
    }
    _isInteractive(event) {
      if (!event?.target) return false;
      const t = event.target;
      if (t.closest(".dc-actions")) return true;
      return ["button", "a", "input", "select", "textarea", "ha-switch"].some((s) => t.closest(s));
    }
    _containerKey(container) {
      if (container.id) return container.id;
      if (!container.__dcKey) {
        const fallback = container.name || container.status_entity || container.control_entity || container.switch_entity || cryptoRandom();
        Object.defineProperty(container, "__dcKey", { value: fallback, enumerable: false, configurable: false });
      }
      return container.__dcKey;
    }
    _normalizeContainers(input) {
      if (!input) return [];
      const result = [];
      const add = (c) => {
        if (!c || typeof c !== "object") return;
        let clone;
        try { clone = typeof structuredClone === "function" ? structuredClone(c) : { ...c }; } catch { clone = { ...c }; }
        if (clone.stopped_color && !clone.not_running_color) clone.not_running_color = clone.stopped_color;
        result.push(clone);
      };
      if (Array.isArray(input) || (typeof input === "object" && typeof input[Symbol.iterator] === "function")) {
        try { for (const c of input) add(c); } catch (e) { console.warn("docker-card: Failed to iterate containers", e); }
      }
      if (!result.length && typeof input === "object") {
        const vals = Object.values(input);
        if (vals.length) vals.forEach(add); else add(input);
      }
      return result;
    }
    // ── Status ───────────────────────────────────────────────────────────────
    _containerStatus(container) {
      const stateEntityId = container.status_entity || container.control_entity || container.switch_entity;
      const entity = stateEntityId ? this._getEntity(stateEntityId) : undefined;
      const rawState = entity ? entity.state : undefined;
      const runningStates = container.running_states || this.config.running_states;
      const stoppedStates = container.stopped_states || this.config.stopped_states;
      const pausedStates = container.paused_states || this.config.paused_states;
      const norm = rawState ? rawState.toLowerCase() : undefined;
      const isRunning = norm ? runningStates.includes(norm) : false;
      const isStopped = norm ? stoppedStates.includes(norm) : false;
      const isPaused = norm ? pausedStates.includes(norm) : false;
      const cssClass = isRunning ? "running" : isPaused ? "paused" : isStopped ? "stopped" : "unknown";
      const label = this._prettyStatus(rawState, { runningStates, stoppedStates, pausedStates });
      const controlEntityId = container.control_entity || container.switch_entity;
      const toggleCap = this._toggleCap(controlEntityId, container.control_domain || container.switch_domain);
      const canToggle = Boolean(toggleCap || (container.start_service && container.stop_service));
      const canRestart = Boolean(this._getRestartService(container));
      const canPause = Boolean(this._getPauseService(container, false) || this._getPauseService(container, true));
      const canRecreate = Boolean(this._getRecreateService(container));
      return { entityId: stateEntityId, rawState, label, cssClass, isRunning, isStopped, isPaused, canToggle, canRestart, canPause, canRecreate };
    }
    _computeOverallStatus() {
      const entityId = this.config.docker_overview?.status;
      const entity = entityId ? this._getEntity(entityId) : undefined;
      const rawState = entity ? entity.state : undefined;
      if (!rawState) return { label: this._t("status.unknown"), cssClass: "idle", tone: "idle", entityId };
      const v = rawState.toLowerCase();
      if (["on","running","online","ok","true","ready"].includes(v)) return { label: this._t("status.online"), cssClass: "running", tone: "running", entityId };
      if (["off","offline","error","problem","false","down"].includes(v)) return { label: this._t("status.offline"), cssClass: "offline", tone: "not_running", entityId };
      const trans = { starting:"status.starting", degraded:"status.degraded", paused:"status.paused", unknown:"status.unknown", idle:"status.idle" };
      if (trans[v]) return { label: this._t(trans[v]), cssClass: "idle", tone: "idle", entityId };
      return { label: rawState, cssClass: "idle", tone: "idle", entityId };
    }
    _prettyStatus(state, opts = {}) {
      if (!state) return this._t("status.unknown");
      const v = state.toLowerCase();
      const running = opts.runningStates || this.config.running_states;
      const stopped = opts.stoppedStates || this.config.stopped_states;
      const paused = opts.pausedStates || this.config.paused_states;
      if (running.includes(v)) return this._t("status.running");
      if (stopped.includes(v)) return this._t("status.stopped");
      if (paused.includes(v)) return this._t("status.paused");
      const trans = { starting:"status.starting", degraded:"status.degraded", unknown:"status.unknown", idle:"status.idle" };
      if (trans[v]) return this._t(trans[v]);
      return state.charAt(0).toUpperCase() + state.slice(1);
    }
    // ── Services ─────────────────────────────────────────────────────────────
    _toggleCap(entityId, domainOverride) {
      if (!entityId) return undefined;
      const domain = domainOverride || domainFromEntityId(entityId);
      const mapping = domain ? TOGGLE_SERVICE_MAP[domain] : undefined;
      if (!mapping) return undefined;
      return { domain, entity_id: entityId, on: mapping.on, off: mapping.off };
    }
    _restartCap(entityId, domainOverride) {
      if (!entityId) return undefined;
      const domain = domainOverride || domainFromEntityId(entityId);
      const mapping = domain ? RESTART_SERVICE_MAP[domain] : undefined;
      if (!mapping) return undefined;
      return { domain, entity_id: entityId, service: mapping.service };
    }
    _pauseCap(entityId) {
      if (!entityId) return undefined;
      const domain = domainFromEntityId(entityId);
      const mapping = domain ? PAUSE_SERVICE_MAP[domain] : undefined;
      if (!mapping) return undefined;
      return { domain, entity_id: entityId, service: mapping.service };
    }
    _recreateCap(entityId) {
      if (!entityId) return undefined;
      const domain = domainFromEntityId(entityId);
      const mapping = domain ? RECREATE_SERVICE_MAP[domain] : undefined;
      if (!mapping) return undefined;
      return { domain, entity_id: entityId, service: mapping.service };
    }
    _getRestartService(container) {
      if (!container) return undefined;
      if (container.restart_entity) {
        const cap = this._restartCap(container.restart_entity, container.restart_domain);
        if (cap) return { domain: cap.domain, service: cap.service, data: { entity_id: cap.entity_id } };
      }
      return this._normalizeSvc(container.restart_service);
    }
    /**
     * Returns the service config for pause or resume.
     *
     * Container config keys:
     *   pause_entity   — button/script entity to press when pausing
     *   resume_entity  — button/script entity to press when resuming
     *
     * @param {object} container
     * @param {boolean} shouldResume  true = get resume service, false = get pause service
     */
    _getPauseService(container, shouldResume) {
      if (!container) return undefined;
      if (shouldResume) {
        if (container.resume_entity) {
          const cap = this._pauseCap(container.resume_entity);
          if (cap) return { domain: cap.domain, service: cap.service, data: { entity_id: cap.entity_id } };
        }
        return undefined;
      } else {
        if (container.pause_entity) {
          const cap = this._pauseCap(container.pause_entity);
          if (cap) return { domain: cap.domain, service: cap.service, data: { entity_id: cap.entity_id } };
        }
        return undefined;
      }
    }
    /** Recreate service — pulls the image at the container's already-configured tag, then recreates. */
    _getRecreateService(container) {
      if (!container?.recreate_entity) return undefined;
      const cap = this._recreateCap(container.recreate_entity);
      if (!cap) return undefined;
      return { domain: cap.domain, service: cap.service, data: { entity_id: cap.entity_id } };
    }
    _resolveToggleService(container, shouldRun) {
      const controlEntityId = container.control_entity || container.switch_entity;
      const cap = this._toggleCap(controlEntityId, container.control_domain || container.switch_domain);
      if (cap) {
        const svc = shouldRun ? cap.on : cap.off;
        if (svc) return { domain: cap.domain, service: svc, data: { entity_id: cap.entity_id } };
      }
      return this._normalizeSvc(shouldRun ? container.start_service : container.stop_service);
    }
    _normalizeSvc(service) {
      if (!service) return undefined;
      if (typeof service === "string") {
        const parts = service.split(".");
        if (parts.length !== 2) return undefined;
        return { domain: parts[0], service: parts[1], data: {} };
      }
      const { domain, service: srv, data, service_data, entity_id, target } = service;
      if (!domain || !srv) return undefined;
      const payload = { ...(service_data || data || {}) };
      if (entity_id && !payload.entity_id) payload.entity_id = entity_id;
      if (target && !payload.target) payload.target = target;
      return { domain, service: srv, data: payload };
    }
    async _callService(service) {
      if (!this._hass) throw new Error("Home Assistant unavailable");
      return this._hass.callService(service.domain, service.service, service.data || {});
    }
    // ── Toggle / Restart / Pause ─────────────────────────────────────────────
    async _handleToggle(container, shouldRun, toggleEl) {
      const key = this._containerKey(container);
      const displayName = container.name || this._friendlyName(container.status_entity || container.switch_entity);
      const actionWord = shouldRun ? this._t("actions.start") : this._t("actions.stop");
      const svcConfig = this._resolveToggleService(container, shouldRun);
      if (!svcConfig) {
        this._notify(this._t("notifications.missing_toggle", { action: actionWord, name: displayName }));
        toggleEl.checked = !shouldRun;
        return;
      }
      toggleEl.disabled = true;
      this._pending.set(key, shouldRun ? "start" : "stop");
      this.render();
      try {
        await this._callService(svcConfig);
        this._notify(shouldRun ? this._t("notifications.starting", { name: displayName }) : this._t("notifications.stopping", { name: displayName }));
      } catch (err) {
        console.error("docker-card toggle error", err);
        this._notify(shouldRun ? this._t("notifications.failed_start", { name: displayName }) : this._t("notifications.failed_stop", { name: displayName }));
        toggleEl.checked = !shouldRun;
      } finally {
        this._pending.delete(key);
        toggleEl.disabled = false;
        this.render();
      }
    }
    async _handleRestart(container, buttonEl) {
      const svcConfig = this._getRestartService(container);
      const displayName = container.name || this._friendlyName(container.restart_entity || container.status_entity);
      if (!svcConfig) {
        this._notify(this._t("notifications.missing_restart", { name: displayName }));
        return;
      }
      const key = this._containerKey(container);
      buttonEl.disabled = true;
      this._pending.set(key, "restart");
      this.render();
      try {
        await this._callService(svcConfig);
        this._notify(this._t("notifications.restarting", { name: displayName }));
      } catch (err) {
        console.error("docker-card restart error", err);
        this._notify(this._t("notifications.failed_restart", { name: displayName }));
      } finally {
        this._pending.delete(key);
        buttonEl.disabled = false;
        this.render();
      }
    }
    async _handlePause(container, shouldResume, buttonEl) {
      const displayName = container.name || this._friendlyName(container.status_entity);
      const svcConfig = this._getPauseService(container, shouldResume);
      if (!svcConfig) {
        this._notify(shouldResume
          ? this._t("notifications.missing_resume", { name: displayName })
          : this._t("notifications.missing_pause", { name: displayName }));
        return;
      }
      const key = this._containerKey(container);
      buttonEl.disabled = true;
      this._pending.set(key, shouldResume ? "resume" : "pause");
      this.render();
      try {
        await this._callService(svcConfig);
        this._notify(shouldResume
          ? this._t("notifications.resuming", { name: displayName })
          : this._t("notifications.pausing", { name: displayName }));
      } catch (err) {
        console.error("docker-card pause error", err);
        this._notify(shouldResume
          ? this._t("notifications.failed_resume", { name: displayName })
          : this._t("notifications.failed_pause", { name: displayName }));
      } finally {
        this._pending.delete(key);
        buttonEl.disabled = false;
        this.render();
      }
    }
    /** Fires the recreate service after the inline confirm step has already been accepted. */
    async _handleRecreate(container) {
      const svcConfig = this._getRecreateService(container);
      const displayName = container.name || this._friendlyName(container.status_entity || container.recreate_entity);
      const key = this._containerKey(container);
      this._recreateConfirming.delete(key);
      if (!svcConfig) {
        this._notify(this._t("notifications.missing_recreate", { name: displayName }));
        this.render();
        return;
      }
      this._pending.set(key, "recreate");
      this.render();
      try {
        await this._callService(svcConfig);
        this._notify(this._t("notifications.recreating", { name: displayName }));
      } catch (err) {
        console.error("docker-card recreate error", err);
        this._notify(this._t("notifications.failed_recreate", { name: displayName }));
      } finally {
        this._pending.delete(key);
        this.render();
      }
    }
    // ── Actions ──────────────────────────────────────────────────────────────
    _normalizeAction(action) {
      if (!action) return undefined;
      if (typeof action === "string") return { action };
      if (typeof action !== "object") return undefined;
      if (!action.action) {
        if (action.service || action.service_data || action.data || action.target) return { ...action, action: "call-service" };
        if (action.navigation_path || action.path) return { ...action, action: "navigate" };
        if (action.url || action.url_path) return { ...action, action: "url" };
        return { ...action, action: "more-info" };
      }
      return { ...action };
    }
    _handleAction(actionConfig, defaultEntity) {
      const config = this._normalizeAction(actionConfig);
      if (!config || config.action === "none") return;
      switch (config.action) {
        case "more-info": this._showMoreInfo(config.entity || defaultEntity); break;
        case "navigate": {
          const path = config.navigation_path || config.path;
          if (path) this.dispatchEvent(new CustomEvent("navigate", { bubbles: true, composed: true, detail: { path } }));
          break;
        }
        case "url": {
          const url = config.url_path || config.url;
          if (url) window.open(url, config.new_tab === false ? "_self" : "_blank", "noreferrer");
          break;
        }
        case "call-service": {
          if (!this._hass) return;
          const svcStr = config.service || config.service_name;
          let domain, service;
          if (svcStr) { const p = svcStr.split("."); domain = p[0]; service = p[1]; }
          if (!domain) domain = config.domain;
          if (!service) service = config.service;
          if (!domain || !service) return;
          const data = { ...(config.service_data || config.data || {}) };
          if (config.entity && !data.entity_id) data.entity_id = config.entity;
          else if (!data.entity_id && defaultEntity) data.entity_id = defaultEntity;
          this._hass.callService(domain, service, data, config.target);
          break;
        }
        case "toggle": {
          const id = config.entity || defaultEntity;
          if (id && this._hass) this._hass.callService("homeassistant", "toggle", { entity_id: id });
          break;
        }
        case "fire-dom-event":
          this.dispatchEvent(new CustomEvent(config.event || config.event_type || "ll-custom", {
            detail: config.event_data || config.data || {}, bubbles: true, composed: true,
          }));
          break;
      }
    }
    // ── HA helpers ────────────────────────────────────────────────────────────
    _getEntity(entityId) {
      if (!entityId || !this._hass?.states) return undefined;
      return this._hass.states[entityId];
    }
    /** Every entity ID the currently-rendered card actually reads, derived fresh from config each call. */
    _watchedEntities() {
      const ids = new Set();
      const oc = this.config?.docker_overview;
      if (oc && typeof oc === "object") {
        Object.values(oc).forEach((v) => { if (typeof v === "string" && v) ids.add(v); });
      }
      const containerEntityFields = [
        "status_entity", "control_entity", "switch_entity",
        "restart_entity", "pause_entity", "resume_entity", "recreate_entity",
        "cpu_entity", "memory_entity", "image_version_entity", "health_entity",
        "update_entity", "network_rx_entity", "network_tx_entity",
      ];
      (this.config?.containers || []).forEach((c) => {
        containerEntityFields.forEach((f) => { if (c[f]) ids.add(c[f]); });
      });
      return ids;
    }
    /**
     * True if anything the card actually reads from hass changed since prevHass.
     * Relies on HA's frontend guarantee that hass.states[id] keeps the same object
     * reference unless that specific entity's state/attributes actually changed —
     * so a reference check is sufficient, no need to diff state/attributes by value.
     */
    _isDirty(prevHass, hass) {
      if (!prevHass || !hass) return true;
      if (prevHass.language !== hass.language) return true;
      if (prevHass.locale !== hass.locale) return true;
      for (const id of this._watchedEntities()) {
        if (prevHass.states?.[id] !== hass.states?.[id]) return true;
      }
      return false;
    }
    _friendlyName(entityId) {
      const e = this._getEntity(entityId);
      return e?.attributes?.friendly_name || entityId || this._t("common.container");
    }
    _showMoreInfo(entityId) {
      if (!entityId) return;
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
    }
    _notify(message) {
      if (!message) return;
      this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }));
    }
    // ── Formatting ────────────────────────────────────────────────────────────
    _fmtState(state) {
      if (state === undefined || state === null || state === "unknown" || state === "unavailable") return "—";
      return state;
    }
    /** Formats an entity's state with its own unit_of_measurement appended (e.g. disk usage sensors in GB/MB). No unit is added when the entity declares none. */
    _fmtStateWithUnit(entity) {
      if (!entity) return "—";
      const s = this._fmtState(entity.state);
      if (s === "—") return s;
      const unit = entity.attributes?.unit_of_measurement;
      return unit ? `${s} ${unit}` : s;
    }
    /**
     * Formats a CPU/memory entity's state using its own unit_of_measurement
     * (falls back to "%" for entities that don't declare one) — so absolute
     * sensors like memory in MB display correctly instead of being shown as
     * a percentage.
     */
    _fmtResourceValue(entity) {
      if (!entity) return null;
      const value = entity.state;
      if (value === undefined || value === null) return null;
      const s = value.toString().toLowerCase();
      if (s === "unknown" || s === "unavailable" || s === "") return null;
      const n = parseFloat(value);
      if (isNaN(n)) return null;
      const unit = entity.attributes?.unit_of_measurement ?? "%";
      return unit === "%" ? `${n.toFixed(1)}%` : `${n.toFixed(1)} ${unit}`;
    }
    _parseIntState(state) {
      if (state === undefined || state === null) return undefined;
      const s = state.toString().trim();
      const n = Number(s);
      if (Number.isInteger(n)) return n;
      const m = s.match(/-?\d+/);
      if (m) { const c = Number(m[0]); if (Number.isInteger(c)) return c; }
      return undefined;
    }
    _isBlank(value) {
      if (value === undefined || value === null) return true;
      const s = value.toString().trim();
      if (!s || s === "—") return true;
      if (/^(unknown|unavailable)$/i.test(s)) return true;
      return s.replace(/[—\s/·]/g, "").length === 0;
    }
    _esc(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    /** Only allow http(s) URLs through to an href — blocks javascript:/data: etc. from untrusted attribute values. */
    _safeHttpUrl(url) {
      if (!url) return "";
      try {
        const parsed = new URL(String(url), window.location.href);
        return /^https?:$/.test(parsed.protocol) ? String(url) : "";
      } catch {
        return "";
      }
    }
    // ── Translations ──────────────────────────────────────────────────────────
    /** Resolves the HA-configured language to one of our translated languages, falling back to English. */
    _lang() {
      const raw = (this._hass?.locale?.language || this._hass?.language || DEFAULT_LANGUAGE).toLowerCase();
      const primary = raw.split("-")[0];
      return TRANSLATIONS[primary] ? primary : DEFAULT_LANGUAGE;
    }
    _t(key, replacements) {
      if (!key) return "";
      const translations = TRANSLATIONS[this._lang()] || TRANSLATIONS[DEFAULT_LANGUAGE];
      const raw = this._getValue(translations, key) ?? this._getValue(TRANSLATIONS[DEFAULT_LANGUAGE], key) ?? key;
      if (!replacements || typeof raw !== "string") return raw;
      return raw.replace(/\{([^}]+)\}/g, (match, k) =>
        Object.prototype.hasOwnProperty.call(replacements, k) ? replacements[k] : match
      );
    }
    _getValue(tree, key) {
      if (!tree || !key) return undefined;
      return key.split(".").reduce((acc, seg) =>
        acc && Object.prototype.hasOwnProperty.call(acc, seg) ? acc[seg] : undefined, tree);
    }
  }
  // ── Visual editor (#26) ────────────────────────────────────────────────────
  // Card-wide settings on top, then one row per container ("Add container"),
  // each row with its own <ha-form>. Options the editor does not show (colors,
  // state lists, actions, domain overrides) are never touched: every change
  // only sets/removes the keys of the form that changed.
  const EDITOR_TRANSLATIONS = {
    en: {
      title: "Title", columns: "Maximum columns", containers_expanded: "Expand the container list on load",
      graphs: "Show CPU/memory graphs", graph_hours: "Graph window (hours)", graph_height: "Graph height (px)",
      graph_refresh: "Graph refresh (seconds)", name: "Name", icon: "Icon",
      status_entity: "Status entity", control_entity: "Start/stop entity", restart_entity: "Restart entity",
      pause_entity: "Pause entity", resume_entity: "Resume entity", cpu_entity: "CPU entity",
      memory_entity: "Memory entity", recreate_entity: "Recreate entity", network_rx_entity: "Network RX entity",
      network_tx_entity: "Network TX entity", image_version_entity: "Image version entity",
      health_entity: "Health entity", update_entity: "WUD update entity",
      status: "Docker status", container_count: "Container count", containers_running: "Running containers",
      containers_paused: "Paused containers", containers_stopped: "Stopped containers", docker_version: "Docker version",
      image_count: "Image count", operating_system: "Operating system", operating_system_version: "OS version",
      container_disk_usage: "Container disk usage", image_disk_usage: "Image disk usage", volume_disk_usage: "Volume disk usage",
      wud_last_poll: "WUD last scan", wud_scan: "WUD force-scan button", prune_images: "Prune images button",
      prune_volumes: "Prune volumes button", prune_networks: "Prune networks button",
      updates_summary: "Show the \"updates available\" tile",
      section_overview: "Docker overview", section_containers: "Containers", advanced: "Advanced",
      add_container: "Add container", remove_container: "Remove container", move_up: "Move up", move_down: "Move down",
      container_n: "Container {n}",
      note: "Options that are not shown here (colors, states, actions, domain overrides) stay in YAML and are kept when you edit.",
    },
    sv: {
      title: "Titel", columns: "Max antal kolumner", containers_expanded: "Expandera containerlistan vid start",
      graphs: "Visa CPU-/minnesgrafer", graph_hours: "Grafens tidsfönster (timmar)", graph_height: "Grafhöjd (px)",
      graph_refresh: "Grafuppdatering (sekunder)", name: "Namn", icon: "Ikon",
      status_entity: "Statusentitet", control_entity: "Start/stopp-entitet", restart_entity: "Omstartsentitet",
      pause_entity: "Pausentitet", resume_entity: "Återupptagsentitet", cpu_entity: "CPU-entitet",
      memory_entity: "Minnesentitet", recreate_entity: "Återskapa-entitet", network_rx_entity: "Nätverk RX-entitet",
      network_tx_entity: "Nätverk TX-entitet", image_version_entity: "Image-versionsentitet",
      health_entity: "Hälsoentitet", update_entity: "WUD-uppdateringsentitet",
      status: "Docker-status", container_count: "Antal containrar", containers_running: "Körande containrar",
      containers_paused: "Pausade containrar", containers_stopped: "Stoppade containrar", docker_version: "Docker-version",
      image_count: "Antal images", operating_system: "Operativsystem", operating_system_version: "OS-version",
      container_disk_usage: "Diskutrymme containrar", image_disk_usage: "Diskutrymme images", volume_disk_usage: "Diskutrymme volymer",
      wud_last_poll: "Senaste WUD-skanning", wud_scan: "WUD-knapp: tvinga skanning", prune_images: "Knapp: rensa images",
      prune_volumes: "Knapp: rensa volymer", prune_networks: "Knapp: rensa nätverk",
      updates_summary: "Visa rutan \"uppdateringar tillgängliga\"",
      section_overview: "Docker-översikt", section_containers: "Containrar", advanced: "Avancerat",
      add_container: "Lägg till container", remove_container: "Ta bort container", move_up: "Flytta upp", move_down: "Flytta ner",
      container_n: "Container {n}",
      note: "Inställningar som inte visas här (färger, tillstånd, åtgärder, domänöverskrivningar) ligger kvar i YAML och bevaras när du redigerar.",
    },
    de: {
      title: "Titel", columns: "Maximale Spaltenzahl", containers_expanded: "Containerliste beim Laden ausklappen",
      graphs: "CPU-/Speicher-Diagramme anzeigen", graph_hours: "Diagramm-Zeitraum (Stunden)", graph_height: "Diagrammhöhe (px)",
      graph_refresh: "Diagramm-Aktualisierung (Sekunden)", name: "Name", icon: "Symbol",
      status_entity: "Status-Entität", control_entity: "Start/Stopp-Entität", restart_entity: "Neustart-Entität",
      pause_entity: "Pause-Entität", resume_entity: "Fortsetzen-Entität", cpu_entity: "CPU-Entität",
      memory_entity: "Speicher-Entität", recreate_entity: "Neu-erstellen-Entität", network_rx_entity: "Netzwerk-RX-Entität",
      network_tx_entity: "Netzwerk-TX-Entität", image_version_entity: "Image-Versions-Entität",
      health_entity: "Health-Entität", update_entity: "WUD-Update-Entität",
      status: "Docker-Status", container_count: "Anzahl Container", containers_running: "Laufende Container",
      containers_paused: "Pausierte Container", containers_stopped: "Gestoppte Container", docker_version: "Docker-Version",
      image_count: "Anzahl Images", operating_system: "Betriebssystem", operating_system_version: "OS-Version",
      container_disk_usage: "Speicherplatz Container", image_disk_usage: "Speicherplatz Images", volume_disk_usage: "Speicherplatz Volumes",
      wud_last_poll: "Letzter WUD-Scan", wud_scan: "WUD-Schaltfläche: Scan erzwingen", prune_images: "Schaltfläche: Images bereinigen",
      prune_volumes: "Schaltfläche: Volumes bereinigen", prune_networks: "Schaltfläche: Netzwerke bereinigen",
      updates_summary: "Kachel „Updates verfügbar“ anzeigen",
      section_overview: "Docker-Übersicht", section_containers: "Container", advanced: "Erweitert",
      add_container: "Container hinzufügen", remove_container: "Container entfernen", move_up: "Nach oben", move_down: "Nach unten",
      container_n: "Container {n}",
      note: "Optionen, die hier nicht angezeigt werden (Farben, Zustände, Aktionen, Domain-Überschreibungen), bleiben in YAML erhalten.",
    },
    fr: {
      title: "Titre", columns: "Nombre maximal de colonnes", containers_expanded: "Déplier la liste des conteneurs au chargement",
      graphs: "Afficher les graphiques CPU/mémoire", graph_hours: "Fenêtre du graphique (heures)", graph_height: "Hauteur du graphique (px)",
      graph_refresh: "Rafraîchissement du graphique (secondes)", name: "Nom", icon: "Icône",
      status_entity: "Entité d'état", control_entity: "Entité démarrer/arrêter", restart_entity: "Entité de redémarrage",
      pause_entity: "Entité de pause", resume_entity: "Entité de reprise", cpu_entity: "Entité CPU",
      memory_entity: "Entité mémoire", recreate_entity: "Entité de recréation", network_rx_entity: "Entité réseau RX",
      network_tx_entity: "Entité réseau TX", image_version_entity: "Entité version d'image",
      health_entity: "Entité de santé", update_entity: "Entité de mise à jour WUD",
      status: "État de Docker", container_count: "Nombre de conteneurs", containers_running: "Conteneurs en cours",
      containers_paused: "Conteneurs en pause", containers_stopped: "Conteneurs arrêtés", docker_version: "Version de Docker",
      image_count: "Nombre d'images", operating_system: "Système d'exploitation", operating_system_version: "Version de l'OS",
      container_disk_usage: "Espace disque des conteneurs", image_disk_usage: "Espace disque des images", volume_disk_usage: "Espace disque des volumes",
      wud_last_poll: "Dernier scan WUD", wud_scan: "Bouton WUD : forcer le scan", prune_images: "Bouton : nettoyer les images",
      prune_volumes: "Bouton : nettoyer les volumes", prune_networks: "Bouton : nettoyer les réseaux",
      updates_summary: "Afficher la tuile « mises à jour disponibles »",
      section_overview: "Vue d'ensemble Docker", section_containers: "Conteneurs", advanced: "Avancé",
      add_container: "Ajouter un conteneur", remove_container: "Supprimer le conteneur", move_up: "Monter", move_down: "Descendre",
      container_n: "Conteneur {n}",
      note: "Les options non affichées ici (couleurs, états, actions, remplacements de domaine) restent en YAML et sont conservées.",
    },
  };
  const editorT = (hass, key, repl) => {
    const raw = (hass?.locale?.language || hass?.language || DEFAULT_LANGUAGE).toLowerCase().split("-")[0];
    const dict = EDITOR_TRANSLATIONS[raw] || EDITOR_TRANSLATIONS[DEFAULT_LANGUAGE];
    const s = dict[key] ?? EDITOR_TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
    return repl ? s.replace(/\{(\w+)\}/g, (m, k) => (k in repl ? repl[k] : m)) : s;
  };
  const edEntity = (name, domain) => ({ name, selector: { entity: domain ? { domain } : {} } });
  const edNumber = (name, min, max) => ({ name, selector: { number: { min, max, step: 1, mode: "box" } } });
  const EDITOR_CARD_SCHEMA = [
    { name: "title", selector: { text: {} } },
    edNumber("columns", 1, 6),
    { name: "containers_expanded", selector: { boolean: {} } },
    { name: "graphs", selector: { boolean: {} } },
    edNumber("graph_hours", 1, 168),
    edNumber("graph_height", 16, 200),
    edNumber("graph_refresh", 30, 3600),
  ];
  const EDITOR_OVERVIEW_SCHEMA = [
    edEntity("status"),
    edEntity("container_count", "sensor"), edEntity("containers_running", "sensor"),
    edEntity("containers_paused", "sensor"), edEntity("containers_stopped", "sensor"),
    edEntity("docker_version", "sensor"), edEntity("image_count", "sensor"),
    edEntity("operating_system", "sensor"), edEntity("operating_system_version", "sensor"),
    edEntity("container_disk_usage", "sensor"), edEntity("image_disk_usage", "sensor"), edEntity("volume_disk_usage", "sensor"),
    edEntity("wud_last_poll", "sensor"), edEntity("wud_scan", "button"),
    edEntity("prune_images", "button"), edEntity("prune_volumes", "button"), edEntity("prune_networks", "button"),
    { name: "updates_summary", selector: { boolean: {} } },
  ];
  const EDITOR_CONTAINER_SCHEMA = [
    { name: "name", selector: { text: {} } },
    { name: "icon", selector: { icon: {} } },
    edEntity("status_entity"), edEntity("control_entity"), edEntity("restart_entity"),
    edEntity("pause_entity", ["button", "script", "automation"]),
    edEntity("resume_entity", ["button", "script", "automation"]),
    edEntity("cpu_entity", "sensor"), edEntity("memory_entity", "sensor"),
  ];
  const EDITOR_CONTAINER_ADVANCED_SCHEMA = [
    edEntity("recreate_entity", ["button", "script", "automation"]),
    edEntity("network_rx_entity", "sensor"), edEntity("network_tx_entity", "sensor"),
    edEntity("image_version_entity", "sensor"), edEntity("health_entity", "sensor"), edEntity("update_entity", "sensor"),
    edNumber("graph_hours", 1, 168), edNumber("graph_height", 16, 200), edNumber("graph_refresh", 30, 3600),
  ];
  const EDITOR_CSS = `
    .dce { display: flex; flex-direction: column; gap: 12px; }
    .dce-block { border: 1px solid var(--divider-color); border-radius: 12px; background: var(--card-background-color); }
    .dce-sum { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px; cursor: pointer; font-weight: 500; color: var(--primary-text-color); }
    .dce-sum::before { content: "▸"; color: var(--secondary-text-color); }
    details[open] > .dce-sum::before { content: "▾"; }
    .dce-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dce-actions { display: flex; gap: 4px; }
    .dce-btn { min-width: 44px; min-height: 44px; border: none; border-radius: 8px; background: transparent; color: var(--primary-text-color); font-size: 1rem; cursor: pointer; }
    .dce-btn:hover:not([disabled]) { background: var(--secondary-background-color); }
    .dce-btn[disabled] { opacity: 0.35; cursor: default; }
    .dce-body { padding: 0 12px 12px; }
    .dce-sub { display: flex; align-items: center; min-height: 44px; cursor: pointer; color: var(--secondary-text-color); }
    .dce-heading { font-weight: 600; color: var(--primary-text-color); }
    .dce-add { min-height: 44px; border: 1px dashed var(--primary-color); border-radius: 12px; background: transparent; color: var(--primary-color); font-size: 0.95rem; cursor: pointer; }
    .dce-note { margin: 0; color: var(--secondary-text-color); font-size: 0.85rem; }
    .dce summary:focus-visible, .dce button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  `;
  /** Set/remove exactly the schema's keys on a copy of `base`; everything else is left alone. */
  const editorApply = (base, schema, value) => {
    const next = { ...base };
    schema.forEach(({ name }) => {
      const v = value ? value[name] : undefined;
      if (v === undefined || v === null || v === "") delete next[name];
      else next[name] = v;
    });
    return next;
  };
  const editorPick = (obj, schema) => {
    const out = {};
    schema.forEach(({ name }) => { if (obj && obj[name] !== undefined) out[name] = obj[name]; });
    return out;
  };
  class DockerCardEditor extends HTMLElement {
    constructor() {
      super();
      this._config = {};
      this._hass = undefined;
      this._built = false;
      this._open = new Set();
      this._rows = [];
    }
    setConfig(config) {
      this._config = { ...(config || {}) };
      if (this._built) this._sync(); else this._ensureBuilt();
    }
    set hass(hass) {
      this._hass = hass;
      if (!this._built) { this._ensureBuilt(); return; }
      this._applyHass();
    }
    /** Same container normalisation the card does, without writing anything back. */
    _containers() {
      const input = this._config.containers ?? this._config.container;
      if (Array.isArray(input)) return input.filter((c) => c && typeof c === "object");
      if (input && typeof input === "object") return Object.values(input).filter((c) => c && typeof c === "object");
      return [];
    }
    _ensureBuilt() {
      if (this._built || !this._hass) return;
      this.innerHTML = `<style>${EDITOR_CSS}</style>
        <div class="dce">
          <div class="dce-card"></div>
          <details class="dce-block dce-overview"><summary class="dce-sum"></summary><div class="dce-body"></div></details>
          <div class="dce-heading"></div>
          <div class="dce-list"></div>
          <button type="button" class="dce-add"></button>
          <p class="dce-note"></p>
        </div>`;
      this._cardForm = this._makeForm(EDITOR_CARD_SCHEMA, (v) => this._onCardChange(v));
      this.querySelector(".dce-card").appendChild(this._cardForm);
      this._overviewForm = this._makeForm(EDITOR_OVERVIEW_SCHEMA, (v) => this._onOverviewChange(v));
      this.querySelector(".dce-overview .dce-body").appendChild(this._overviewForm);
      this.querySelector(".dce-add").addEventListener("click", () => this._addContainer());
      const list = this.querySelector(".dce-list");
      list.addEventListener("click", (e) => this._onListClick(e));
      // "toggle" does not bubble; capture it to remember which rows are open.
      list.addEventListener("toggle", (e) => {
        const row = e.target.closest ? e.target.closest(".dce-row") : null;
        if (!row || e.target !== row) return;
        const i = Number(row.dataset.i);
        if (row.open) this._open.add(i); else this._open.delete(i);
      }, true);
      this._built = true;
      this._labels();
      this._renderRows();
      this._pushData();
    }
    _makeForm(schema, onChange) {
      const form = document.createElement("ha-form");
      form.schema = schema;
      form.computeLabel = (s) => editorT(this._hass, s.name);
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        onChange(ev.detail.value);
      });
      return form;
    }
    _setData(form, data) {
      if (JSON.stringify(form.data) === JSON.stringify(data)) return;
      form.data = data;
    }
    _labels() {
      const t = (k) => editorT(this._hass, k);
      this.querySelector(".dce-overview > summary").textContent = t("section_overview");
      this.querySelector(".dce-heading").textContent = t("section_containers");
      this.querySelector(".dce-add").textContent = "+ " + t("add_container");
      this.querySelector(".dce-note").textContent = t("note");
    }
    _applyHass() {
      const forms = [this._cardForm, this._overviewForm];
      this._rows.forEach((r) => forms.push(r.main, r.adv));
      forms.forEach((f) => { if (f.hass !== this._hass) f.hass = this._hass; });
      this._rows.forEach((r, i) => this._setRowName(r, this._containers()[i], i));
    }
    _pushData() {
      this._cardForm.hass = this._hass;
      this._overviewForm.hass = this._hass;
      this._setData(this._cardForm, editorPick(this._config, EDITOR_CARD_SCHEMA));
      this._setData(this._overviewForm, { ...(this._config.docker_overview || {}) });
    }
    _sync() {
      this._pushData();
      if (this._containers().length !== this._rows.length) this._renderRows(); else this._pushRowData();
    }
    _rowName(c, i) {
      if (c.name) return String(c.name);
      const id = c.status_entity || c.control_entity || c.switch_entity;
      return (id && this._hass?.states?.[id]?.attributes?.friendly_name) || id || editorT(this._hass, "container_n", { n: i + 1 });
    }
    _setRowName(row, c, i) {
      const text = this._rowName(c || {}, i);
      if (row.name.textContent !== text) row.name.textContent = text;
    }
    _renderRows() {
      const list = this.querySelector(".dce-list");
      list.textContent = "";
      this._rows = [];
      const containers = this._containers();
      containers.forEach((c, i) => list.appendChild(this._buildRow(i, containers.length)));
      this._pushRowData();
    }
    _buildRow(i, count) {
      const t = (k) => editorT(this._hass, k);
      const details = document.createElement("details");
      details.className = "dce-block dce-row";
      details.dataset.i = String(i);
      details.open = this._open.has(i);
      const sum = document.createElement("summary");
      sum.className = "dce-sum";
      const name = document.createElement("span");
      name.className = "dce-name";
      const actions = document.createElement("span");
      actions.className = "dce-actions";
      [["up", "▲", "move_up", i === 0], ["down", "▼", "move_down", i === count - 1], ["remove", "✕", "remove_container", false]]
        .forEach(([act, glyph, key, disabled]) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "dce-btn";
          b.dataset.act = act;
          b.textContent = glyph;
          b.title = t(key);
          b.setAttribute("aria-label", t(key));
          b.disabled = disabled;
          actions.appendChild(b);
        });
      sum.append(name, actions);
      const body = document.createElement("div");
      body.className = "dce-body";
      const main = this._makeForm(EDITOR_CONTAINER_SCHEMA, (v) => this._onContainerChange(i, EDITOR_CONTAINER_SCHEMA, v));
      const advanced = document.createElement("details");
      const advSum = document.createElement("summary");
      advSum.className = "dce-sub";
      advSum.textContent = t("advanced");
      const adv = this._makeForm(EDITOR_CONTAINER_ADVANCED_SCHEMA, (v) => this._onContainerChange(i, EDITOR_CONTAINER_ADVANCED_SCHEMA, v));
      advanced.append(advSum, adv);
      body.append(main, advanced);
      details.append(sum, body);
      this._rows.push({ main, adv, name });
      return details;
    }
    _pushRowData() {
      const containers = this._containers();
      this._rows.forEach((row, i) => {
        const c = containers[i] || {};
        row.main.hass = this._hass;
        row.adv.hass = this._hass;
        this._setData(row.main, editorPick(c, EDITOR_CONTAINER_SCHEMA));
        this._setData(row.adv, editorPick(c, EDITOR_CONTAINER_ADVANCED_SCHEMA));
        this._setRowName(row, c, i);
      });
    }
    // ── Change handling ──────────────────────────────────────────────────────
    _emit() {
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    }
    _onCardChange(value) {
      this._config = editorApply(this._config, EDITOR_CARD_SCHEMA, value);
      this._emit();
    }
    _onOverviewChange(value) {
      const next = editorApply(this._config.docker_overview || {}, EDITOR_OVERVIEW_SCHEMA, value);
      const config = { ...this._config };
      if (Object.keys(next).length) config.docker_overview = next; else delete config.docker_overview;
      this._config = config;
      this._emit();
    }
    _onContainerChange(i, schema, value) {
      const containers = this._containers().slice();
      if (!containers[i]) return;
      containers[i] = editorApply(containers[i], schema, value);
      this._setContainers(containers);
      this._emit();
    }
    /** Always writes the canonical `containers` array (the legacy singular key is dropped). */
    _setContainers(containers) {
      const config = { ...this._config };
      delete config.container;
      config.containers = containers;
      this._config = config;
    }
    _addContainer() {
      const containers = this._containers().concat([{}]);
      this._open.add(containers.length - 1);
      this._setContainers(containers);
      this._renderRows();
      this._emit();
    }
    _onListClick(e) {
      const btn = e.target.closest ? e.target.closest("button[data-act]") : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const row = btn.closest(".dce-row");
      const i = Number(row.dataset.i);
      const containers = this._containers().slice();
      const act = btn.dataset.act;
      if (act === "remove") {
        containers.splice(i, 1);
        this._open = new Set([...this._open].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)));
      } else {
        const j = act === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= containers.length) return;
        [containers[i], containers[j]] = [containers[j], containers[i]];
        const a = this._open.has(i);
        const b = this._open.has(j);
        this._open.delete(i); this._open.delete(j);
        if (a) this._open.add(j);
        if (b) this._open.add(i);
      }
      this._setContainers(containers);
      this._renderRows();
      this._emit();
    }
  }
  customElements.define(CARD_NAME, DockerCard);
  customElements.define(CARD_NAME + "-editor", DockerCardEditor);
})();
