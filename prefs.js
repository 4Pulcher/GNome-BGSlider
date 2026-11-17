import Adw from 'gi://Adw';
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

export default class GnomeBGSliderPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('Slideshow'),
            icon_name: 'preferences-desktop-wallpaper-symbolic',
        });

        const slideshowGroup = new Adw.PreferencesGroup({
            title: _('Profiles'),
            description: _('Each profile has its own wallpapers folder. Switch profiles from the top-bar popup.'),
        });

        for (const [key, title] of [
            ['user-directory', _('User profile folder')],
            ['system-directory', _('System profile folder')],
        ]) {
            const row = new Adw.ActionRow({
                title,
                subtitle: this._displayDirectory(settings, key),
            });
            const chooseButton = new Gtk.Button({
                label: _('Choose\u2026'),
                valign: Gtk.Align.CENTER,
            });
            chooseButton.connect('clicked', () => {
                const chooser = new Gtk.FileChooserNative({
                    title: _('Select wallpaper folder'),
                    action: Gtk.FileChooserAction.SELECT_FOLDER,
                    transient_for: window,
                    modal: true,
                });
                chooser.connect('response', (dialog, response) => {
                    if (response === Gtk.ResponseType.ACCEPT) {
                        const file = chooser.get_file();
                        if (file)
                            settings.set_string(key, file.get_path());
                    }
                });
                chooser.show();
            });
            row.add_suffix(chooseButton);
            settings.connect(`changed::${key}`, () =>
                row.set_subtitle(this._displayDirectory(settings, key)));
            slideshowGroup.add(row);
        }

        page.add(slideshowGroup);

        const slideshowSettingsGroup = new Adw.PreferencesGroup({
            title: _('Slideshow'),
            description: _('Automatically change the desktop wallpaper.'),
        });

        const intervalRow = Adw.SpinRow.new_with_range(5, 86400, 5);
        intervalRow.title = _('Interval (seconds)');
        intervalRow.subtitle = _('How long each wallpaper is shown');
        settings.bind('interval-seconds', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        slideshowSettingsGroup.add(intervalRow);

        const shuffleRow = new Adw.SwitchRow({
            title: _('Random order'),
            subtitle: _('Off shows wallpapers in alphabetical order'),
        });
        settings.bind('shuffle', shuffleRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        slideshowSettingsGroup.add(shuffleRow);

        const recursiveRow = new Adw.SwitchRow({
            title: _('Include subfolders'),
        });
        settings.bind('recursive', recursiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        slideshowSettingsGroup.add(recursiveRow);

        const restoreRow = new Adw.SwitchRow({
            title: _('Restore original wallpaper'),
            subtitle: _('Put back the wallpaper you had before enabling BG Slider'),
        });
        settings.bind('restore-original', restoreRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        slideshowSettingsGroup.add(restoreRow);

        page.add(slideshowSettingsGroup);

        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });

        const optionsRow = new Adw.ComboRow({
            title: _('Picture options'),
            subtitle: _('How the wallpaper fills the screen'),
            model: Gtk.StringList.new([
                _('None'),
                _('Wallpaper (tile)'),
                _('Centered'),
                _('Scaled'),
                _('Stretched'),
                _('Zoom'),
                _('Spanned'),
            ]),
        });
        const currentIndex = PICTURE_OPTIONS.indexOf(settings.get_string('picture-options'));
        optionsRow.selected = currentIndex === -1 ? 5 : currentIndex;
        optionsRow.connect('notify::selected', () =>
            settings.set_string('picture-options', PICTURE_OPTIONS[optionsRow.selected]));
        appearanceGroup.add(optionsRow);

        page.add(appearanceGroup);
        window.add(page);

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
        window.add(aboutPage);
    }

    _displayDirectory(settings, key) {
        const path = settings.get_string(key);
        return path && path.length > 0 ? path : '(not set)';
    }
}
