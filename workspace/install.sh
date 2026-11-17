#!/bin/sh
# Install BG Slider (gnome-bgslider@4pulcher) for the current user.
set -e

UUID="gnome-bgslider@4pulcher"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"
SRC="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if [ ! -f "$SRC/metadata.json" ]; then
    echo "Error: metadata.json not found next to install.sh" >&2
    exit 1
fi

mkdir -p "$DEST"
cp "$SRC/extension.js" "$SRC/prefs.js" "$SRC/metadata.json" "$DEST/"
cp -R "$SRC/schemas" "$DEST/"

if command -v glib-compile-schemas >/dev/null 2>&1; then
    glib-compile-schemas "$DEST/schemas/"
fi

if command -v gnome-extensions >/dev/null 2>&1; then
    if gnome-extensions enable "$UUID" 2>/dev/null; then
        echo "BG Slider installed and enabled."
        exit 0
    fi
    echo "BG Slider installed. Log out and back in, then run:"
    echo "  gnome-extensions enable $UUID"
else
    echo "BG Slider installed. Log out and back in, then enable it"
    echo "with the Extensions app."
fi
