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
