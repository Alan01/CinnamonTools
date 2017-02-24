const ExtensionUUID = "0dyseus@MultiTranslatorExtension";
const ExtensionPath = imports.ui.extensionSystem.extensionMeta[ExtensionUUID].path;
const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;
const Signals = imports.signals;
const Gio = imports.gi.Gio;
const Pango = imports.gi.Pango;
const Cinnamon = imports.gi.Cinnamon;
const CinnamonEntry = imports.ui.cinnamonEntry;
const Soup = imports.gi.Soup;
const _httpSession = new Soup.SessionAsync();
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Gst = imports.gi.Gst;
const Main = imports.ui.main;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext;

function _(aStr) {
    let customTrans = Gettext.dgettext(ExtensionUUID, aStr);

    if (customTrans != aStr)
        return customTrans;

    return Gettext.gettext(aStr);
}

Soup.Session.prototype.add_feature.call(
    _httpSession,
    new Soup.ProxyResolverDefault()
);
_httpSession.user_agent = "Mozilla/5.0";
_httpSession.timeout = 5;

const TTS_URI = "https://translate.google.com/translate_tts?client=tw-ob&ie=UTF-8&total=1&idx=0&textlen=%d&q=%s&tl=%s";
const TTS_TEXT_MAX_LEN = 100;

const LNG_CHOOSER_COLUMNS = 4;

const STATS_TYPE_SOURCE = "source";
const STATS_TYPE_TARGET = "target";

const STATUS_BAR_MESSAGE_TYPES = {
    error: 0,
    info: 1,
    success: 2
};

const STATUS_BAR_MAX_MESSAGE_LENGTH = 60;

const ICONS = {
    help: "dialog-question-symbolic",
    preferences: "preferences-system-symbolic",
    close: "window-close-symbolic",
    shutdown: "system-shutdown-symbolic",
    listen: "audio-volume-high-symbolic"
};

const LANGUAGES_LIST = {
    "auto": "Detect language",
    "af": "Afrikaans",
    "ar": "Arabic",
    "az": "Azerbaijani",
    "be": "Belarusian",
    "bg": "Bulgarian",
    "bn": "Bengali",
    "ca": "Catalan",
    "cs": "Czech",
    "cy": "Welsh",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "en": "English",
    "es": "Spanish",
    "et": "Estonian",
    "eu": "Basque",
    "fa": "Persian",
    "fi": "Finnish",
    "fr": "French",
    "ga": "Irish",
    "gl": "Galician",
    "gu": "Gujarati",
    "hi": "Hindi",
    "hr": "Croatian",
    "ht": "HaitianCreole",
    "hu": "Hungarian",
    "hy": "Armenian",
    "id": "Indonesian",
    "is": "Icelandic",
    "it": "Italian",
    "iw": "Hebrew",
    "ja": "Japanese",
    "ka": "Georgian",
    "kn": "Kannada",
    "ko": "Korean",
    "la": "Latin",
    "lo": "Lao",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "mk": "Macedonian",
    "ms": "Malay",
    "mt": "Maltese",
    "nl": "Dutch",
    "no": "Norwegian",
    "pl": "Polish",
    "pt": "Portuguese",
    "ro": "Romanian",
    "ru": "Russian",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sq": "Albanian",
    "sr": "Serbian",
    "sv": "Swedish",
    "sw": "Swahili",
    "ta": "Tamil",
    "te": "Telugu",
    "th": "Thai",
    "tl": "Filipino",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "vi": "Vietnamese",
    "yi": "Yiddish",
    "zh-CN": "Chinese Simplified",
    "zh-TW": "Chinese Traditional"
};

function SettingsHandler(aUUID) {
    this._init(aUUID);
}

SettingsHandler.prototype = {
    __proto__: Settings.ExtensionSettings.prototype,

    _init: function(aUUID) {
        this.settings = new Settings.ExtensionSettings(this, aUUID);
        let bD = Settings.BindingDirection || null;
        let settingsArray = [
            [bD.IN, "pref_open_translator_dialog_keybinding", null],
            [bD.IN, "pref_translate_from_clipboard_keybinding", null],
            [bD.IN, "pref_translate_from_selection_keybinding", null],
            [bD.IN, "pref_sync_entries_scrolling", null],
            [bD.BIDIRECTIONAL, "pref_default_translator", null],
            [bD.BIDIRECTIONAL, "pref_translators_prefs", null],
            [bD.IN, "pref_remember_last_translator", null],
            [bD.BIDIRECTIONAL, "pref_last_translator", null],
            [bD.IN, "pref_enable_shortcuts", null],
            [bD.IN, "pref_width_percents", null],
            [bD.IN, "pref_height_percents", null],
            [bD.IN, "pref_font_size", null],
            [bD.BIDIRECTIONAL, "pref_languages_stats", null],
            [bD.IN, "pref_show_most_used", null],
            [bD.IN, "pref_dialog_theme", null],
        ];
        let newBinding = typeof this.settings.bind === "function";
        for (let [binding, property_name, callback] of settingsArray) {
            // Condition needed for retro-compatibility.
            // Mark for deletion on EOL.
            if (newBinding)
                this.settings.bind(property_name, property_name, callback);
            else
                this.settings.bindProperty(binding, property_name, property_name, callback, null);
        }
    }
};

/**
 * START animation.js
 */

var settings = new SettingsHandler(ExtensionUUID).settings;

const ANIMATED_ICON_UPDATE_TIMEOUT = 16;

function Animation(file, width, height, speed) {
    this._init(file, width, height, speed);
}

Animation.prototype = {
    _init: function(file, width, height, speed) {
        this.actor = new St.Bin();
        this.actor.connect("destroy", Lang.bind(this, this._onDestroy));
        this._speed = speed;

        this._isLoaded = false;
        this._isPlaying = false;
        this._timeoutId = 0;
        this._frame = 0;

        this._animations = St.TextureCache.get_default().load_sliced_image(file, width, height,
            Lang.bind(this, this._animationsLoaded));
        this.actor.set_child(this._animations);
    },

    play: function() {
        if (this._isLoaded && this._timeoutId === 0) {
            if (this._frame === 0)
                this._showFrame(0);

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_LOW, this._speed, Lang.bind(this, this._update));
            GLib.Source.set_name_by_id(this._timeoutId, "[cinnamon] this._update");
        }

        this._isPlaying = true;
    },

    stop: function() {
        if (this._timeoutId > 0) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._isPlaying = false;
    },

    _showFrame: function(frame) {
        let oldFrameActor = this._animations.get_child_at_index(this._frame);
        if (oldFrameActor)
            oldFrameActor.hide();

        this._frame = (frame % this._animations.get_n_children());

        let newFrameActor = this._animations.get_child_at_index(this._frame);
        if (newFrameActor)
            newFrameActor.show();
    },

    _update: function() {
        this._showFrame(this._frame + 1);
        return GLib.SOURCE_CONTINUE;
    },

    _animationsLoaded: function() {
        this._isLoaded = this._animations.get_n_children() > 0;

        if (this._isPlaying)
            this.play();
    },

    _onDestroy: function() {
        this.stop();
    }
};

function AnimatedIcon(file, size) {
    this._init(file, size);
}

AnimatedIcon.prototype = {
    __proto__: Animation.prototype,

    _init: function(file, size) {
        Animation.prototype._init.call(this, file, size, size, ANIMATED_ICON_UPDATE_TIMEOUT);
    }
};

/**
 * END animation.js
 */

/**
 * START buttons_bar.js
 */

function ButtonsBarButton(icon_name, label_text, tip_text, params, action) {
    this._init(icon_name, label_text, tip_text, params, action);
}

