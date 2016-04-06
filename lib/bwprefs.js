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
  const PREFS_SERVICE = require("sdk/simple-prefs");

  module.exports = {
    "_vars": {"allowUndeclared": false, "defaultState": {}},

    get: function(strVar) {
      var state = this.state(strVar);
      if (state) {
        var result = PREFS_SERVICE.prefs[strVar];
        if (typeof(result) == "undefined" || typeof(result) == "number" && (result < state.min || result > state.max)) {
          if (state.default) {
            result = state.default;
            this.set(strVar, state.default);
          }
        }
        return result;
      } else {
        return false;
      }
    },

    getJSON: function(strVar) {
      var state = this.state(strVar);
      if (state) {
        var result = this.get(strVar);
        try {
          result = JSON.parse(result);
        } catch (e) {
          try {
            if (state.default) {
              result = JSON.parse(state.default);
              this.set(strVar, state.default);
            }
          } catch (e) {
            result = {};
          }
        }
        return result;
      } else {
        return false;
      }
    },

    has: function(strVar) {
      return (typeof(PREFS_SERVICE.prefs[strVar]) != "undefined");
    },

    init: function(objDefaults, boolAllowUndeclared, cbkDisplayed, cbkModified) {
      if (typeof(objDefaults) == "object" && Object.keys(this._vars.defaultState).length === 0) {
        this._vars.defaultState = objDefaults;
        this._vars.allowUndeclared = boolAllowUndeclared || false;

        for (var item in this._vars.defaultState) {
          if (!this.has(item)) this.set(item, this._vars.defaultState[item].default);
          if (typeof(cbkModified) == "function") {
            PREFS_SERVICE.on(item, cbkModified);
          }
        }

        if (typeof(cbkDisplayed) == "function") {
          require("sdk/system/events").on("addon-options-displayed", function(event) {
            if (event.data == require("sdk/self").id)
              cbkDisplayed(event.subject);
          }, true);
        }

        return true;
      } else {
        return false;
      }
    },

    set: function(strVar, objVal) {
      if (this.state(strVar)) {
        return PREFS_SERVICE.prefs[strVar] = objVal;
      } else {
        return false;
      }
    },

    state: function(strVar) {
      if (typeof(this._vars.defaultState[strVar]) == "object") {
        return this._vars.defaultState[strVar];
      } else {
        return this._vars.allowUndeclared;
      }
    }
  }
})();
