(function() {
  "use strict";
  var slice = [].slice;
  var DocBrown = {};

  function isPromise(obj) {
    return typeof obj === "object" &&
           typeof obj.then === "function" &&
           typeof obj.catch === "function";
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

  function merge(dest) {
    slice.call(arguments, 0).forEach(function(source) {
      for (var prop in source) {
        if (prop !== "state")
          dest[prop] = source[prop];
      }
    });
    return dest;
  }

  DocBrown.createStore = function(storeProto) {
    if (typeof storeProto !== "object") {
      throw new Error("Invalid store prototype");
    }
    return (function() {
      var __state = {}, __listeners = [];

      // XXX name store to simplify applying mixin
      // eg. storeMixin("timeStore") instead of storeMixin(timeStore)
      function BaseStore() {
        var args = slice.call(arguments);
        if (typeof this.initialize === "function") {
          this.initialize.apply(this, args);
        }
        if (typeof this.getInitialState === "function") {
          __state = this.getInitialState();
        }
        if (!Array.isArray(this.actions) || this.actions.length === 0) {
          throw new Error("Stores must define a non-empty actions array");
        }
        this.actions.forEach(function(Actions) {
          // XXX check for valid Actions object
          var dispatcher = Actions._dispatcher;
          Actions._registered.forEach(function(action) {
            dispatcher.register(action, this);
          }, this);
        }, this);
      }

      BaseStore.prototype = merge({
        get state() {
          return __state;
        },
        getState: function() {
          return __state;
        },
        setState: function(state) {
          if (typeof state !== "object") {
            throw new Error("setState only accepts objects");
          }
          // Poor man's inefficient but strict & safe change check. I know.
          var changed = Object.keys(state).some(function(prop) {
            return !__state.hasOwnProperty(prop) ||
                   state[prop] !== __state[prop];
          });
          if (!changed) return;
          __state = merge({}, __state, state);
          __listeners.forEach(function(listener) {
            listener(__state);
          });
        },
        subscribe: function(listener) {
          __listeners.push(listener);
        },
        unsubscribe: function(listener) {
          __listeners = __listeners.filter(function(registered) {
            return registered !== listener;
          });
        }
      }, storeProto);

      return BaseStore;
    })();
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