ButtonsBarButton.prototype = {
    _init: function(icon_name, label_text, tip_text, params, action) {
        this.params = Params.parse(params, {
            button_style_class: "translator-button",
            box_style_class: "translator-button-box",
            track_hover: true,
            reactive: true,
            toggle_mode: false,
            icon_style: "translator-buttons-bar-icon",
            statusbar: false
        });
        this._button_box = new St.BoxLayout({
            style_class: this.params.box_style_class
        });
        this._button_content = new St.BoxLayout();

        this._sensitive = true;

        this._button = new St.Button({
            track_hover: this.params.track_hover,
            reactive: this.params.reactive,
            style_class: this.params.button_style_class,
            toggle_mode: this.params.toggle_mode
        });
        this._button.add_actor(this._button_content);
        this._button_box.add_actor(this._button);

        if (typeof action === "function") {
            this._button.connect("clicked", Lang.bind(this, function() {
                if (this._sensitive)
                    action();
            }));
        }

        this._icon = false;
        this._label = false;
        this._label_text = label_text;
        this._tip_text = tip_text;

        if (!is_blank(icon_name)) {
            this._icon = new St.Icon({
                icon_name: icon_name,
                style_class: this.params.icon_style
            });

            this._button_content.add(this._icon, {
                x_fill: false,
                x_align: St.Align.START
            });
        }

        if (!is_blank(this._label_text)) {
            this._label = new St.Label();
            this._label.clutter_text.set_markup(this._label_text);

            this._button_content.add(this._label, {
                x_fill: false,
                y_align: St.Align.MIDDLE
            });

            if (this._icon) {
                this._label.visible = false;
            }
        }

        this._button.connect("enter-event", Lang.bind(this, this._on_enter_event));
        this._button.connect("leave-event", Lang.bind(this, this._on_leave_event));

        this._button.tooltip = new Tooltips.Tooltip(this._button, this._tip_text);

        this._button.connect("destroy", Lang.bind(this, function() {
            this._button.tooltip.destroy();
        }));

        if (!this._icon && !this._label) {
            throw new Error(_("Icon and label are both false."));
        }
    },

    _on_enter_event: function(object, event) {
        if (this._icon && this._label) {
            this._label.opacity = 0;
            this._label.show();

            Tweener.addTween(this._label, {
                time: 0.3,
                opacity: 255,
                transition: "easeOutQuad"
            });
        }
    },

    _on_leave_event: function(object, event) {
        if (this._icon && this._label) {
            Tweener.addTween(this._label, {
                time: 0.3,
                opacity: 0,
                transition: "easeOutQuad",
                onComplete: Lang.bind(this, function() {
                    this._label.hide();
                })
            });
        }
    },

    connect: function(signal, callback) {
        this.button.connect(signal, callback);
    },

    set_checked: function(checked) {
        if (checked) {
            this.button.add_style_pseudo_class("active");
        } else {
            this.button.remove_style_pseudo_class("active");
        }

        this.button.set_checked(checked);
    },

    get_checked: function() {
        return this.button.get_checked();
    },

    set_sensitive: function(sensitive) {
        this._sensitive = sensitive;
    },

    destroy: function() {
        this.params = null;
        this._label_text = null;
        this._tip_text = null;
        this._button_box.destroy();
    },

    get label_actor() {
        return this._label;
    },

    get label() {
        return this._label.clutter_text.get_text();
    },

    set label(text) {
        this._label.clutter_text.set_markup(text);
    },

    get icon_actor() {
        return this._icon;
    },

    get icon_name() {
        return this._icon.icon_name;
    },

    set icon_name(name) {
        this._icon.icon_name;
    },

    get has_icon() {
        return this._icon !== false ? true : false;
    },

    get has_label() {
        return this._label !== false ? true : false;
    },

    get button() {
        return this._button;
    },

    get actor() {
        return this._button_box;
    },
};

function ButtonsBarLabel(text, style_class) {
    this._init(text, style_class);
}

ButtonsBarLabel.prototype = {
    _init: function(text, style_class) {
        this._label = new St.Label({
            style_class: style_class
        });
        this._label.clutter_text.set_markup(text);

        this.actor = new St.BoxLayout();
        this.actor.add(this._label);
    },

    get label_actor() {
        return this._label;
    },

    get label() {
        return this._label.clutter_text.get_text();
    },

    set label(text) {
        this._label.clutter_text.set_markup(text);
    },
};

function ButtonsBar(params) {
    this._init(params);
}

ButtonsBar.prototype = {
    _init: function(params) {
        this.params = Params.parse(params, {
            style_class: "translator-buttons-bar-box"
        });

        this.actor = new St.BoxLayout({
            style_class: this.params.style_class
        });
        this._buttons = [];
    },

    add_button: function(button, aAlignEnd) {
        this._buttons.push(button);
        this.actor.add(button.actor, {
            x_fill: false,
            x_align: aAlignEnd ? St.Align.END : St.Align.START
        });
    },

    clear: function() {
        for (let i = 0; i < this._buttons.length; i++) {
            let button = this._buttons[i];
            button.destroy();
        }
    },

    destroy: function() {
        this.actor.destroy();
    }
};

/**
 * END buttons_bar.js
 */

/**
 * START chars_counter.js
 */

function CharsCounter() {
    this._init();
}

CharsCounter.prototype = {
    _init: function() {
        this.actor = new St.BoxLayout({
            style_class: "translator-chars-counter-box",
            visible: false
        });

        this._current_length = 0;
        this._max_length = 0;

        this._current_length_label = new St.Label({
            style_class: "translator-chars-counter-text"
        });
        this._current_length_label.get_clutter_text().set_use_markup(true);

        this._max_length_label = new St.Label({
            style_class: "translator-chars-counter-text"
        });
        this._max_length_label.get_clutter_text().set_use_markup(true);

        this._separator_label = new St.Label({
            style_class: "translator-chars-counter-text",
            text: "/"
        });

        this.actor.add_actor(this._current_length_label);
        this.actor.add_actor(this._separator_label);
        this.actor.add_actor(this._max_length_label);
    },

    _show: function() {
        if (this.actor.visible)
            return;

        this.actor.opacity = 0;
        this.actor.show();

        Tweener.addTween(this.actor, {
            time: 0.3,
            transition: "easeOutQuad",
            opacity: 255
        });
    },

    _hide: function() {
        if (!this.actor.visible)
            return;

        Tweener.addTween(this.actor, {
            time: 0.3,
            transition: "easeOutQuad",
            opacity: 0,
            onComplete: Lang.bind(this, function() {
                this.actor.hide();
                this.actor.opacity = 255;
            })
        });
    },

    _maybe_show: function() {
        if (this._max_length < 1 || this._current_length < 1) {
            this._hide();
            return;
        }

        if (this.actor.visible)
            return;

        this._show();
    },

    _current_length_changed: function() {
        this._maybe_show();

        let markup;

        if (this._current_length >= this._max_length) {
            markup = '<span color="red"><b>%s</b></span>'.format(
                this._current_length.toString()
            );
        } else {
            markup = this._current_length.toString();
        }

        let clutter_text = this._current_length_label.get_clutter_text();

        Tweener.addTween(this._current_length_label, {
            time: 0.2,
            transition: "easeOutQuad",
            opacity: 100,
            onComplete: Lang.bind(this, function() {
                clutter_text.set_markup(markup);

                Tweener.addTween(this._current_length_label, {
                    time: 0.2,
                    transition: "easeOutQuad",
                    opacity: 255
                });
            })
        });

        clutter_text.set_markup(markup);
    },

    _max_length_changed: function() {
        this._maybe_show();
        let markup = "<b>%s</b>".format(this._max_length.toString());
        let clutter_text = this._max_length_label.get_clutter_text();

        Tweener.addTween(this._max_length_label, {
            time: 0.2,
            transition: "easeOutQuad",
            opacity: 100,
            onComplete: Lang.bind(this, function() {
                clutter_text.set_markup(markup);

                Tweener.addTween(this._max_length_label, {
                    time: 0.2,
                    transition: "easeOutQuad",
                    opacity: 255
                });
            })
        });

        clutter_text.set_markup(markup);
        this._current_length_changed();
    },

    destroy: function() {
        this.actor.destroy();
    },

    get current_length() {
        return this._current_length;
    },

    set current_length(length) {
        this._current_length = length;
        this._current_length_changed();
    },

    get max_length() {
        return this._max_length;
    },

    set max_length(length) {
        this._max_length = length;
        this._max_length_changed();
    }
};

