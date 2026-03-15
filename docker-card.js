/*
 * Docker Card
 * A minimal Lovelace custom card to monitor and control Docker containers.
 * Inspired by vineetchoudhary/lovelace-docker-card
 */

(function () {
  const CARD_NAME = "docker-card";
  const CARD_DESCRIPTION = "Modern Docker container overview with start/stop toggles and restart actions.";
  const DEFAULT_LANGUAGE = "en";
  const DEFAULT_TRANSLATIONS = {
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
      images: "Images",
      docker: "Docker",
      os: "OS",
      running_total_aria: "Open running containers details",
      images_aria: "Open Docker images details",
      docker_aria: "Open Docker version details",
      os_aria: "Open operating system details",
    },
    container: { image: "Image" },
    aria: {
      open_status_details: "Open Docker status details",
      collapse_containers: "Collapse container list",
      expand_containers: "Expand container list",
    },
    resources: { cpu: "CPU", memory: "Memory" },
    actions: {
      start: "start",
      stop: "stop",
      restart: "Restart",
      start_container: "Start container",
      stop_container: "Stop container",
    },
    notifications: {
      starting: "Starting {name}…",
      stopping: "Stopping {name}…",
      failed_start: "Failed to start {name}. Check logs.",
      failed_stop: "Failed to stop {name}. Check logs.",
      restarting: "Restarting {name}…",
      failed_restart: "Failed to restart {name}.",
      missing_toggle: "No service configured to {action} {name}.",
      missing_restart: "No restart service configured for {name}.",
    },
    status: {
      online: "Online", offline: "Offline", idle: "Idle",
      running: "Running", stopped: "Stopped", unknown: "Unknown",
      starting: "Starting", degraded: "Degraded", paused: "Paused",
    },
  };

  const TRANSLATION_CACHE = new Map([[DEFAULT_LANGUAGE, DEFAULT_TRANSLATIONS]]);
  const TRANSLATION_PROMISES = new Map();

  const MODULE_BASE_URL = (() => {
    if (typeof document === "undefined") return undefined;
    const script = document.currentScript;
    if (script && script.src) {
      try {
        const url = new URL(script.src, window.location.href);
        url.hash = ""; url.search = "";
        url.pathname = url.pathname.replace(/[^/]+$/, "");
        return url.toString();
      } catch (e) { console.warn("docker-card: Unable to determine base URL", e); }
    }
    return undefined;
  })();

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
    }

    setConfig(config) {
      if (!config) throw new Error("Missing configuration for docker-card");
      const nc = { ...config };
      if (nc.stopped_color && !nc.not_running_color) nc.not_running_color = nc.stopped_color;
      const containers = this._normalizeContainers(nc.containers ?? nc.container);
      this.config = {
        running_states: ["running", "on", "started", "up"],
        stopped_states: ["stopped", "off", "exited", "down", "inactive"],
        running_color: "var(--state-active-color, #2e8f57)",
        not_running_color: "var(--state-error-color, #c22040)",
        ...nc,
        containers,
      };
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

    set hass(hass) { this._hass = hass; this.render(); }

    getCardSize() { return 4; }

    // ── CSS ──────────────────────────────────────────────────────────────────

    _css() {
      // Responsive column formula: fills up to --dc-max-cols columns,
      // auto-reducing when container is too narrow.
      // min item width = 180px ensures graceful wrapping on small screens.
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
        ha-switch[disabled] { opacity: 0.5; }

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
      const cols = this._columns;

      const status = this._computeOverallStatus();
      const pillClasses = ["dc-pill", status.cssClass, status.tone === "not_running" ? "not-running" : "", status.entityId ? "actionable" : ""].filter(Boolean).join(" ");

      this.innerHTML = `
        <div class="dc-card" style="--dc-rc:${rc};--dc-nrc:${nrc};--dc-max-cols:${cols}">
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
    }

    _renderOverview() {
      const oc = this.config.docker_overview;
      if (!oc || typeof oc !== "object") return "";

      const get = (key) => {
        const id = oc[key];
        const e = id ? this._getEntity(id) : undefined;
        return { entityId: id, state: e?.state };
      };

      const items = [];

      const running = get("containers_running");
      const total = get("container_count");
      const rv = `${this._fmtState(running.state)} / ${this._fmtState(total.state)}`;
      if (!this._isBlank(rv)) {
        const rc = this._parseIntState(running.state);
        const tc = this._parseIntState(total.state);
        const cls = (typeof rc === "number" && typeof tc === "number" && rc !== tc) ? "not-running" : "running";
        items.push({ label: this._t("overview.running_total"), value: rv, badge: "RT", cls, entityId: running.entityId, aria: this._t("overview.running_total_aria") });
      }

      const images = get("image_count");
      const iv = this._fmtState(images.state);
      if (!this._isBlank(iv)) items.push({ label: this._t("overview.images"), value: iv, badge: "IMG", entityId: images.entityId, aria: this._t("overview.images_aria") });

      const docker = get("docker_version");
      const dv = this._fmtState(docker.state);
      if (!this._isBlank(dv)) items.push({ label: this._t("overview.docker"), value: dv, badge: "DOC", entityId: docker.entityId, aria: this._t("overview.docker_aria") });

      const osn = get("operating_system");
      const osv = get("operating_system_version");
      const osl = this._fmtState(osn.state);
      const osvl = this._fmtState(osv.state);
      let osVal = osl !== "—" && osvl !== "—" ? `${osl} · ${osvl}` : osl !== "—" ? osl : osvl !== "—" ? osvl : "";
      if (!this._isBlank(osVal)) items.push({ label: this._t("overview.os"), value: osVal, badge: "OS", entityId: osv.entityId || osn.entityId, aria: this._t("overview.os_aria") });

      if (!items.length) return "";

      return `<div class="dc-overview">${items.map((item) => `
        <div class="dc-ov-item${item.entityId ? " actionable" : ""}"
          ${item.entityId ? `role="button" tabindex="0" aria-label="${this._esc(item.aria || "")}" data-more-info="${item.entityId}"` : ""}>
          <div class="dc-ov-badge">${item.badge}</div>
          <div class="dc-ov-text">
            <div class="dc-ov-label">${this._esc(item.label)}</div>
            <div class="dc-ov-value${item.cls ? " " + item.cls : ""}">${this._esc(item.value)}</div>
          </div>
        </div>`).join("")}</div>`;
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

    _renderRow(c) {
      const key = this._containerKey(c);
      const si = this._containerStatus(c);
      const pending = this._pending.has(key);
      const rc = c.running_color || this.config.running_color;
      const nrc = c.not_running_color || c.stopped_color || this.config.not_running_color;
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
            healthy:   { icon: "mdi:heart-pulse",     color: "#2e8f57" },
            unhealthy: { icon: "mdi:heart-broken",    color: "#c22040" },
            starting:  { icon: "mdi:heart-half-full", color: "#f4b942" },
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

      let resHtml = "";
      const cpuE = c.cpu_entity ? this._getEntity(c.cpu_entity) : undefined;
      const memE = c.memory_entity ? this._getEntity(c.memory_entity) : undefined;
      const cpuV = cpuE ? this._fmtPct(cpuE.state) : null;
      const memV = memE ? this._fmtPct(memE.state) : null;
      if (cpuV || memV) {
        resHtml = `<div class="dc-resources">
          ${cpuV ? `<div class="dc-res-item"><span class="dc-res-label">${this._t("resources.cpu")}:</span><span>${cpuV}</span></div>` : ""}
          ${memV ? `<div class="dc-res-item"><span class="dc-res-label">${this._t("resources.memory")}:</span><span>${memV}</span></div>` : ""}
        </div>`;
      }

      const tapAction = this._normalizeAction(c.tap_action);
      const holdAction = this._normalizeAction(c.hold_action);
      const isActionable = (tapAction?.action && tapAction.action !== "none") || (holdAction?.action && holdAction.action !== "none");

      return `
        <div class="dc-row ${si.cssClass}${pending ? " pending" : ""}${isActionable ? " actionable" : ""}"
          data-key="${key}"
          style="--dc-rc:${rc};--dc-nrc:${nrc}"
          ${isActionable ? `role="button" tabindex="0" aria-label="${name}"` : ""}>
          <div class="dc-info">
            <div class="dc-name">${iconHtml}<span>${name}</span></div>
            <div class="dc-state-row">
              <div class="dc-status ${si.cssClass}">${this._esc(si.label)}</div>
              ${healthHtml}
            </div>
            ${imageHtml}
            ${resHtml}
          </div>
          <div class="dc-actions">
            <ha-switch data-key="${key}"
              ${si.isRunning ? "checked" : ""}
              ${!si.canToggle || pending ? "disabled" : ""}
              title="${si.isRunning ? this._t("actions.stop_container") : this._t("actions.start_container")}">
            </ha-switch>
            <button class="dc-restart" data-key="${key}" ${!si.canRestart || pending ? "disabled" : ""}>
              ${this._t("actions.restart")}
            </button>
          </div>
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
          if (e.key === "Enter" && tapAction) { e.preventDefault(); this._handleAction(tapAction, defaultEntity); }
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
      const norm = rawState ? rawState.toLowerCase() : undefined;
      const isRunning = norm ? runningStates.includes(norm) : false;
      const isStopped = norm ? stoppedStates.includes(norm) : false;
      const cssClass = isRunning ? "running" : isStopped ? "stopped" : "unknown";
      const label = this._prettyStatus(rawState, { runningStates, stoppedStates });
      const controlEntityId = container.control_entity || container.switch_entity;
      const toggleCap = this._toggleCap(controlEntityId, container.control_domain || container.switch_domain);
      const canToggle = Boolean(toggleCap || (container.start_service && container.stop_service));
      const canRestart = Boolean(this._getRestartService(container));
      return { entityId: stateEntityId, rawState, label, cssClass, isRunning, canToggle, canRestart };
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
      if (running.includes(v)) return this._t("status.running");
      if (stopped.includes(v)) return this._t("status.stopped");
      const trans = { starting:"status.starting", degraded:"status.degraded", paused:"status.paused", unknown:"status.unknown", idle:"status.idle" };
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

    _getRestartService(container) {
      if (!container) return undefined;
      if (container.restart_entity) {
        const cap = this._restartCap(container.restart_entity, container.restart_domain);
        if (cap) return { domain: cap.domain, service: cap.service, data: { entity_id: cap.entity_id } };
      }
      return this._normalizeSvc(container.restart_service);
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

    // ── Toggle / Restart ─────────────────────────────────────────────────────

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

    _fmtPct(value) {
      if (value === undefined || value === null) return null;
      const s = value.toString().toLowerCase();
      if (s === "unknown" || s === "unavailable" || s === "") return null;
      const n = parseFloat(value);
      if (isNaN(n)) return null;
      return `${n.toFixed(1)}%`;
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

    // ── Translations ──────────────────────────────────────────────────────────

    _t(key, replacements) {
      if (!key) return "";
      const language = this._hass?.selectedLanguage || this._hass?.language || DEFAULT_LANGUAGE;
      this._maybeLoadTranslations(language);
      const translations = TRANSLATION_CACHE.get(language) || TRANSLATION_CACHE.get(DEFAULT_LANGUAGE) || DEFAULT_TRANSLATIONS;
      const raw = this._getValue(translations, key) || this._getValue(DEFAULT_TRANSLATIONS, key) || key;
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

    _maybeLoadTranslations(language) {
      if (!language || language === DEFAULT_LANGUAGE) return;
      if (TRANSLATION_CACHE.has(language) || TRANSLATION_PROMISES.has(language)) return;
      if (!MODULE_BASE_URL) return;
      let url;
      try { url = new URL(`translations/${language}.json`, MODULE_BASE_URL).toString(); } catch { return; }
      const p = fetch(url)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { if (data && typeof data === "object") { TRANSLATION_CACHE.set(language, data); this.render(); } })
        .catch((e) => console.warn(`docker-card: Failed to load ${language} translations`, e))
        .finally(() => TRANSLATION_PROMISES.delete(language));
      TRANSLATION_PROMISES.set(language, p);
    }
  }

  customElements.define(CARD_NAME, DockerCard);
})();
