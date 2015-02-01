DocBrown
========

Minimalistic, simple, opinionated Flux implementation. Yeah, yet another one, sorry.

Read [more about Flux here](http://facebook.github.io/flux/docs/overview.html).

Dispatcher
----------

That's rather simple:

```js
var Dispatcher = DocBrown.createDispatcher();
```

Stores
------

### Definition

```js
var TimeStore = DocBrown.createStore({
  getInitialState: function() {
    return {year: 2015};
  }
});
```

### Usage

```js
var store = new TimeStore();

console.log(store.getState().year); // 2015

store.subscribe(function(state) {
  console.log(state.year);                 // 1995
  console.log(state === store.getState()); // true
});

store.setState({year: 1995})
```

### Registering

Stores need to be registered against the Dispatcher, so it can notify subscribers from state change.

```js
var timeStore = new TimeStore();
var plutoniumStore = new PlutoniumStore();

// Register stores to be notified by action events.
Dispatcher.register({
  timeStore: timeStore,
  plutoniumStore: plutoniumStore
});
```

Actions
-------

### Definition

Actions are defined using an array of strings, where entries are action names. Actions are responsible of dispatching events on their own, that's why they need to know about the dispatcher.

```js
var Dispatcher = DocBrown.createDispatcher();
var TimeActions = DocBrown.createActions(Dispatcher, [
  "backward",
  "forward"
]);
```

### Conventions

- The name of the action should match the one of the store which should be called;
- Args passed to the action function are applied to the store method.

```js
var TimeStore = DocBrown.createStore({
  getInitialState: function() {
    return {year: 2015};
  },
  backward: function(years) {
    this.setState({year: this.getState().year - years});
  },
  forward: function(years) {
    this.setState({year: this.getState().year + years});
  }
});
var store = new TimeStore();

Dispatcher.register({timeStore: timeStore});

timeStore.subscribe = function(state) {
  console.log(state.year, state === store.getState());
};

Action.forward(20);  // 2035, true
Action.backward(20); // 1995, true
```

## Asynchronous actions

**There's no such thing as async actions.** Let's keep the initial need simple and iron out the problem; an asynchronous operation should first call a sync action and then make the store triggering new actions dedicated to handle successes and failures:

```js
var TimeActions = DocBrown.createActions(Dispatcher, [
  "travelBackward",
  "travelBackwardSucceeded",
  "travelBackwardFailed"
]);

var TimeStore = DocBrown.createStore({
  getInitialState: function() {
    return {year: 2015, error: null};
  },
  travelBackward: function(years) {
    setTimeout(function() {
      if (Math.random() > .5) {
        Actions.travelBackwardSucceeded(this.getState().years - years);
      } else {
        Actions.travelBackwardFailed(new Error("Damn."));
      }
    }.bind(this), 50);
  },
  travelBackwardSucceeded: function(newYear) {
    this.setState({year: newYear});
  },
  travelBackwardFailed: function(err) {
    this.setState({error: err});
  }
});
```

React mixin
===========

This implementation isn't tied to [React](facebook.github.io/react/), though a React mixin is provided. A demo is available in the `demo/` directory.

Basic usage:

```js
var Dispatcher = DocBrown.createDispatcher();

var Actions = DocBrown.createActions(Dispatcher, ["travelBy"]);

var TimeStore = DocBrown.createStore({
  getInitialState: function() {
    return {year: new Date().getFullYear()};
  },
  travelBy: function(years) {
    this.setState({year: this.getState().year + years});
  }
});

Dispatcher.register({timeStore: new TimeStore()});

var Counter = React.createClass({
  mixins: [DocBrown.storeMixin(Dispatcher, "timeStore")],

  travelClickHandler: function(years) {
    return function() {
      Actions.travelBy(years);
    };
  },

  render: function() {
    return <div>
      <p style={{fontSize: "30px"}}>Year: {this.state.year}</p>
      <button onClick={this.travelClickHandler(-1)}>back 1 year</button>
      <button onClick={this.travelClickHandler(1)}>forward 1 year</button>
    </div>;
  }
});

React.render(<Counter/>, document.body);
```

Install
=======

    $ git clone https://github.com/n1k0/docbrown.git
    $ npm install --dev

Test
====

    $ npm test

License
=======

MIT.
