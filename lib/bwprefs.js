(function() {
  module.exports = {
    _service: require("simple-prefs"),
    _vars: { defaultState: {} },

    get: function(strVar) {
      if (state = this.state(strVar)) {
        var result = this._service.prefs[strVar] || (this._service.prefs[strVar] = state["default"]);
        if (typeof(result) == "number" && typeof(state["min"]) == "number" && typeof(state["max"]) == "number") {
          if (result < state["min"] || result > state["max"]) {
            result = state["default"];
            this.set(strVar, state["default"]);
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
            result = JSON.parse(state["default"]);
            this.set(strVar, state["default"]);
          } catch (e) {
            result = new Object();
          }
        }
        return result;
      } else {
        return false;
      }
    },

    /*getRegex: function(rgxFilter) {
      var result = {};
      for (var pref in this._service.prefs) {
        if (typeof(rgxFilter) == "regex" && rgxFilter.test(pref)) {
          console.log(pref);
          result.push(pref);
        }
      }
      return result;
    }, -- this.getWildcard("actions.*"); -- use this to add all bound actions onOptionsDisplayed */

    has: function(strVar) {
      return (typeof(this._service.prefs[strVar]) != "undefined");
    },

    init: function(objDefaults, boolAllowUndeclared, cbkDisplayed, cbkModified) {
      if (typeof(objDefaults) == "object" && Object.keys(this._vars.defaultState).length === 0) {
        this._vars.defaultState = objDefaults;
        this._vars.allowUndeclared = boolAllowUndeclared || false;

        for (var item in this._vars.defaultState) {
          if (!this.has(item)) this.set(item, this._vars.defaultState[item]["default"]);
          if (typeof(cbkModified) == "function") {
            this._service.on(item, cbkModified);
          }
        }

        if (typeof(cbkDisplayed) == "function") {
          require("observer-service").add("addon-options-displayed", function(subject, data) {
            if (data == require("self").id) cbkDisplayed(subject);
          });
        }

        return true;
      } else {
        return false;
      }
    },

    set: function(strVar, objVal) {
      if (this.state(strVar)) {
        return this._service.prefs[strVar] = objVal;
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
    },
  }
})();
