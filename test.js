var DocBrown = require("./");
var expect = require("chai").expect;
var sinon = require("sinon");
var Promise = require("bluebird");

describe("DocBrown.createDispatcher()", function() {
  it("should create a Dispatcher", function() {
    expect(DocBrown.createDispatcher()).to.be.an.instanceOf(DocBrown.Dispatcher);
  });

  describe("DocBrown.Dispatcher()", function() {
    var dispatcher;

    beforeEach(function() {
      dispatcher = DocBrown.createDispatcher();
    });

    describe("#register()", function() {
      var a = {a: 1}, b = {b: 1};

      it("should register stores for a given action", function() {
        dispatcher.register("foo", a);

        expect(dispatcher.registeredFor("foo")).eql([a]);
      });

      it("should append new registered store for an action", function() {
        dispatcher.register("foo", a);
        dispatcher.register("foo", b);

        expect(dispatcher.registeredFor("foo")).eql([a, b]);
      });
    });

    describe("#registeredFor()", function() {
      it("should check that a store is registered for an action", function() {
        dispatcher.register("foo", {a: 1});

        expect(dispatcher.registeredFor("foo")).eql([{a: 1}]);
      });
    });

    describe("#dispatch()", function() {
      it("should notify a registered store", function() {
        var store = {foo: sinon.spy()};
        dispatcher.register("foo", store);

        dispatcher.dispatch("foo", 1, 2, 3);

        sinon.assert.called(store.foo);
        sinon.assert.calledWithExactly(store.foo, 1, 2, 3);
      });

      it("should notify multiple registered stores", function() {
        var storeA = {foo: sinon.spy()};
        var storeB = {foo: sinon.spy()};
        dispatcher.register("foo", storeA);
        dispatcher.register("foo", storeB);

        dispatcher.dispatch("foo");

        sinon.assert.called(storeA.foo);
        sinon.assert.called(storeB.foo);
      });

      it("should apply store context to listener", function() {
        var expected = null;
        var store = {foo: function() {expected = this;}};
        dispatcher.register("foo", store);

        dispatcher.dispatch("foo", 1, 2, 3);

        expect(expected).to.eql(store);
      });

      describe("on store handler returning a Promise", function() {
        var store;

        beforeEach(function() {
          store = {
            fulfillMe: function() {
              return new Promise(function(fulfill) {
                fulfill("ok");
              });
            },
            fulfillMeSuccess: sinon.spy(),
            rejectMe: function() {
              return new Promise(function(fulfill, reject) {
                reject("error");
              });
            },
            rejectMeError: sinon.spy()
          };
          dispatcher.register("fulfillMe", store);
          dispatcher.register("rejectMe", store);
        });

        it("should call a *Success handler next when fulfilled", function(done) {
          dispatcher.dispatch("fulfillMe");

          setImmediate(function() {
            sinon.assert.calledOnce(store.fulfillMeSuccess);
            sinon.assert.calledWithExactly(store.fulfillMeSuccess, "ok");
            done();
          });
        });

        it("should call a *Error handler next when rejected", function(done) {
          dispatcher.dispatch("rejectMe");

          setImmediate(function() {
            sinon.assert.calledOnce(store.rejectMeError);
            sinon.assert.calledWithExactly(store.rejectMeError, "error");
            done();
          });
        });
      });
    });

    describe("#clear()", function() {
      it("should clear registered action handlers", function() {
        dispatcher.register("foo", {a: 1});
        dispatcher.register("bar", {b: 1});

        dispatcher.clear();

        expect(dispatcher.actionHandlers).eql({});
      });
    });
  });
});

describe("DocBrown.createActions()", function() {
  var dispatcher;

  beforeEach(function() {
    dispatcher = DocBrown.createDispatcher();
  });

  it("should require a dispatcher", function() {
    expect(function() {
      DocBrown.createActions();
    }).to.Throw(/Invalid dispatcher/);
  });

  it("should require an actions array", function() {
    expect(function() {
      DocBrown.createActions(dispatcher);
    }).to.Throw(/Invalid actions array/);
  });

  it("should create an object with matching action methods", function() {
    var actions = DocBrown.createActions(dispatcher, ["foo", "bar"]);

    expect(actions).to.include.keys("foo", "bar");
  });

  it("should create callable action methods", function() {
    var actions = DocBrown.createActions(dispatcher, ["foo"]);

    expect(actions.foo).to.be.a("function");
  });

  it("should create dispatching action methods", function() {
    sinon.stub(dispatcher, "dispatch");
    var actions = DocBrown.createActions(dispatcher, ["foo"]);

    actions.foo(1, 2, 3);

    sinon.assert.calledOnce(dispatcher.dispatch);
    sinon.assert.calledWithExactly(dispatcher.dispatch, "foo", 1, 2, 3);
  });

  describe("#only()", function() {
    it("should select only selected actions", function() {
      var actions = DocBrown.createActions(dispatcher, ["foo", "bar", "baz"]);
      var onlyActions = actions.only("foo", "baz");

      expect(onlyActions).to.include.keys("foo", "baz");
      expect(onlyActions).to.not.include.keys("bar");
    });

    it("should return initial actions if no arg is provided", function() {
      var actions = DocBrown.createActions(dispatcher, ["foo", "bar", "baz"]);

      expect(actions.only()).eql(actions);
    });
  });

  describe("#drop()", function() {
    it("should drop selected actions", function() {
      var actions = DocBrown.createActions(dispatcher, ["foo", "bar", "baz"]);
      var dropActions = actions.drop("foo", "baz");

      expect(dropActions).to.not.include.keys("foo", "baz");
      expect(dropActions).to.include.keys("bar");
    });

    it("should return initial actions if no arg is provided", function() {
      var actions = DocBrown.createActions(dispatcher, ["foo", "bar", "baz"]);

      expect(actions.drop()).eql(actions);
    });
  });
});