/**
 * END chars_counter.js
 */

/**
 * START google_tts.js
 */

function GoogleTTS() {
    this._init();
}

GoogleTTS.prototype = {
    _init: function() {
        Gst.init(null, 0);

        this._player = Gst.ElementFactory.make("playbin", "player");
        this._bus = this._player.get_bus();
        this._bus.add_signal_watch();

        this._bus.connect("message::error", Lang.bind(this, this._kill_stream));
        this._bus.connect("message::eos", Lang.bind(this, this._kill_stream));
    },

    _kill_stream: function() {
        this._player.set_state(Gst.State.NULL);
    },

    speak: function(text, lang) {
        let extract = text.substr(0, TTS_TEXT_MAX_LEN - 1);
        this._kill_stream();

        let uri = TTS_URI.format(extract.length, encodeURIComponent(extract), lang);
        this._player.set_property("uri", uri);
        this._player.set_state(Gst.State.PLAYING);
    },

    destroy: function() {
        this._player.set_state(Gst.State.NULL);
    },
};

/**
 * END google_tts.js
 */

/**
 * START help_dialog.js
 */

function HelpDialog() {
    this._init();
}

HelpDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function() {
        ModalDialog.ModalDialog.prototype._init.call(this);

        this._dialogLayout =
            typeof this.dialogLayout === "undefined" ? this._dialogLayout : this.dialogLayout;
        this._dialogLayout.connect("key-press-event", Lang.bind(this,
            this._on_key_press_event
        ));
        this._dialogLayout.set_style_class_name("translator-help-box");

        this._label = new St.Label({
            style_class: "translator-help-text"
        });
        this._label.clutter_text.set_line_wrap(true);

        let base = "<b>%s:</b> %s\n";
        let markup =
            "<span size='x-large'><b>%s:</b></span>\n".format(_("Shortcuts")) +
            base.format(escape_html(settings.getValue("pref_open_translator_dialog_keybinding")),
                _("Open translator dialog.")) +
            base.format(escape_html(settings.getValue("pref_translate_from_clipboard_keybinding")),
                _("Open translator dialog and translate text from clipboard.")) +
            base.format(escape_html(settings.getValue("pref_translate_from_selection_keybinding")),
                _("Open translator dialog and translate from primary selection.")) +
            base.format(escape_html("<Ctrl><Enter>"),
                _("Translate text.")) +
            base.format(escape_html("<Ctrl><Shift>C"),
                _("Copy translated text to clipboard.")) +
            base.format(escape_html("<Ctrl>S"),
                _("Swap languages.")) +
            base.format(escape_html("<Ctrl>D"),
                _("Reset languages to default.")) +
            base.format(escape_html("<Tab>"),
                _("Toggle transliteration of result text.")) +
            base.format(escape_html("<Escape>"),
                _("Close dialog."));
        this._label.clutter_text.set_markup(markup);

        this._close_button = this._get_close_button();

        this.contentLayout.add(this._close_button, {
            x_fill: false,
            x_align: St.Align.END,
            y_fill: false,
            y_align: St.Align.START
        });
        this.contentLayout.add(this._label, {
            x_fill: false,
            x_align: St.Align.START,
            y_fill: false,
            y_align: St.Align.END
        });
    },

    _on_key_press_event: function(object, event) {
        let symbol = event.get_key_symbol();

        if (symbol == Clutter.Escape) {
            this.close();
        }
    },

    _get_close_button: function() {
        let icon = new St.Icon({
            icon_name: ICONS.close,
            icon_size: 20,
            style: "color: grey;"
        });

        let button = new St.Button({
            reactive: true
        });
        button.connect("clicked", Lang.bind(this, function() {
            this.close();
        }));
        button.add_actor(icon);

        return button;
    },

    _resize: function() {
        let width_percents = settings.getValue("pref_width_percents");
        let height_percents = settings.getValue("pref_height_percents");
        let primary = Main.layoutManager.primaryMonitor;

        let translator_width = Math.round(primary.width / 100 * width_percents);
        let translator_height = Math.round(primary.height / 100 * height_percents);

        let help_width = Math.round(translator_width * 0.9);
        let help_height = Math.round(translator_height * 0.9);
        this._dialogLayout.set_width(help_width);
        this._dialogLayout.set_height(help_height);
    },

    close: function() {
        ModalDialog.ModalDialog.prototype.close.call(this);
        this.destroy();
    },

    open: function() {
        this._resize();
        ModalDialog.ModalDialog.prototype.open.call(this);
    },
};

/**
 * END help_dialog.js
 */

/**
 * START language_chooser.js
 */

function LanguageChooser(title, languages) {
    this._init(title, languages);
}

LanguageChooser.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(title, languages) {
        ModalDialog.ModalDialog.prototype._init.call(this);

        this._dialogLayout =
            typeof this.dialogLayout === "undefined" ? this._dialogLayout : this.dialogLayout;
        this._dialogLayout.connect("key-press-event", Lang.bind(this,
            this._on_key_press_event
        ));
        this._dialogLayout.set_style_class_name("translator-language-chooser");

        this._languages_grid_layout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.VERTICAL
        });
        this._languages_table = new St.Widget({
            layout_manager: this._languages_grid_layout
        });

        this._box = new St.BoxLayout({
            vertical: true
        });
        this._box.add_actor(this._languages_table);

        this._scroll = new St.ScrollView({
            style_class: "translator-language-chooser-box"
        });
        this._scroll.add_actor(this._box);

        this._title = new St.Label({
            text: title,
            style_class: "translator-language-chooser-title",
            x_expand: true,
            y_expand: false
        });

        this._search_entry = new St.Entry({
            style_class: "translator-language-chooser-entry",
            visible: false,
            x_expand: false,
            y_expand: false
        });
        this._search_entry.connect("key-press-event", Lang.bind(this, function(o, e) {
            let symbol = e.get_key_symbol();

            if (symbol == Clutter.Escape) {
                this._search_entry.set_text("");
                this._search_entry.hide();
                this._scroll.grab_key_focus();
                this._info_label.show();
                return true;
            } else {
                return false;
            }
        }));
        this._search_entry.clutter_text.connect(
            "text-changed",
            Lang.bind(this, this._update_list)
        );

        this._info_label = new St.Label({
            text: '<span color="black"><i>Type to search...</i></span>',
            x_expand: false,
            y_expand: false
        });
        this._info_label.clutter_text.set_use_markup(true);

        this._close_button = this._get_close_button();

        this._grid_layout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.VERTICAL
        });
        this._table = new St.Widget({
            layout_manager: this._grid_layout
        });
        this._grid_layout.attach(this._title, 0, 0, 1, 1);
        this._grid_layout.attach(this._close_button, 1, 0, 1, 1);
        this._grid_layout.attach(this._scroll, 0, 1, 2, 1);
        this._grid_layout.attach(this._search_entry, 0, 2, 1, 2);
        this._grid_layout.attach(this._info_label, 0, 2, 1, 2);

        this.set_languages(languages);

        this.contentLayout.add_actor(this._table);
    },

    _on_key_press_event: function(object, event) {
        let symbol = event.get_key_symbol();

        if (symbol == Clutter.Escape) {
            this.close();
        } else {
            let ch = get_unichar(symbol);

            if (ch) {
                // log(ch);
                this._info_label.hide();
                this._search_entry.set_text(ch);
                this._search_entry.show();
                this._search_entry.grab_key_focus();
            }
        }
    },

    _update_list: function() {
        this._languages_table.destroy_all_children();
        let filtered = {};

        for (let key in this._languages) {
            let lang_name = this._languages[key];
            let lang_code = key;
            let search_text = this._search_entry.get_text().toLowerCase();

            if (!starts_with(lang_name.toLowerCase(), search_text)) continue;

            filtered[lang_code] = lang_name;
        }

        this.show_languages("", filtered);
    },

    _get_close_button: function() {
        let icon = new St.Icon({
            icon_name: ICONS.close,
            icon_size: 20,
            style: "color: grey;"
        });

        let button = new St.Button({
            reactive: true,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.END,
            y_align: St.Align.MIDDLE
        });
        button.connect("clicked", Lang.bind(this, function() {
            this.close();
        }));
        button.add_actor(icon);

        return button;
    },

    _get_button: function(lang_code, lang_name) {
        let button = new St.Button({
            label: "%s".format(lang_name),
            track_hover: true,
            reactive: true,
            style_class: "translator-language-chooser-button",
            x_fill: false,
            y_fill: false,
            x_expand: true,
            y_expand: false
        });
        button.connect("clicked", Lang.bind(this, function() {
            this.emit("language-chose", {
                code: lang_code,
                name: lang_name
            });
        }));
        button.lang_code = lang_code;
        button.lang_name = lang_name;

        return button;
    },

    _resize: function() {
        let width_percents = settings.getValue("pref_width_percents");
        let height_percents = settings.getValue("pref_height_percents");
        let primary = Main.layoutManager.primaryMonitor;

        let translator_width = Math.round(primary.width / 100 * width_percents);
        let translator_height = Math.round(primary.height / 100 * height_percents);

        let chooser_width = Math.round(translator_width * 0.9);
        let chooser_height = Math.round(translator_height * 0.9);
        this._dialogLayout.set_width(chooser_width);
        this._dialogLayout.set_height(chooser_height);

        let scroll_width = Math.round(chooser_width * 0.9);
        let scroll_height = Math.round(
            chooser_height - this._title.height - this._info_label.height - this._dialogLayout.get_theme_node().get_padding(St.Side.BOTTOM) * 3
        );
        this._scroll.set_width(scroll_width);
        this._scroll.set_height(scroll_height);
    },

    show_languages: function(selected_language_code, list) {
        let row = 0;
        let column = 0;
        let languages = this._languages;

        if (!is_blank(list)) languages = list;

        let keys = Object.keys(languages);
        keys.sort(Lang.bind(this, function(a, b) {
            if (a === "auto")
                return false;

            a = languages[a];
            b = languages[b];
            return a > b;
        }));

        for each(let code in keys) {
            let button = this._get_button(code, languages[code]);

            if (button.lang_code === selected_language_code) {
                button.add_style_pseudo_class("active");
                button.set_reactive(false);
            }

            this._languages_grid_layout.attach(button, column, row, 1, 1);

            if (column === (LNG_CHOOSER_COLUMNS - 1)) {
                column = 0;
                row++;
            } else {
                column++;
            }
        }
    },

    set_languages: function(languages) {
        if (!languages)
            return;

        this._languages = languages;
    },

    close: function() {
        this._languages_table.destroy_all_children();
        this._search_entry.set_text("");
        this._search_entry.hide();
        ModalDialog.ModalDialog.prototype.close.call(this);
    },

    open: function() {
        this._resize();
        ModalDialog.ModalDialog.prototype.open.call(this);
    },
};
Signals.addSignalMethods(LanguageChooser.prototype);

