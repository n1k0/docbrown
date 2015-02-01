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

    describe("#registered()", function() {
      beforeEach(function() {
        dispatcher.register({a: 1});
      });

      it("should check that a store is registered", function() {
        expect(dispatcher.registered("a")).eql(true);
      });

      it("should check that a store is not registered", function() {
        expect(dispatcher.registered("b")).eql(false);
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

      it("should apply store context to listener", function() {
        var expected = null;
        var store = {foo: function() {expected = this;}};
        dispatcher.register({store: store});

        dispatcher.dispatch("foo", 1, 2, 3);

        expect(expected).to.eql(store);
      });
    });
  });
});

describe("DocBrown.createActions()", function() {
  it("should require a dispatcher", function() {
    expect(function() {
      DocBrown.createActions();
    }).to.Throw(/Invalid dispatcher/);
  });

  it("should require an actions array", function() {
    expect(function() {
      DocBrown.createActions(DocBrown.createDispatcher());
    }).to.Throw(/Invalid actions array/);
  });

  it("should create an object with matching action methods", function() {
    var actions = DocBrown.createActions(DocBrown.createDispatcher(), ["foo", "bar"]);

    expect(actions).to.include.keys("foo", "bar");
  });

  it("should create callable action methods", function() {
    var actions = DocBrown.createActions(DocBrown.createDispatcher(), ["foo"]);

    expect(actions.foo).to.be.a("function");
  });

  it("should create dispatching action methods", function() {
    var dispatcher = DocBrown.createDispatcher();
    sinon.stub(dispatcher, "dispatch");
    var actions = DocBrown.createActions(dispatcher, ["foo"]);

    actions.foo(1, 2, 3);

    sinon.assert.calledOnce(dispatcher.dispatch);
    sinon.assert.calledWithExactly(dispatcher.dispatch, "foo", 1, 2, 3);
  });
});

describe("DocBrown.createStore()", function() {
  it("should create a Store constructor", function() {
    expect(DocBrown.createStore({})).to.be.a("function");
  });

  it("should allow constructing a store", function() {
    var Store = DocBrown.createStore({});

    expect(new Store()).to.be.an("object");
  });

  it("should apply initialize with constructor args if defined", function() {
    var proto = {initialize: sinon.spy()};
    var Store = DocBrown.createStore(proto);
    var store = new Store(1, 2, 3);

    sinon.assert.calledOnce(proto.initialize);
    sinon.assert.calledWithExactly(proto.initialize, 1, 2, 3);
  });

  it("should apply initialize with the store context", function() {
    var Store = DocBrown.createStore({initialize: function(x){this.x = x;}});
    var store = new Store(42);

    expect(store.x).eql(42);
  });

  it("should set a null state by default", function() {
    var Store = DocBrown.createStore({});
    var store = new Store();

    expect(store.getState()).eql(null);
  });

  it("should set initial state if method is defined", function() {
    var Store = DocBrown.createStore({
      getInitialState: function() {return {};}
    });
    var store = new Store();

    expect(store.getState()).eql({});
  });

  describe("#subscribe()", function() {
    var store;

    beforeEach(function() {
      var Store = DocBrown.createStore({});
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
      var Store = DocBrown.createStore({});
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
  it("should require a Dispatcher", function() {
    expect(function() {
      DocBrown.storeMixin();
    }).to.Throw("Invalid dispatcher");
  });

  it("should require a registered store name", function() {
    expect(function() {
      DocBrown.storeMixin(DocBrown.createDispatcher());
    }).to.Throw(/Unknown store name/);
  });

  describe("constructed", function() {
    var dispatcher, store, mixin;

    beforeEach(function() {
      dispatcher = DocBrown.createDispatcher();
      var Store = DocBrown.createStore({});
      store = new Store();
      dispatcher.register({store: store});
      mixin = DocBrown.storeMixin(dispatcher, "store");
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