describe("DocBrown.createStore()", function() {
  var dispatcher, Actions;

  beforeEach(function() {
    dispatcher = DocBrown.createDispatcher();
    Actions = DocBrown.createActions(dispatcher, ["foo"]);
  });

  it("should require a store prototype", function() {
    expect(function() {
      new (DocBrown.createStore())();
    }).to.Throw(/Invalid store prototype/);
  });

  it("should create a Store constructor", function() {
    expect(DocBrown.createStore({actions: [Actions]})).to.be.a("function");
  });

  it("should ensure an actions array is provided", function() {
    expect(function() {
      new (DocBrown.createStore({}))();
    }).to.Throw(/non-empty actions array/);
  });

  it("should ensure a non-empty actions array is provided", function() {
    expect(function() {
      new (DocBrown.createStore({actions: []}))();
    }).to.Throw(/non-empty actions array/);
  });

  it("should allow constructing a store", function() {
    var Store = DocBrown.createStore({actions: [Actions]});

    expect(new Store()).to.be.an("object");
  });

  it("should apply initialize with constructor args if defined", function() {
    var proto = {actions: [Actions], initialize: sinon.spy()};
    var Store = DocBrown.createStore(proto);
    var store = new Store(1, 2, 3);

    sinon.assert.calledOnce(proto.initialize);
    sinon.assert.calledWithExactly(proto.initialize, 1, 2, 3);
  });

  it("shouldn't share contexts across stores instances", function() {
    var Store = DocBrown.createStore({
      actions: [Actions],
      initialize: function(x) {this.x = x;}
    });
    var store1 = new Store(1);
    var store2 = new Store(2);

    expect(store1.x).eql(1);
    expect(store2.x).eql(2);
  });

  it("shouldn't share state across stores instances", function() {
    var Store = DocBrown.createStore({
      actions: [Actions]
    });
    var store1 = new Store();
    var store2 = new Store();
    store1.setState({a: 1});

    expect(store2.state.a).not.eql(1);
  });

  it("should apply initialize with the store context", function() {
    var Store = DocBrown.createStore({
      actions: [Actions],
      initialize: function(x){this.x = x;}
    });
    var store = new Store({a: 1});

    expect(store.x).eql({a: 1});
  });

  it("should set an empty state by default", function() {
    var Store = DocBrown.createStore({actions: [Actions]});
    var store = new Store();

    expect(store.state).eql({});
  });

  it("should set initial state if method is defined", function() {
    var Store = DocBrown.createStore({
      actions: [Actions],
      getInitialState: function() {return {};}
    });
    var store = new Store();

    expect(store.getState()).eql({});
  });

  it("should register subscribed actions against the dispatcher", function() {
    var Store = DocBrown.createStore({
      actions: [DocBrown.createActions(dispatcher, ["foo", "bar"]),
                DocBrown.createActions(dispatcher, ["bar", "baz"])]
    });
    var store = new Store();

    expect(dispatcher.registeredFor("foo")).eql([store]);
    expect(dispatcher.registeredFor("bar")).eql([store]);
  });

  describe("#getState()", function() {
    it("should get current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      expect(store.getState().foo).eql(42);
    });
  });

  describe("#get state()", function() {
    it("should get current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      expect(store.state.foo).eql(42);
    });
  });

  describe("#setState()", function() {
    it("should set current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      store.setState({foo: 43});

      expect(store.state.foo).eql(43);
    });

    it("should merge state properties", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42, bar: 1};}
      });
      var store = new Store();

      store.setState({foo: 43});

      expect(store.state).eql({foo: 43, bar: 1});
    });

    it("should clone store proto method", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        foo: function(){}
      });
      var store1 = new Store();
      var store2 = new Store();

      expect(store1.foo).not.eql(store2.foo);
    });

    it("should notify subscribers if state has actually changed", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();
      var subscriber1 = sinon.spy();
      var subscriber2 = sinon.spy();
      store.subscribe(subscriber1);
      store.subscribe(subscriber2);

      store.setState({foo: 43});

      sinon.assert.calledOnce(subscriber1);
      sinon.assert.calledOnce(subscriber2);
      sinon.assert.calledWithExactly(subscriber1, {foo: 43});
      sinon.assert.calledWithExactly(subscriber2, {foo: 43});
    });

    it("should not notify subscribers if state hasn't changed", function() {
      var Store = DocBrown.createStore({
        actions: [Actions],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();
      var subscriber = sinon.spy();
      store.subscribe(subscriber);

      store.setState({foo: 42});

      sinon.assert.notCalled(subscriber);
    });

    describe("state", function() {
      function setup(currentState, newState) {
        var Store = DocBrown.createStore({
          actions: [Actions],
          getInitialState: function() {
            return currentState;
          }
        });
        var store = new Store();
        var subscriber = sinon.spy();
        store.subscribe(subscriber);
        store.setState(newState);
        return subscriber.getCall(0);
      }
      function expectNotUpdated(currentState, newState) {
        if (!!setup(currentState, newState)) {
          throw new Error("state updated");
        }
      }
      describe("should not be updated when", function() {
        it("a number prop hasn't changed", function() {
          expectNotUpdated({a: 1}, {a: 1});
        });

        it("a boolean prop hasn't changed", function() {
          expectNotUpdated({a: false}, {a: false});
        });

        it("a float prop hasn't changed", function() {
          expectNotUpdated({a: 0.2 + 0.1}, {a: 0.2 + 0.1});
        });

        it("a string prop hasn't changed", function() {
          expectNotUpdated({a: "1"}, {a: "1"});
        });

        it("state objects don't differ", function() {
          expectNotUpdated({a: 1, b: 2}, {b: 2, a: 1});
        });
      });
    });
  });

  describe("#subscribe()", function() {
    var store;

    beforeEach(function() {
      var Store = DocBrown.createStore({actions: [Actions]});
      store = new Store();
    });

    it("should register a new change listener", function() {
      var spy = sinon.spy();

      store.subscribe(spy);

      store.setState({a: 1});

      sinon.assert.calledOnce(spy);
    });

    it("should notify subscribers with new state", function() {
      var newState = {foo: "bar"};
      var spy = sinon.spy();

      store.subscribe(spy);

      store.setState(newState);

      sinon.assert.calledWithExactly(spy, newState);
    });
  });

  describe("#unsubscribe()", function() {
    it("should unsubscribe a registered listener", function() {
      var Store = DocBrown.createStore({actions: [Actions]});
      var store = new Store();
      var listener = sinon.spy();
      store.subscribe(listener);
      store.setState({foo: "bar"});

      store.unsubscribe(listener);
      store.setState({bar: "baz"});

      sinon.assert.calledOnce(listener);
    });
  });
});

