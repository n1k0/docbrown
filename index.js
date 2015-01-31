(function() {
  "use strict";
  var Flux = {};

  function Dispatcher() {
    this._stores = {};
  }
  Dispatcher.prototype = {
    get stores() {
      return this._stores;
    },
    dispatch: function(actionName) {
      for (var storeName in this.stores) {
        var store = this.stores[storeName];
        if (typeof store[actionName] === "function") {
          store[actionName].apply(null, [].slice.call(arguments, 1));
        }
      }
    },
    register: function(stores) {
      for (var name in stores) {
        if (!this._stores.hasOwnProperty(name)) {
          this._stores[name] = stores[name];
        }
      }
    }
  };
  Flux.Dispatcher = Dispatcher;

  Flux.createDispatcher = function() {
    return new Dispatcher();
  };

  Flux.createActions = function(dispatcher, actions) {
    if (!(dispatcher instanceof Dispatcher)) {
      throw new Error("Invalid dispatcher");
    }
    if (!Array.isArray(actions)) {
      throw new Error("Invalid actions array");
    }
    return actions.reduce(function(actions, name) {
      actions[name] = dispatcher.dispatch.bind(null, name);
      return actions;
    }, {});
  };

  var BaseStorePrototype = {
    getState: function() {
      return this.__state;
    },
    setState: function(state) {
      this.__state = state;
      this.__listeners.forEach(function(listener) {
        listener(state);
      });
    },
    subscribe: function(listener) {
      this.__listeners.push(listener);
    },
    unsubscribe: function(listener) {
      this.__listeners = this.__listeners.filter(function(registered) {
        return registered !== listener;
      });
    }
  };

  function merge(dest) {
    [].slice.call(arguments, 0).forEach(function(source) {
      for (var prop in source) {
        dest[prop] = source[prop];
      }
    });
    return dest;
  }

  Flux.createStore = function(storeProto) {
    function BaseStore() {
      var args = [].slice.call(arguments);
      this.__state = null;
      this.__listeners = [];
      if (typeof this.initialize === "function") {
        this.initialize.apply(this, args);
      }
      if (typeof this.getInitialState === "function") {
        this.setState(this.getInitialState());
      }
    }
    BaseStore.prototype = merge({}, BaseStorePrototype, storeProto);
    return BaseStore;
  };

  if (typeof module === "object" && module.exports) {
    module.exports = Flux;
  } else if (typeof window === "object") {
    window.Flux = Flux;
  }
})();