/**
 * END language_chooser.js
 */

/**
 * START languages_buttons.js
 */

function LanguagesButtons(languages) {
    this._init(languages);
}

LanguagesButtons.prototype = {
    _init: function(languages) {
        this._langs = languages || [];

        this._box = new St.BoxLayout();
        this._label = new St.Label({
            text: _("Most used languages​​."),
            style_class: "translator-langs-buttons-label"
        });
        this.buttons = new ButtonsBar({
            style_class: "translator-langs-buttons-box"
        });
        this.buttons.actor.hide();
        this._box.add_actor(this._label);
        this._box.add_actor(this.buttons.actor);

        this._show_buttons();
    },

    _show_buttons: function() {
        if (this._langs.length > 0) {
            this._label.hide();
            this.buttons.actor.show();

            for (let i = 0; i < this._langs.length; i++) {
                let button_params = {
                    button_style_class: "translator-lang-button",
                    box_style_class: "translator-lang-button-box",
                    toggle_mode: true
                };
                let button = new ButtonsBarButton(
                    false,
                    this._langs[i].lang_name,
                    "",
                    button_params
                );
                this._langs[i].button = button;
                let lang_data = this._langs[i];
                button.connect("clicked", Lang.bind(this, function() {
                    this.emit("clicked", lang_data);
                }));
                this.buttons.add_button(button);
            }
        } else {
            this._label.show();
        }
    },

    reload: function() {
        this.buttons.clear();
        this._show_buttons();
    },

    add_languages: function(new_langs) {
        this._langs = this._langs.concat(new_langs);
        this.reload();
    },

    set_languages: function(new_langs) {
        this._langs = new_langs;
        this.reload();
    },

    select: function(lang_code) {
        for (let i = 0; i < this._langs.length; i++) {
            let lang = this._langs[i];

            if (lang.lang_code === lang_code) {
                lang.button.set_checked(true);
                this.emit("selected", lang);
            } else {
                lang.button.set_checked(false);
            }
        }
    },

    destroy: function() {
        this._langs = null;
        this._box.destroy();
    },

    get actor() {
        return this._box;
    },

    get languages() {
        return this._langs;
    }
};
Signals.addSignalMethods(LanguagesButtons.prototype);

/**
 * END languages_buttons.js
 */

/**
 * START languages_stats.js
 */

function LanguagesStats() {
    this._init();
}

LanguagesStats.prototype = {
    _init: function() {
        this._reload();
    },

    _reload: function() {
        this._json_data = settings.getValue("pref_languages_stats");
        this._storage = JSON.parse(this._json_data);

        if (this._storage instanceof Array) {
            this._storage = {};
        }
    },

    increment: function(translator_name, type, lang_data) {
        let key_string = "%s-%s-%s".format(
            translator_name,
            type,
            lang_data.code
        );

        if (key_string in this._storage) {
            this._storage[key_string].count++;
        } else {
            let data = {
                lang_name: lang_data.name,
                lang_code: lang_data.code,
                count: 1
            };
            this._storage[key_string] = data;
        }

        this.save();
    },

    get_n_most_used: function(translator_name, type, n) {
        n = n || 5;
        let key_string = "%s-%s".format(translator_name, type);
        let keys = Object.keys(this._storage);

        let filtered = keys.filter(Lang.bind(this, function(key) {
            if (this._storage[key].count <= 3)
                return false;
            return starts_with(key, key_string);
        }));
        filtered.sort(Lang.bind(this, function(a, b) {
            return this._storage[b].count > this._storage[a].count;
        }));

        let result = [];

        for (let i = 0; i < filtered.length; i++) {
            if (i >= n) break;

            let clone = JSON.parse(JSON.stringify(this._storage[filtered[i]]));
            result.push(clone);
        }

        return result.slice(0);
    },

    save: function() {
        settings.setValue("pref_languages_stats", JSON.stringify(this._storage));
        this.emit("stats-changed");
    }
};
Signals.addSignalMethods(LanguagesStats.prototype);

/**
 * END languages_stats.js
 */

/**
 * START status_bar.js
 */

function StatusBarMessage(text, timeout, type, has_spinner) {
    this._init(text, timeout, type, has_spinner);
}

StatusBarMessage.prototype = {
    _init: function(text, timeout, type, has_spinner) {
        this._text = text;
        this._markup = this._prepare_message(text, type);
        this._type = type || STATUS_BAR_MAX_MESSAGE_LENGTH.info;
        this._timeout = timeout || 0;
        this._has_spinner = has_spinner || false;
    },

    _prepare_message: function(message, type) {
        message = message.trim();
        message = message.slice(0, STATUS_BAR_MAX_MESSAGE_LENGTH);
        message = escape_html(message);

        let message_markup = '<span color="%s">%s</span>';

        switch (type) {
            case STATUS_BAR_MESSAGE_TYPES.error:
                message_markup = message_markup.format("red", message);
                break;
            case STATUS_BAR_MESSAGE_TYPES.info:
                message_markup = message_markup.format("grey", message);
                break;
            case STATUS_BAR_MESSAGE_TYPES.success:
                message_markup = message_markup.format("green", message);
                break;
            default:
                message_markup = message_markup.format("grey", message);
        }

        return message_markup;
    },

    get text() {
        return this._text;
    },

    get markup() {
        return this._markup;
    },

    get type() {
        return this._type;
    },

    get timeout() {
        return this._timeout;
    },

    get has_spinner() {
        return this._has_spinner;
    }
};

