# GNome-BGSlider

A timed wallpaper slideshow for the GNOME desktop, rewritten as a native
**GNOME Shell extension** for GNOME **45, 46, 47, 48 and 49**.

## Repository layout

```
├── gnome-bgslider@4pulcher.zip   # ready-to-install extension bundle
├── workspace/                    # all sources
│   ├── extension.js              # indicator, popup, About, slideshow engine
│   ├── prefs.js                  # GTK4/libadwaita settings window
│   ├── metadata.json
│   └── schemas/                  # GSettings schema
├── versions/
│   ├── 1.0/GNomeBGSlider.sh      # legacy bash script (original, by AIsin)
│   └── 2.0/gnome-bgslider@4pulcher-2.0.zip
├── VERSIONS.md                   # release history
└── LICENSE                       # GPL-3.0
```

## Features

- **Dedicated top-bar icon** (wallpaper symbol) in the panel.
- **Click the icon** (left or right) — opens the **popup**:
  - **Profile chooser**: dynamic profiles, defaults `User`
    (`~/Pictures/Wallpapers`) and `System` (`/usr/share/backgrounds`),
    shown with a radio dot.
  - **Preview frame (256×256)** of the current wallpaper, scaled
    according to the active picture option.
  - **Scaling method**: sub-menu with all GNOME picture options
    (`none`, `wallpaper`, `centered`, `scaled`, `stretched`, `zoom`,
    `spanned`) — the preview updates instantly.
  - **Buttons**: previous, randomize, next, and pause/resume.
  - **Buttons**: `Settings…` and `About`.
- **Settings GUI** (GTK4 / libadwaita window):
  - **Profiles frame**:
    - Profile selector
    - List with the wallpaper folders included in the profile
    - **Scaling method** selector with a **Random** switch beside it
      (default off = alphabetical order)
    - Buttons: `Add Folder`, `Modify Folder`, `Remove Folder`
    - Buttons: `New Profile`, `Delete Profile`
  - Interval in seconds (5 s – 24 h)
  - Include subfolders (recursive scan, like the old `globstar` behaviour)
  - Restore your original wallpaper when the extension is disabled
- **About dialog**: GitHub profile photo (256×256, loaded from
  github.com/4Pulcher), name and version, author, and a link button to
  [github.com/4Pulcher](https://github.com/4Pulcher).
- Supports both `picture-uri` and `picture-uri-dark` (light/dark themes).

## Installation

### From the zip (recommended)

```bash
unzip gnome-bgslider@4pulcher.zip \
    -d ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher
gnome-extensions enable gnome-bgslider@4pulcher
```

Log out and back in (or restart GNOME Shell on X11 with `Alt+F2` → `r`).
The extension compiles its GSettings schema automatically on first run.

### From source

```bash
git clone https://github.com/4Pulcher/Gnome-BGSlider.git
cd Gnome-BGSlider
glib-compile-schemas workspace/schemas/
mkdir -p ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher
cp -r workspace/extension.js workspace/prefs.js workspace/metadata.json \
      workspace/schemas \
      ~/.local/share/gnome-shell/extensions/gnome-bgslider@4pulcher/
gnome-extensions enable gnome-bgslider@4pulcher
```

### As a zip you build yourself

```bash
cd workspace
glib-compile-schemas schemas/
zip -r ../gnome-bgslider@4pulcher.zip extension.js prefs.js metadata.json schemas
gnome-extensions install ../gnome-bgslider@4pulcher.zip --force
```

## Usage

| Action | Result |
| --- | --- |
| Click panel icon (left or right) | Popup: profile chooser, 256×256 preview, scaling selector, previous / randomize / next / pause, Settings…, About |
| Choose a profile | Switches to that profile's wallpaper folders |
| Scaling sub-menu | Sets the picture option; preview updates instantly |
| Settings… | Profiles, folders, scaling, random, interval, subfolders |
| Disable the extension | Timer stops; your previous wallpaper is restored (configurable) |

Supported image types: `jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp`, `svg`,
`avif`, `heif`. Animated GIFs are shown as a single frame (the shell cannot
animate them; the old script needed ImageMagick for this).

## Profiles

Profiles are dynamic: a profile is a named list of wallpaper folders, and
the slideshow uses the folders of the active profile. Defaults:

- **User** — `~/Pictures/Wallpapers`
- **System** — `/usr/share/backgrounds`

Add your own profiles and folders in Settings. The original script used
`~/Afbeeldingen/Wallpapers` — simply add that folder to the User profile.

## Legacy script

`versions/1.0/GNomeBGSlider.sh` is the original bash script (version 1.0).
It still works stand-alone on older GNOME releases, but the extension
replaces it: no terminal, no ImageMagick, no `gsettings` calls from cron —
everything runs inside GNOME Shell with a GUI.

## Development

- `workspace/extension.js` — indicator, popup (profiles, preview, scaling,
  controls), About dialog and slideshow engine
- `workspace/prefs.js` — GTK4/libadwaita settings window
- `workspace/schemas/` — GSettings schema (`glib-compile-schemas
  workspace/schemas/` after edits)
- `workspace/metadata.json` — extension metadata (GNOME 45–49)

Tested with `gnome-extensions` on GNOME 45+; for older GNOME releases
(40–44) the legacy script remains the supported option.
