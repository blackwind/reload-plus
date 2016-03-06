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

(function() {
  const BADGE_ANONID = require("sdk/self").name + "-badge";

  module.exports = function(tab, backColor = "#3A3", foreColor = "#FFF") {
    if (tab.tagName != "tab")
      return false;

    var adjacentNode, lastAdjacentNode;
    var inherits = ["fadein", "pinned", "selected"];
    var registeredTab = tab;

    var badge = registeredTab.ownerDocument.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "xul:label");
    badge.setAttribute("anonid", BADGE_ANONID);
    badge.setAttribute("class", "tab-text tab-badge");
    badge.setAttribute("style", "background-color: " + backColor + " !important; border-radius: 2px !important; color: " + foreColor + " !important; font-weight: bold !important; margin: 0px 0px 0px 2px !important; padding: 0px 6px !important; text-decoration: none !important;");
    badge.setAttribute("xbl:inherits", inherits.join(","));

    return {
      show: function(val) {
        if (val)
          this.setText(val);

        if (!badge.parentNode || lastAdjacentNode !== adjacentNode) {
          if (badge.parentNode) this.hide();
          lastAdjacentNode = adjacentNode = this._getAdjacentNode();
          if (adjacentNode.parentNode.insertBefore(badge, adjacentNode)) {
            var self = this; registeredTab._onTabEvent = function(event) { self._updateTab(event); };
            registeredTab.addEventListener("TabMove", registeredTab._onTabEvent);
            this._inheritAttributes();
            this._updatePositioning();
            return true;
          }
        }

        return false;
      },

      hide: function() {
        if (badge.parentNode) {
          if (badge.parentNode.removeChild(badge)) {
            registeredTab.removeEventListener("TabMove", registeredTab._onTabEvent);
            delete registeredTab._onTabEvent;
            this._updatePositioning();
            return true;
          }
        }

        return false;
      },

      getText: function() {
        return badge.getAttribute("value");
      },

      setText: function(val) {
        var result = badge.setAttribute("value", val);
        this._updatePositioning();
        return result;
      },

      _getAdjacentNode: function() {
        return registeredTab.ownerDocument.getAnonymousElementByAttribute(registeredTab, "class", "tab-content").lastChild;
      },

      _inheritAttributes: function() {
        if (badge.parentNode) {
          for (var i in inherits) {
            if (result = badge.parentNode.getAttribute(inherits[i])) {
              badge.setAttribute(inherits[i], result);
            } else {
              badge.removeAttribute(inherits[i]);
            }
          }
        }
      },

      _updatePositioning: function() {
        if (registeredTab.pinned)
          registeredTab.parentNode._positionPinnedTabs();
      },

      _updateTab: function(event) {
        registeredTab = event.target;
        switch (event.type) {
          case "TabMove":
            adjacentNode = null;
            this.show();
            break;
        }
      }
    }
  }
})();