function StatusBar(params) {
    this._init(params);
}

StatusBar.prototype = {

    _init: function(params) {
        this.actor = new St.BoxLayout({
            style_class: "translator-statusbar-box",
            visible: false
        });
        this._message_label = new St.Label();
        this._message_label.get_clutter_text().use_markup = true;

        let spinner_icon = ExtensionPath + "/icons/process-working.svg";
        this._spinner = new AnimatedIcon(
            spinner_icon,
            16
        );

        this.actor.add(this._spinner.actor);
        this.actor.add(this._message_label);

        this._messages = {};
    },

    _get_max_id: function() {
        let max_id = Math.max.apply(Math, Object.keys(this._messages));
        let result = max_id > 0 ? max_id : 0;
        return result;
    },

    _generate_id: function() {
        let max_id = this._get_max_id();
        let result = max_id > 0 ? (max_id + 1) : 1;
        return result;
    },

    show_message: function(id) {
        let message = this._messages[id];
        if (message === undefined || !(message instanceof StatusBarMessage))
            return;

        this._message_label.get_clutter_text().set_markup(message.markup);

        this.actor.opacity = 0;
        this.actor.show();

        if (message.has_spinner) {
            this._spinner.actor.show();
            this._spinner.play();
        } else {
            this._spinner.actor.hide();
        }

        Tweener.addTween(this.actor, {
            time: 0.3,
            opacity: 255,
            transition: "easeOutQuad",
            onComplete: Lang.bind(this, function() {
                let timeout = parseInt(message.timeout, 10);

                if (timeout > 0) {
                    Mainloop.timeout_add(message.timeout,
                        Lang.bind(this, function() {
                            this.remove_message(id);
                        })
                    );
                }
            })
        });
    },

    hide_message: function(id) {
        if (this._message_label.visible !== true)
            return;

        let message = this._messages[id];
        if (message === undefined || !(message instanceof StatusBarMessage))
            return;

        Tweener.addTween(this.actor, {
            time: 0.3,
            opacity: 0,
            transition: "easeOutQuad",
            onComplete: Lang.bind(this, function() {
                this.actor.hide();
            })
        });
    },

    add_message: function(message, timeout, type, has_spinner) {
        if (is_blank(message))
            return false;

        message = new StatusBarMessage(message, timeout, type, has_spinner);

        let id = this._generate_id();
        this._messages[id] = message;
        this.show_message(id);

        return id;
    },

    remove_message: function(id) {
        this.hide_message(id);
        delete this._messages[id];
        this.show_last();
    },

    remove_last: function() {
        let max_id = this._get_max_id();
        if (max_id > 0) this.remove_message(max_id);
    },

    show_last: function() {
        let max_id = this._get_max_id();
        if (max_id > 0) this.show_message(max_id);
    },

    clear: function() {
        this.actor.hide();
        this._messages = {};
    },

    destroy: function() {
        this.clear();
        this.actor.destroy();
    }
};

/**
 * END status_bar.js
 */

/**
 * START translation_provider_base.js
 */

function TranslationProviderPrefs(provider_name) {
    this._init(provider_name);
}

TranslationProviderPrefs.prototype = {
    _init: function(provider_name) {
        this._name = provider_name;

        this._settings_connect_id = settings.connect(
            "changed::pref_translators_prefs",
            Lang.bind(this, this._load_prefs)
        );

        this._last_source;
        this._last_target;
        this._default_source;
        this._default_target;
        this._remember_last_lang;

        this._load_prefs();
    },

    _load_prefs: function() {
        let prefs = settings.getValue("pref_translators_prefs");

        if (prefs[this._name] === undefined) {
            throw new Error(_("Can't load prefs for %s").format(this._name));
        }

        prefs = prefs[this._name];
        this._default_source = prefs.default_source || "auto";
        this._default_target = prefs.default_target || "en";
        this._last_source = prefs.last_source || "";
        this._last_target = prefs.last_target || "";
        this._remember_last_lang = prefs.remember_last_lang || false;
    },

    save_prefs: function(new_prefs) {
        let current_prefs = settings.getValue("pref_translators_prefs");

        try {
            let temp = {};

            if (current_prefs[this._name] !== undefined) {
                temp = current_prefs[this._name];
            }

            for (let key in new_prefs) {
                temp[key] = new_prefs[key];
            }

            current_prefs[this._name] = temp;

        } finally {
            settings.setValue("pref_translators_prefs", current_prefs);
        }
    },

    destroy: function() {
        if (this._settings_connect_id > 0) {
            settings.disconnect(this._settings_connect_id);
        }
    },

    get last_source() {
        return !is_blank(this._last_source) ? this._last_source : false;
    },

    set last_source(lang_code) {
        this._last_source = lang_code;
        this.save_prefs({
            last_source: lang_code
        });
    },

    get last_target() {
        return !is_blank(this._last_target) ?
            this._last_target : false;
    },

    set last_target(lang_code) {
        this._last_target = lang_code;
        this.save_prefs({
            last_target: lang_code
        });
    },

    get default_source() {
        return this._default_source;
    },

    set default_source(lang_code) {
        this._default_source = lang_code;
        this.save_prefs({
            default_source: lang_code
        });
    },

    get default_target() {
        return this._default_target;
    },

    set default_target(lang_code) {
        this._default_target = lang_code;
        this.save_prefs({
            default_target: lang_code
        });
    },

    get remember_last_lang() {
        return this._remember_last_lang;
    },

    set remember_last_lang(enable) {
        enable = enable === true ? true : false;
        this._remember_last_lang = enable;
        this.save_prefs({
            remember_last_lang: enable
        });
    },
};

function TranslationProviderBase(name, limit, url) {
    this._init(name, limit, url);
}

TranslationProviderBase.prototype = {
    _init: function(name, limit, url) {
        this._name = name;
        this._limit = limit;
        this._url = url;
        this.prefs = new TranslationProviderPrefs(this._name);
    },

    _get_data_async: function(url, callback) {
        let request = Soup.Message.new("GET", url);

        _httpSession.queue_message(request, Lang.bind(this,
            function(_httpSession, message) {
                if (message.status_code === 200) {
                    try {
                        callback(request.response_body.data);
                    } catch (aErr) {
                        global.logError("%s: ".format(_("Error")) + aErr);
                        callback("");
                    }
                } else {
                    callback("");
                }
            }
        ));
    },

    make_url: function(source_lang, target_lang, text) {
        let result = this._url.format(
            source_lang,
            target_lang,
            encodeURIComponent(text)
        );
        return result;
    },

    get_languages: function() {
        return LANGUAGES_LIST;
    },

    get_language_name: function(lang_code) {
        return LANGUAGES_LIST[lang_code] || false;
    },

    get_pairs: function(language) {
        throw new Error(_("Not implemented"));
    },

    parse_response: function(helper_source_data) {
        throw new Error(_("Not implemented"));
    },

    translate: function(source_lang, target_lang, text, callback) {
        if (is_blank(text)) {
            callback(false);
            return;
        }

        let url = this.make_url(source_lang, target_lang, text);
        this._get_data_async(url, Lang.bind(this, function(result) {
            let data = this.parse_response(result);
            callback(data);
        }));
    },

    get name() {
        return this._name;
    },

    get limit() {
        return this._limit;
    },

    destroy: function() {
        this.prefs.destroy();
    },
};

/**
 * END translation_provider_base.js
 */

/**
 * START translator_dialog.js
 */

function EntryBase(params) {
    this._init(params);
}

