#!/bin/bash
set -e

echo "== Stopping DeckyWARP and related services =="

sudo systemctl stop plugin_loader.service
sudo systemctl stop warp-svc.service
sudo systemctl disable warp-svc.service
sudo systemctl reset-failed warp-svc.service

sudo systemctl --user stop warp-taskbar.service || true
sudo systemctl --user disable warp-taskbar.service || true
sudo systemctl --user reset-failed warp-taskbar.service || true

sudo pkill -f warp-taskbar || true
sudo pkill -f warp-tray || true
sudo pkill -f warp-client || true
sudo pkill -f warp-svc || true

echo "== Removing old plugin and dependencies =="

sudo steamos-readonly disable

sudo rm -rf /home/deck/homebrew/plugins/DeckyWARP
sudo rm -rf /home/deck/homebrew/plugins/decky-warp

sudo pacman -Rns --noconfirm cloudflare-warp-bin chaotic-keyring chaotic-mirrorlist || true
sudo sed -i '/\[chaotic-aur\]/,+1d' /etc/pacman.conf || true
sudo rm -rf /etc/pacman.d/gnupg

sudo pacman -Sc --noconfirm || true

sudo rm -f /tmp/.warp_installing /tmp/warp_install.log /tmp/warp_install.sh
sudo systemctl reset-failed warp-install.service

sudo rm -f /usr/share/applications/warp*.desktop
sudo rm -f /home/deck/.config/autostart/warp*.desktop

sudo steamos-readonly enable

echo "== Installing latest DeckyWARP plugin =="

PLUGIN_DIR="/home/deck/homebrew/plugins/DeckyWARP"
TMP_DIR="/tmp/deckywarp_install"
ZIP_URL="https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"

sudo mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo "== Fetching latest release =="
ASSET_URL=$(curl -s "$ZIP_URL" | grep '"zipball_url":' | cut -d '"' -f 4)
[ -z "$ASSET_URL" ] && echo "ERROR: could not fetch asset URL" && exit 1

echo "== Downloading zip =="
curl -L -o latest.zip "$ASSET_URL"
unzip -qo latest.zip

INNER_DIR=$(find . -maxdepth 1 -type d -name "*DeckyWARP*" | head -n 1)
[ ! -d "$INNER_DIR" ] && echo "ERROR: inner dir not found" && exit 1

echo "== Copying to Decky plugin directory =="
sudo mkdir -p "$PLUGIN_DIR"
sudo cp -r "$INNER_DIR"/* "$PLUGIN_DIR"

sudo systemctl start plugin_loader.service

echo "✅ DeckyWARP installed successfully."
echo "🔄 Please restart Steam or Decky if the plugin is not visible."