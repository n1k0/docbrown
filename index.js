(function() {
  "use strict";
  var DocBrown = {};
  var slice = [].slice;
  var hasOwnProperty = [].hasOwnProperty;

  function isPromise(obj) {
    return typeof obj === "object" &&
           typeof obj.then === "function" &&
           typeof obj.catch === "function";
  }

  function merge(obj) {
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  }

  function tryApply(obj, method, args) {
    if (typeof obj[method] !== "function") return;
    var res = obj[method].apply(obj, args);
    if (isPromise(res)) {
      res.then(function() {
        tryApply(obj, method + "Success", slice.call(arguments));
      }, function() {
        tryApply(obj, method + "Error", slice.call(arguments));
      });
    }
  }

  function Dispatcher() {
    // format: {actionA: [storeA, storeB], actionB: [storeC]}
    this._actionHandlers = {};
  }
  Dispatcher.prototype = {
    get actionHandlers() {
      return this._actionHandlers;
    },
    register: function(action, store) {
      if (this.registeredFor(action).indexOf(store) !== -1) return;
      if (this.actionHandlers.hasOwnProperty(action)) {
        this.actionHandlers[action].push(store);
      } else {
        this.actionHandlers[action] = [store];
      }
    },
    unregister: function(action, store) {
      if (this.registeredFor(action).indexOf(store) === -1) return;
      if (!this.actionHandlers.hasOwnProperty(action)) return;
      this.actionHandlers[action] = this.actionHandlers[action].filter(function(registeredStore) {
        return store !== registeredStore;
      });
    },
    dispatch: function(action) {
      var actionArgs = slice.call(arguments, 1);
      (this.actionHandlers[action] || []).forEach(function(store) {
        tryApply(store, action, actionArgs);
      });
    },
    registeredFor: function(action) {
      return this.actionHandlers[action] || [];
    }
  };
  DocBrown.Dispatcher = Dispatcher;

  DocBrown.createDispatcher = function() {
    return new Dispatcher();
  };

  DocBrown.createActions = function(dispatcher, actionNames) {
    if (!(dispatcher instanceof Dispatcher)) {
      throw new Error("Invalid dispatcher");
    }
    if (!Array.isArray(actionNames)) {
      throw new Error("Invalid actions array");
    }
    var baseActions = actionNames.reduce(function(actions, name) {
      actions[name] = dispatcher.dispatch.bind(dispatcher, name);
      return actions;
    }, {_dispatcher: dispatcher, _registered: actionNames});
    baseActions.only = function() {
      if (!arguments.length) return this;
      return DocBrown.createActions(dispatcher, slice.call(arguments));
    };
    baseActions.drop = function() {
      if (!arguments.length) return this;
      var exclude = ["drop", "only"].concat(slice.call(arguments));
      var actions = Object.keys(this).filter(function(name) {
        return exclude.indexOf(name) === -1;
      });
      return DocBrown.createActions(dispatcher, actions);
    };
    return baseActions;
  };

  var baseStoreProto = {
    getState: function() {
      return this.__state;
    },
    setState: function(state) {
      if (typeof state !== "object") {
        throw new Error("setState only accepts objects");
      }
      // Poor man's inefficient but strict & safe change check. I know.
      var changed = Object.keys(state).some(function(prop) {
        return !this.__state.hasOwnProperty(prop) ||
               state[prop] !== this.__state[prop];
      }, this);
      if (!changed) return;
      this.__state = merge({}, this.__state, state);
      this.__listeners.forEach(function(listener) {
        listener(this.__state);
      }.bind(this));
    },
    subscribe: function(listener) {
      this.__listeners.push(listener);
    },
    unsubscribe: function(listener) {
      this.__listeners = this.__listeners.filter(function(registered) {
        return registered !== listener;
      });
    },
    registerAll: function() {
      this.actions.forEach(function(Actions) {
        Actions._registered.forEach(function(action) {
          this._dispatcher.register(action, this);
        }, this);
      }, this);
    },
    unregisterAll: function() {
      this.actions.forEach(function(Actions) {
        Actions._registered.forEach(function(action) {
          this._dispatcher.unregister(action, this);
        }, this);
      }, this);
    }
  };

  DocBrown.createStore = function(storeProto) {
    if (typeof storeProto !== "object") {
      throw new Error("Invalid store prototype");
    }
    function BaseStore() {
      this.__state = {};
      this.__listeners = [];
      var args = slice.call(arguments);
      if (typeof this.initialize === "function") {
        this.initialize.apply(this, args);
      }
      if (typeof this.getInitialState === "function") {
        this.__state = this.getInitialState();
      }
      if (!Array.isArray(this.actions) || this.actions.length === 0) {
        throw new Error("Stores must define a non-empty actions array");
      }
      this._dispatcher = this.actions[0]._dispatcher;
      this.registerAll();
    }
    BaseStore.prototype = merge({
      get state() {
        return this.__state;
      }
    }, baseStoreProto, storeProto);
    return BaseStore;
  };

  DocBrown.storeMixin = function(store) {
    var _getStore;
    if (typeof store === "function") {
      _getStore = store;
    } else if (typeof store === "object") {
      _getStore = function() {
        return store;
      };
    } else {
      throw new Error("Unsupported store retriever.");
    }
    return {
      getStore: function() {
        var store = _getStore();
        if (!store)
          throw new Error("Missing store");
        return store;
      },
      getInitialState: function() {
        // Earliest hook available, attaching change listener now.
        this.__changeListener = function(state) {
          this.setState(state);
        }.bind(this);
        return this.getStore().getState();
      },
      componentDidMount: function() {
        this.getStore().subscribe(this.__changeListener);
      },
      componentWillUnmount: function() {
        this.getStore().unsubscribe(this.__changeListener);
        delete this.__changeListener;
      }
    };
  };

  if (typeof module === "object" && module.exports) {
    module.exports = DocBrown;
  } else if (typeof window === "object") {
    window.DocBrown = DocBrown;
  } else {
    console.warn("[DocBrown] Only commonjs and browser DOM are supported.");
  }
})();
