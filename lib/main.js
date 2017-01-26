// Reload Plus - Supercharge your reload button and hotkeys!
// Copyright © 2007-2016 bwProductions <http://blackwind.org/>
//
// This add-on is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
//
// This add-on is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along
// with this add-on. If not, see <http://www.gnu.org/licenses/>.

"use strict";

(function() {
  const bwBadge = require("./bwbadge");
  const bwPrefs = require("./bwprefs");
  const {Cc, Ci} = require("chrome");
  const globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
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
        var chromeWindow = _(windows.activeWindow);
        var targetWindows = (bwPrefs.get("targetAllWindows") ? Array.prototype.map.call(windows, w => _(w)) : [chromeWindow]);
        var url = tabs.activeTab.url;
        var urlAlt = bwPrefs.getJSON("customAction").url.replace("%s", escape(url));

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
              "contentScriptOptions": {"do": "loadMissingImages"},
            }).destroy();
            break;
          case 8:
            // Reload All Tabs
            for (let targetWindow of targetWindows) {
              for (let tab of targetWindow.gBrowser.tabs) {
                if (tab.tagName && !tab.hidden)
                  _(tab).reload();
              }
            }
            break;
          case 9:
            // Reload Non-Pinned Tabs
            for (let targetWindow of targetWindows) {
              for (let tab of targetWindow.gBrowser.tabs) {
                if (tab.tagName && !tab.hidden && !tab.pinned)
                  _(tab).reload();
              }
            }
            break;
          case 10:
            // Reload Pinned Tabs
            for (let targetWindow of targetWindows) {
              for (let tab of targetWindow.gBrowser.tabs) {
                if (tab.tagName && !tab.hidden && tab.pinned)
                  _(tab).reload();
              }
            }
            break;
          case 11:
            // Reload Unsuccessful Tabs
            for (let targetWindow of targetWindows) {
              for (let tab of targetWindow.gBrowser.tabs) {
                if (tab.tagName && !tab.hidden && tab._unsuccessful)
                  _(tab).reload();
              }
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
      var document = (document || _(windows.activeWindow).document);
      var actions = bwApp.getActions();
      var menu = document.createElement("menupopup");

      for (let i in actions) {
        if ((!callback && i == 1) || i == 3 || i == 5 || i == 7)
          menu.appendChild(document.createElement("menuseparator"));

        if (callback && i == 0) {
          // Skip blank entry for context menus.
        } else {
          var item = document.createElement("menuitem");
          item.setAttribute("value", i);
          item.setAttribute("label", actions[i]);
          if (typeof(callback) == "function") {
            item.setAttribute("class", "menuitem-iconic");
            item.setAttribute("style", "list-style-image: url('" + self.data.url("images/action-" + i + ".png") + "');");
            item.addEventListener("command", function() { callback(parseInt(this.value, 10)); });
          }
          menu.appendChild(item);
        }
      }

      return menu;
    },

    dispatch: function(ctrl, alt, shift, meta, button) {
      var pref = "actions.mod" + ((ctrl ? "Ctrl" : "") + (alt ? "Alt" : "") + (shift ? "Shift" : "") + (meta ? "Meta" : "") || "Open") + button;
      var action = bwPrefs.get(pref);
      if (action)
        bwApp.executeAction(action);
    },

    getActions: function() {
      var customName = bwPrefs.getJSON("customAction").name;
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
      ];
    },

    getMods: function() {
      var button = bwPrefs.get("rightIsMiddle") ? "Right" : "Middle";
      var functionKey = bwPrefs.get("functionKey");
      return {
        "modOpen0":  "Left Mouse (or F" + functionKey + ")",
        "modCtrl0":  "Ctrl+LMouse (or Ctrl+F" + functionKey + ")",
        "modAlt0":   "Alt+LMouse (or Alt+F" + functionKey + ")",
        "modShift0": "Shift+LMouse (or Shift+F" + functionKey + ")",
        "modOpen1":  button + " Mouse",
        "modCtrl1":  "Ctrl+" + button[0] + "Mouse",
        "modAlt1":   "Alt+" + button[0] + "Mouse",
        "modShift1": "Shift+" + button[0] + "Mouse",
      };
    },

    hotkeys: {
      bind: function() {
        var functionKey = bwPrefs.get("functionKey");
        var vals = [false, true];

        this.unbind();

        for (let ctrl of vals) for (let alt of vals) for (let shift of vals) for (let meta of vals) {
          this.hotkeys.push(Hotkey({
            "combo": (ctrl ? "ctrl-" : "") + (alt ? "alt-" : "") + (shift ? "shift-" : "") + (meta ? "meta-" : "") + "f" + functionKey,
            "onPress": bwApp.dispatch.bind(bwApp, ctrl, alt, shift, meta, 0),
          }));
        }
      },

      unbind: function() {
        for (let i in this.hotkeys)
          this.hotkeys[i].destroy();
        this.hotkeys = [];
      },
    },

    onHttpResponse: function(event) {
      try {
        var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel);
        if (!TO_IGNORE.statusCodes.includes(httpChannel.responseStatus) && !TO_IGNORE.statusTexts.includes(httpChannel.responseStatusText)) {
          var browser = httpChannel.notificationCallbacks.getInterface(Ci.nsILoadContext).topFrameElement;
          var chromeWindow = browser.ownerGlobal;
          var tab = chromeWindow.gBrowser.getTabForBrowser(browser);
          if (typeof(tab._unsuccessful) == "undefined")
            tab._unsuccessful = (String(httpChannel.responseStatus)[0] == "5");
        }
      } catch (e) { }
    },

    onOfflineModified: function(event) {
      if (event.data == "online") {
        var action = bwPrefs.get("workOnlineAction");
        if (action > 0)
          bwApp.executeAction(action + 7);
      }
    },

    onOptionsDisplayed: function(document) {
      var mods = bwApp.getMods();
      for (let mod in mods) {
        var menu = bwApp.createMenu();
        var e = document.getElementById("reloadplus-actions-" + mod);
        e.appendChild(menu);
        e.value = bwPrefs.get("actions." + mod);
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
      // TODO: Migrate to tabs API pageshow/pagehide when bug 1031442 is fixed.
      var chromeWindow = event.currentTarget.ownerDocument.defaultView;
      var document = event.originalTarget;

      if (chromeWindow.location == "chrome://browser/content/browser.xul" && !document.defaultView.frameElement) {
        // Only handle what page-mod can't.
        if (!document.toString().includes("[object HTMLDocument]") || document.documentURI == "about:blank") {
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
        if (error && !TO_IGNORE.netErrors.includes(error) || tab._unsuccessful) {
          tab._unsuccessful = true;
          var delay = bwPrefs.get("autoRetryDelay");
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

    onPageUnload: function(tab) {
      if (tab) {
        delete tab._unsuccessful;
        var retryInterval = tab._autoRetryInterval || tab._retryInterval;
        if (retryInterval)
          retryInterval.stop();
      }
    },

    onWidgetClick: function(event) {
      if (TO_ATTACH.includes(event.target.id) && !event.target.disabled) {
        if (event.button === 0 || event.button == 1) {
          bwApp.dispatch(event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.button == 2 && bwPrefs.get("rightIsMiddle")) {
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

    onWidgetMouseOver: function() {
      var actions = bwApp.getActions();
      var mods = bwApp.getMods();
      var button = "", tooltip = "";

      for (let i in mods) {
        var val = bwPrefs.get("actions." + i);
        if (button != (button = i.charAt(i.length - 1)))
          tooltip += "\n";
        if (val > 0)
          tooltip += mods[i] + " = " + actions[val] + "\n";
      }

      this.setAttribute("tooltiptext", tooltip.trim());
    },

    onWindowLoad: function(chromeWindow) {
      var appcontent = chromeWindow.document.getElementById("appcontent");
      if (appcontent) {
        appcontent.addEventListener("DOMContentLoaded", bwApp.onPageEvent, true);
        appcontent.addEventListener("beforeunload", bwApp.onPageEvent, true);
      }

      for (let id of TO_ATTACH) {
        var reloadButton = chromeWindow.document.getElementById(id);
        if (reloadButton) {
          if (!this.defaultState)
            this.defaultState = {};

          this.defaultState[id] = {};
          this.defaultState[id].command = reloadButton.getAttribute("command");
          this.defaultState[id].onclick = reloadButton.getAttribute("onclick");
          this.defaultState[id].oncommand = reloadButton.getAttribute("oncommand");
          this.defaultState[id].tooltiptext = reloadButton.getAttribute("tooltiptext");

          reloadButton.removeAttribute("command");
          reloadButton.removeAttribute("disabled");
          reloadButton.removeAttribute("onclick");
          reloadButton.removeAttribute("oncommand");

          var menu = bwApp.createMenu(chromeWindow.document, action => bwApp.executeAction(action));
          reloadButton.appendChild(menu);

          reloadButton.addEventListener("click", bwApp.onWidgetClick, true);
          reloadButton.addEventListener("mouseover", bwApp.onWidgetMouseOver, true);
        }
      }
    },

    onWindowUnload: function(chromeWindow) {
      var appcontent = chromeWindow.document.getElementById("appcontent");
      if (appcontent) {
        appcontent.removeEventListener("DOMContentLoaded", bwApp.onPageEvent, true);
        appcontent.removeEventListener("beforeunload", bwApp.onPageEvent, true);
      }

      for (let id of TO_ATTACH) {
        var reloadButton = chromeWindow.document.getElementById(id);
        if (reloadButton) {
          reloadButton.setAttribute("command", this.defaultState[id].command);
          reloadButton.setAttribute("onclick", this.defaultState[id].onclick);
          reloadButton.setAttribute("oncommand", this.defaultState[id].oncommand);
          reloadButton.setAttribute("tooltiptext", this.defaultState[id].tooltiptext);

          var menu = reloadButton.getElementsByTagName("menupopup")[0];
          if (menu)
            reloadButton.removeChild(menu);

          reloadButton.removeEventListener("click", bwApp.onWidgetClick, true);
          reloadButton.removeEventListener("mouseover", bwApp.onWidgetMouseOver, true);
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
          // TODO: Remove this workaround when bugs 967873, 1211321 are fixed.
          retryInterval.stop();

          var browserMM = bwGecko.getBrowserForTab(tab).messageManager;
          browserMM.sendAsyncMessage("createLoader");
          browserMM.addMessageListener("response", function callee(response) { browserMM.removeMessageListener("response", callee);  // eslint-disable-line
            var browser = response.data;
            var timeLeft = delay;

            if (browser.posted && !retryInterval.confirmedPages.includes(browser.url)) {
              if (prompts.confirm(chromeWindow, browser.url, "WARNING: Form data will be resubmitted on every reload. Is this acceptable?")) {
                retryInterval.confirmedPages.push(browser.url);
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
                } else {
                  retryInterval.stop();
                  if (_(tab))  // If tab still open...
                    browserMM.sendAsyncMessage("reload");
                }
              }
            }, 1000);
          });
        },

        stop: function() {
          badge.hide();
          chromeWindow.clearInterval(timer);
        },
      };

      if (!tab._autoRetryInterval)
        retryInterval.start();

      return retryInterval;
    },
  };

  var bwGecko = {
    getBrowserForTab: require("sdk/tabs/utils").getBrowserForTab,
    modelFor: require("sdk/model/core").modelFor,
    viewFor: require("sdk/view/core").viewFor,
  };

  var bwTime = {
    fromString: function(time) {
      var match = /(?:(\d+)[d:])*?(?:(\d+)[h:])*?(?:(\d+)[m:])*?(?:(\d+)s?)*?$/i.exec(time);
      if (match) {
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
        var h = parseInt(time / 3600, 10); h = (h > 0 ? h + ":" : "");
        var m = parseInt(time % 3600 / 60, 10); m = (h && m < 10 ? "0" + m + ":" : m + ":");
        var s = parseInt(time % 3600 % 60, 10); s = (s < 10 ? "0" + s : s);
        return h + m + s;
      } else {
        return time;
      }
    },
  };

  var _ = function(obj) {
    return (obj.once ? bwGecko.viewFor(obj) : bwGecko.modelFor(obj));
  };

  Object.defineProperty(RegExp.prototype, "extractMatch", {
    "value": function(data, num = 1) {
      var match = this.exec(data);
      if (match && match[num]) {
        return match[num];
      } else {
        return false;
      }
    },
  });

  Object.defineProperty(Number.prototype, "isBetween", {
    "value": function(min, max) {
      return (this >= min && this <= max);
    },
  });

  // TODO: Remove polyfill when we require Firefox 43.
  if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
      "value": function(needle) {
        return (this.indexOf(needle) !== -1);
      },
    });
  }

  // TODO: Remove polyfill when we require Firefox 40.
  if (!String.prototype.includes) {
    Object.defineProperty(String.prototype, "includes", {
      "value": function() {
        return this.contains.apply(this, arguments);
      },
    });
  }

  // Declare the necessary constants.
  const DEBUG_MODE = require("sdk/system").pathFor("ProfD").startsWith(require("sdk/system/environment").env.TEMP);
  const MAX_ACTION = bwApp.getActions().length - 1;
  const MAX_DURATION = 86400;
  const TO_ATTACH = [
    "ctr_reload-button",
    "ctraddon_reload-button",
    "reload-button",
    "urlbar-reload-button",
  ];
  const TO_IGNORE = {
    "netErrors": [
      "cspBlocked",
      "fileNotFound",
      "malformedURI",
      "malwareBlocked",
      "notCached",
      "redirectLoop",
      "remoteXUL",
      "sslv3Used",
      "unknownProtocolFound",
    ],
    "statusCodes": [
      509,  // Bandwidth Limit Exceeded
    ],
    "statusTexts": [
      "MediaWiki exception",  // MediaWiki sometimes throws 500 but still correctly displays the page.
    ],
  };

  // Apply a default set of preferences.
  bwPrefs.init({
    "actions.modOpen0":  {"default": 1, "min": 0, "max": MAX_ACTION},
    "actions.modOpen1":  {"default": 2, "min": 0, "max": MAX_ACTION},
    "actions.modCtrl0":  {"default": 3, "min": 0, "max": MAX_ACTION},
    "actions.modCtrl1":  {"default": 4, "min": 0, "max": MAX_ACTION},
    "actions.modAlt0":   {"default": 7, "min": 0, "max": MAX_ACTION},
    "actions.modAlt1":   {"default": 9, "min": 0, "max": MAX_ACTION},
    "actions.modShift0": {"default": 5, "min": 0, "max": MAX_ACTION},
    "actions.modShift1": {"default": 6, "min": 0, "max": MAX_ACTION},
    "autoRetryDelay":    {"default": (DEBUG_MODE ? 5 : 0), "min": 0, "max": MAX_DURATION},
    "customAction":      {"default": '{"name": "Google Cache", "url": "https://www.google.com/search?q=cache:%s"}'},
    "functionKey":       {"default": 5, "min": 1, "max": 24},
    "rightIsMiddle":     {"default": false},
    "targetAllWindows":  {"default": false},
    "workOnlineAction":  {"default": 0, "min": 0, "max": 4},
  }, true, bwApp.onOptionsDisplayed, bwApp.onOptionsModified);

  // Attach and begin execution.
  bwApp.hotkeys.bind();
  globalMM.loadFrameScript(self.data.url("frame.js"), true);
  observer.on("http-on-examine-cached-response", bwApp.onHttpResponse);
  observer.on("http-on-examine-merged-response", bwApp.onHttpResponse);
  observer.on("http-on-examine-response", bwApp.onHttpResponse);
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
          bwApp.onPageLoad(_(worker.tab), documentURI);
      });
      worker.port.on("onPageUnload", function(documentURI) {
        if (worker.tab)
          bwApp.onPageUnload(_(worker.tab), documentURI);
      });
    },
  });
  for (let w of windows) bwApp.onWindowLoad(_(w));
  windows.on("open", w => bwApp.onWindowLoad(_(w)));
  windows.on("close", w => bwApp.onWindowUnload(_(w)));
})();
