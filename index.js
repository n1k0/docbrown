(function() {
  "use strict";
  var DocBrown = {};

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
          store[actionName].apply(store, [].slice.call(arguments, 1));
        }
      }
    },
    register: function(stores) {
      for (var name in stores) {
        if (!this.registered(name)) {
          this._stores[name] = stores[name];
        }
      }
    },
    registered: function(name) {
      return this.stores.hasOwnProperty(name);
    },
  };
  DocBrown.Dispatcher = Dispatcher;

  DocBrown.createDispatcher = function() {
    return new Dispatcher();
  };

  DocBrown.createActions = function(dispatcher, actions) {
    if (!(dispatcher instanceof Dispatcher)) {
      throw new Error("Invalid dispatcher");
    }
    if (!Array.isArray(actions)) {
      throw new Error("Invalid actions array");
    }
    return actions.reduce(function(actions, name) {
      actions[name] = dispatcher.dispatch.bind(dispatcher, name);
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

  DocBrown.createStore = function(storeProto) {
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

  DocBrown.storeMixin = function(dispatcher, storeName) {
    if (!(dispatcher instanceof Dispatcher)) {
      throw new Error("Invalid dispatcher");
    }
    if (!dispatcher.registered(storeName)) {
      throw new Error("Unknown store name; did you register it?");
    }
    var store = dispatcher.stores[storeName];
    return {
      getStore: function() {
        return store;
      },
      getInitialState: function() {
        // Earliest hook available, attaching change listener now.
        this.__changeListener = function(state) {
          this.setState(state);
        }.bind(this);
        return store.getState();
      },
      componentDidMount: function() {
        store.subscribe(this.__changeListener);
      },
      componentWillUnmount: function() {
        store.unsubscribe(this.__changeListener);
        delete this.__changeListener;
      }
    };
  };

  if (typeof module === "object" && module.exports) {
    module.exports = DocBrown;
  } else if (typeof window === "object") {
    window.DocBrown = DocBrown;
  }
})();
