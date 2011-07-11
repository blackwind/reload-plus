(function() {
  module.exports = {
    service: require("preferences-service"),
    root: "extensions." + require("self").id.split("@")[0] + ".",
    vars: {},

    get: function(strVar) {
      if (state = this.state(strVar)) {
        var result = this.service.get(this.root + strVar, state["default"]);
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

    has: function(strVar) {
      return this.service.has(this.root + strVar);
    },

    init: function(objDefaults) {
      if (typeof(objDefaults) == "object" && Object.keys(this.vars).length === 0) {
        this.vars = objDefaults;
        for (item in this.vars) {
          if (!this.has(item)) {
            this.set(item, this.vars[item]["default"]);
          }
        }
        return true;
      } else {
        return false;
      }
    },

    set: function(strVar, objVal) {
      if (this.state(strVar)) {
        return this.service.set(this.root + strVar, objVal);
      } else {
        return false;
      }
    },

    state: function(strVar) {
      if (typeof(this.vars[strVar]) == "object") {
        return this.vars[strVar];
      } else {
        return false;
      }
    }
  }
})();
