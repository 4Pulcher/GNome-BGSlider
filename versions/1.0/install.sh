#!/bin/sh
# Install the legacy GNomeBGSlider.sh script into ~/.local/bin.
set -e

SRC="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEST="$HOME/.local/bin"

mkdir -p "$DEST"
cp "$SRC/GNomeBGSlider.sh" "$DEST/"
chmod +x "$DEST/GNomeBGSlider.sh"

echo "Installed to $DEST/GNomeBGSlider.sh"
echo "Edit the variables at the top of the script (Directory, Seconden,"
echo "Option), then run it in the background."
