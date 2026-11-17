import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heif',
]);

const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';

const SLIDESHOW_CHANGED = 'changed';
const SLIDESHOW_ERROR = 'error';

function expandPath(path) {
    if (!path || path.length === 0)
        return GLib.build_filenamev([GLib.get_home_dir(), 'Pictures', 'Wallpapers']);
    if (path === '~')
        return GLib.get_home_dir();
    if (path.startsWith('~/'))
        return GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    return path;
}

function baseName(path) {
    return path?.split('/').filter(p => p.length > 0).pop() ?? '';
}

const Slideshow = GObject.registerClass({
    Signals: {
        [SLIDESHOW_CHANGED]: {},
        [SLIDESHOW_ERROR]: {param_types: [GObject.TYPE_STRING]},
    },
}, class Slideshow extends GObject.Object {
    _init(settings) {
        super._init();
        this._settings = settings;
        this._background = new Gio.Settings({schema_id: BACKGROUND_SCHEMA});
        this._files = [];
        this._index = -1;
        this._paused = false;
        this._timeoutId = 0;
        this._originalUri = this._background.get_string('picture-uri');
        this._originalUriDark = this._background.settings_schema.has_key('picture-uri-dark')
            ? this._background.get_string('picture-uri-dark')
            : null;
    }

    get files() {
        return this._files;
    }

    get index() {
        return this._index;
    }

    get paused() {
        return this._paused;
    }

    get currentPath() {
        return this._index >= 0 ? this._files[this._index] : null;
    }

    get directory() {
        return expandPath(this._settings.get_string('directory'));
    }

    get interval() {
        return this._settings.get_uint('interval-seconds');
    }

    start() {
        this._applyPictureOptions();
        this.refresh();
        if (this._files.length > 0)
            this.next();
        this._restartTimer();
    }

    stop() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._settings.get_boolean('restore-original')) {
            this._background.set_string('picture-uri', this._originalUri);
            if (this._originalUriDark !== null)
                this._background.set_string('picture-uri-dark', this._originalUriDark);
            Gio.Settings.sync();
        }
    }

    refresh() {
        const dir = Gio.File.new_for_path(this.directory);
        const files = [];
        if (this._settings.get_boolean('recursive'))
            this._scanDirectory(dir, files, 0);
        else
            this._collectFiles(dir, files);
        files.sort((a, b) => a.localeCompare(b));

        const current = this.currentPath;
        this._files = files;
        if (current) {
            const kept = files.indexOf(current);
            if (kept >= 0)
                this._index = kept;
        }
        if (this._index >= files.length)
            this._index = files.length - 1;
    }

    next() {
        this._step(1);
    }

    previous() {
        this._step(-1);
    }

    setPaused(paused) {
        if (this._paused === paused)
            return;
        this._paused = paused;
        this._restartTimer();
        this.emit(SLIDESHOW_CHANGED);
    }

    togglePaused() {
        this.setPaused(!this._paused);
    }

    applyOptions() {
        this._applyPictureOptions();
    }

    _applyPictureOptions() {
        const options = this._settings.get_string('picture-options');
        this._background.set_string('picture-options', options);
    }

    _step(direction) {
        if (this._files.length === 0)
            return false;

        if (this._settings.get_boolean('shuffle') && this._files.length > 1) {
            let next = this._index;
            while (next === this._index)
                next = Math.floor(Math.random() * this._files.length);
            this._index = next;
        } else {
            this._index = (this._index + direction + this._files.length) % this._files.length;
        }

        this._applyCurrent();
        return true;
    }

    _applyCurrent() {
        const path = this.currentPath;
        if (!path)
            return;
        try {
            const uri = GLib.filename_to_uri(path, null);
            this._background.set_string('picture-uri', uri);
            if (this._background.settings_schema.has_key('picture-uri-dark'))
                this._background.set_string('picture-uri-dark', uri);
            this.emit(SLIDESHOW_CHANGED);
        } catch (error) {
            this.emit(SLIDESHOW_ERROR, error.message);
        }
    }

    _collectFiles(dir, files) {
        try {
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const name = info.get_name();
                if (info.get_file_type() === Gio.FileType.DIRECTORY)
                    continue;
                if (!IMAGE_EXTENSIONS.has(name.split('.').pop().toLowerCase()))
                    continue;
                files.push(dir.get_child(name).get_path());
            }
            enumerator.close(null);
        } catch (error) {
            this.emit(SLIDESHOW_ERROR, `${dir.get_path()}: ${error.message}`);
        }
    }

    _scanDirectory(dir, files, depth) {
        this._collectFiles(dir, files);
        if (depth >= 10)
            return;
        try {
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                if (info.get_file_type() === Gio.FileType.DIRECTORY)
                    this._scanDirectory(dir.get_child(info.get_name()), files, depth + 1);
            }
            enumerator.close(null);
        } catch {
        }
    }

    _restartTimer() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._paused)
            return;
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this.interval, () => {
            this.next();
            return GLib.SOURCE_CONTINUE;
        });
    }
});

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, _('BG Slider'), true);

        this._extension = extension;

        this.add_child(new St.Icon({
            icon_name: 'preferences-desktop-wallpaper-symbolic',
            style_class: 'system-status-icon',
        }));

        this.setMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP, 0));
        this.menu.connect('open-state-changed', () => this._sync());
        this._buildMenu();
        this._sync();
    }

    vfunc_event(event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const button = event.get_button();
            if (button === Clutter.BUTTON_SECONDARY)
                this.menu.toggle();
            else if (button === Clutter.BUTTON_PRIMARY)
                this._extension.showMainDialog();
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _buildMenu() {
        const slideshow = this._extension.slideshow;

        const header = new PopupMenu.PopupMenuItem(_('BG Slider'), {reactive: false});
        header.label.style = 'font-weight: bold;';
        this.menu.addMenuItem(header);

        this._runSwitch = new PopupMenu.PopupSwitchMenuItem(_('Slideshow running'), true);
        this._runSwitch.connect('toggled', (item, state) => slideshow.setPaused(!state));
        this.menu.addMenuItem(this._runSwitch);

        this._nextItem = new PopupMenu.PopupMenuItem(_('Next Wallpaper'));
        this._nextItem.connect('activate', () => slideshow.next());
        this.menu.addMenuItem(this._nextItem);

        this._previousItem = new PopupMenu.PopupMenuItem(_('Previous Wallpaper'));
        this._previousItem.connect('activate', () => slideshow.previous());
        this.menu.addMenuItem(this._previousItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const mainMenuItem = new PopupMenu.PopupMenuItem(_('Main Menu\u2026'));
        mainMenuItem.connect('activate', () => this._extension.showMainDialog());
        this.menu.addMenuItem(mainMenuItem);

        const settingsItem = new PopupMenu.PopupMenuItem(_('Settings\u2026'));
        settingsItem.connect('activate', () => this._extension.openPrefs());
        this.menu.addMenuItem(settingsItem);

        const aboutItem = new PopupMenu.PopupMenuItem(_('About'));
        aboutItem.connect('activate', () => this._extension.showAboutDialog());
        this.menu.addMenuItem(aboutItem);
    }

    _sync() {
        if (!this._runSwitch)
            return;
        const {slideshow} = this._extension;
        this._runSwitch.setToggleState(!slideshow.paused);
    }
});

