DocBrown
========

[![Build Status](https://travis-ci.org/n1k0/docbrown.svg)](https://travis-ci.org/n1k0/docbrown) [![Coverage Status](https://coveralls.io/repos/n1k0/docbrown/badge.svg)](https://coveralls.io/r/n1k0/docbrown)

Minimalistic, simple, opinionated Flux implementation. Right, yet [another one](https://www.npmjs.com/search?q=flux), I'm so sorry.

Read [more about Flux here](http://facebook.github.io/flux/docs/overview.html).

Dispatcher
----------

Essential, central piece of the Flux architecture, the Dispatcher registers and dispatches action events.

Creating a dispatcher is rather simple:

```js
var Dispatcher = DocBrown.createDispatcher();

Dispatcher.dispatch("foo");
```

Most of the time, you'll never have to directly consume from the Dispatcher; Actions and Stores will.

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
    return {year: 2015, travelling: false, error: null};
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
    this.setState({travelling: true});
  },
  travelBackwardSucceeded: function(newYear) {
    this.setState({year: newYear, travelling: false});
  },
  travelBackwardFailed: function(err) {
    this.setState({error: err, travelling: false});
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

Note: this will try to send coverage reports to Coveralls. Ignore any error about that.

License
=======

MIT.
