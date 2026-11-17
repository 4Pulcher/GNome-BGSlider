import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
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
const GITHUB_PROFILE_URI = 'https://github.com/4Pulcher';
const GITHUB_AVATAR_URI = 'https://github.com/4Pulcher.png?size=256';
const PREVIEW_SIZE = 256;

const SLIDESHOW_CHANGED = 'changed';
const SLIDESHOW_ERROR = 'error';

const PROFILES = [
    {id: 'user', label: _('User'), key: 'user-directory'},
    {id: 'system', label: _('System'), key: 'system-directory'},
];

const SCALING_OPTIONS = [
    ['none', _('None')],
    ['wallpaper', _('Wallpaper (tile)')],
    ['centered', _('Centered')],
    ['scaled', _('Scaled')],
    ['stretched', _('Stretched')],
    ['zoom', _('Zoom')],
    ['spanned', _('Spanned')],
];

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

function pixbufToContent(pixbuf) {
    const image = new Clutter.Image();
    const format = pixbuf.get_has_alpha()
        ? Cogl.PixelFormat.RGBA_8888
        : Cogl.PixelFormat.RGB_888;
    image.set_data(
        pixbuf.get_pixels(),
        format,
        pixbuf.get_width(),
        pixbuf.get_height(),
        pixbuf.get_rowstride());
    return image;
}