const MainMenuDialog = GObject.registerClass(
class MainMenuDialog extends ModalDialog.ModalDialog {
    _init(extension) {
        super._init({destroyOnClose: false});

        this._extension = extension;
        const slideshow = extension.slideshow;

        const box = new St.BoxLayout({
            vertical: true,
            style: 'width: 420px; spacing: 12px;',
        });

        const title = new St.Label({
            text: _('BG Slider'),
            x_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 18px; font-weight: bold;',
        });
        box.add_child(title);

        this._statusLabel = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            style: 'text-align: center; opacity: 0.7;',
        });
        box.add_child(this._statusLabel);

        this._wallpaperLabel = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            ellipsize: Pango.EllipsizeMode.MIDDLE,
            style: 'text-align: center;',
        });
        box.add_child(this._wallpaperLabel);

        const controls = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 8px;',
        });
        this._previousButton = new St.Button({
            label: _('\u25C0  Previous'),
            style_class: 'button',
            can_focus: true,
        });
        this._previousButton.connect('clicked', () => slideshow.previous());
        controls.add_child(this._previousButton);

        this._pauseButton = new St.Button({
            style_class: 'button',
            can_focus: true,
        });
        this._pauseButton.connect('clicked', () => slideshow.togglePaused());
        controls.add_child(this._pauseButton);

        this._nextButton = new St.Button({
            label: _('Next  \u25B6'),
            style_class: 'button',
            can_focus: true,
        });
        this._nextButton.connect('clicked', () => slideshow.next());
        controls.add_child(this._nextButton);

        box.add_child(controls);

        this.contentLayout.add_child(box);

        this.setButtons([
            {
                label: _('Settings\u2026'),
                action: () => {
                    this.close();
                    extension.openPrefs();
                },
            },
            {
                label: _('Close'),
                action: () => this.close(),
                key: Clutter.KEY_Escape,
                default: true,
            },
        ]);
    }

    update() {
        const slideshow = this._extension.slideshow;
        const total = slideshow.files.length;
        const current = slideshow.currentPath;

        if (total === 0) {
            this._statusLabel.text = _('No wallpapers found');
            this._wallpaperLabel.text = slideshow.directory;
        } else {
            const position = slideshow.index + 1;
            const state = slideshow.paused ? _('paused') : _('running');
            this._statusLabel.text = _('Slideshow %s \u2014 image %d of %d').format(state, position, total);
            this._wallpaperLabel.text = baseName(current);
        }

        this._pauseButton.label = slideshow.paused ? _('\u25B6  Resume') : _('\u23F8  Pause');
    }
});

