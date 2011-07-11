(function() {
  // Apply a default set of preferences.
  const bwPreferences = require("./bwprefs");
  bwPreferences.init({"autoRetryDelay": {"default": 0, "min": 0, "max": 86400},
                      "customAction": {"default": '{"name": "Google Cache", "url": "http://www.google.com/search?q=cache:%s"}'},
                      "functionKey": {"default": 5, "min": 1, "max": 12},
                      "modifiers.none": {"default": 0, "min": 0, "max": 3},
                      "modifiers.ctrl": {"default": 1, "min": 0, "max": 3},
                      "modifiers.alt": {"default": 2, "min": 0, "max": 3},
                      "modifiers.shift": {"default": 3, "min": 0, "max": 3},
                      "rightIsMiddle": {"default": false}});

  // Bind our hotkeys to the dispatcher.
  const { Hotkey } = require("hotkeys");
  var functionKey = bwPreferences.get("functionKey");
  var hotkeyNone = Hotkey({
    combo: "f" + functionKey,
    onPress: function() {
      bwReloadPlus.dispatch(0, 0, 0, 0);
    }
  });
  var hotkeyCtrl = Hotkey({
    combo: "ctrl-f" + functionKey,
    onPress: function() {
      bwReloadPlus.dispatch(1, 0, 0, 0);
    }
  });
  var hotkeyAlt = Hotkey({
    combo: "alt-f" + functionKey,
    onPress: function() {
      bwReloadPlus.dispatch(0, 1, 0, 0);
    }
  });
  var hotkeyShift = Hotkey({
    combo: "shift-f" + functionKey,
    onPress: function() {
      bwReloadPlus.dispatch(0, 0, 1, 0);
    }
  });

  // Modify all necessary elements.
  const winUtils = require("window-utils");
  var delegate = {
    onTrack: function(window) {
      //console.log("Tracking a window: " + window.location);
      var appcontent = window.document.getElementById("appcontent");
      if (appcontent) {
        appcontent.addEventListener("DOMContentLoaded", function(event) {
          var safeDocument = event.originalTarget;
          var safeWindow = safeDocument.defaultView;

          if (safeDocument.documentURI.match(/^about:neterror/)) {
            var delay = bwPreferences.get("autoRetryDelay");
            if (delay > 0) {
              var delayLeft = delay;
              var title = safeDocument.title;
              safeDocument.title = title + " [Retrying in " + delayLeft-- + "s...]";

              var interval = safeWindow.setInterval(function() {
                safeDocument.title = title + " [Retrying in " + delayLeft-- + "s...]";
              }, 1000);

              safeWindow.setTimeout(function() {
                safeDocument.title = title + " [Retrying...]";
                safeWindow.clearInterval(interval);
                if (safeWindow) {
                  safeWindow.document.getElementById("errorTryAgain").click();
                }
              }, delay * 1000);
            }
          }
        }, true);
      }

      var buttons = ["reload-button", "urlbar-reload-button"];
      for (x in buttons) {
        var reloadButton = window.document.getElementById(buttons[x]);
        if (reloadButton) {
          reloadButton.removeAttribute("command");
          reloadButton.removeAttribute("disabled");
          reloadButton.removeAttribute("onclick");
          reloadButton.removeAttribute("oncommand");

          reloadButton.addEventListener("click", function(event) {
            if (!this.disabled) {
              if (event.button == 0 || event.button == 1) {
                bwReloadPlus.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.button);
                event.preventDefault();
                event.stopPropagation();
              } else if (event.button == 2 && bwPreferences.get("rightIsMiddle") === true) {
                bwReloadPlus.dispatch(event.ctrlKey, event.altKey, event.shiftKey, 1);
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }, true);

          reloadButton.addEventListener("mouseover", function(event) {
            var modifierNone = bwPreferences.get("modifiers.none");
            var modifierCtrl = bwPreferences.get("modifiers.ctrl");
            var modifierAlt = bwPreferences.get("modifiers.alt");
            var modifierShift = bwPreferences.get("modifiers.shift");
            var custom = bwPreferences.getJSON("customAction")["name"];
            var middle = bwPreferences.get("rightIsMiddle") ? "Right" : "Middle";
            var actions = ["Standard Reload", "Override Cache", "Load Missing Images", custom, "Standard Reload (new tab)", "Override Cache (new tab)", "Reload All Tabs", custom + " (new tab)"];
            this.setAttribute("tooltiptext", "Left Mouse (or F" + functionKey + ") = " + actions[modifierNone] + "\r\n" +
                                             "Ctrl+LMouse (or Ctrl+F" + functionKey + ") = " + actions[modifierCtrl] + "\r\n" +
                                             "Alt+LMouse (or Alt+F" + functionKey + ") = " + actions[modifierAlt] + "\r\n" +
                                             "Shift+LMouse (or Shift+F" + functionKey + ") = " + actions[modifierShift] + "\r\n" +
                                             "\r\n" +
                                             middle + " Mouse = " + actions[modifierNone + 4] + "\r\n" +
                                             "Ctrl+" + middle[0] + "Mouse = " + actions[modifierCtrl + 4] + "\r\n" +
                                             "Alt+" + middle[0] + "Mouse = " + actions[modifierAlt + 4] + "\r\n" +
                                             "Shift+" + middle[0] + "Mouse = " + actions[modifierShift + 4]);
          }, true);
        }
      }
    },
    onUntrack: function(window) {
      //console.log("Untracking a window: " + window.location);
    }
  };
  var tracker = new winUtils.WindowTracker(delegate);

  var bwReloadPlus = {
    dispatch: function(ctrl, alt, shift, button) {
      var window = winUtils.activeWindow;
      var document = window._content.document;
      var url = document.location.href;
      var functions = [function() bwReloadPlus.reload(window, document, url, button),
                       function() bwReloadPlus.override(window, document, url, button),
                       function() bwReloadPlus.special(window, document, url, button),
                       function() bwReloadPlus.custom(window, document, url, button)];

      if (ctrl && !shift && !alt) {
        var mod = bwPreferences.get("modifiers.ctrl");
        functions[mod]();
      } else if (alt && !shift && !ctrl) {
        var mod = bwPreferences.get("modifiers.alt");
        functions[mod]();
      } else if (shift && !ctrl && !alt) {
        var mod = bwPreferences.get("modifiers.shift");
        functions[mod]();
      } else {
        var mod = bwPreferences.get("modifiers.none");
        functions[mod]();
      }
    },

    reload: function(window, document, url, button) {
      if (button == 0) {
        window.BrowserReload();
      } else if (button == 1) {
        var tab = window.gBrowser.addTab(url);
        window.gBrowser.selectedTab = tab;
      }
    },

    override: function(window, document, url, button) {
      if (button == 0) {
        window.BrowserReloadSkipCache();
      } else if (button == 1) {
        var tab = window.gBrowser.addTab(url);
        window.gBrowser.selectedTab = tab;
        window.BrowserReloadSkipCache();
      }
    },

    special: function(window, document, url, button) {
      if (button == 0) {
        var imgs = document.getElementsByTagNameNS("*", "img");
        if (imgs && imgs.length) {
          for (var i = 0; i < imgs.length; ++i) {
            imgs[i].src = imgs[i].src;
          }
        }
      } else if (button == 1) {
        window.gBrowser.reloadAllTabs();
      }
    },

    custom: function(window, document, url, button) {
      var custom = bwPreferences.getJSON("customAction")["url"];
      var cached = custom.replace("%s", escape(url));

      if (button == 0) {
        document.location.href = cached;
      } else if (button == 1) {
        var tab = window.gBrowser.addTab(cached);
        window.gBrowser.selectedTab = tab;
      }
    }
  }
})();
