var DocBrown = require("./");
var expect = require("chai").expect;
var sinon = require("sinon");

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

      it("should register stores", function() {
        dispatcher.register(a);

        expect(dispatcher.stores).eql([a]);
      });

      it("should append new registered store for an action", function() {
        dispatcher.register(a);
        dispatcher.register(b);

        expect(dispatcher.stores).eql([a, b]);
      });
    });

    describe("#dispatch()", function() {
      it("should notify a registered store", function() {
        var store = {foo: sinon.spy()};
        dispatcher.register(store);

        dispatcher.dispatch("foo", 1, 2, 3);

        sinon.assert.called(store.foo);
        sinon.assert.calledWithExactly(store.foo, 1, 2, 3);
      });

      it("should notify multiple registered stores", function() {
        var storeA = {foo: sinon.spy()};
        var storeB = {foo: sinon.spy()};
        dispatcher.register(storeA);
        dispatcher.register(storeB);

        dispatcher.dispatch("foo");

        sinon.assert.called(storeA.foo);
        sinon.assert.called(storeB.foo);
      });

      it("should apply store context to listener", function() {
        var expected = null;
        var store = {foo: function() {expected = this;}};
        dispatcher.register(store);

        dispatcher.dispatch("foo", 1, 2, 3);

        expect(expected).to.eql(store);
      });
    });
  });
});

describe("DocBrown.createActions()", function() {


  it("should require an actions array", function() {
    expect(function() {
      DocBrown.createActions();
    }).to.Throw(/Invalid actions array/);
  });

  it("should create an object with matching action methods", function() {
    var actions = DocBrown.createActions(["foo", "bar"]);

    expect(actions).to.include.keys("foo", "bar");
  });

  it("should create callable action methods", function() {
    var actions = DocBrown.createActions(["foo"]);

    expect(actions.foo).to.be.a("function");
  });

  it("should create callable action methods with a register method", function() {
    var actions = DocBrown.createActions(["foo"]);

    expect(actions.foo.register).to.be.a("function");
  });

  it("should create dispatching action methods", function() {
    var store = {foo: sinon.spy()};
    var actions = DocBrown.createActions( ["foo"]);
    actions.foo.register(store);
    actions.foo(1, 2, 3);

    sinon.assert.calledOnce(store.foo);
    sinon.assert.calledWithExactly(store.foo, 1, 2, 3);
  });
});

describe("DocBrown.createStore()", function() {
  var Actions;

  beforeEach(function() {
    Actions = DocBrown.createActions(["foo"]);
  });

  it("should require a store prototype", function() {
    expect(function() {
      new (DocBrown.createStore())();
    }).to.Throw(/Invalid store prototype/);
  });

  it("should create a Store constructor", function() {
    expect(DocBrown.createStore({actions: [Actions.foo]})).to.be.a("function");
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
    var Store = DocBrown.createStore({actions: [Actions.foo]});

    expect(new Store()).to.be.an("object");
  });

  it("should apply initialize with constructor args if defined", function() {
    var proto = {actions: [Actions.foo], initialize: sinon.spy()};
    var Store = DocBrown.createStore(proto);
    var store = new Store(1, 2, 3);

    sinon.assert.calledOnce(proto.initialize);
    sinon.assert.calledWithExactly(proto.initialize, 1, 2, 3);
  });

  it("should apply initialize with the store context", function() {
    var Store = DocBrown.createStore({
      actions: [Actions.foo],
      initialize: function(x){this.x = x;}
    });
    var store = new Store({a: 1});

    expect(store.x).eql({a: 1});
  });

  it("should set an empty state by default", function() {
    var Store = DocBrown.createStore({actions: [Actions.foo]});
    var store = new Store();

    expect(store.state).eql({});
  });

  it("should set initial state if method is defined", function() {
    var Store = DocBrown.createStore({
      actions: [Actions.foo],
      getInitialState: function() {return {};}
    });
    var store = new Store();

    expect(store.getState()).eql({});
  });

  describe("#getState()", function() {
    it("should get current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions.foo],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      expect(store.getState().foo).eql(42);
    });
  });

  describe("#get state()", function() {
    it("should get current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions.foo],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      expect(store.state.foo).eql(42);
    });
  });

  describe("#setState()", function() {
    it("should set current state", function() {
      var Store = DocBrown.createStore({
        actions: [Actions.foo],
        getInitialState: function() {return {foo: 42};}
      });
      var store = new Store();

      store.setState({foo: 43});

      expect(store.state.foo).eql(43);
    });

    it("should merge state properties", function() {
      var Store = DocBrown.createStore({
        actions: [Actions.foo],
        getInitialState: function() {return {foo: 42, bar: 1};}
      });
      var store = new Store();

      store.setState({foo: 43});

      expect(store.state).eql({foo: 43, bar: 1});
    });

    it("should notify subscribers", function() {
      var Store = DocBrown.createStore({
        actions: [Actions.foo],
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
  });

  describe("#subscribe()", function() {
    var store;

    beforeEach(function() {
      var Store = DocBrown.createStore({actions: [Actions.foo]});
      store = new Store();
    });

    it("should register a new change listener", function(done) {
      store.subscribe(function() {
        done();
      });

      store.setState({});
    });

    it("should notify subscribers with new state", function(done) {
      var newState = {foo: "bar"};
      store.subscribe(function(state) {
        expect(state === newState);
        done();
      });

      store.setState(newState);
    });
  });

  describe("#unsubscribe()", function() {
    it("should unsubscribe a registered listener", function() {
      var Store = DocBrown.createStore({actions: [Actions.foo]});
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
  it("should require a store", function() {
    expect(function() {
      DocBrown.storeMixin();
    }).to.Throw("Missing store");
  });

  describe("constructed", function() {
    var Actions, store, mixin;

    beforeEach(function() {
      Actions = DocBrown.createActions(["foo"]);
      var Store = DocBrown.createStore({actions: [Actions.foo]});
      store = new Store();
      mixin = DocBrown.storeMixin(store);
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
