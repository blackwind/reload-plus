(function() {
  const bwBadge = require("./bwbadge");
  const bwPreferences = require("./bwprefs");
  const {Ci, Cu} = require("chrome");
  const {Hotkey} = require("hotkeys");
  const winUtils = require("window-utils");

  var bwApp = {
    dispatch: function(ctrl, alt, shift, meta, button) {
      var mod = "mod" + ((ctrl ? "Ctrl" : "") + (alt ? "Alt" : "") + (shift ? "Shift" : "") + (meta ? "Meta" : "") || "Open") + button;
      var action = bwPreferences.get("actions." + mod);

      if (action > 0 && action <= max) {
        var chromeWindow = winUtils.activeWindow;
        var document = chromeWindow._content.document;
        var url = document.location.href;

        switch (action) {
          case 1:
            // Standard Reload
            chromeWindow.BrowserReload();
            break;
          case 2:
            // Standard Reload (new tab)
            var tab = chromeWindow.gBrowser.addTab(url);
            chromeWindow.gBrowser.selectedTab = tab;
            break;
          case 3:
            // Override Cache
            chromeWindow.BrowserReloadSkipCache();
            break;
          case 4:
            // Override Cache (new tab)
            var tab = chromeWindow.gBrowser.addTab(url);
            chromeWindow.gBrowser.selectedTab = tab;
            chromeWindow.BrowserReloadSkipCache();
            break;
          case 5:
            // Custom Action
            var custom = bwPreferences.getJSON("customAction")["url"];
            var cached = custom.replace("%s", escape(url));
            document.location.href = cached;
            break;
          case 6:
            // Custom Action (new tab)
            var custom = bwPreferences.getJSON("customAction")["url"];
            var cached = custom.replace("%s", escape(url));
            var tab = chromeWindow.gBrowser.addTab(cached);
            chromeWindow.gBrowser.selectedTab = tab;
            break;
          case 7:
            // Load Missing Images
            var imgs = document.getElementsByTagNameNS("*", "img");
            if (imgs && imgs.length) {
              for (i = 0; i < imgs.length; i++) {
                imgs[i].src = imgs[i].src;
              }
            }
            break;
          case 8:
            // Reload All Tabs
            chromeWindow.gBrowser.reloadAllTabs();
            break;
          case 9:
            // Reload Non-Pinned Tabs
            var tabs = chromeWindow.gBrowser.tabs;
            for (i = 0; i < tabs.length; i++) {
              if (!tabs[i].pinned)
                tabs[i].linkedBrowser.reload();
            }
            break;
          case 10:
            // Reload Pinned Tabs
            var tabs = chromeWindow.gBrowser.tabs;
            for (i = 0; i < tabs.length; i++) {
              if (tabs[i].pinned)
                tabs[i].linkedBrowser.reload();
            }
            break;
          case 11:
            // Set/Clear Reload Interval
            var tab = bwGecko.getTabForDocument(chromeWindow, document);
            if (tab._reloadInterval) {
              try { tab._reloadInterval.stop(); } catch (e) { }
              delete tab._reloadInterval;
            } else {
              var delay = parseInt(chromeWindow.prompt("Reload after how many seconds?", (this.defaultDelay || 30)));
              if (bwData.isBetween(delay, 1, 86400)) {
                this.defaultDelay = delay;
                tab._reloadInterval = new bwApp.reloadInterval(tab, delay).obj;
              }
            }
            break;
        }
      }
    },

    delegate: {
      defaultState: {},

      onTrack: function(chromeWindow) {
        var appcontent = chromeWindow.document.getElementById("appcontent");
        if (appcontent) {
          chromeWindow._onPageLoad = function(event) { if (chromeWindow.location == "chrome://browser/content/browser.xul" && !event.originalTarget.defaultView.frameElement) bwApp.onPageLoad(chromeWindow, event.originalTarget); }
          appcontent.addEventListener("DOMContentLoaded", chromeWindow._onPageLoad, true);
        }

        var buttons = ["reload-button", "urlbar-reload-button"];
        for (i in buttons) {
          var reloadButton = chromeWindow.document.getElementById(buttons[i]);
          if (reloadButton) {
            this.defaultState[buttons[i]] = {};
            this.defaultState[buttons[i]]["command"] = reloadButton.getAttribute("command");
            this.defaultState[buttons[i]]["disabled"] = reloadButton.getAttribute("disabled");
            this.defaultState[buttons[i]]["onclick"] = reloadButton.getAttribute("onclick");
            this.defaultState[buttons[i]]["oncommand"] = reloadButton.getAttribute("oncommand");
            this.defaultState[buttons[i]]["tooltiptext"] = reloadButton.getAttribute("tooltiptext");

            reloadButton.removeAttribute("command");
            reloadButton.removeAttribute("disabled");
            reloadButton.removeAttribute("onclick");
            reloadButton.removeAttribute("oncommand");

            reloadButton.addEventListener("click", bwApp.onWidgetClick, true);
            reloadButton.addEventListener("mouseover", bwApp.onWidgetMouseOver, true);
          }
        }
      },

      onUntrack: function(chromeWindow) {
        var appcontent = chromeWindow.document.getElementById("appcontent");
        if (appcontent) {
          appcontent.removeEventListener("DOMContentLoaded", chromeWindow._onPageLoad, true);
          delete chromeWindow._onPageLoad;
        }

        var buttons = ["reload-button", "urlbar-reload-button"];
        for (i in buttons) {
          var reloadButton = chromeWindow.document.getElementById(buttons[i]);
          if (reloadButton) {
            reloadButton.setAttribute("command", this.defaultState[buttons[i]]["command"]);
            //reloadButton.setAttribute("disabled", this.defaultState[buttons[i]]["disabled"]);
            reloadButton.setAttribute("onclick", this.defaultState[buttons[i]]["onclick"]);
            reloadButton.setAttribute("oncommand", this.defaultState[buttons[i]]["oncommand"]);
            reloadButton.setAttribute("tooltiptext", this.defaultState[buttons[i]]["tooltiptext"]);

            reloadButton.removeEventListener("click", bwApp.onWidgetClick, true);
            reloadButton.removeEventListener("mouseover", bwApp.onWidgetMouseOver, true);
          }
        }
      }
    },

    getActions: function() {
      var customName = bwPreferences.getJSON("customAction")["name"];
      return ["---",
              "Standard Reload",
              "Standard Reload (new tab)",
              "Override Cache",
              "Override Cache (new tab)",
              customName,
              customName + " (new tab)",
              "Load Missing Images",
              "Reload All Tabs",
              "Reload Non-Pinned Tabs",
              "Reload Pinned Tabs",
              "Set/Clear Reload Interval"];
    },

    getMods: function() {
      var button = bwPreferences.get("rightIsMiddle") ? "Right" : "Middle";
      var functionKey = bwPreferences.get("functionKey");
      return {"modOpen0":  "Left Mouse (or F" + functionKey + ")",
              "modCtrl0":  "Ctrl+LMouse (or Ctrl+F" + functionKey + ")",
              "modAlt0":   "Alt+LMouse (or Alt+F" + functionKey + ")",
              "modShift0": "Shift+LMouse (or Shift+F" + functionKey + ")",
              "modOpen1":  button + " Mouse",
              "modCtrl1":  "Ctrl+" + button[0] + "Mouse",
              "modAlt1":   "Alt+" + button[0] + "Mouse",
              "modShift1": "Shift+" + button[0] + "Mouse"};
    },

    hotkeys: {
      bind: function() {
        var functionKey = bwPreferences.get("functionKey");
        this.unbind();
        this.hotkeys = [
          Hotkey({
            combo: "f" + functionKey,
            onPress: function() {
              bwApp.dispatch(0, 0, 0, 0, 0);
            }
          }),

          Hotkey({
            combo: "ctrl-f" + functionKey,
            onPress: function() {
              bwApp.dispatch(1, 0, 0, 0, 0);
            }
          }),

          Hotkey({
            combo: "alt-f" + functionKey,
            onPress: function() {
              bwApp.dispatch(0, 1, 0, 0, 0);
            }
          }),

          Hotkey({
            combo: "shift-f" + functionKey,
            onPress: function() {
              bwApp.dispatch(0, 0, 1, 0, 0);
            }
          })
        ];
        return true;
      },

      unbind: function() {
        for (i in this.hotkeys) {
          this.hotkeys[i].destroy();
        }
        return true;
      }
    },

    observer: {
      register: function() {
        var Services = Cu.import("resource://gre/modules/Services.jsm").Services;

        this.svcPrefs = Services.prefs.getBranch(bwPreferences.root).QueryInterface(Ci.nsIPrefBranch2);
        this.svcPrefs.addObserver("", this, false);

        this.svcObs = Services.obs;
        this.svcObs.addObserver(this, "addon-options-displayed", false);
      },

      unregister: function() {
        if (this.svcPrefs)
          this.svcPrefs.removeObserver("", this);

        if (this.svcObs)
          this.svcObs.removeObserver(this, "addon-options-displayed");
      },

      observe: function(aSubject, aTopic, aData) {
        if (aTopic == "addon-options-displayed" && aData == require("self").id) {
          bwApp.onOptionsDisplayed(aSubject);
        } else if (aTopic == "nsPref:changed") {
          bwApp.onOptionsModified(aData);
        }
      }
    },

    onOptionsDisplayed: function(document) {
      var actions = bwApp.getActions();
      var mods = bwApp.getMods();

      document.getElementById("reloadplus-functionKey").value = bwPreferences.get("functionKey");

      for (mod in mods) {
        var popup = document.getElementById("reloadplus-actions-" + mod + "-popup");
        var val = bwPreferences.get("actions." + mod);
        for (i in actions) {
          if (i == 1 || i == 3 || i == 5 || i == 7) popup.appendChild(document.createElement("menuseparator"));
          var node = document.createElement("menuitem");
          node.setAttribute("value", i);
          node.setAttribute("label", actions[i]);
          if (i == val) node.setAttribute("selected", "true");
          popup.appendChild(node);
        }
      }
    },

    onOptionsModified: function(pref) {
      switch (pref) {
        case "functionKey":
          bwApp.hotkeys.bind();
          break;
      }
    },

    onPageLoad: function(chromeWindow, document) {
      var tab = bwGecko.getTabForDocument(chromeWindow, document);
      var errorCode = bwData.extractMatch(/^about:neterror\?e=(\w+)&/, document.documentURI);
      var ignoredErrors = ["fileNotFound", "malformedURI", "protocolNotFound", "redirectLoop", "remoteXUL"];

      if (errorCode && !bwData.inArray(errorCode, ignoredErrors)) {
        var delay = bwPreferences.get("autoRetryDelay");
        /*var result =*/ new bwApp.reloadInterval(tab, delay, errorCode).obj;
      } else if (tab._reloadInterval) {
        try {
          tab._reloadInterval.start();
        } catch (e) {
          delete tab._reloadInterval;
        }
      }
    },

    onWidgetClick: function(event) {
      if (!this.disabled) {
        if (event.button == 0 || event.button == 1) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2 && bwPreferences.get("rightIsMiddle") === true) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 1);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    },

    onWidgetMouseOver: function(event) {
      var actions = bwApp.getActions();
      var mods = bwApp.getMods();
      var tooltip = "";

      for (i in mods) {
        // Add an extra linebreak after certain keys.
        if (i == "modOpen1") tooltip += "\r\n";
        val = bwPreferences.get("actions." + i);
        if (val > 0) tooltip += mods[i] + " = " + actions[val] + "\r\n";
      }

      this.setAttribute("tooltiptext", tooltip.trim());
    },

    reloadInterval: function(tab, delay, isErrorPage) {
      if (tab.tagName != "tab" || !bwData.isBetween(delay, 1, 86400))
        return false;

      var window = tab.linkedBrowser._contentWindow;
      var document = window.document;
      var badge = new bwBadge(tab).obj, registeredDelay = delay, timer;

      if (!badge)
        return false;

      this.obj = {
        start: function() {
          var delayLeft = registeredDelay;

          window.addEventListener("beforeunload", this.stop);

          badge.show(delayLeft);
          timer = window.setInterval(function() {
            if (--delayLeft <= 0) {
              if (isErrorPage) {
                document.getElementById("errorTryAgain").click();
              } else {
                document.location.reload();
              }
            } else {
              badge.show(delayLeft);
            }
          }, 1000);
        },

        stop: function() {
          if (badge)
            badge.hide();

          if (timer)
            window.clearInterval(timer);
        }
      }

      this.obj.start();
    }
  }

  var bwData = {
    extractMatch: function(regex, data, num) { num = num || 1;
      var match = regex.exec(data);
      if (match && match[num]) {
        return match[num];
      } else {
        return false;
      }
    },

    inArray: function(needle, haystack) {
      var length = haystack.length;
      for (var i = 0; i < length; i++) {
        if (haystack[i] == needle)
          return true;
      }
      return false;
    },

    isBetween: function(num, min, max) {
      return (num >= min && num <= max);
    }
  }

  var bwGecko = {
    getTabForDocument: function(chromeWindow, document) {
      var i = chromeWindow.gBrowser.getBrowserIndexForDocument(document);
      var tab = chromeWindow.gBrowser.tabs[i];
      return tab;
    }
  }

  // Apply a default set of preferences.
  var max = bwApp.getActions().length - 1;
  bwPreferences.init({"actions.modOpen0":  {"default": 1, "min": 0, "max": max},
                      "actions.modOpen1":  {"default": 2, "min": 0, "max": max},
                      "actions.modCtrl0":  {"default": 3, "min": 0, "max": max},
                      "actions.modCtrl1":  {"default": 4, "min": 0, "max": max},
                      "actions.modAlt0":   {"default": 7, "min": 0, "max": max},
                      "actions.modAlt1":   {"default": 8, "min": 0, "max": max},
                      "actions.modShift0": {"default": 5, "min": 0, "max": max},
                      "actions.modShift1": {"default": 6, "min": 0, "max": max},
                      "autoRetryDelay":    {"default": 0, "min": 0, "max": 86400},
                      "customAction":      {"default": '{"name": "Google Cache", "url": "http://www.google.com/search?q=cache:%s"}'},
                      "functionKey":       {"default": 5, "min": 1, "max": 24},
                      "rightIsMiddle":     {"default": false}}, true);

  // Attach and begin execution.
  /*var tracker =*/ new winUtils.WindowTracker(bwApp.delegate);
  bwApp.hotkeys.bind();
  bwApp.observer.register();

  // Revert changes on unload.
  exports.onUnload = function(reason) {
    bwApp.hotkeys.unbind();
    bwApp.observer.unregister();
  }
})();
