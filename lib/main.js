(function() {
  const bwBadge = require("./bwbadge");
  const bwPreferences = require("./bwprefs");
  const {Cc, Ci, Cu} = require("chrome");
  const {Hotkey} = require("sdk/hotkeys");
  const observer = require("sdk/system/events");
  const {PageMod} = require("sdk/page-mod");
  const prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
  const self = require("sdk/self");
  const tabs = require("sdk/tabs");
  const windows = require("sdk/windows").browserWindows;

  var bwApp = {
    executeAction: function(action) {
      if (action.isBetween(1, MAX_ACTION)) {
        var chromeWindow = bwGecko.changeType(windows.activeWindow);
        var url = tabs.activeTab.url;
        var urlAlt = bwPreferences.getJSON("customAction").url.replace("%s", escape(url));

        switch (action) {
          case 1:
            // Standard Reload
            tabs.activeTab.reload();
            break;
          case 2:
            // Standard Reload (new tab)
            tabs.open(url);
            break;
          case 3:
            // Override Cache
            chromeWindow.BrowserReloadSkipCache();
            break;
          case 4:
            // Override Cache (new tab)
            tabs.open({
              "url": url,
              onOpen: function() {
                chromeWindow.BrowserReloadSkipCache();
              },
            });
            break;
          case 5:
            // Custom Action
            tabs.activeTab.url = urlAlt;
            break;
          case 6:
            // Custom Action (new tab)
            tabs.open(urlAlt);
            break;
          case 7:
            // Load Missing Images
            tabs.activeTab.attach({
              "contentScriptFile": self.data.url("content.js"),
              "contentScriptOptions": {
                "do": "loadMissingImages",
              },
            }).destroy();
            break;
          case 8:
            // Reload All Tabs
            for each (var tab in chromeWindow.gBrowser.tabs) {
              if (!tab.hidden)
                tab.linkedBrowser.reload();
            }
            break;
          case 9:
            // Reload Non-Pinned Tabs
            for each (var tab in chromeWindow.gBrowser.tabs) {
              if (!tab.hidden && !tab.pinned)
                tab.linkedBrowser.reload();
            }
            break;
          case 10:
            // Reload Pinned Tabs
            for each (var tab in chromeWindow.gBrowser.tabs) {
              if (!tab.hidden && tab.pinned)
                tab.linkedBrowser.reload();
            }
            break;
          case 11:
            // Reload Unsuccessful Tabs
            for each (var tab in chromeWindow.gBrowser.tabs) {
              if (!tab.hidden && tab._unsuccessful)
                tab.linkedBrowser.reload();
            }
            break;
          case 12:
            // Set/Clear Retry Interval
            var tab = chromeWindow.gBrowser.selectedTab;
            if (tab._retryInterval) {
              tab._retryInterval.stop();
              delete tab._retryInterval;
            } else {
              var delay = bwTime.fromString(chromeWindow.prompt("Reload after how many seconds?", (this.defaultDelay || 30)));
              if (delay.isBetween(1, MAX_DURATION)) {
                this.defaultDelay = delay;
                tab._retryInterval = new bwApp.retryInterval(tab, delay);
              }
            }
            break;
        }
      }
    },

    createMenu: function(document, callback) {
      var document = (document ? document : bwGecko.changeType(windows.activeWindow).document);
      var actions = bwApp.getActions();
      var menu = document.createElement("menupopup");

      for (var i in actions) {
        if ((!callback && i == 1) || i == 3 || i == 5 || i == 7)
          menu.appendChild(document.createElement("menuseparator"));

        if (callback && i == 0) {  // jshint ignore:line
          // Skip blank entry for context menus.
        } else {
          var item = document.createElement("menuitem");
          item.setAttribute("value", i);
          item.setAttribute("label", actions[i]);
          if (typeof(callback) == "function") {
            item.setAttribute("class", "menuitem-iconic");
            item.setAttribute("style", "list-style-image: url('" + self.data.url("action" + i + ".png") + "');");
            item.addEventListener("command", function() callback(parseInt(this.value, 10)));
          }
          menu.appendChild(item);
        }
      }

      return menu;
    },

    dispatch: function(ctrl, alt, shift, meta, button) {
      var pref = "actions.mod" + ((ctrl ? "Ctrl" : "") + (alt ? "Alt" : "") + (shift ? "Shift" : "") + (meta ? "Meta" : "") || "Open") + button;
      var action = bwPreferences.get(pref);
      if (action)
        bwApp.executeAction(action);
    },

    getActions: function() {
      var customName = bwPreferences.getJSON("customAction").name;
      return [
        "---",
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
        "Set/Clear Retry Interval",
      ]
    },

    getMods: function() {
      var button = bwPreferences.get("rightIsMiddle") ? "Right" : "Middle";
      var functionKey = bwPreferences.get("functionKey");
      return {
        "modOpen0":  "Left Mouse (or F" + functionKey + ")",
        "modCtrl0":  "Ctrl+LMouse (or Ctrl+F" + functionKey + ")",
        "modAlt0":   "Alt+LMouse (or Alt+F" + functionKey + ")",
        "modShift0": "Shift+LMouse (or Shift+F" + functionKey + ")",
        "modOpen1":  button + " Mouse",
        "modCtrl1":  "Ctrl+" + button[0] + "Mouse",
        "modAlt1":   "Alt+" + button[0] + "Mouse",
        "modShift1": "Shift+" + button[0] + "Mouse",
      }
    },

    hotkeys: {
      bind: function() {
        var functionKey = bwPreferences.get("functionKey");
        var vals = [false, true];

        this.unbind();

        for each (var meta in vals) { for each (var shift in vals) { for each (var alt in vals) { for each (var ctrl in vals) {
          this.hotkeys.push(Hotkey({
            "combo": (ctrl ? "ctrl-" : "") + (alt ? "alt-" : "") + (shift ? "shift-" : "") + (meta ? "meta-" : "") + "f" + functionKey,
            "onPress": bwApp.dispatch.bind(bwApp, ctrl, alt, shift, meta, 0),
          }));
        } } } }
      },

      unbind: function() {
        for (var i in this.hotkeys)
          this.hotkeys[i].destroy();
        this.hotkeys = [];
      },
    },

    onHTTPResponse: function(event) {
      try {
        var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel);
        var browser = httpChannel.notificationCallbacks.getInterface(Ci.nsILoadContext).topFrameElement;
        var chromeWindow = browser.ownerGlobal;
        var tab = chromeWindow.gBrowser.getTabForBrowser(browser);
        if (typeof(tab._unsuccessful) == "undefined")
          tab._unsuccessful = (String(httpChannel.responseStatus)[0] == "5");
      } catch (e) { }
    },

    onOfflineModified: function(event) {
      if (event.data == "online") {
        var action = bwPreferences.get("workOnlineAction");
        if (action > 0)
          bwApp.executeAction(action + 7);
      }
    },

    onOptionsDisplayed: function() {
      var document = bwGecko.changeType(windows.activeWindow).content.document;
      var mods = bwApp.getMods();
      for (var mod in mods) {
        var menu = bwApp.createMenu();
        var e = document.getElementById("reloadplus-actions-" + mod);
        e.appendChild(menu);
        e.value = bwPreferences.get("actions." + mod);
      }
    },

    onOptionsModified: function(pref) {
      switch (pref) {
        case "functionKey":
          bwApp.hotkeys.bind();
          break;
      }
    },

    onPageEvent: function(event) {
      // TODO: Migrate to tabs API pageshow/pagehide when pagehide is available.
      var chromeWindow = event.currentTarget.ownerDocument.defaultView;
      var document = event.originalTarget;

      if (chromeWindow.location == "chrome://browser/content/browser.xul" && !document.defaultView.frameElement) {
        // Only handle what page-mod can't.
        if (!document.toString().contains("[object HTMLDocument]") || document.documentURI == "about:blank") {
          var func = (event.type == "DOMContentLoaded" ? bwApp.onPageLoad : bwApp.onPageUnload);
          var tab = chromeWindow.gBrowser.tabs[chromeWindow.gBrowser.getBrowserIndexForDocument(document)];
          if (tab) {
            tab._unsuccessful = false;
            func(tab, document.documentURI);
          }
        }
      }
    },

    onPageLoad: function(tab, documentURI) {
      if (tab) {
        var error = /^about:neterror\?e=(\w+)&/.extractMatch(documentURI);
        if (error && !TO_IGNORE.contains(error) || tab._unsuccessful) {
          tab._unsuccessful = true;
          var delay = bwPreferences.get("autoRetryDelay");
          if (delay.isBetween(1, MAX_DURATION)) {
            if (tab._autoRetryInterval) {
              tab._autoRetryInterval.start();
            } else {
              tab._autoRetryInterval = new bwApp.retryInterval(tab, delay);
            }
          } else {
            delete tab._autoRetryInterval;
          }
        } else {
          delete tab._autoRetryInterval;
        }

        if (tab._retryInterval && !tab._autoRetryInterval)
          tab._retryInterval.start();
      }
    },

    onPageUnload: function(tab, documentURI) {
      if (tab) {
        delete tab._unsuccessful;
        var retryInterval = tab._autoRetryInterval || tab._retryInterval;
        if (retryInterval)
          retryInterval.stop();
      }
    },

    onWidgetClick: function(event) {
      if (TO_ATTACH.contains(event.target.id) && !event.target.disabled) {
        if (event.button === 0 || event.button == 1) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2 && bwPreferences.get("rightIsMiddle")) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 1);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2) {
          var menu = event.target.getElementsByTagName("menupopup")[0];
          menu.openPopup(event.target, "after_start", 0, 0);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    },

    onWidgetMouseOver: function(event) {
      var actions = bwApp.getActions();
      var mods = bwApp.getMods();
      var button = "", tooltip = "";

      for (var i in mods) {
        var val = bwPreferences.get("actions." + i);
        if (button != (button = i.charAt(i.length - 1)))
          tooltip += "\n";
        if (val > 0)
          tooltip += mods[i] + " = " + actions[val] + "\n";
      }

      this.setAttribute("tooltiptext", tooltip.trim());
    },

    onWindowClose: function(chromeWindow) {
      var appcontent = chromeWindow.document.getElementById("appcontent");
      if (appcontent) {
        appcontent.removeEventListener("DOMContentLoaded", bwApp.onPageEvent, true);
        appcontent.removeEventListener("beforeunload", bwApp.onPageEvent, true);
      }

      for each (var button in TO_ATTACH) {
        var reloadButton = chromeWindow.document.getElementById(button);
        if (reloadButton) {
          reloadButton.setAttribute("command", this.defaultState[button].command);
          reloadButton.setAttribute("onclick", this.defaultState[button].onclick);
          reloadButton.setAttribute("oncommand", this.defaultState[button].oncommand);
          reloadButton.setAttribute("tooltiptext", this.defaultState[button].tooltiptext);

          var menu = reloadButton.getElementsByTagName("menupopup")[0];
          if (menu)
            reloadButton.removeChild(menu);

          reloadButton.removeEventListener("click", bwApp.onWidgetClick, true);
          reloadButton.removeEventListener("mouseover", bwApp.onWidgetMouseOver, true);
        }
      }
    },

    onWindowOpen: function(chromeWindow) {
      var appcontent = chromeWindow.document.getElementById("appcontent");
      if (appcontent) {
        appcontent.addEventListener("DOMContentLoaded", bwApp.onPageEvent, true);
        appcontent.addEventListener("beforeunload", bwApp.onPageEvent, true);
      }

      for each (var button in TO_ATTACH) {
        var reloadButton = chromeWindow.document.getElementById(button);
        if (reloadButton) {
          if (!this.defaultState)
            this.defaultState = {};

          this.defaultState[button] = {};
          this.defaultState[button].command = reloadButton.getAttribute("command");
          this.defaultState[button].onclick = reloadButton.getAttribute("onclick");
          this.defaultState[button].oncommand = reloadButton.getAttribute("oncommand");
          this.defaultState[button].tooltiptext = reloadButton.getAttribute("tooltiptext");

          reloadButton.removeAttribute("command");
          reloadButton.removeAttribute("disabled");
          reloadButton.removeAttribute("onclick");
          reloadButton.removeAttribute("oncommand");

          var menu = bwApp.createMenu(chromeWindow.document, function(action) bwApp.executeAction(action));
          reloadButton.appendChild(menu);

          reloadButton.addEventListener("click", bwApp.onWidgetClick, true);
          reloadButton.addEventListener("mouseover", bwApp.onWidgetMouseOver, true);
        }
      }
    },

    retryInterval: function(tab, delay) {
      if (tab.tagName != "tab" || !delay.isBetween(1, MAX_DURATION))
        return false;

      var badge = new bwBadge(tab);
      var chromeWindow = tab.ownerGlobal;
      var timer;

      var retryInterval = {
        "confirmedPages": [],

        start: function() {
          // TODO: Remove this workaround when e10s reliably calls onPageUnload.
          retryInterval.stop();

          var browser = bwGecko.createLoader(tab);
          var timeLeft = delay;

          if (browser.posted && !this.confirmedPages.contains(browser.url)) {
            if (prompts.confirm(chromeWindow, browser.url, "WARNING: Form data will be resubmitted on every reload. Is this acceptable?")) {
              this.confirmedPages.push(browser.url);
            } else {
              return false;
            }
          }

          badge.show(bwTime.toString(timeLeft));
          timer = chromeWindow.setInterval(function() {
            if (--timeLeft > 0) {
              badge.show(bwTime.toString(timeLeft));
            } else {
              var focused = chromeWindow.document.getElementById("urlbar").getAttribute("focused");
              if (focused == "true" && tab == chromeWindow.gBrowser.selectedTab) {
                badge.show("...");
                return false;
              }

              retryInterval.stop();
              browser.reload();
            }
          }, 1000);
        },

        stop: function() {
          badge.hide();
          chromeWindow.clearInterval(timer);
        }
      }

      if (!tab._autoRetryInterval)
        retryInterval.start();

      return retryInterval;
    },
  }

  var bwGecko = {
    changeType: function(obj) {
      return (obj.once ? this.viewFor(obj) : this.modelFor(obj));
    },

    createLoader: function(tab) {
      var nav = tab.linkedBrowser.webNavigation;
      var entry = nav.sessionHistory.getEntryAtIndex(nav.sessionHistory.index, false).QueryInterface(Ci.nsISHEntry);

      var currentURI = nav.currentURI.spec;
      var loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
      var postData = entry.postData;
      var referrerURI = entry.referrerURI;

      return {
        "posted": Boolean(postData),
        "url": currentURI,

        reload: function() {
          if (postData) {
            nav.loadURI(currentURI, loadFlags, referrerURI, postData, null);
          } else {
            tab.linkedBrowser.reload();
          }
        },
      }
    },

    modelFor: require("sdk/model/core").modelFor,
    viewFor: require("sdk/view/core").viewFor,
  }

  var bwTime = {
    fromString: function(time) {
      if (match = /(?:(\d+)[d:])*?(?:(\d+)[h:])*?(?:(\d+)[m:])*?(?:(\d+)s?)*?$/i.exec(time)) {
        var d = (parseInt(match[1], 10) || 0) * 86400;
        var h = (parseInt(match[2], 10) || 0) * 3600;
        var m = (parseInt(match[3], 10) || 0) * 60;
        var s = (parseInt(match[4], 10) || 0);
        return d + h + m + s;
      } else {
        return parseInt(time, 10) || 0;
      }
    },

    toString: function(time) {
      if (time >= 60) {
        var h = parseInt(time / 3600, 10); h = (h > 0 ? h+":" : "");
        var m = parseInt(time % 3600 / 60, 10); m = (h && m < 10 ? "0"+m+":" : m+":");
        var s = parseInt(time % 3600 % 60, 10); s = (s < 10 ? "0"+s : s);
        return h + m + s;
      } else {
        return time;
      }
    },
  }

  Object.defineProperty(Array.prototype, "contains", {
    "value": function(needle) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] == needle)
          return true;
      }
      return false;
    }
  });

  Object.defineProperty(Number.prototype, "isBetween", {
    "value": function(min, max) {
      return (this >= min && this <= max);
    }
  });

  Object.defineProperty(RegExp.prototype, "extractMatch", {
    "value": function(data, num = 1) {
      var match = this.exec(data);
      if (match && match[num]) {
        return match[num];
      } else {
        return false;
      }
    }
  });

  // Declare the necessary constants.
  const DEBUG_MODE = require("sdk/system").pathFor("ProfD").endsWith(".mozrunner");
  const MAX_ACTION = bwApp.getActions().length - 1;
  const MAX_DURATION = 86400;
  const TO_ATTACH = [
    "ctr_reload-button",
    "ctraddon_reload-button",
    "reload-button",
    "urlbar-reload-button",
  ];
  const TO_IGNORE = [
    "cspBlocked",
    "fileNotFound",
    "malformedURI",
    "malwareBlocked",
    "netOffline",
    "notCached",
    "redirectLoop",
    "remoteXUL",
    "sslv3Used",
    "unknownProtocolFound",
  ];

  // Apply a default set of preferences.
  bwPreferences.init({
    "actions.modOpen0":  {"default": 1, "min": 0, "max": MAX_ACTION},
    "actions.modOpen1":  {"default": 2, "min": 0, "max": MAX_ACTION},
    "actions.modCtrl0":  {"default": 3, "min": 0, "max": MAX_ACTION},
    "actions.modCtrl1":  {"default": 4, "min": 0, "max": MAX_ACTION},
    "actions.modAlt0":   {"default": 7, "min": 0, "max": MAX_ACTION},
    "actions.modAlt1":   {"default": 8, "min": 0, "max": MAX_ACTION},
    "actions.modShift0": {"default": 5, "min": 0, "max": MAX_ACTION},
    "actions.modShift1": {"default": 6, "min": 0, "max": MAX_ACTION},
    "autoRetryDelay":    {"default": (DEBUG_MODE ? 5 : 0), "min": 0, "max": MAX_DURATION},
    "customAction":      {"default": '{"name": "Google Cache", "url": "https://www.google.com/search?q=cache:%s"}'},
    "functionKey":       {"default": 5, "min": 1, "max": 24},
    "rightIsMiddle":     {"default": false},
    "workOnlineAction":  {"default": 0, "min": 0, "max": 4},
  }, true, bwApp.onOptionsDisplayed, bwApp.onOptionsModified);

  // Attach and begin execution.
  bwApp.hotkeys.bind();
  observer.on("http-on-examine-cached-response", bwApp.onHTTPResponse);
  observer.on("http-on-examine-merged-response", bwApp.onHTTPResponse);
  observer.on("http-on-examine-response", bwApp.onHTTPResponse);
  observer.on("network:offline-status-changed", bwApp.onOfflineModified);
  PageMod({
    "include": /.*/,
    "contentScriptFile": self.data.url("content.js"),
    "contentScriptOptions": {},
    "contentScriptWhen": "start",
    "attachTo": ["existing", "top"],
    onAttach: function(worker) {
      worker.port.on("onPageLoad", function(documentURI) {
        if (worker.tab)
          bwApp.onPageLoad(bwGecko.changeType(worker.tab), documentURI);
      });
      worker.port.on("onPageUnload", function(documentURI) {
        if (worker.tab)
          bwApp.onPageUnload(bwGecko.changeType(worker.tab), documentURI);
      });
    },
  });
  for each (var highLevelWindow in windows) bwApp.onWindowOpen(bwGecko.changeType(highLevelWindow));
  windows.on("open", function(highLevelWindow) bwApp.onWindowOpen(bwGecko.changeType(highLevelWindow)));
  windows.on("close", function(highLevelWindow) bwApp.onWindowClose(bwGecko.changeType(highLevelWindow)));
})();
