# GNome-BGSlider 1.0 — Legacy script

The original stand-alone bash script by AIsin. It changes the GNOME desktop
wallpaper at a fixed interval, outside of GNOME Shell.

## Files

- `GNomeBGSlider.sh` — the script
- `install.sh` — copies the script to `~/.local/bin`

## Install

```bash
./install.sh
```

Or run it directly from this folder.

## Usage

Edit the variables at the top of `GNomeBGSlider.sh`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `Directory` | `$HOME/Afbeeldingen/Wallpapers` | folder scanned for images (recursively) |
| `Seconden` | `30` | seconds each wallpaper is shown |
| `Option` | `spanned` | picture options (`none`, `wallpaper`, `centered`, `scaled`, `stretched`, `zoom`, `spanned`) |

Then run it in the background:

```bash
GNomeBGSlider.sh &
```

Stop it with `Ctrl+C` (foreground) or `kill` (background); it cleans up its
temporary GIF frames on exit.

## Requirements

- GNOME desktop with `gsettings`
- Optional: ImageMagick `convert` for animated GIFs
- Supported image types: `gif`, `jpg`, `jpeg`, `png`

## Superseded

This script is superseded by version 2.0, a native GNOME Shell extension
for GNOME 45+ — see the repository root [README](../../README.md) and
[VERSIONS](../../VERSIONS.md).
