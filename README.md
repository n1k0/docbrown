Flux target API
===============

This is a draft, WiP README Driven Development Wishlist for a Flux API. Don't judge, contribute.

Stores
------

### Definition

```js
var MyStore = Flux.createStore({
  initialize: function() {
    // constructor
  },
  getInitialState: function() {
    // default state
    return {};
  },
  getState: function() {
    // current state
    return value;
  }
});
```

### Usage

```js
var myStore = new MyStore(...args);

myStore.subscribe(function(state) {
  console.log(state === myStore.getState()); // true
});
```

Actions
-------

### Definition

Actions are defined using a regular array, where entries are action names.

```js
// Simple (dispatcher is an instance of Dispatcher)
var Actions = Flux.createActions(Dispatcher, ["actionA", "actionB"]);
```

#### Ability to create distinct action objects:

```js
var AActions = Flux.createActions(Dispatcher, ["actionA"]);
var BActions = Flux.createActions(Dispatcher, ["actionB"]);
```

Note: We don't care about name conflicts, because listening stores are supposed to react to a single action name the very same way.

## Usage

### Conventions

- The name of the action should match the listening store method one;
- Args passed to the action function are applied to the listening store method.

```js
var Actions = Flux.createActions(Dispatcher, ["actionA"]);

var Store = Flux.createStore({
  getInitialState: function() {
    return {list: [], error: null};
  },
  actionA: function(a, b, c) {
    this.setState({list: [a, b, c]});
  }
});
var store = new Store();

Dispatcher.register({store: store});

store.subscribe = function(state) {
  console.log(state); // {list: [1, 2, 3], error: null}
  console.log(state === store.getState()); // true
};

Action.actionA(1, 2, 3);

```

## Asynchronous actions

**There's no such thing as async actions.** Let's keep the initial need simple and flatten the problem; an asynchronous operation should first call a sync action and then make the store triggering new actions dedicated to handling success and failures:

```js
var Actions = Flux.createActions(Dispatcher, [
  "actionA",
  "actionASucceeded",
  "actionAFailed"
]);

var Store = Flux.createStore({
  getInitialState: function() {
    return {list: [], error: null};
  },
  actionA: function(a, b, c) {
    setTimeout(function() {
      if (Math.random() > .5) {
        Actions.actionASucceeded(a, b, c);
      } else {
        Actions.actionAFailed(new Error("Boom."));
      }
    }, 50);
  },
  actionASucceeded: function(a, b, c) {
    this.setState({list: [a, b, c]});
  },
  actionAFailed: function(err) {
    this.setState({error: err});
  }
});
```

Dispatcher
----------

Should stay as simple as possible.

### Registering stores

The dispatcher needs to know about the stores to notify with the action events.

```js
var Dispatcher = Flux.createDispatcher();

var storeA = new MyStoreA();
var storeB = new MyStoreB();

// register stores to be notified by action events
Dispatcher.register({
  storeA: storeA,
  storeB: storeB
});
```

React mixin
===========

This spec isn't tied to React, though a mixin would be convenient. Could be:

```js
var Dispatcher = Flux.createDispatcher();
var Actions = Flux.createActions(Dispatcher, ["incrementBy"]);
var CounterStore = Flux.createStore({
  getInitialState: function() {
    return {value: 0};
  },
  incrementBy: function(x) {
    this.state.value += x;
  }
});
Dispatcher.register({counterStore: new CounterStore()})

var Counter = React.createClass({
  mixins: [Flux.storeMixin("counterStore")],

  handleClick: function() {
    Actions.incrementBy(1);
  },

  render: function() {
    return <div>
      <p>{this.state.value}</p>
      <button onClick={this.handleClick}>inc</button>
    </div>;
  }
})
```

Install
=======

    $ git clone https://github.com/n1k0/docbrown.git
    $ nom install --dev

Test
====

    $ npm test

TDD
===

    $ npm run tdd