EntryBase.prototype = {
    _init: function(params) {
        this.params = Params.parse(params, {
            box_style: "translator-text-box",
            entry_style: "translator-entry"
        });

        this.scroll = new St.ScrollView({
            style_class: this.params.box_style
        });

        this.actor = new St.BoxLayout({
            reactive: true,
            x_expand: true,
            y_expand: true,
            x_align: St.Align.END,
            y_align: St.Align.MIDDLE
        });
        this.actor.connect("button-press-event",
            Lang.bind(this, function() {
                this._clutter_text.grab_key_focus();
            })
        );
        this.actor.add(this.scroll, {
            x_fill: true,
            y_fill: true,
            expand: true
        });

        this._entry = new St.Entry({
            style_class: this.params.entry_style
        });
        CinnamonEntry.addContextMenu(this._entry);

        this._clutter_text = this._entry.get_clutter_text();
        this._clutter_text.set_single_line_mode(false);
        this._clutter_text.set_activatable(false);
        this._clutter_text.set_line_wrap(true);
        this._clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        this._clutter_text.set_max_length(0);
        this._clutter_text.connect("key-press-event", Lang.bind(this, this._on_key_press_event));
        this.set_font_size(settings.getValue("pref_font_size"));

        this._font_connection_id = settings.connect(
            "changed::pref_font_size",
            Lang.bind(this, function() {
                this.set_font_size(settings.getValue("pref_font_size"));
            })
        );

        this._box = new St.BoxLayout({
            vertical: true
        });
        this._box.add(this._entry, {
            y_align: St.Align.START,
            y_fill: false
        });

        this.scroll.add_actor(this._box);
    },

    _on_key_press_event: function(o, e) {
        let symbol = e.get_key_symbol();
        let code = e.get_key_code();
        let state = e.get_state();

        let cyrillic_control = 8196;
        let cyrillic_shift = 8192;

        let control_mask =
            // state === Clutter.ModifierType.CONTROL_MASK ||
            state === cyrillic_control;
        let shift_mask =
            // state === Clutter.ModifierType.SHIFT_MASK ||
            state === cyrillic_shift;

        if (symbol == Clutter.Right) {
            let sel = this._clutter_text.get_selection_bound();

            if (sel === -1) {
                this._clutter_text.set_cursor_position(
                    this._clutter_text.text.length
                );
            }

            return false;
        }
        // cyrillic Ctrl+A
        else if (control_mask && code == 38) {
            this._clutter_text.set_selection(0, this._clutter_text.text.length);
            return true;
        }
        // cyrillic Ctrl+C
        else if (control_mask && code == 54) {
            let clipboard = St.Clipboard.get_default();
            let selection = this._clutter_text.get_selection();
            let text;

            if (!is_blank(selection))
                text = selection;
            else
                text = this._clutter_text.text;

            clipboard.set_text(text);
            return true;
        }
        // cyrillic Ctrl+V
        else if (control_mask && code == 55) {
            let clipboard = St.Clipboard.get_default();
            clipboard.get_text(Lang.bind(this, function(clipboard, text) {
                if (!is_blank(text)) {
                    this._clutter_text.delete_selection();
                    this._clutter_text.set_text(
                        this._clutter_text.text + text
                    );
                    return true;
                }

                return false;
            }));
        } else if (
            (state == Clutter.ModifierType.CONTROL_MASK || state == cyrillic_control) &&
            (symbol == Clutter.Return || symbol == Clutter.KP_Enter)
        ) {
            this.emit("activate");
            return Clutter.EVENT_STOP;
        } else {
            // let t = {
            //     state: state,
            //     symbol: symbol,
            //     code: code
            // };
            // log(JSON.stringify(t, null, '\t'));
        }

        return false;
    },

    destroy: function() {
        if (this._font_connection_id > 0) {
            settings.disconnect(this._font_connection_id);
        }

        this.actor.destroy();
    },

    grab_key_focus: function() {
        this._clutter_text.grab_key_focus();
    },

    set_size: function(width, height) {
        this.scroll.set_width(width);
        this.scroll.set_height(height);
    },

    set_font_size: function(size) {
        let style_string = "font-size: %spx".format(size);
        this.entry.set_style(style_string);
    },

    get entry() {
        return this._entry;
    },

    get clutter_text() {
        return this._clutter_text;
    },

    get text() {
        return this._entry.get_text();
    },

    set text(text) {
        this._entry.set_text(text);
    },

    get markup() {
        return this._clutter_text.get_markup();
    },

    set markup(markup) {
        this._clutter_text.set_markup(markup);
    },

    get length() {
        return this._entry.get_text().length;
    },

    get is_empty() {
        return this._entry.get_text().length < 1;
    },

    get max_length() {
        return this._clutter_text.get_max_length();
    },

    set max_length(length) {
        length = parseInt(length, 10);
        this._clutter_text.set_max_length(length);
        this.emit("max-length-changed");
    }
};
Signals.addSignalMethods(EntryBase.prototype);

function SourceEntry() {
    this._init();
}

SourceEntry.prototype = {
    __proto__: EntryBase.prototype,

    _init: function() {
        EntryBase.prototype._init.call(this, {
            entry_style: "translator-entry",
            box_style: "translator-source-text-box"
        });

        let v_adjust = this.scroll.vscroll.adjustment;
        v_adjust.connect("changed", Lang.bind(this, function() {
            v_adjust.value = v_adjust.upper - v_adjust.page_size;
        }));
    },
};

function TargetEntry() {
    this._init();
}

TargetEntry.prototype = {
    __proto__: EntryBase.prototype,

    _init: function() {
        EntryBase.prototype._init.call(this, {
            box_style: "translator-target-text-box",
            entry_style: "translator-entry"
        });

        this._clutter_text.set_editable(false);
        this.actor.connect("button-press-event", Lang.bind(this, function() {
            this._clutter_text.set_editable(true);
        }));
        this._clutter_text.connect("button-press-event",
            Lang.bind(this, function() {
                this._clutter_text.set_editable(true);
                this._clutter_text.grab_key_focus();
            })
        );
        this._clutter_text.connect("key-focus-out", Lang.bind(this, function() {
            this._clutter_text.set_editable(false);
        }));
    },
};

function ListenButton() {
    this._init();
}

ListenButton.prototype = {
    _init: function() {
        this.actor = new St.Button({
            style_class: "listen-button",
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });
        this._icon = new St.Icon({
            icon_name: ICONS.listen,
            icon_size: 15
        });

        this.actor.add_actor(this._icon);
    },

    show: function() {
        this.actor.show();
    },

    hide: function() {
        this.actor.hide();
    },

    destroy: function() {
        this.actor.destroy();
    }
};

function TranslatorDialog(text_translator) {
    this._init(text_translator);
}

TranslatorDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(text_translator) {
        ModalDialog.ModalDialog.prototype._init.call(this, {
            cinnamonReactive: false
        });

        this._text_translator = text_translator;

        this._dialogLayout =
            typeof this.dialogLayout === "undefined" ? this._dialogLayout : this.dialogLayout;
        this._dialogLayout.set_style_class_name("translator-box");

        this._source = new SourceEntry();
        this._source.clutter_text.connect(
            "text-changed",
            Lang.bind(this, this._on_source_changed)
        );
        this._source.connect("max-length-changed",
            Lang.bind(this, function() {
                this._chars_counter.max_length = this._source.max_length;
            })
        );
        this._target = new TargetEntry();
        this._target.clutter_text.connect(
            "text-changed",
            Lang.bind(this, this._on_target_changed)
        );

        this._connection_ids = {
            source_scroll: 0,
            target_scroll: 0,
            sync_scroll_settings: 0,
            show_most_used: 0
        };

        this._topbar = new ButtonsBar({
            style_class: "translator-top-bar-box"
        });
        this._topbar.actor.x_expand = true;
        this._topbar.actor.x_align = St.Align.MIDDLE;

        this._dialog_menu = new ButtonsBar();
        this._dialog_menu.actor.x_expand = true;
        this._dialog_menu.actor.y_expand = true;
        this._dialog_menu.actor.x_align = St.Align.END;
        this._dialog_menu.actor.y_align = St.Align.MIDDLE;

        this._statusbar = new StatusBar();
        this._statusbar.actor.x_align = St.Align.END;
        this._most_used_bar = false;

        this._chars_counter = new CharsCounter();

        this._google_tts = new GoogleTTS();
        this._listen_source_button = new ListenButton();
        this._listen_source_button.hide();
        this._listen_source_button.actor.connect("clicked",
            Lang.bind(this, function() {
                this.google_tts.speak(
                    this._source.text,
                    this._text_translator.current_source_lang
                );
            }));
        this._listen_target_button = new ListenButton();
        this._listen_target_button.hide();
        this._listen_target_button.actor.connect("clicked",
            Lang.bind(this, function() {
                let lines_count = this._source.text.split("\n").length;
                let translation = this._target.text.split("\n").slice(0, lines_count).join("\n");
                this.google_tts.speak(
                    translation,
                    this._text_translator.current_target_lang
                );
            }));

        this._grid_layout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.VERTICAL
        });
        this._table = new St.Widget({
            layout_manager: this._grid_layout
        });
        this._grid_layout.attach(this._topbar.actor, 0, 0, 4, 1);
        this._grid_layout.attach(this._dialog_menu.actor, 3, 0, 2, 1);
        this._grid_layout.attach(this._source.actor, 0, 2, 2, 1);
        this._grid_layout.attach(this._target.actor, 2, 2, 2, 1);
        this._grid_layout.attach(this._listen_source_button.actor, 1, 3, 1, 1);
        this._grid_layout.attach(this._chars_counter.actor, 0, 3, 1, 2);
        this._grid_layout.attach(this._listen_target_button.actor, 3, 3, 1, 1);
        this._grid_layout.attach(this._statusbar.actor, 2, 3, 2, 1);

        this.contentLayout.add_child(this._table);

        this._init_most_used_bar();
        this._init_scroll_sync();
    },

    _onKeyPressEvent: function(object, keyPressEvent) {
        let modifiers = Cinnamon.get_event_state(keyPressEvent);
        let ctrlAltMask = Clutter.ModifierType.CONTROL_MASK | Clutter.ModifierType.MOD1_MASK;
        let symbol = keyPressEvent.get_key_symbol();
        if (symbol === Clutter.Escape && !(modifiers & ctrlAltMask)) {
            this.close();
            return;
        }

        let action = this._actionKeys[symbol];

        if (action)
            action();
    },

    _on_source_changed: function() {
        this._chars_counter.current_length = this._source.length;

        if (!this._source.is_empty) this._listen_source_button.show();
        else this._listen_source_button.hide();
    },

    _on_target_changed: function() {
        if (!this._target.is_empty) this._listen_target_button.show();
        else this._listen_target_button.hide();
    },

    _init_scroll_sync: function() {
        if (settings.getValue("pref_sync_entries_scrolling")) {
            this.sync_entries_scroll();
        }

        this._connection_ids.sync_scroll_settings = settings.connect(
            "changed::pref_sync_entries_scrolling",
            Lang.bind(this, function() {
                let sync = settings.getValue("pref_sync_entries_scrolling");

                if (sync)
                    this.sync_entries_scroll();
                else
                    this.unsync_entries_scroll();
            })
        );
    },

    _init_most_used_bar: function() {
        if (settings.getValue("pref_show_most_used")) {
            this._show_most_used_bar();
        }

        this._connection_ids.show_most_used = settings.connect(
            "changed::pref_show_most_used",
            Lang.bind(this, function(a, b, c) {
                if (settings.getValue("pref_show_most_used")) {
                    this._show_most_used_bar();
                } else {
                    this._hide_most_used_bar();
                }
            })
        );
    },

    _show_most_used_bar: function() {
        if (!this._most_used_bar) {
            this._most_used_sources = new LanguagesButtons();
            this._most_used_targets = new LanguagesButtons();
            this._most_used_bar = true;
        }

        this._topbar.actor.set_style("padding-bottom: 0px;");
        this._grid_layout.attach(this._most_used_sources.actor, 0, 1, 1, 1);
        this._grid_layout.attach(this._most_used_targets.actor, 1, 1, 1, 1);
    },

    _hide_most_used_bar: function() {
        if (this._most_used_bar) {
            this._topbar.actor.set_style("padding-bottom: 10px;");
            this._most_used_sources.destroy();
            this._most_used_targets.destroy();
            this._most_used_bar = false;
        }
    },

    _get_statusbar_height: function() {
        let message_id = this._statusbar.add_message(_("Sample message 1."));
        let result = this._statusbar.actor.get_preferred_height(-1)[1];
        this._statusbar.remove_message(message_id);
        return result;
    },

    _resize: function() {
        let width_percents = settings.getValue("pref_width_percents");
        let height_percents = settings.getValue("pref_height_percents");
        let primary = Main.layoutManager.primaryMonitor;

        let box_width = Math.round(primary.width / 100 * width_percents);
        let box_height = Math.round(primary.height / 100 * height_percents);
        this._dialogLayout.set_width(
            box_width + this._dialogLayout.get_theme_node().get_padding(St.Side.LEFT) * 2
        );
        this._dialogLayout.set_height(
            box_height + this._dialogLayout.get_theme_node().get_padding(St.Side.TOP) * 2
        );

        let text_box_width = Math.round(
            box_width / 2 - 10 // The margin of the translator box
        );
        let text_box_height =
            box_height - this._topbar.actor.height - Math.max(
                this._get_statusbar_height(),
                this._chars_counter.actor.height
            );

        if (this._most_used_bar) {
            text_box_height -= Math.max(
                this._most_used_sources.actor.height,
                this._most_used_targets.actor.height
            );
        }

        this._source.set_size(text_box_width, text_box_height);
        this._target.set_size(text_box_width, text_box_height);
    },

    sync_entries_scroll: function() {
        if (this._connection_ids.source_scroll < 1) {
            let source_v_adjust = this._source.scroll.vscroll.adjustment;
            this._connection_ids.source_scroll = source_v_adjust.connect(
                "notify::value",
                Lang.bind(this, function(adjustment) {
                    let target_adjustment =
                        this._target.scroll.vscroll.adjustment;

                    if (target_adjustment.value === adjustment.value)
                        return;

                    target_adjustment.value = adjustment.value;
                    adjustment.upper =
                        adjustment.upper > target_adjustment.upper ? adjustment.upper : target_adjustment.upper;
                })
            );
        }

        if (this._connection_ids.target_scroll < 1) {
            let target_v_adjust = this._target.scroll.vscroll.adjustment;
            this._connection_ids.target_scroll = target_v_adjust.connect(
                "notify::value",
                Lang.bind(this, function(adjustment) {
                    let source_adjustment =
                        this._source.scroll.vscroll.adjustment;

                    if (source_adjustment.value === adjustment.value)
                        return;

                    source_adjustment.value = adjustment.value;

                    adjustment.upper =
                        adjustment.upper > source_adjustment.upper ? adjustment.upper : source_adjustment.upper;
                })
            );
        }
    },

    unsync_entries_scroll: function() {
        if (this._connection_ids.source_scroll > 0) {
            let source_v_adjust = this._source.scroll.vscroll.adjustment;
            source_v_adjust.disconnect(this._connection_ids.source_scroll);
            this._connection_ids.source_scroll = 0;
        }

        if (this._connection_ids.target_scroll > 0) {
            let target_v_adjust = this._target.scroll.vscroll.adjustment;
            target_v_adjust.disconnect(this._connection_ids.target_scroll);
            this._connection_ids.target_scroll = 0;
        }
    },

    open: function() {
        ModalDialog.ModalDialog.prototype.open.call(this);
        this._resize();
    },

    close: function() {
        this._statusbar.clear();
        ModalDialog.ModalDialog.prototype.close.call(this);
    },

    destroy: function() {
        if (this._connection_ids.sync_scroll_settings > 0) {
            settings.disconnect(this._connection_ids.sync_scroll_settings);
        }
        if (this._connection_ids.show_most_used > 0) {
            settings.disconnect(this._connection_ids.show_most_used);
        }

        delete this._text_translator;

        this._source.destroy();
        this._target.destroy();
        this._statusbar.destroy();
        this._dialog_menu.destroy();
        this._topbar.destroy();
        this._chars_counter.destroy();
        this._listen_source_button.destroy();
        this._listen_target_button.destroy();
        this._google_tts.destroy();
        ModalDialog.ModalDialog.prototype.destroy.call(this);
    },

    get source() {
        return this._source;
    },

    get target() {
        return this._target;
    },

    get topbar() {
        return this._topbar;
    },

    get dialog_menu() {
        return this._dialog_menu;
    },

    get statusbar() {
        return this._statusbar;
    },

    get dialog_layout() {
        return this._dialogLayout;
    },

    get most_used() {
        let r = {
            sources: this._most_used_sources,
            targets: this._most_used_targets
        };
        return r;
    },

    get google_tts() {
        return this._google_tts;
    }
};

