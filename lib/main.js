(function() {
  var winUtils = require("window-utils");
  const { Hotkey } = require("hotkeys");

  var reloadShift = Hotkey({
    combo: "shift-f5",
    onPress: function() {
      bwReloadPlus(1, 0, 0, 0);
    }
  });
  var reloadCtrl = Hotkey({
    combo: "ctrl-f5",
    onPress: function() {
      bwReloadPlus(0, 1, 0, 0);
    }
  });
  var reloadAlt = Hotkey({
    combo: "alt-f5",
    onPress: function() {
      bwReloadPlus(0, 0, 1, 0);
    }
  });

  var delegate = {
    onTrack: function(window) {
      //console.log("Tracking a window: " + window.location);
      var buttons = new Array("reload-button", "urlbar-reload-button");
      for (x in buttons) {
        //console.log("Reload Plus: Binding " + buttons[x]);
        var reloadButton = window.document.getElementById(buttons[x]);
        if (reloadButton) {
          reloadButton.removeAttribute("command");
          reloadButton.removeAttribute("disabled");
          reloadButton.removeAttribute("onclick");
          reloadButton.removeAttribute("oncommand");
          reloadButton.setAttribute("tooltiptext", "Left Mouse (or F5) = Standard Reload\r\n" +
                                                   "Ctrl+LMouse (or Ctrl+F5) = Override Cache\r\n" +
                                                   "Alt+LMouse (or Alt+F5) = Load Missing Images\r\n" +
                                                   "Shift+LMouse (or Shift+F5) = Google Cache\r\n" +
                                                   "\r\n" +
                                                   "Middle Mouse = Standard Reload (new tab)\r\n" +
                                                   "Ctrl+MMouse = Override Cache (new tab)\r\n" +
                                                   "Alt+MMouse = Reload All Tabs\r\n" +
                                                   "Shift+MMouse = Google Cache (new tab)");
          reloadButton.addEventListener("click", function(event) {
            if (!this.disabled) {
              if (event.button == 0 || event.button == 1) {
                bwReloadPlus(event.shiftKey, event.ctrlKey, event.altKey, event.button);
                //console.log("Reload Plus: Fired!");
              }
            }
            event.preventDefault();
            event.stopPropagation();
          }, true);
        }
      }
    },
    onUntrack: function(window) {
      //console.log("Untracking a window: " + window.location);
    }
  };
  var tracker = new winUtils.WindowTracker(delegate);

  function bwReloadPlus(shift, ctrl, alt, button) {
    var window = winUtils.activeWindow;
    var url = window._content.document.location.href;
    var cached = "http://www.google.com/search?q=cache:" + escape(url);

    if (button == 0) {
      // Current tab actions (left-click).
      if (shift && !ctrl && !alt) {
        // Load Google Cache
        window._content.document.location.href = cached;
      } else if (ctrl && !shift && !alt) {
        // Full Reload
        window.BrowserReloadSkipCache();
      } else if (alt && !shift && !ctrl) {
        // Load Missing Images
        var imgs = window._content.document.getElementsByTagNameNS("*", "img");
        if (imgs && imgs.length) {
          for (var i = 0; i < imgs.length; ++i) {
            imgs[i].src = imgs[i].src;
          }
        }
      } else {
        // Standard Reload
        window.BrowserReload();
      }
    } else if (button == 1) {
      // New tab actions (middle-click).
      if (shift && !ctrl && !alt) {
        // Load Google Cache
        var tab = window.gBrowser.addTab(cached);
        window.gBrowser.selectedTab = tab;
      } else if (ctrl && !shift && !alt) {
        // Full Reload
        var tab = window.gBrowser.addTab(url);
        window.gBrowser.selectedTab = tab;
        window.BrowserReloadSkipCache();
      } else if (alt && !shift && !ctrl) {
        // Reload All Tabs
        window.gBrowser.reloadAllTabs();
      } else {
        // Standard Reload
        var tab = window.gBrowser.addTab(url);
        window.gBrowser.selectedTab = tab;
      }
    }
  }
})();
