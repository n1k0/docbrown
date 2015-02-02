DocBrown
========

Minimalistic, simple, opinionated Flux implementation. Yeah, yet another one, sorry.

Read [more about Flux here](http://facebook.github.io/flux/docs/overview.html).

Dispatcher
----------

Essential, central piece of the Flux architecture, the Dispatcher registers and dispatches action events.

Creating a dispatcher is rather simple:

```js
var Dispatcher = DocBrown.createDispatcher();

Dispatcher.dispatch("foo");
```

Most of the time, you'll never have to call anything from the Dispatcher; Actions will.

Actions
-------

Actions are defined using an array of strings, where entries are action names. Actions are responsible of dispatching events on their own, that's why they need to know about the dispatcher.

```js
var Dispatcher = DocBrown.createDispatcher();
var TimeActions = DocBrown.createActions(Dispatcher, [
  "backward",
  "forward"
]);

typeof TimeActions.backward; // "function"
typeof TimeActions.forward;  // "function"

TimeActions.forward(); // dispatches a "forward" action event.
```

**Note:** Arguments passed to action functions are applied to their matching store methods.

Stores
------

A store reflects the current state of a given application domain data. It:

- defines initial state;
- alters state;
- subscribes to action events and optionnaly react accordingly (eg. by altering state);
- notifies subscribers from state change events.

```js
var Dispatcher = DocBrown.createDispatcher();
var TimeActions = DocBrown.createActions(Dispatcher, [
  "backward",
  "forward"
]);
var TimeStore = DocBrown.createStore({
  actions: [TimeActions],
  getInitialState: function() {
    return {year: 2015};
  },
  backward: function() {
    this.setState({year: this.getState().year - 1});
  },
  forward: function() {
    this.setState({year: this.getState().year + 1});
  },
});

// Usage
var store = new TimeStore();

console.log(store.getState().year); // 2015

store.subscribe(function(state) {
  console.log(state.year);                 // 2016
  console.log(state === store.getState()); // true
});

store.forward();
```

### Asynchronous actions

**There are no such things as async actions.** Let's keep the initial need simple and iron out the problem; an asynchronous operation should first call a sync action and then make the store triggering new actions dedicated to handle successes and failures:

```js
var TimeActions = DocBrown.createActions(Dispatcher, [
  "travelBackward",
  "travelBackwardStarted",
  "travelBackwardSucceeded",
  "travelBackwardFailed"
]);

var TimeStore = DocBrown.createStore({
  actions: [TimeActions],
  getInitialState: function() {
    return {year: 2015, error: null};
  },
  travelBackward: function(years) {
    TimeActions.travelBackwardStarted(years);
    setTimeout(function() {
      if (Math.random() > .5) {
        TimeActions.travelBackwardSucceeded(this.getState().years - years);
      } else {
        TimeActions.travelBackwardFailed(new Error("Damn."));
      }
    }.bind(this), 50);
  },
  travelBackwardStarted: function(years) {
    console.warn("Ignition.");
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

This Flux implementation isn't tied to [React](facebook.github.io/react/), though a React mixin is conveniently provided.

Basic usage:

```js
var Dispatcher = DocBrown.createDispatcher();

var TimeActions = DocBrown.createActions(Dispatcher, ["travelBy"]);

var TimeStore = DocBrown.createStore({
  actions: [TimeActions],
  getInitialState: function() {
    return {year: new Date().getFullYear()};
  },
  travelBy: function(years) {
    this.setState({year: this.getState().year + years});
  }
});

var Counter = React.createClass({
  mixins: [DocBrown.storeMixin(timeStore)],

  travelClickHandler: function(years) {
    return function() {
      TimeActions.travelBy(years);
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

A working demo is available in the `demo/` directory in this repository.

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
