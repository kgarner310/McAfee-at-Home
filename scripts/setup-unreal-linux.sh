#!/usr/bin/env bash
#
# Unreal Engine setup helper for Linux desktops.
#
# Epic requires signing in to an Epic Games account to download the engine, so
# no script can fetch it for you. This handles everything around that one
# manual step. Download the zip (signed in) from:
#   https://www.unrealengine.com/en-US/linux
#
# Usage:
#   ./setup-unreal-linux.sh check                Preflight hardware/software check
#   ./setup-unreal-linux.sh deps                 Install system deps (Debian/Ubuntu, uses sudo)
#   ./setup-unreal-linux.sh install ZIP [DIR]    Extract Epic's zip, fix permissions,
#                                                create a desktop launcher
#
# Run as your normal user, not with sudo (deps invokes sudo itself where needed).
set -euo pipefail

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; RESET=''
fi
ok()   { printf '%s[ OK ]%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '%s[WARN]%s %s\n' "$YELLOW" "$RESET" "$1"; }
fail() { printf '%s[FAIL]%s %s\n' "$RED" "$RESET" "$1"; }

usage() { sed -n 's/^# \{0,3\}//p' "$0" | sed -n '3,15p'; }

# Free space in GiB for the filesystem containing $1.
free_gib() { df -Pk "$1" | awk 'NR==2 {printf "%d", $4/1024/1024}'; }

cmd_check() {
  local problems=0

  local cores
  cores=$(nproc)
  if [ "$cores" -ge 8 ]; then ok "CPU cores: $cores"
  elif [ "$cores" -ge 4 ]; then warn "CPU cores: $cores (works; 8+ is comfortable)"
  else fail "CPU cores: $cores (Epic's floor is a quad-core)"; problems=1; fi

  # A 16 GB machine reports ~15 GiB MemTotal (kernel overhead), so thresholds
  # sit slightly below the marketing sizes.
  local ram_gib
  ram_gib=$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo)
  if [ "$ram_gib" -ge 30 ]; then ok "RAM: ${ram_gib} GiB"
  elif [ "$ram_gib" -ge 15 ]; then warn "RAM: ${ram_gib} GiB (usable; Epic recommends 32 GB)"
  else fail "RAM: ${ram_gib} GiB (below 16 GB the editor will struggle)"; problems=1; fi

  local disk_gib
  disk_gib=$(free_gib "$HOME")
  if [ "$disk_gib" -ge 150 ]; then ok "Free disk under \$HOME: ${disk_gib} GiB"
  elif [ "$disk_gib" -ge 100 ]; then warn "Free disk under \$HOME: ${disk_gib} GiB (enough for the engine, tight once you add projects)"
  else fail "Free disk under \$HOME: ${disk_gib} GiB (need ~100 GiB minimum: ~25 GiB zip + ~60 GiB extracted)"; problems=1; fi

  if command -v lspci >/dev/null 2>&1; then
    local gpus
    gpus=$(lspci 2>/dev/null | grep -Ei 'vga|3d|display' || true)
    if [ -z "$gpus" ]; then
      fail "No GPU detected — the editor needs a Vulkan-capable discrete GPU"; problems=1
    elif printf '%s' "$gpus" | grep -qi 'nvidia\|amd\|radeon'; then
      ok "GPU: $(printf '%s' "$gpus" | head -1 | cut -d: -f3- | sed 's/^ //')"
    else
      warn "GPU found but looks integrated-only: $(printf '%s' "$gpus" | head -1 | cut -d: -f3- | sed 's/^ //')"
    fi
  else
    warn "lspci not available; can't detect GPU (install pciutils, or check manually)"
  fi

  if command -v vulkaninfo >/dev/null 2>&1; then
    if vulkaninfo --summary >/dev/null 2>&1; then ok "Vulkan is working"
    else warn "vulkaninfo present but errored — GPU driver likely missing/misconfigured"; fi
  else
    warn "vulkaninfo not installed (run: $0 deps) — Vulkan is required to run the editor"
  fi

  if command -v unzip >/dev/null 2>&1; then ok "unzip available"
  else warn "unzip not installed (run: $0 deps)"; fi

  echo
  if [ "$problems" -eq 0 ]; then
    echo "Preflight passed. Next: sign in and download the Linux zip from"
    echo "  https://www.unrealengine.com/en-US/linux"
    echo "then run: $0 install <path-to-zip>"
  else
    echo "This machine fails one or more hard requirements — fix those before downloading ~25 GiB."
    return 1
  fi
}

cmd_deps() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "This helper only automates Debian/Ubuntu. Install equivalents of:"
    echo "  unzip vulkan-tools libvulkan1 pciutils build-essential clang git"
    return 1
  fi
  sudo apt-get update
  sudo apt-get install -y unzip vulkan-tools libvulkan1 pciutils build-essential clang git
  ok "Dependencies installed (source builds fetch the rest themselves via Setup.sh)"
}

cmd_install() {
  local zip="${1:-}"
  if [ -z "$zip" ]; then echo "Usage: $0 install ZIP [DIR]"; return 1; fi
  if [ ! -f "$zip" ]; then fail "Not found: $zip"; return 1; fi
  command -v unzip >/dev/null 2>&1 || { fail "unzip is required (run: $0 deps)"; return 1; }

  local base dir
  base=$(basename "$zip" .zip)
  dir="${2:-$HOME/$base}"
  if [ -e "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ]; then
    fail "Target exists and is not empty: $dir (pass a different DIR)"; return 1
  fi

  # Extraction needs roughly 2.5x the zip size free at the target.
  local zip_gib need_gib have_gib
  zip_gib=$(du -k "$zip" | awk '{printf "%d", $1/1024/1024}')
  need_gib=$(( zip_gib * 5 / 2 ))
  mkdir -p "$dir"
  have_gib=$(free_gib "$dir")
  if [ "$have_gib" -lt "$need_gib" ]; then
    fail "Only ${have_gib} GiB free at $dir; extracting a ${zip_gib} GiB zip needs ~${need_gib} GiB"
    rmdir "$dir" 2>/dev/null || true
    return 1
  fi

  echo "Extracting to $dir (this takes a while)..."
  unzip -q "$zip" -d "$dir"

  local editor
  editor=$(find "$dir" -type f -name UnrealEditor -path '*/Engine/Binaries/Linux/*' 2>/dev/null | head -1)
  if [ -z "$editor" ]; then
    fail "Extraction finished but Engine/Binaries/Linux/UnrealEditor was not found."
    echo "Check that the zip is Epic's Linux engine archive from unrealengine.com/en-US/linux."
    return 1
  fi
  # Epic's zips sometimes lose the executable bits.
  chmod -R u+x "$(dirname "$editor")" 2>/dev/null || true
  ok "Editor binary: $editor"

  local apps="$HOME/.local/share/applications"
  mkdir -p "$apps"
  cat > "$apps/unreal-editor.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Unreal Editor ($base)
Exec=$editor
Path=$(dirname "$editor")
Terminal=false
Categories=Development;
EOF
  ok "Desktop launcher created: $apps/unreal-editor.desktop"

  echo
  echo "Done. Launch from your app menu ('Unreal Editor') or run:"
  echo "  $editor"
  echo "First launch compiles thousands of shaders — slow once, fast after."
}

case "${1:-}" in
  check)   cmd_check ;;
  deps)    cmd_deps ;;
  install) shift; cmd_install "$@" ;;
  *)       usage; exit 1 ;;
esac
