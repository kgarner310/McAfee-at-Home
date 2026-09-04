# Unreal Engine — install guide

Current engine version as of September 2026: **Unreal Engine 5.8**. Always grab
whatever the latest version is shown on Epic's site/launcher; nothing below
depends on the exact number.

## The one thing no script can do for you

Every legitimate way to get Unreal Engine goes through a **free Epic Games
account**. The download pages require signing in, and the source code lives in
a private GitHub repo that only unlocks after you link your GitHub account to
your Epic account. So the manual part is always: sign in and click the
download. Everything around that step is covered here or automated by the
scripts in [`../scripts/`](../scripts/).

> Never download the engine from a third-party mirror. It violates Epic's EULA
> and is a classic malware delivery vehicle — ironic for this repo.

## Before you start — the honest requirements

| Resource | Minimum to limp along | Comfortable |
|---|---|---|
| Free disk | ~100 GB | 150–250 GB (engine + a project + caches) |
| RAM | 16 GB | 32 GB |
| GPU | Vulkan/DX12-capable discrete GPU | NVIDIA RTX 2080 or better |
| CPU | Quad-core 2.5 GHz | 8+ cores |
| Time | A long download (tens of GB) | Start it before dinner |

A machine without a discrete GPU (most cloud VMs, thin laptops) will install
fine and then be miserable or unusable in the editor. Check first, download
second.

## Path A — Windows (the normal path, use this unless you have a reason not to)

1. Run `scripts/setup-unreal-windows.ps1` in PowerShell — it checks your free
   disk and installs the **Epic Games Launcher** via winget. (Or install the
   launcher manually from <https://www.unrealengine.com/download>.)
2. Open the Epic Games Launcher and sign in (create the free account if
   needed).
3. Left sidebar → **Unreal Engine** → top tab **Library**.
4. Click the **+** next to *Engine Versions*, pick the newest version, click
   **Install**. Choose an install drive with the disk headroom from the table
   above.
5. When it finishes, click **Launch** and create a blank project to confirm
   the editor opens.

## Path B — Linux desktop (pre-built binaries)

There is no Epic Games Launcher for Linux. Epic instead publishes a pre-built
zip (~25 GB download, ~60 GB extracted).

1. On the Linux machine, run a preflight check first:
   `./scripts/setup-unreal-linux.sh check`
2. Install system dependencies (Debian/Ubuntu):
   `./scripts/setup-unreal-linux.sh deps`
3. In a browser, sign in at <https://www.unrealengine.com/en-US/linux> and
   download the zip for the latest version.
4. Extract and register it:
   `./scripts/setup-unreal-linux.sh install ~/Downloads/Linux_Unreal_Engine_*.zip`
5. Launch from the desktop entry the script creates, or run the
   `.../Engine/Binaries/Linux/UnrealEditor` path it prints.

## Path C — Build from source (only if you need to modify the engine itself)

Skip this unless you specifically need engine changes; it costs 200+ GB of
disk and hours of compile time.

1. Create/sign in to your Epic account, then link your GitHub account:
   Epic account → **Apps and Accounts** → connect GitHub, and accept the
   invitation email to the private `EpicGames` GitHub org.
2. `git clone https://github.com/EpicGames/UnrealEngine` (404 = your accounts
   aren't linked yet; the repo is private).
3. Inside the clone: `./Setup.sh`, then `./GenerateProjectFiles.sh`, then
   `make` (Linux/Mac). On Windows run the `.bat` equivalents and build the
   `UE5` target in Visual Studio.

Official docs: [Linux quickstart](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-quickstart-for-unreal-engine)
· [Linux requirements](https://dev.epicgames.com/documentation/unreal-engine/linux-development-requirements-for-unreal-engine)

## Gotchas that eat an afternoon

- **Disk fills mid-install.** The installer needs roughly 2× the final size
  while unpacking. Clear space *before* starting.
- **Windows Defender / antivirus scanning the install** can multiply install
  and shader-compile times. Excluding the engine folder from real-time
  scanning speeds it up; that's a security trade-off you make knowingly, on a
  drive you trust.
- **First project open is slow.** Thousands of shaders compile on first run.
  That's normal, not a hang. Later opens are fast.
- **VMs and remote boxes without GPU passthrough** can't run the editor
  usefully. If you want cloud UE, you need a GPU instance and a remote
  desktop protocol — that's a different (and pricey) setup.
- **Multiple versions coexist fine.** Don't uninstall an old version an
  existing project depends on until the project migrates cleanly.