function imageGravity(options) {
    switch (options) {
    case 'zoom':
    case 'spanned':
    case 'wallpaper':
        return Clutter.ContentGravity.COVER;
    case 'stretched':
        return Clutter.ContentGravity.FILL;
    default:
        return Clutter.ContentGravity.CONTAIN;
    }
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

    get profile() {
        return this._settings.get_string('active-profile');
    }

    get directory() {
        const profile = PROFILES.find(p => p.id === this.profile) ?? PROFILES[0];
        return expandPath(this._settings.get_string(profile.key));
    }

    get interval() {
        return this._settings.get_uint('interval-seconds');
    }

    get pictureOptions() {
        return this._settings.get_string('picture-options');
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
        this.emit(SLIDESHOW_CHANGED);
    }

    next() {
        this._step(1);
    }

    previous() {
        this._step(-1);
    }

    randomize() {
        if (this._files.length === 0)
            return;
        let next = this._index;
        if (this._files.length > 1) {
            while (next === this._index)
                next = Math.floor(Math.random() * this._files.length);
        }
        this._index = next;
        this._applyCurrent();
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
        this._background.set_string('picture-options', this.pictureOptions);
    }

    _step(direction) {
        if (this._files.length === 0)
            return;

        if (this._settings.get_boolean('shuffle') && this._files.length > 1) {
            this.randomize();
            return;
        }
        this._index = (this._index + direction + this._files.length) % this._files.length;
        this._applyCurrent();
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

const WallpaperPreview = GObject.registerClass(
class WallpaperPreview extends St.Widget {
    _init(slideshow) {
        super._init({
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'background-color: rgb(25, 25, 25);'
                + 'border: 1px solid rgba(255, 255, 255, 0.15);'
                + 'border-radius: 8px;',
        });
        this._slideshow = slideshow;
        this._path = null;
        this._loadToken = 0;
        this.connectObject(SLIDESHOW_CHANGED, () => this.update(), this);
        this.update();
    }

    update() {
        const path = this._slideshow.currentPath;
        if (path === this._path)
            return;
        this._path = path;
        if (!path) {
            this.content = null;
            return;
        }
        const token = ++this._loadToken;
        const file = Gio.File.new_for_path(path);
        GdkPixbuf.Pixbuf.new_from_file_at_size_async(file, PREVIEW_SIZE * 2, PREVIEW_SIZE * 2, null,
            (source, result) => {
                if (token !== this._loadToken)
                    return;
                try {
                    const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size_async_finish(result);
                    this.content = pixbufToContent(pixbuf);
                    this.content_gravity = imageGravity(this._slideshow.pictureOptions);
                } catch (error) {
                    console.warn(`[BG Slider] preview failed: ${error.message}`);
                }
            });
    }
});

const AboutAvatar = GObject.registerClass(
class AboutAvatar extends St.Widget {
    _init() {
        super._init({
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'background-color: rgb(35, 35, 35);'
                + 'border: 1px solid rgba(255, 255, 255, 0.2);'
                + 'border-radius: 8px;',
        });
        this._fallbackAvatar();
        this._loadAvatar();
    }

    _loadAvatar() {
        let message;
        try {
            message = Soup.Message.new('GET', GITHUB_AVATAR_URI);
        } catch {
            return;
        }
        if (!message)
            return;

        const session = new Soup.Session({timeout: 15});
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (source, result) => {
            try {
                const bytes = source.send_and_read_finish(result);
                if (message.get_status() !== Soup.Status.OK || !bytes) {
                    this._fallbackAvatar();
                    return;
                }
                const stream = Gio.MemoryStream.new_from_bytes(bytes);
                GdkPixbuf.Pixbuf.new_from_stream_async(stream, null, (pixbufSource, pixbufResult) => {
                    try {
                        const pixbuf = GdkPixbuf.Pixbuf.new_from_stream_async_finish(pixbufResult);
                        this.content = pixbufToContent(pixbuf);
                        this.content_gravity = Clutter.ContentGravity.COVER;
                        this.remove_child(this._fallbackIcon);
                    } catch {
                        this._fallbackAvatar();
                    }
                });
            } catch {
                this._fallbackAvatar();
            }
        });
    }

    _fallbackAvatar() {
        this._fallbackIcon = new St.Icon({
            icon_name: 'avatar-default-symbolic',
            icon_size: 128,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._fallbackIcon);
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
        this.menu.connect('open-state-changed', (_, open) => {
            if (open)
                this._sync();
        });
        this._extension.slideshow.connectObject(SLIDESHOW_CHANGED, () => this._sync(), this);

        this._buildMenu();
        this._sync();
    }

    _buildMenu() {
        const settings = this._extension.settings;
        const slideshow = this._extension.slideshow;

        this._profileItems = new Map();
        for (const profile of PROFILES) {
            const item = new PopupMenu.PopupMenuItem(profile.label);
            item.connect('activate', () => settings.set_string('active-profile', profile.id));
            this._profileItems.set(profile.id, item);
            this.menu.addMenuItem(item);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const previewItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style: 'padding: 4px 12px;',
        });
        this._preview = new WallpaperPreview(slideshow);
        previewItem.add_child(this._preview);
        this.menu.addMenuItem(previewItem);

        this._scalingItems = new Map();
        this._scalingMenu = new PopupMenu.PopupSubMenuMenuItem('', true);
        for (const [value, label] of SCALING_OPTIONS) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => settings.set_string('picture-options', value));
            this._scalingItems.set(value, item);
            this._scalingMenu.menu.addMenuItem(item);
        }
        this.menu.addMenuItem(this._scalingMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const controlsItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style: 'padding: 4px 12px;',
        });
        const controls = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 12px;',
        });
        this._previousButton = this._iconButton('media-skip-backward-symbolic', () => slideshow.previous());
        this._randomButton = this._iconButton('media-playlist-shuffle-symbolic', () => slideshow.randomize());
        this._nextButton = this._iconButton('media-skip-forward-symbolic', () => slideshow.next());
        this._pauseButton = this._iconButton('media-playback-pause-symbolic', () => slideshow.togglePaused());
        controls.add_child(this._previousButton);
        controls.add_child(this._randomButton);
        controls.add_child(this._nextButton);
        controls.add_child(this._pauseButton);
        controlsItem.add_child(controls);
        this.menu.addMenuItem(controlsItem);

        const actionsItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style: 'padding: 4px 12px;',
        });
        const actions = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 12px;',
        });
        const settingsButton = new St.Button({
            label: _('Settings\u2026'),
            style_class: 'button',
            can_focus: true,
        });
        settingsButton.connect('clicked', () => {
            this.menu.close();
            this._extension.openPrefs();
        });
        const aboutButton = new St.Button({
            label: _('About'),
            style_class: 'button',
            can_focus: true,
        });
        aboutButton.connect('clicked', () => {
            this.menu.close();
            this._extension.showAboutDialog();
        });
        actions.add_child(settingsButton);
        actions.add_child(aboutButton);
        actionsItem.add_child(actions);
        this.menu.addMenuItem(actionsItem);
    }

    _iconButton(iconName, callback) {
        const button = new St.Button({
            style_class: 'button',
            can_focus: true,
            child: new St.Icon({icon_name: iconName, icon_size: 16}),
        });
        button.connect('clicked', callback);
        return button;
    }

    _sync() {
        const settings = this._extension.settings;
        const slideshow = this._extension.slideshow;
        const profile = settings.get_string('active-profile');

        for (const [id, item] of this._profileItems)
            item.setOrnament(id === profile ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);

        const options = settings.get_string('picture-options');
        for (const [value, label] of SCALING_OPTIONS) {
            this._scalingItems.get(value)
                .setOrnament(value === options ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
            if (value === options)
                this._scalingMenu.label.text = _('Scaling: %s').format(label);
        }

        this._pauseButton.child.icon_name = slideshow.paused
            ? 'media-playback-start-symbolic'
            : 'media-playback-pause-symbolic';
    }
});

