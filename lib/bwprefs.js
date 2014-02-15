(function() {
  module.exports = {
    _service: require("sdk/preferences/service"),
    _vars: { defaultState: {} },

    root: "extensions." + require("sdk/self").id.split("@")[0] + ".",
    //root: "extensions." + require("sdk/self").name + ".",

    get: function(strVar) {
      if (state = this.state(strVar)) {
        var result = this._service.get(this.root + strVar, state.default);
        if (typeof(result) == "number" && typeof(state.min) == "number" && typeof(state.max) == "number") {
          if (result < state.min || result > state.max) {
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
            result = JSON.parse(state.default);
            this.set(strVar, state.default);
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
      return this._service.has(this.root + strVar);
    },

    init: function(objDefaults, boolAllowUndeclared, cbkDisplayed, cbkModified) {
      if (typeof(objDefaults) == "object" && Object.keys(this._vars.defaultState).length === 0) {
        this._vars.defaultState = objDefaults;
        this._vars.allowUndeclared = boolAllowUndeclared || false;

        for (var item in this._vars.defaultState) {
          if (!this.has(item)) this.set(item, this._vars.defaultState[item].default);
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
        return this._service.set(this.root + strVar, objVal);
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
  };
})();
