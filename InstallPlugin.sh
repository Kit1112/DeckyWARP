#!/bin/bash
set +e

sudo echo "== Stopping DeckyWARP and related services =="

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

sudo echo "== Removing old plugin and dependencies =="

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

sudo echo "== Installing latest DeckyWARP plugin =="

PLUGIN_DIR="/home/deck/homebrew/plugins/DeckyWARP"
TMP_DIR="/tmp/deckywarp_install"
ZIP_URL="https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"

sudo mkdir -p "$TMP_DIR"
cd "$TMP_DIR" || exit 1

sudo echo "== Fetching latest release =="
ASSET_URL=$(sudo curl -s "$ZIP_URL" | sudo grep '"zipball_url":' | sudo cut -d '"' -f 4)
if [ -z "$ASSET_URL" ]; then
  sudo echo "ERROR: could not fetch asset URL"
  exit 1
fi

sudo echo "== Downloading zip =="
sudo curl -L -o latest.zip "$ASSET_URL" || exit 1
sudo unzip -qo latest.zip || exit 1

INNER_DIR=$(sudo find . -maxdepth 1 -type d -name "*DeckyWARP*" | head -n 1)
if [ ! -d "$INNER_DIR" ]; then
  sudo echo "ERROR: inner dir not found"
  exit 1
fi

sudo echo "== Copying to Decky plugin directory =="
sudo mkdir -p "$PLUGIN_DIR"
sudo cp -r "$INNER_DIR"/* "$PLUGIN_DIR"

sudo systemctl start plugin_loader.service || true

sudo echo "✅ DeckyWARP installed (with soft error tolerance)."
sudo echo "🔄 Please restart Steam or Decky if the plugin is not visible."
