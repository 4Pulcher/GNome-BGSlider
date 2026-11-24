# BG Slider 2.0 — GNOME Shell extension

Native GNOME Shell extension (`gnome-bgslider@4pulcher`) for GNOME
**45, 46, 47, 48 and 49**. Timed wallpaper slideshow with a top-bar popup,
profiles, preview and a libadwaita settings window.

## Files in this bundle

- `extension.js` — indicator, popup, About dialog, slideshow engine
- `prefs.js` — GTK4/libadwaita settings window
- `metadata.json` — extension metadata
- `schemas/` — GSettings schema
- `install.sh` — installs the bundle for the current user

## Install

From inside the extracted bundle:

```bash
./install.sh
```

Or without the script:

```bash
unzip gnome-bgslider@4pulcher.zip \
    -d ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher
gnome-extensions enable gnome-bgslider@4pulcher
```

`install.sh` compiles the GSettings schema when `glib-compile-schemas` is
available; otherwise the extension compiles it itself on first run.

## What it does

- Top-bar icon; clicking it opens a popup with a profile chooser
  (`User` / `System` by default), a 256×256 preview of the current
  wallpaper, a scaling-method sub-menu, and previous / randomize / next /
  pause buttons plus Settings… and About.
- Profiles are named lists of wallpaper folders, managed in Settings
  (Add/Modify/Remove Folder, New/Delete Profile).
- About dialog shows the GitHub profile photo, version, author and link.

See the repository root [README](../../README.md) for the full manual and
[VERSIONS](../../VERSIONS.md) for the release history.
