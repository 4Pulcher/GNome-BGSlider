# GNome-BGSlider

A timed wallpaper slideshow for the GNOME desktop, rewritten as a native
**GNOME Shell extension** for GNOME **45, 46, 47, 48 and 49** (the old bash
script `GNomeBGSlider.sh` is still included for reference under *Legacy*).

## Features

- **Dedicated top-bar icon** (wallpaper symbol) in the panel.
- **Click the icon** (left or right) — opens the **popup**:
  - **Profile chooser**: `User` (your wallpapers folder,
    default `~/Pictures/Wallpapers`) and `System`
    (default `/usr/share/backgrounds`), shown with a radio dot.
  - **Preview frame (256×256)** of the current wallpaper, scaled
    according to the active picture option.
  - **Scaling selector**: sub-menu with all GNOME picture options
    (`none`, `wallpaper`, `centered`, `scaled`, `stretched`, `zoom`,
    `spanned`) — the preview updates instantly.
  - **Buttons**: previous, randomize, next, and pause/resume.
  - **Buttons**: `Settings…` and `About`.
- **Settings GUI** (GTK4 / libadwaita window):
  - **Profiles frame**:
    - Profile selector
    - List with the wallpaper folders included in the profile
    - **Scaling method** selector (all GNOME picture options) with a
      **Random** switch beside it (default off = alphabetical order)
    - Buttons: `Add Folder`, `Modify Folder`, `Remove Folder`
    - Buttons: `New Profile`, `Delete Profile`
  - Interval in seconds (5 s – 24 h)
  - Include subfolders (recursive scan, like the old `globstar` behaviour)
  - Restore your original wallpaper when the extension is disabled
- **About dialog**: your GitHub profile photo (256×256, loaded from
  github.com/4Pulcher), name and version, author, and a link button to
  [github.com/4Pulcher](https://github.com/4Pulcher).
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
| Click panel icon (left or right) | Popup: profile chooser, 256×256 preview, scaling selector, previous / randomize / next / pause, Settings…, About |
| Choose `User` or `System` | Switches the wallpapers folder used by the slideshow |
| Scaling sub-menu | Sets the picture option; preview updates instantly |
| Settings… | Profile folders, interval, shuffle, subfolders, picture options |
| Disable the extension | Timer stops; your previous wallpaper is restored (configurable) |

Supported image types: `jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp`, `svg`,
`avif`, `heif`. Animated GIFs are shown as a single frame (the shell cannot
animate them; the old script needed ImageMagick for this).

## Default folder

Profiles are dynamic: the defaults are `User` (`~/Pictures/Wallpapers`) and
`System` (`/usr/share/backgrounds`), and you can add your own profiles with
any number of folders in Settings. The original script used
`~/Afbeeldingen/Wallpapers` — simply add that folder to the User profile.

## Legacy script

`GNomeBGSlider.sh` is the original bash script (version 1.0). It still works
stand-alone, but the extension replaces it: no terminal, no ImageMagick, no
`gsettings` calls from cron — everything runs inside GNOME Shell with a GUI.

## Development

- `extension.js` — indicator, popup (profiles, preview, scaling, controls),
  About dialog and slideshow engine
- `prefs.js` — GTK4/libadwaita settings window
- `schemas/` — GSettings schema (`glib-compile-schemas schemas/` after edits)
- `metadata.json` — extension metadata (GNOME 45–49)

Tested with `gnome-extensions` on GNOME 45+; for older GNOME releases
(40–44) the legacy script remains the supported option.
