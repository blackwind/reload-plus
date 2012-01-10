(function() {
  const bwBadge = require("./bwbadge");
  const bwPreferences = require("./bwprefs");
  const {Hotkey} = require("hotkeys");
  const observer = require("observer-service");
  const winUtils = require("window-utils");

  var bwApp = {
    executeAction: function(action) {
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
            // Reload Unsuccessful Tabs
            var tabs = chromeWindow.gBrowser.tabs;
            for (i = 0; i < tabs.length; i++) {
              if (/^about:neterror\?/.test(tabs[i].linkedBrowser._contentWindow.document.documentURI))
                tabs[i].linkedBrowser.reload();
            }
            break;
          case 12:
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

    createMenu: function(callback) {
      var document = winUtils.activeWindow.document;
      var actions = bwApp.getActions();
      var menu = document.createElement("menupopup");

      for (i in actions) {
        if ((!callback && i == 1) || i == 3 || i == 5 || i == 7) menu.appendChild(document.createElement("menuseparator"));
        if (callback && i == 0) {
          // Skip blank entry for context menus.
        } else {
          var item = document.createElement("menuitem");
          item.setAttribute("value", i);
          item.setAttribute("label", actions[i]);
          if (typeof(callback) == "function") {
            item.setAttribute("class", "menuitem-iconic");
            item.setAttribute("style", "list-style-image: url('" + require("self").data.url("action" + i + ".png") + "');");
            item.addEventListener("command", function() callback(parseInt(this.value)));
          }
          menu.appendChild(item);
        }
      }

      return menu;
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

            var menu = bwApp.createMenu(function(action) bwApp.executeAction(action));
            reloadButton.appendChild(menu);

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

            var menu = reloadButton.getElementsByTagName("menupopup")[0];
            reloadButton.removeChild(menu);

            reloadButton.removeEventListener("click", bwApp.onWidgetClick, true);
            reloadButton.removeEventListener("mouseover", bwApp.onWidgetMouseOver, true);
          }
        }
      },
    },

    dispatch: function(ctrl, alt, shift, meta, button) {
      var mod = "mod" + ((ctrl ? "Ctrl" : "") + (alt ? "Alt" : "") + (shift ? "Shift" : "") + (meta ? "Meta" : "") || "Open") + button;
      var action = bwPreferences.get("actions." + mod);
      bwApp.executeAction(action);
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
              "Reload Unsuccessful Tabs",
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
        var vals = [false, true];

        this.unbind();

        for each (meta in vals) { for each (shift in vals) { for each (alt in vals) { for each (ctrl in vals) {
          var combo = (ctrl ? "ctrl-" : "") + (alt ? "alt-" : "") + (shift ? "shift-" : "") + (meta ? "meta-" : "") + "f" + functionKey;
          eval("var onPress = function() bwApp.dispatch(" + ctrl + ", " + alt + ", " + shift + ", " + meta + ", 0);");
          this.hotkeys.push(Hotkey({
            combo: combo,
            onPress: onPress,
          }));
        } } } }
      },

      unbind: function() {
        for (i in this.hotkeys) {
          this.hotkeys[i].destroy();
        }
        this.hotkeys = [];
      },
    },

    onOfflineModified: function(subject, data) {
      if (data == "online") {
        var action = bwPreferences.get("workOnlineAction");
        if (action > 0) bwApp.executeAction(action + 7);
      }
    },

    onOptionsDisplayed: function(document) {
      var mods = bwApp.getMods();
      for (mod in mods) {
        var menu = bwApp.createMenu();
        document.getElementById("reloadplus-actions-" + mod).appendChild(menu);
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
      var ignoredErrors = ["fileNotFound", "malformedURI", "netOffline", "protocolNotFound", "redirectLoop", "remoteXUL"];

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
      if (event.target == this && !this.disabled) {
        if (event.button == 0 || event.button == 1) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2 && bwPreferences.get("rightIsMiddle") === true) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 1);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2) {
          var menu = event.target.getElementsByTagName("menupopup")[0];
          menu.openPopup(null, "overlay", event.clientX, event.clientY);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    },

    onWidgetMouseOver: function(event) {
      var actions = bwApp.getActions();
      var mods = bwApp.getMods();
      var button = "", tooltip = "";

      for (i in mods) {
        var val = bwPreferences.get("actions." + i);
        if (button != (button = i.charAt(i.length - 1))) tooltip += "\r\n";
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
              badge.hide();
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
    },
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
      for (i = 0; i < length; i++) {
        if (haystack[i] == needle)
          return true;
      }
      return false;
    },

    isBetween: function(num, min, max) {
      return (num >= min && num <= max);
    },
  }

  var bwGecko = {
    getTabForDocument: function(chromeWindow, document) {
      var i = chromeWindow.gBrowser.getBrowserIndexForDocument(document);
      var tab = chromeWindow.gBrowser.tabs[i];
      return tab;
    },
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
                      "rightIsMiddle":     {"default": false},
                      "workOnlineAction":  {"default": 0, "min": 0, "max": 4}}, true, bwApp.onOptionsDisplayed, bwApp.onOptionsModified);

  // Attach and begin execution.
  /*var tracker =*/ new winUtils.WindowTracker(bwApp.delegate);
  observer.add("network:offline-status-changed", bwApp.onOfflineModified);
  bwApp.hotkeys.bind();
})();