const AboutDialog = GObject.registerClass(
class AboutDialog extends ModalDialog.ModalDialog {
    _init(extension) {
        super._init({destroyOnClose: false});

        const box = new St.BoxLayout({
            vertical: true,
            style: 'width: 380px; spacing: 10px;',
        });

        const icon = new St.Icon({
            icon_name: 'preferences-desktop-wallpaper-symbolic',
            icon_size: 48,
            x_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(icon);

        const title = new St.Label({
            text: _('BG Slider'),
            x_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 18px; font-weight: bold; text-align: center;',
        });
        box.add_child(title);

        const rows = [
            _('Version: %s').format(extension.metadata.version ?? '2.0'),
            _('Timed wallpaper slideshow for GNOME 45+'),
            _('Based on GNomeBGSlider by AIsin'),
            _('License: GPL-3.0'),
            'github.com/4Pulcher/Gnome-BGSlider',
        ];
        for (const text of rows) {
            box.add_child(new St.Label({
                text,
                x_align: Clutter.ActorAlign.CENTER,
                style: 'text-align: center; opacity: 0.8;',
            }));
        }

        this.contentLayout.add_child(box);

        this.setButtons([
            {
                label: _('Close'),
                action: () => this.close(),
                key: Clutter.KEY_Escape,
                default: true,
            },
        ]);
    }
});

export default class GnomeBGSliderExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._slideshow = new Slideshow(this._settings);
        this._slideshowChangedId = this._slideshow.connect(SLIDESHOW_CHANGED, () => this._syncDialogs());
        this._slideshowErrorId = this._slideshow.connect(SLIDESHOW_ERROR, (_, message) => {
            console.warn(`[BG Slider] ${message}`);
        });

        this._settingsIds = [
            this._settings.connect('changed::directory', () => this._onDirectoryChanged()),
            this._settings.connect('changed::recursive', () => this._onDirectoryChanged()),
            this._settings.connect('changed::interval-seconds', () => this._slideshow._restartTimer()),
            this._settings.connect('changed::picture-options', () => this._slideshow.applyOptions()),
        ];

        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._mainDialog = null;
        this._aboutDialog = null;

        this._slideshow.start();
    }

    disable() {
        this._slideshow.stop();
        this._slideshow.disconnect(this._slideshowChangedId);
        this._slideshow.disconnect(this._slideshowErrorId);
        this._slideshow = null;

        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this._settingsIds = [];
        this._settings = null;

        this._mainDialog?.destroy();
        this._mainDialog = null;
        this._aboutDialog?.destroy();
        this._aboutDialog = null;

        this._indicator?.destroy();
        this._indicator = null;
    }

    get slideshow() {
        return this._slideshow;
    }

    showMainDialog() {
        if (!this._mainDialog)
            this._mainDialog = new MainMenuDialog(this);
        this._mainDialog.update();
        this._mainDialog.open(global.get_current_time());
    }

    showAboutDialog() {
        if (!this._aboutDialog)
            this._aboutDialog = new AboutDialog(this);
        this._aboutDialog.open(global.get_current_time());
    }

    _syncDialogs() {
        if (this._mainDialog?.state === ModalDialog.State.OPENED)
            this._mainDialog.update();
        this._indicator?._sync();
    }

    _onDirectoryChanged() {
        this._slideshow.refresh();
        if (this._slideshow.files.length === 0) {
            Main.notify(_('BG Slider'),
                _('No wallpapers found in %s').format(this._slideshow.directory));
        } else {
            this._slideshow.next();
        }
        this._syncDialogs();
    }
}
