(function() {
  const PREFS_SERVICE = require("sdk/simple-prefs");

  module.exports = {
    "_vars": {"allowUndeclared": false, "defaultState": {}},

    get: function(strVar) {
      if (state = this.state(strVar)) {
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
      if (state = this.state(strVar)) {
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
            if (event.data == require("sdk/self").id) cbkDisplayed();
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
