(function() {
  module.exports = function(tab) {
    const anonid = require("self").id.split("@")[0] + "-badge";
    //const anonid = require("self").name + "-badge";
    const xulNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    if (tab.tagName != "tab" || tab.ownerDocument.getAnonymousElementByAttribute(tab, "anonid", anonid))
      return false;

    var adjacentNode, lastAdjacentNode;
    var inherits = ["fadein", "pinned", "selected"];
    var registeredTab = tab;

    var badge = registeredTab.ownerDocument.createElementNS(xulNS, "xul:label");
    badge.setAttribute("anonid", anonid);
    badge.setAttribute("class", "tab-text tab-badge");
    badge.setAttribute("style", "background-color: #3A3 !important; color: #FFF !important; font-weight: bold !important; margin: 0px 2px !important; padding: 0px 6px !important;");
    badge.setAttribute("xbl:inherits", inherits.join(","));

    this.obj = {
      show: function(val) {
        if (val)
          this.setText(val);

        if (!badge.parentNode || lastAdjacentNode !== adjacentNode) {
          if (badge.parentNode) this.hide();
          lastAdjacentNode = adjacentNode = this._getAdjacentNode();
          if (adjacentNode.parentNode.insertBefore(badge, adjacentNode)) {
            var self = this; registeredTab._onTabEvent = function(event) { self._updateTab(event); }
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
          for (i in inherits) {
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
