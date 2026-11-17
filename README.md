# GNome-BGSlider

A timed wallpaper slideshow for the GNOME desktop, rewritten as a native
**GNOME Shell extension** for GNOME **45, 46, 47, 48 and 49** (the old bash
script `GNomeBGSlider.sh` is still included for reference under *Legacy*).

## Features

- **Dedicated top-bar icon** (wallpaper symbol) in the panel.
- **Left-click the icon** — opens the **Main Menu GUI**: slideshow state,
  current wallpaper, and Previous / Pause / Next controls.
- **Right-click the icon** — opens the menu with **Main Menu…**, **Settings…**
  and **About**, plus quick slideshow controls:
  - Slideshow running (pause / resume switch)
  - Next / Previous wallpaper
- **Settings GUI** (GTK4 / libadwaita window):
  - Wallpaper folder (folder picker)
  - Interval in seconds (5 s – 24 h)
  - Random (shuffle) or alphabetical order
  - Include subfolders (recursive scan, like the old `globstar` behaviour)
  - Picture options (`zoom`, `spanned`, `scaled`, … — as in the old script)
  - Restore your original wallpaper when the extension is disabled
- **About dialog** with version, author, license and link.
- Supports both `picture-uri` and `picture-uri-dark` (light/dark themes).

## Installation

### From source

```bash
git clone https://github.com/4Pulcher/Gnome-BGSlider.git
cd Gnome-BGSlider
glib-compile-schemas schemas/
mkdir -p ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher
cp -r extension.js prefs.js metadata.json schemas \
   ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher/
```

Then log out and back in (or restart GNOME Shell on X11 with
`Alt+F2` → `r`), and enable it:

```bash
gnome-extensions enable gnome-bgslider@4pulcher
```

### As a zip

```bash
git clone https://github.com/4Pulcher/Gnome-BGSlider.git
cd Gnome-BGSlider
glib-compile-schemas schemas/
zip -r gnome-bgslider@4pulcher.zip \
    extension.js prefs.js metadata.json schemas
gnome-extensions install gnome-bgslider@4pulcher.zip --force
```

## Usage

| Action | Result |
| --- | --- |
| Left-click panel icon | Main Menu GUI (status, current wallpaper, Previous / Pause / Next) |
| Right-click panel icon | Menu: Main Menu…, Settings…, About + slideshow controls |
| Settings… | Folder, interval, shuffle, subfolders, picture options |
| Disable the extension | Timer stops; your previous wallpaper is restored (configurable) |

Supported image types: `jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp`, `svg`,
`avif`, `heif`. Animated GIFs are shown as a single frame (the shell cannot
animate them; the old script needed ImageMagick for this).

## Default folder

The default wallpaper folder is `~/Pictures/Wallpapers`. Change it in the
Settings window, or put your images there. The original script used
`~/Afbeeldingen/Wallpapers` — simply select that folder once in Settings.

## Legacy script

`GNomeBGSlider.sh` is the original bash script (version 1.0). It still works
stand-alone, but the extension replaces it: no terminal, no ImageMagick, no
`gsettings` calls from cron — everything runs inside GNOME Shell with a GUI.

## Development

- `extension.js` — indicator, menus, dialogs and slideshow engine
- `prefs.js` — GTK4/libadwaita settings window
- `schemas/` — GSettings schema (`glib-compile-schemas schemas/` after edits)
- `metadata.json` — extension metadata (GNOME 45–49)

Tested with `gnome-extensions` on GNOME 45+; for older GNOME releases
(40–44) the legacy script remains the supported option.