const AboutDialog = GObject.registerClass(
class AboutDialog extends ModalDialog.ModalDialog {
    _init(extension) {
        super._init({destroyOnClose: false});

        const box = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'width: 380px; spacing: 12px;',
        });

        box.add_child(new AboutAvatar());

        const version = extension.metadata['version-name']
            ?? String(extension.metadata.version ?? '2.0');
        const title = new St.Label({
            text: _('BG Slider %s').format(version),
            x_align: Clutter.ActorAlign.CENTER,
            style: 'font-size: 18px; font-weight: bold; text-align: center;',
        });
        box.add_child(title);

        const author = new St.Label({
            text: _('Author: AIsin (4Pulcher)'),
            x_align: Clutter.ActorAlign.CENTER,
            style: 'text-align: center; opacity: 0.8;',
        });
        box.add_child(author);

        const linkButton = new St.Button({
            label: 'github.com/4Pulcher',
            style_class: 'button',
            can_focus: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        linkButton.connect('clicked', () => {
            try {
                Gio.AppInfo.launch_default_for_uri(GITHUB_PROFILE_URI, null);
            } catch (error) {
                console.warn(`[BG Slider] could not open link: ${error.message}`);
            }
        });
        box.add_child(linkButton);

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
        this._slideshowErrorId = this._slideshow.connect(SLIDESHOW_ERROR, (_, message) => {
            console.warn(`[BG Slider] ${message}`);
        });

        this._settingsIds = [
            this._settings.connect('changed::active-profile', () => this._onSourceChanged()),
            this._settings.connect('changed::user-directory', () => this._onSourceChanged()),
            this._settings.connect('changed::system-directory', () => this._onSourceChanged()),
            this._settings.connect('changed::recursive', () => this._onSourceChanged()),
            this._settings.connect('changed::interval-seconds', () => this._slideshow._restartTimer()),
            this._settings.connect('changed::picture-options', () => this._slideshow.applyOptions()),
        ];

        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._aboutDialog = null;

        this._slideshow.start();
    }

    disable() {
        this._slideshow.stop();
        this._slideshow.disconnect(this._slideshowErrorId);
        this._slideshow = null;

        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this._settingsIds = [];
        this._settings = null;

        this._aboutDialog?.destroy();
        this._aboutDialog = null;

        this._indicator?.destroy();
        this._indicator = null;
    }

    get settings() {
        return this._settings;
    }

    get slideshow() {
        return this._slideshow;
    }

    showAboutDialog() {
        if (!this._aboutDialog)
            this._aboutDialog = new AboutDialog(this);
        this._aboutDialog.open(global.get_current_time());
    }

    _onSourceChanged() {
        this._slideshow.refresh();
        if (this._slideshow.files.length === 0) {
            Main.notify(_('BG Slider'),
                _('No wallpapers found in %s').format(this._slideshow.directory));
        } else {
            this._slideshow.next();
        }
    }
}
