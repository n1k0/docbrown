(function() {
  "use strict";
  var DocBrown = {};

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
      var actionArgs = [].slice.call(arguments, 1);
      (this.actionHandlers[action] || []).forEach(function(store) {
        if (typeof store[action] === "function") {
          store[action].apply(store, actionArgs);
        } else {}
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
      return DocBrown.createActions(dispatcher, [].slice.call(arguments));
    };
    baseActions.drop = function() {
      if (!arguments.length) return this;
      var exclude = ["drop", "only"].concat([].slice.call(arguments));
      var actions = Object.keys(this).filter(function(name) {
        return exclude.indexOf(name) === -1;
      });
      return DocBrown.createActions(dispatcher, actions);
    };
    return baseActions;
  };

  function merge(dest) {
    [].slice.call(arguments, 0).forEach(function(source) {
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
        var args = [].slice.call(arguments);
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
          merge(__state, state);
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
    if (!store) {
      throw new Error("Missing store");
    }
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
  } else {
    console.warn("[DocBrown] Only commonjs and browser DOM are supported.");
  }
})();
