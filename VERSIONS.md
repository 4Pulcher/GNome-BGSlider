# VERSIONS

All released versions of GNome-BGSlider live in [`versions/`](versions/).
The latest installable bundle is also provided at the repository root as
[`gnome-bgslider@4pulcher.zip`](gnome-bgslider@4pulcher.zip).

## 2.0 — GNOME Shell extension (current)

- **File:** [`versions/2.0/gnome-bgslider@4pulcher-2.0.zip`](versions/2.0/gnome-bgslider@4pulcher-2.0.zip)
- **Type:** native GNOME Shell extension (`gnome-bgslider@4pulcher`)
- **GNOME:** 45, 46, 47, 48, 49
- **Sources:** [`workspace/`](workspace/)
- **Highlights:**
  - Dedicated top-bar icon; click opens the popup
  - Popup: profile chooser, 256×256 wallpaper preview, scaling method
    sub-menu, previous / randomize / next / pause buttons, Settings…,
    About
  - Dynamic profiles (named collections of wallpaper folders),
    defaults: `User` (`~/Pictures/Wallpapers`) and `System`
    (`/usr/share/backgrounds`)
  - Settings window (GTK4 / libadwaita): profile selector, folder list,
    scaling method, Random switch (default off), Add/Modify/Remove
    Folder, New/Delete Profile, interval, subfolders, restore-original
  - About dialog: GitHub profile photo, name and version, author, link
    to github.com/4Pulcher
  - Sets `picture-uri` and `picture-uri-dark`
  - Compiles its GSettings schema on first run if needed

## 1.0 — Legacy bash script

- **File:** [`versions/1.0/GNomeBGSlider.sh`](versions/1.0/GNomeBGSlider.sh)
- **Type:** stand-alone bash script (by AIsin)
- **GNOME:** older releases (pre-45); still works outside the shell
- **Highlights:**
  - Scans `~/Afbeeldingen/Wallpapers` recursively (`globstar`)
  - Random wallpaper every 30 s via `gsettings`
  - Picture option `spanned`
  - Animated GIFs via ImageMagick `convert` (optional)