/**
 * END translator_dialog.js
 */

/**
 * START translators_manager.js
 */

function TranslatorsManager(extension_object) {
    this._init(extension_object);
}

TranslatorsManager.prototype = {
    _init: function(extension_object) {
        this._extension_object = extension_object;
        this._translators = this._load_translators();
        this._default = this.get_by_name(settings.getValue("pref_default_translator"));
        this._current = this._default;
    },

    _load_translators: function() {
        let translators = [];
        let translators_imports = imports.translation_providers;
        let files_list = get_files_in_dir(ExtensionPath + "/translation_providers");

        for (let i = 0; i < files_list.length; i++) {
            let file_name = files_list[i];
            let module_name = file_name.slice(0, -3);

            if (!ends_with(file_name, "_translation_provider.js"))
                continue;

            let translator = new translators_imports[module_name].Translator(
                this._extension_object
            );
            translator.file_name = file_name;
            translators.push(translator);
        }

        return translators;
    },

    get_by_name: function(name) {
        if (is_blank(name))
            return false;

        for (let i = 0; i < this._translators.length; i++) {
            let translator = this._translators[i];

            if (translator.name.toLowerCase() == name.toLowerCase()) {
                return translator;
            }
        }

        return false;
    },

    get current() {
        return this._current;
    },

    set current(translator_object_or_name) {
        let name = translator_object_or_name;
        let translator = translator_object_or_name;

        if (translator_object_or_name instanceof TranslationProviderBase) {
            name = translator_object_or_name.name;
        } else {
            translator = this.get_by_name(name);
        }

        this._current = translator;

        settings.setValue("pref_default_translator", name);
    },

    get last_used() {
        let name = settings.getValue("pref_last_translator");
        let translator = this.get_by_name(name);
        if (!translator)
            return false;

        return translator;
    },

    get default() {
        return this._default;
    },

    get translators_names() {
        let result = [];

        for (let i = 0; i < this._translators.length; i++) {
            result.push(this._translators[i].name);
        }

        return result;
    },

    get translators() {
        return this._translators;
    },

    get num_translators() {
        return this._translators.length;
    },

    destroy: function() {
        for (let i = 0; i < this._translators.length; i++) {
            this._translators[i].destroy();
        }
    },
};

/**
 * END translators_manager.js
 */

/**
 * START utils.js
 */

function is_blank(str) {
    return (!str || /^\s*$/.test(str));
}

function starts_with(str1, str2) {
    return str1.slice(0, str2.length) == str2;
}

function ends_with(str1, str2) {
    return str1.slice(-str2.length) == str2;
}

function escape_html(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function get_files_in_dir(path) {
    let dir = Gio.file_new_for_path(path);
    let file_enum, info;
    let result = [];

    try {
        file_enum = dir.enumerate_children(
            "standard::*",
            Gio.FileQueryInfoFlags.NONE,
            null
        );
    } catch (aErr) {
        global.logError(aErr);
        return false;
    }

    while ((info = file_enum.next_file(null)) !== null) {
        let file_type = info.get_file_type();

        if (file_type != Gio.FileType.REGULAR) continue;

        let file_name = info.get_name();
        result.push(file_name);
    }

    file_enum.close(null);

    return result;
}

function get_unichar(keyval) {
    let ch = Clutter.keysym_to_unicode(keyval);

    if (ch) {
        return String.fromCharCode(ch);
    } else {
        return false;
    }
}

// http://stackoverflow.com/a/7654602
var asyncLoop = function(o) {
    var i = -1;

    var loop = function() {
        i++;
        if (i == o.length) {
            o.callback();
            return;
        }
        o.functionToLoop(loop, i);
    };

    loop(); //init
};

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * END utils.js
 */

function ShellOutputProcess(command_argv) {
    this._init(command_argv);
}

ShellOutputProcess.prototype = {

    _init: function(command_argv) {
        this.command_argv = command_argv;
        this.flags = GLib.SpawnFlags.SEARCH_PATH;
        this.success = false;
        this.standard_output_content = "";
        this.standard_error_content = "";
        this.pid = -1;
        this.standard_input_file_descriptor = -1;
        this.standard_output_file_descriptor = -1;
        this.standard_error_file_descriptor = -1;
    },

    spawn_sync_and_get_output: function() {
        this.spawn_sync();
        let output = this.get_standard_output_content();
        return output;
    },

    spawn_sync: function() {
        let [success, standard_output_content, standard_error_content] = GLib.spawn_sync(
            null,
            this.command_argv,
            null,
            this.flags,
            null);
        this.success = success;
        this.standard_output_content = standard_output_content;
        this.standard_error_content = standard_error_content;
    },

    get_standard_output_content: function() {
        return this.standard_output_content.toString();
    },

    spawn_sync_and_get_error: function() {
        this.spawn_sync();
        let output = this.get_standard_error_content();
        return output;
    },

    get_standard_error_content: function() {
        return this.standard_error_content.toString();
    },

    spawn_async: function() {
        let [
            success,
            pid,
            standard_input_file_descriptor,
            standard_output_file_descriptor,
            standard_error_file_descriptor
        ] = GLib.spawn_async_with_pipes(
            null,
            this.command_argv,
            null,
            this.flags,
            null,
            null);

        this.success = success;
        this.pid = pid;
        this.standard_input_file_descriptor = standard_input_file_descriptor;
        this.standard_output_file_descriptor = standard_output_file_descriptor;
        this.standard_error_file_descriptor = standard_error_file_descriptor;
    },

};

function TranslatorsPopup(button, dialog) {
    this._init(button, dialog);
}

TranslatorsPopup.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,

    _init: function(button, dialog) {
        this._button = button;
        this._dialog = dialog;

        PopupMenu.PopupMenu.prototype._init.call(this, this._button.actor, 0, St.Side.TOP);

        this.setSourceAlignment(0.05);

        this._label_menu_item = new St.Label({
            text: _("Press <Esc> to close"),
            style_class: "translator-translators-popup-escape-label"
        });

        this.actor.hide();
        Main.uiGroup.add_actor(this.actor);

        this._dialog.source.actor.connect("button-press-event",
            Lang.bind(this, function() {
                if (this.isOpen)
                    this.close(true);
            })
        );
        this._dialog.target.actor.connect("button-press-event",
            Lang.bind(this, function() {
                if (this.isOpen)
                    this.close(true);
            })
        );
    },

    add_item: function(name, action) {
        let item = new PopupMenu.PopupMenuItem(name);
        item.connect("activate", Lang.bind(this, function() {
            action();
            this.close();
        }));
        this.addMenuItem(item);
    },

    open: function() {
        try {
            this._button.set_sensitive(false);
            this._button.actor.add_style_pseudo_class("active");
            this.box.add(this._label_menu_item);
            PopupMenu.PopupMenu.prototype.open.call(this, true);
            this.firstMenuItem.actor.grab_key_focus();
        } catch (aErr) {
            global.logError(aErr);
        }
    },

    close: function() {
        PopupMenu.PopupMenu.prototype.close.call(this, true);
        this._button.set_sensitive(true);
        this._button.actor.remove_style_pseudo_class("active");
        this._dialog.source.grab_key_focus();
        this.destroy();
    },

    destroy: function() {
        this.removeAll();
        this.actor.destroy();

        this.emit("destroy");

        Main.sessionMode.disconnect(this._sessionUpdatedId);
        this._sessionUpdatedId = 0;
    }
};