describe("DocBrown.storeMixin()", function() {
  it("should require a store retriever", function() {
    expect(function() {
      DocBrown.storeMixin();
    }).to.Throw("Unsupported store retriever.");
  });

  it("should accept a store instance as a retriever", function() {
    var fakeStore = {fakeStore: true};

    var mixin = DocBrown.storeMixin(fakeStore);

    expect(mixin.getStore()).eql(fakeStore);
  });

  it("should accept a function as a retriever", function() {
    var fakeStore = {fakeStore: true};

    var mixin = DocBrown.storeMixin(function() {
      return fakeStore;
    });

    expect(mixin.getStore()).eql(fakeStore);
  });

  describe("constructed", function() {
    var dispatcher, Actions, store, mixin;

    beforeEach(function() {
      dispatcher = DocBrown.createDispatcher();
      Actions = DocBrown.createActions(dispatcher, ["foo"]);
      var Store = DocBrown.createStore({actions: [Actions]});
      store = new Store();
      mixin = DocBrown.storeMixin(function() {
        return store;
      });
    });

    it("should create an object", function() {
      expect(mixin).to.be.an("object");
    });

    describe("#getStore", function() {
      it("should retrieve attached store", function() {
        expect(mixin.getStore()).eql(store);
      });
    });

    describe("#componentDidMount", function() {
      beforeEach(function() {
        mixin.getInitialState();
      });

      it("should start listening to store change", function() {
        sinon.stub(store, "subscribe");

        mixin.componentDidMount();

        sinon.assert.calledOnce(store.subscribe);
      });

      it("should call proto setState on store change", function() {
        mixin.setState = sinon.spy();
        mixin.componentDidMount();

        store.setState({a: 1});

        sinon.assert.calledOnce(mixin.setState);
        sinon.assert.calledWithExactly(mixin.setState, {a: 1});
      });
    });

    describe("#componentWillUnmount", function() {
      it("should unsubscribe on component unmount", function() {
        mixin.setState = sinon.spy();
        mixin.componentDidMount();

        mixin.componentWillUnmount();

        store.setState({a: 1});

        sinon.assert.notCalled(mixin.setState);
      });
    });
  });
});
