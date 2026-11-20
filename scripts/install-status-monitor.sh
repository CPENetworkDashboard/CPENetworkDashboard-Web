#!/usr/bin/env bash
set -euo pipefail

# Run from a checkout on the collector server; secrets stay outside the repository.
if [[ "$(uname -s)" != Linux || "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root on Linux with systemd." >&2
  exit 1
fi
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != --enable ) ]]; then
  echo "Usage: sudo bash scripts/install-status-monitor.sh [--enable]" >&2
  exit 1
fi
command -v systemctl >/dev/null
command -v systemd-analyze >/dev/null
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
install_dir="${CPE_INSTALL_DIR:-/opt/cpe-status}"
node_bin="${CPE_NODE:-$(command -v node || true)}"
if [[ -n "$node_bin" && -x "$node_bin" ]]; then node_bin="$(readlink -f -- "$node_bin")"; fi
if [[ ! "$install_dir" =~ ^/[a-zA-Z0-9_./-]+$ || "$install_dir" == / || "$install_dir" == *..* ]]; then
  echo "CPE_INSTALL_DIR must be an absolute path without spaces or parent segments." >&2
  exit 1
fi
if [[ ! "$node_bin" =~ ^/[a-zA-Z0-9_./-]+$ || ! -x "$node_bin" ]]; then
  echo "Install Node 24 in a system path, or set CPE_NODE to its absolute executable path." >&2
  exit 1
fi
case "$install_dir:$node_bin" in
  /home/*|/root/*|*:/home/*|*:/root/*)
    echo "Use system paths outside /home and /root; the service protects home directories." >&2
    exit 1 ;;
esac
"$node_bin" -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)' || {
  echo "Node 24 or newer is required." >&2
  exit 1
}
if [[ "$install_dir" == "$repo_dir" || "$repo_dir" == "$install_dir/"* ]]; then
  echo "CPE_INSTALL_DIR must be separate from this checkout." >&2
  exit 1
fi

# Stop new timer activations before checking whether an observation is running.
timer_was_active=false
if systemctl is-active --quiet cpe-status.timer; then
  timer_was_active=true
  systemctl stop cpe-status.timer
fi
restore_timer() {
  if [[ "$timer_was_active" == true ]]; then systemctl start cpe-status.timer; fi
}
trap restore_timer EXIT
service_state="$(systemctl show cpe-status.service --property=ActiveState --value 2>/dev/null || true)"
case "$service_state" in
  active|activating|deactivating|reloading)
    echo "A check is running. Retry after it completes." >&2
    exit 1 ;;
esac

install -d -m 0755 "$install_dir/scripts" "$install_dir/src/utils"
install -m 0644 "$repo_dir/scripts/collect-status.mjs" "$install_dir/scripts/collect-status.mjs"
install -m 0644 "$repo_dir/src/utils/status.ts" "$install_dir/src/utils/status.ts"
install -d -m 0700 /etc/cpe-status
if [[ ! -e /etc/cpe-status/collector.env ]]; then
  install -m 0600 "$repo_dir/deploy/systemd/collector.env.example" /etc/cpe-status/collector.env
fi
chmod 0600 /etc/cpe-status/collector.env
chown root:root /etc/cpe-status/collector.env
sed -e "s|/usr/bin/node|$node_bin|g" -e "s|/opt/cpe-status|$install_dir|g" \
  "$repo_dir/deploy/systemd/cpe-status.service" > /etc/systemd/system/cpe-status.service
chmod 0644 /etc/systemd/system/cpe-status.service
install -m 0644 "$repo_dir/deploy/systemd/cpe-status.timer" /etc/systemd/system/cpe-status.timer
systemd-analyze verify /etc/systemd/system/cpe-status.service /etc/systemd/system/cpe-status.timer
systemctl daemon-reload
if [[ "${1:-}" == --enable ]]; then
  if ! grep -Eq '^CPE_STATUS_TOKEN=.+$' /etc/cpe-status/collector.env; then
    echo "Set the existing EdgeKV CPE_STATUS_TOKEN in /etc/cpe-status/collector.env, then rerun with --enable." >&2
    exit 1
  fi
  systemctl reset-failed cpe-status.service
  systemctl enable --now cpe-status.timer
  systemctl start cpe-status.service
  systemctl list-timers --all cpe-status.timer
else
  echo "Installed. Set CPE_STATUS_TOKEN in /etc/cpe-status/collector.env, then rerun with --enable."
fi
