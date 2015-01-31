var Flux = require("./");
var expect = require("chai").expect;
var sinon = require("sinon");

describe("Flux.createDispatcher()", function() {
  it("should create a Dispatcher", function() {
    expect(Flux.createDispatcher()).to.be.an.instanceOf(Flux.Dispatcher);
  });
});

describe("Flux.Dispatcher()", function() {
  var dispatcher;

  beforeEach(function() {
    dispatcher = Flux.createDispatcher();
  });

  describe("#register()", function() {
    var a = {a: 1}, b = {b: 1};

    it("should register stores", function() {
      dispatcher.register({a: a, b: b});

      expect(dispatcher.stores).eql({a: a, b: b});
    });

    it("should append stores", function() {
      dispatcher.register({a: a});
      dispatcher.register({b: b});

      expect(dispatcher.stores).eql({a: a, b: b});
    });

    it("should not swap stores", function() {
      dispatcher.register({a: a});
      dispatcher.register({a: b});

      expect(dispatcher.stores).eql({a: a});
    });
  });

  describe("#dispatch()", function() {
    it("should notify a listening store", function() {
      var store = {foo: sinon.spy()};
      dispatcher.register({store: store});

      dispatcher.dispatch("foo", 1, 2, 3);

      sinon.assert.called(store.foo);
      sinon.assert.calledWithExactly(store.foo, 1, 2, 3);
    });

    it("should notify multiple listening stores", function() {
      var storeA = {foo: sinon.spy()};
      var storeB = {foo: sinon.spy()};
      dispatcher.register({storeA: storeA, storeB: storeB});

      dispatcher.dispatch("foo");

      sinon.assert.called(storeA.foo);
      sinon.assert.called(storeB.foo);
    });
  });
});

describe("Flux.createActions()", function() {
  it("should require a dispatcher", function() {
    expect(function() {
      Flux.createActions();
    }).to.Throw(/Invalid dispatcher/);
  });

  it("should require an actions array", function() {
    expect(function() {
      Flux.createActions(Flux.createDispatcher());
    }).to.Throw(/Invalid actions array/);
  });

  it("should create an object with matching action methods", function() {
    var actions = Flux.createActions(Flux.createDispatcher(), ["foo", "bar"]);

    expect(actions).to.include.keys("foo", "bar");
  });

  it("should create callable action methods", function() {
    var actions = Flux.createActions(Flux.createDispatcher(), ["foo"]);

    expect(actions.foo).to.be.a("function");
  });

  it("should create dispatching action methods", function() {
    var dispatcher = Flux.createDispatcher();
    sinon.stub(dispatcher, "dispatch");
    var actions = Flux.createActions(dispatcher, ["foo"]);

    actions.foo(1, 2, 3);

    sinon.assert.calledOnce(dispatcher.dispatch);
    sinon.assert.calledWithExactly(dispatcher.dispatch, "foo", 1, 2, 3);
  });
});

describe("Flux.createStore()", function() {
  it("should create a Store constructor", function() {
    expect(Flux.createStore({})).to.be.a("function");
  });

  it("should allow constructing a store", function() {
    var Store = Flux.createStore({});

    expect(new Store()).to.be.an("object");
  });

  it("should apply initialize with constructor args if defined", function() {
    var proto = {initialize: sinon.spy()};
    var Store = Flux.createStore(proto);
    var store = new Store(1, 2, 3);

    sinon.assert.calledOnce(proto.initialize);
    sinon.assert.calledWithExactly(proto.initialize, 1, 2, 3);
  });

  it("should apply initialize with the store context", function() {
    var Store = Flux.createStore({initialize: function(x){this.x = x;}});
    var store = new Store(42);

    expect(store.x).eql(42);
  });

  it("should set a null state by default", function() {
    var Store = Flux.createStore({});
    var store = new Store();

    expect(store.getState()).eql(null);
  });

  it("should set initial state if method is defined", function() {
    var Store = Flux.createStore({
      getInitialState: function() {return {};}
    });
    var store = new Store();

    expect(store.getState()).eql({});
  });

  describe("#subscribe()", function() {
    var store;

    beforeEach(function() {
      var Store = Flux.createStore({});
      store = new Store();
    });

    it("should register a new change listener", function(done) {
      store.subscribe(function() {
        done();
      });

      store.setState({});
    });

    it("should notify change listener with new state", function(done) {
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
      var Store = Flux.createStore({});
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
