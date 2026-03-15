# Docker Card Extended

A simple Lovelace card that lets you monitor and control your Docker containers without leaving Home Assistant.

## Highlights

- Compact overview of Docker host stats (counts, version, OS, daemon state)
- Live container list with status badges and start/stop actions
- Optional restart button per container for quick recovery
- Theme-aware styling with configurable running vs not-running colors
- Works out of the box with Portainer entities or any toggle-friendly domain
- Optional tap/hold actions on each container row to trigger more-info, URLs, or service calls
- Responsive multi-column layout that adapts to screen size

## Installation

1. In Home Assistant, open **HACS → Frontend → ⋮ → Custom repositories**.
2. Paste this repository URL, choose **Dashboard**, and click **Add**.
3. Search for **Docker Card** under **Frontend**, open the entry, then click **Download**.
4. Reload Lovelace resources (or restart Home Assistant) so the card is available.
5. If HACS does not add it automatically, register `/hacsfiles/docker-card/docker-card.js` as a Lovelace resource.

## Example configuration

```yaml
grid_options:
  columns: full
type: custom:docker-card
title: Docker @ MyServer
containers_expanded: true
columns: 3
docker_overview:
  container_count: sensor.docker_containers_total
  containers_running: sensor.docker_containers_running
  containers_stopped: sensor.docker_containers_stopped
  docker_version: sensor.docker_version
  image_count: sensor.docker_images
  operating_system: sensor.host_os
  operating_system_version: sensor.host_os_version
  status: binary_sensor.docker_daemon_status
running_color: "var(--state-active-color)"
not_running_color: "#c22040"
containers:
  - name: Home Assistant
    status_entity: sensor.docker_home_assistant_state
    control_entity: switch.home_assistant_behallare
    restart_entity: button.home_assistant_restart_container
    cpu_entity: sensor.home_assistant_cpu_anvandning_totalt
    memory_entity: sensor.home_assistant_minnesanvandning_i_procent
    image_version_entity: sensor.docker_home_assistant_image
    health_entity: sensor.docker_home_assistant_health
    icon: mdi:home-assistant
    tap_action:
      action: more-info
      entity: sensor.docker_home_assistant_state
  - name: Deconz
    status_entity: sensor.docker_deconz_state
    control_entity: switch.deconz_behallare
    restart_entity: button.deconz_restart_container
    cpu_entity: sensor.deconz_cpu_anvandning_totalt
    memory_entity: sensor.deconz_minnesanvandning_i_procent
    image_version_entity: sensor.docker_deconz_image
    health_entity: sensor.docker_deconz_health
    icon: mdi:zigbee
```
