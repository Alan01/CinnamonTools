The Multi Translator extension is an extension ported from a gnome-shell extension called [Text Translator](https://github.com/gufoe/text-translator) by [gufoe](https://github.com/gufoe).

## Differences with the original extension

* [x] Removed instant translation and auto-speak options to avoid translation service *abuse*.
* [x] Themable interface.
* [x] ~Migrated to Cinnamon's native settings system.~ Came back to a custom settings window.
* [x] Unified all .js files into just one.
* [x] Obvious needed changes like changing all gnome-shell APIs usage to Cinnamon's, changed the use of JavaScript classes to prototypes, etc.

## Dependencies

**If one or more of these dependencies are missing in your system, you will not be able to use this extension.**

- **xsel** command: XSel is a command-line program for getting and setting the contents of the X selection.
- **trans** command: Command provided by the package translate-shell. Is a simple command line interface for several translation providers (Google Translate, Yandex Translate, Bing Translate and Apertium) which allows you to translate strings in your terminal.
    - Check translate-shell [dependencies](https://github.com/soimort/translate-shell#dependencies) and [recommended dependencies](https://github.com/soimort/translate-shell#recommended-dependencies).

**Note:** The translate-shell package available on Ubuntu 16.04.x/Linux Mint 18.x repositories is outdated and broken. It can be installed anyway so it will also install its dependencies. But updating to the latest version should be done as described bellow.

## How to install latest version of translate-shell

#### Option 1. Direct Download

This method will only install the trans script into the specified locations.

For the current user only. **~/.local/bin** needs to be in your PATH.
```shell
$ wget -O ~/.local/bin/trans git.io/trans && chmod ugo+rx ~/.local/bin/trans
```

For all users without overwriting the installed version.
```shell
$ sudo wget -O /usr/local/bin/trans git.io/trans && sudo chmod ugo+rx /usr/local/bin/trans
```

#### Option 2. From Git - [More details](https://github.com/soimort/translate-shell/blob/develop/README.md#option-3-from-git-recommended-for-seasoned-hackers)

This method will not just install the trans script but also its man pages. Refer to the link above for more installation details.

```shell
$ git clone https://github.com/soimort/translate-shell
$ cd translate-shell
$ make
$ sudo make install
```

## Extension usage

Once installed and enabled, the following shortcuts will be available.

#### Global shortcuts (configurable from the extension settings)

- **<kbd>Super</kbd> + <kbd>T</kbd>:** Open translator dialog.
- **<kbd>Super</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>:** Open translator dialog and translate text from clipboard.
- **<kbd>Super</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>:** Open translator dialog and translate from primary selection.

#### Shortcuts available on the translation dialog

- **<kbd>Ctrl</kbd> + <kbd>Enter</kbd>:** Translate text.
- **<kbd>Shift</kbd> + <kbd>Enter</kbd>:** Force text translation. Ignores translation history.
- **<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>:** Copy translated text to clipboard.
- **<kbd>Ctrl</kbd> + <kbd>S</kbd>:** Swap languages.
- **<kbd>Ctrl</kbd> + <kbd>D</kbd>:** Reset languages to default.

## Tested environments

* [ ] ![Cinnamon 2.8](https://odyseus.github.io/CinnamonTools/lib/badges/cinn-2.8.svg) ![Linux Mint 17.3](https://odyseus.github.io/CinnamonTools/lib/badges/lm-17.3.svg)
* [x] ![Cinnamon 3.0](https://odyseus.github.io/CinnamonTools/lib/badges/cinn-3.0.svg) ![Linux Mint 18](https://odyseus.github.io/CinnamonTools/lib/badges/lm-18.svg)
* [ ] ![Cinnamon 3.2](https://odyseus.github.io/CinnamonTools/lib/badges/cinn-3.2.svg) ![Linux Mint 18.1](https://odyseus.github.io/CinnamonTools/lib/badges/lm-18.1.svg)

## ToDo

### Multi Translator extension ToDo list:

* [ ] **Test extension on all currently supported versions of Cinnamon** ![@high](https://img.shields.io/badge/Priority-High-red.svg)
* [x] **Switch back to a custom settings window** Cinnamon's native settings system is very practical, but it's also very limited. There are certain settings that can be modified in the gnome-shell extension (the extension Multi Translator is based on) that aren't possible to modify using Cinnamon's native settings system. So, I will give a try to a custom one.
* [x] **Add the possibility to select a custom theme**
* [x] **Add "Service provided by Service provider name" notice** This is needed to comply with the terms of use for the translation services.
* [x] **Implement a mechanism to check for dependencies**
* [x] **Provide alternate methods in case translate-shell breaks or doesn't exists (manually configurable or automatic)**
    - There are a total of 3 translation services that doesn't require translate-shell. For now, this should suffice.
* [x] **Add more translation providers that doesn't require the use of translate-shell**
    - Added another Google Translate method that makes use of the mechanism used by the Google Translate Chrome extension.
    - Added **Transltr** service. The only translation service on the face of the earth with a public API and that makes no use of API keys. Lets enjoy it while it lasts (LOL).
* [x] **Create the translation template**
* [x] **Add more translation providers:** At least as much as translate-shell supports.
* [x] **Add Yandex API keys configuration**
* [x] **Make Yandex API keys usage random**
* [x] **Implement translation history**
* [x] **Keep looking for a way to reload the themes without the need to restart Cinnamon** Keep in mind the comment block in extension.js>TranslatorExtension>_loadTheme().
* [x] **Create the dark Linux Mint theme**
* [x] **Add translation mechanism**
* [x] ~**Change all synchronous functions to asynchronous**~ Abandoned idea.
* [x] ~**Create a mechanism to display statistics**~ Abandoned idea.

### Images

##### Dialog translation images

![multitranslator-001](https://cloud.githubusercontent.com/assets/3822556/23602981/cfe98e78-0231-11e7-91f0-ec5e865181c0.png)

[1](https://cloud.githubusercontent.com/assets/3822556/23602982/cfeea296-0231-11e7-84c4-4f3cdf5e47c4.png) -  [2](https://cloud.githubusercontent.com/assets/3822556/23602984/cff224ca-0231-11e7-9bc3-6d398b347a8b.png) - [3](https://cloud.githubusercontent.com/assets/3822556/23602985/cff670a2-0231-11e7-85da-fdc09f8979d7.png) - [4](https://cloud.githubusercontent.com/assets/3822556/23602988/cffc78ee-0231-11e7-9770-284648fd80ec.png)

##### Settings window images

![multitranslator-006](https://cloud.githubusercontent.com/assets/3822556/23626488/d8adad5a-028b-11e7-92ab-bb5e0322170c.png)

[1](https://cloud.githubusercontent.com/assets/3822556/23626489/d8b6072a-028b-11e7-932a-1d7b20c84b45.png) - [2](https://cloud.githubusercontent.com/assets/3822556/23626491/d8bb077a-028b-11e7-8c6d-697a916b0a4c.png) - [3](https://cloud.githubusercontent.com/assets/3822556/23626490/d8b967b2-028b-11e7-8468-7f15a6a9008a.png) - [4](https://cloud.githubusercontent.com/assets/3822556/23626492/d8c14d1a-028b-11e7-8a14-2120a6f9fe1f.png) - [5](https://cloud.githubusercontent.com/assets/3822556/23626493/d8c15a12-028b-11e7-97d3-8aad71fa5cef.png) - [6](https://cloud.githubusercontent.com/assets/3822556/23626494/d8c94218-028b-11e7-99dd-38397836423f.png)


### Multi Translator applet ToDo list:

**The development of this applet has not started yet. Will start it when the extension reaches a stable stage and it's published on the Spices website.**

#### Clicking on applet
   * [ ] Can bring up the extension dialog.
   * [ ] Can translate selection/clipboard and show result in a popup menu (Just like Popup Translator applet).
   * [ ] Can translate selection/clipboard and show result in a notification.

#### Ideas
* [ ] Make the applet complement with the extension, but not depend on it.
* [ ] Make the translation mechanism shared between the extension and the applet.
  * [ ] It will require to store the history file in a place that can be accessed by the extension and the applet.
  * [ ] It will require to ship the extension and the applet with the exact same Python script.
* [ ] Add several translation mechanisms that doesn't depend on the extension, but just on the **trans** command.
* [ ] Create a couple of key bindings to trigger several types of translations.
* [ ] Add options to choose between a **brief** and a **detailed** translation result.

## Issue reports

**Issue reporters should adjunct the output of the following commands.**
**Check the content of the log files for sensible information BEFORE running the commands!!!**

`inxi -xxxSc0 -! 31`
`pastebin ~/.cinnamon/glass.log`
`pastebin ~/.xsession-errors`

## [Download prototype extension](https://odyseus.github.io/CinnamonTools/pkg/0dyseus@MultiTranslatorExtension.tar.gz)

**References to anyone that could be interested in testing the extension.**

@buzz @copecu @fortalezense @maladro1t @NikoKrause @pizzadude @Radek71 @sphh