import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const PICTURE_OPTIONS = [
    'none',
    'wallpaper',
    'centered',
    'scaled',
    'stretched',
    'zoom',
    'spanned',
];

// Raw strings; translated at runtime because module-scope gettext is
// not allowed ("gettext can only be called from extensions").
const PICTURE_OPTION_LABELS = [
    'None',
    'Wallpaper (tile)',
    'Centered',
    'Scaled',
    'Stretched',
    'Zoom',
    'Spanned',
];

const DEFAULT_PROFILES = [
    {name: 'User', directories: ['~/Pictures/Wallpapers']},
    {name: 'System', directories: ['/usr/share/backgrounds']},
];

export default class GnomeBGSliderPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._window = window;
        this._ensureSchemaCompiled();
        this._settings = this.getSettings();
        this._profiles = this._loadProfiles();
        this._updating = false;

        const page = new Adw.PreferencesPage({
            title: _('Slideshow'),
            icon_name: 'preferences-desktop-wallpaper-symbolic',
        });

        const profilesGroup = new Adw.PreferencesGroup({
            title: _('Profiles'),
            description: _('A profile is a named collection of wallpaper folders. The slideshow uses the folders of the active profile.'),
        });

        this._profileSelector = new Adw.ComboRow({
            title: _('Profile'),
        });
        this._profileSelector.connect('notify::selected', () => this._onProfileSelected());
        profilesGroup.add(this._profileSelector);

        this._dirList = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.SINGLE,
            css_classes: ['boxed-list'],
        });
        this._dirList.connect('row-selected', () => this._onRowSelected());
        const listFrame = new Gtk.Frame({child: this._dirList});
        listFrame.margin_top = 6;
        profilesGroup.add(listFrame);

        this._scalingRow = new Adw.ComboRow({
            title: _('Scaling method'),
            subtitle: _('How the wallpaper fills the screen'),
            model: Gtk.StringList.new(PICTURE_OPTION_LABELS.map(label => _(label))),
        });
        const currentIndex = PICTURE_OPTIONS.indexOf(this._settings.get_string('picture-options'));
        this._scalingRow.selected = currentIndex === -1 ? 5 : currentIndex;
        this._scalingRow.connect('notify::selected', () =>
            this._settings.set_string('picture-options', PICTURE_OPTIONS[this._scalingRow.selected]));
        profilesGroup.add(this._scalingRow);

        this._shuffleRow = this._buildSwitchRow(
            _('Random'), _('Off shows wallpapers in alphabetical order'), 'shuffle');
        profilesGroup.add(this._shuffleRow);

        const folderButtons = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_top: 6,
            homogeneous: true,
        });
        this._addButton = new Gtk.Button({label: _('Add Folder')});
        this._addButton.connect('clicked', () => this._onAddFolder());
        this._modifyButton = new Gtk.Button({label: _('Modify Folder')});
        this._modifyButton.connect('clicked', () => this._onModifyFolder());
        this._removeButton = new Gtk.Button({label: _('Remove Folder')});
        this._removeButton.connect('clicked', () => this._onRemoveFolder());
        folderButtons.append(this._addButton);
        folderButtons.append(this._modifyButton);
        folderButtons.append(this._removeButton);
        profilesGroup.add(folderButtons);

        const profileButtons = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_top: 6,
            homogeneous: true,
        });
        this._newProfileButton = new Gtk.Button({label: _('New Profile')});
        this._newProfileButton.connect('clicked', () => this._onNewProfile());
        this._deleteProfileButton = new Gtk.Button({label: _('Delete Profile')});
        this._deleteProfileButton.connect('clicked', () => this._onDeleteProfile());
        profileButtons.append(this._newProfileButton);
        profileButtons.append(this._deleteProfileButton);
        profilesGroup.add(profileButtons);

        page.add(profilesGroup);

        const slideshowGroup = new Adw.PreferencesGroup({
            title: _('Slideshow'),
            description: _('Automatically change the desktop wallpaper.'),
        });

        const intervalRow = Adw.SpinRow.new_with_range(5, 86400, 5);
        intervalRow.title = _('Interval (seconds)');
        intervalRow.subtitle = _('How long each wallpaper is shown');
        this._settings.bind('interval-seconds', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        slideshowGroup.add(intervalRow);

        slideshowGroup.add(this._buildSwitchRow(_('Include subfolders'), null, 'recursive'));

        slideshowGroup.add(this._buildSwitchRow(
            _('Restore original wallpaper'),
            _('Put back the wallpaper you had before enabling BG Slider'),
            'restore-original'));

        page.add(slideshowGroup);
        window.add(page);

        window.add(this._buildAboutPage());

        this._refreshProfileSelector();
        this._refreshDirList();
    }

    _buildSwitchRow(title, subtitle, key) {
        const row = new Adw.ActionRow({title});
        if (subtitle)
            row.subtitle = subtitle;
        const toggle = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        this._settings.bind(key, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        row.add_suffix(toggle);
        row.activatable_widget = toggle;
        return row;
    }

    _ensureSchemaCompiled() {
        try {
            this.getSettings();
            return;
        } catch {
        }
        try {
            const proc = Gio.Subprocess.new(
                ['glib-compile-schemas', GLib.build_filenamev([this.path, 'schemas'])],
                Gio.SubprocessFlags.NONE);
            proc.wait_check(null);
        } catch (error) {
            console.warn(`[BG Slider] could not compile schemas: ${error.message}`);
        }
    }

    _buildAboutPage() {
        const aboutPage = new Adw.PreferencesPage({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('BG Slider'),
            description: _('Timed wallpaper slideshow for GNOME 45+, rewritten from the GNomeBGSlider shell script.'),
        });

        const versionRow = new Adw.ActionRow({title: _('Version')});
        versionRow.add_suffix(new Gtk.Label({label: '2.0', valign: Gtk.Align.CENTER}));
        aboutGroup.add(versionRow);

        const authorRow = new Adw.ActionRow({title: _('Author')});
        authorRow.add_suffix(new Gtk.Label({label: 'AIsin (4Pulcher)', valign: Gtk.Align.CENTER}));
        aboutGroup.add(authorRow);

        const licenseRow = new Adw.ActionRow({title: _('License')});
        licenseRow.add_suffix(new Gtk.Label({label: 'GPL-3.0', valign: Gtk.Align.CENTER}));
        aboutGroup.add(licenseRow);

        const linkRow = new Adw.ActionRow({title: _('Source code')});
        const linkButton = new Gtk.LinkButton({
            label: 'github.com/4Pulcher/Gnome-BGSlider',
            uri: 'https://github.com/4Pulcher/Gnome-BGSlider',
            valign: Gtk.Align.CENTER,
        });
        linkRow.add_suffix(linkButton);
        aboutGroup.add(linkRow);

        aboutPage.add(aboutGroup);
        return aboutPage;
    }

    _loadProfiles() {
        try {
            const parsed = JSON.parse(this._settings.get_string('profiles-json'));
            if (Array.isArray(parsed)) {
                const profiles = parsed.filter(p => p && typeof p.name === 'string' && Array.isArray(p.directories));
                if (profiles.length > 0)
                    return profiles;
            }
        } catch {
        }
        return JSON.parse(JSON.stringify(DEFAULT_PROFILES));
    }

    _saveProfiles() {
        this._settings.set_string('profiles-json', JSON.stringify(this._profiles));
    }

    _currentProfile() {
        const active = this._settings.get_string('active-profile');
        return this._profiles.find(p => p.name === active)
            ?? this._profiles[this._profileSelector.selected]
            ?? this._profiles[0];
    }

    _refreshProfileSelector() {
        this._updating = true;
        this._profileSelector.model = Gtk.StringList.new(this._profiles.map(p => p.name));
        const active = this._settings.get_string('active-profile');
        const index = this._profiles.findIndex(p => p.name === active);
        this._profileSelector.selected = index === -1 ? 0 : index;
        this._updating = false;
        this._deleteProfileButton.sensitive = this._profiles.length > 1;
    }

    _onProfileSelected() {
        if (this._updating)
            return;
        const profile = this._profiles[this._profileSelector.selected];
        if (!profile)
            return;
        this._settings.set_string('active-profile', profile.name);
        this._refreshDirList();
    }

    _refreshDirList() {
        let row = this._dirList.get_row_at_index(0);
        while (row) {
            this._dirList.remove(row);
            row = this._dirList.get_row_at_index(0);
        }
        const profile = this._currentProfile();
        if (!profile)
            return;
        for (const directory of profile.directories) {
            const item = new Adw.ActionRow({title: directory});
            this._dirList.append(item);
        }
    }

    _selectedDirectoryIndex() {
        const row = this._dirList.get_selected_row();
        return row ? row.get_index() : -1;
    }

    _onRowSelected() {
        const selected = this._selectedDirectoryIndex() !== -1;
        this._modifyButton.sensitive = selected;
        this._removeButton.sensitive = selected;
    }

    _chooseFolder(callback) {
        const chooser = new Gtk.FileChooserNative({
            title: _('Select wallpaper folder'),
            action: Gtk.FileChooserAction.SELECT_FOLDER,
            transient_for: this._window,
            modal: true,
        });
        chooser.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const file = chooser.get_file();
                if (file)
                    callback(file.get_path());
            }
        });
        chooser.show();
    }

    _onAddFolder() {
        this._chooseFolder(path => {
            const profile = this._currentProfile();
            if (!profile || profile.directories.includes(path))
                return;
            profile.directories.push(path);
            this._saveProfiles();
            this._refreshDirList();
        });
    }

    _onModifyFolder() {
        const index = this._selectedDirectoryIndex();
        const profile = this._currentProfile();
        if (index === -1 || !profile)
            return;
        this._chooseFolder(path => {
            if (profile.directories.includes(path))
                return;
            profile.directories[index] = path;
            this._saveProfiles();
            this._refreshDirList();
        });
    }

    _onRemoveFolder() {
        const index = this._selectedDirectoryIndex();
        const profile = this._currentProfile();
        if (index === -1 || !profile)
            return;
        profile.directories.splice(index, 1);
        this._saveProfiles();
        this._refreshDirList();
        this._onRowSelected();
    }

    _onNewProfile() {
        const entry = new Gtk.Entry({activates_default: true});
        const dialog = new Adw.MessageDialog({
            heading: _('New Profile'),
            body: _('Enter a name for the new profile.'),
            transient_for: this._window,
            modal: true,
            extra_child: entry,
        });
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('ok', _('Create'));
        dialog.set_response_appearance('ok', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('ok');
        dialog.connect('response', (_, response) => {
            if (response !== 'ok')
                return;
            const name = entry.text.trim();
            if (name.length === 0 || this._profiles.some(p => p.name === name))
                return;
            this._profiles.push({name, directories: []});
            this._settings.set_string('active-profile', name);
            this._saveProfiles();
            this._refreshProfileSelector();
            this._refreshDirList();
        });
        dialog.present();
    }

    _onDeleteProfile() {
        if (this._profiles.length <= 1)
            return;
        const profile = this._currentProfile();
        if (!profile)
            return;
        const dialog = new Adw.MessageDialog({
            heading: _('Delete Profile'),
            body: _('Delete profile "%s" and its folder list?').format(profile.name),
            transient_for: this._window,
            modal: true,
        });
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('delete', _('Delete'));
        dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.connect('response', (_, response) => {
            if (response !== 'delete')
                return;
            const wasActive = this._settings.get_string('active-profile') === profile.name;
            this._profiles = this._profiles.filter(p => p !== profile);
            if (wasActive)
                this._settings.set_string('active-profile', this._profiles[0].name);
            this._saveProfiles();
            this._refreshProfileSelector();
            this._refreshDirList();
        });
        dialog.present();
    }
}

