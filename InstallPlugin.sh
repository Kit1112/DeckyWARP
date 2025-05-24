#!/bin/bash
# Удалили set -e — скрипт не будет завершаться при ошибках
set +e

echo "== Stopping DeckyWARP and related services =="

sudo systemctl stop plugin_loader.service || true
sudo systemctl stop warp-svc.service || true
sudo systemctl disable warp-svc.service || true
sudo systemctl reset-failed warp-svc.service || true

sudo systemctl --user stop warp-taskbar.service || true
sudo systemctl --user disable warp-taskbar.service || true
sudo systemctl --user reset-failed warp-taskbar.service || true

sudo pkill -f warp-taskbar || true
sudo pkill -f warp-tray || true
sudo pkill -f warp-client || true
sudo pkill -f warp-svc || true

echo "== Removing old plugin and dependencies =="

sudo steamos-readonly disable || true

sudo rm -rf /home/deck/homebrew/plugins/DeckyWARP || true
sudo rm -rf /home/deck/homebrew/plugins/decky-warp || true

sudo pacman -Rns --noconfirm cloudflare-warp-bin chaotic-keyring chaotic-mirrorlist || true
sudo sed -i '/\[chaotic-aur\]/,+1d' /etc/pacman.conf || true
sudo rm -rf /etc/pacman.d/gnupg || true

sudo pacman -Sc --noconfirm || true

sudo rm -f /tmp/.warp_installing /tmp/warp_install.log /tmp/warp_install.sh || true
sudo systemctl reset-failed warp-install.service || true

sudo rm -f /usr/share/applications/warp*.desktop || true
sudo rm -f /home/deck/.config/autostart/warp*.desktop || true

sudo steamos-readonly enable || true

echo "== Installing latest DeckyWARP plugin =="

PLUGIN_DIR="/home/deck/homebrew/plugins/DeckyWARP"
TMP_DIR="/tmp/deckywarp_install"
ZIP_URL="https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"

sudo mkdir -p "$TMP_DIR" || true
cd "$TMP_DIR" || exit 1

echo "== Fetching latest release =="
ASSET_URL=$(curl -s "$ZIP_URL" | grep '"zipball_url":' | cut -d '"' -f 4)
if [ -z "$ASSET_URL" ]; then
  echo "ERROR: could not fetch asset URL"
  exit 1
fi

echo "== Downloading zip =="
curl -L -o latest.zip "$ASSET_URL" || exit 1
unzip -qo latest.zip || exit 1

INNER_DIR=$(find . -maxdepth 1 -type d -name "*DeckyWARP*" | head -n 1)
if [ ! -d "$INNER_DIR" ]; then
  echo "ERROR: inner dir not found"
  exit 1
fi

echo "== Copying to Decky plugin directory =="
sudo mkdir -p "$PLUGIN_DIR" || true
sudo cp -r "$INNER_DIR"/* "$PLUGIN_DIR" || true

sudo systemctl start plugin_loader.service || true

echo "✅ DeckyWARP installed (with soft error tolerance)."
echo "🔄 Please restart Steam or Decky if the plugin is not visible."
