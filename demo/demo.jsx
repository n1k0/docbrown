
var TimeActions = DocBrown.createActions(["travelBy"]);

var TimeStore = DocBrown.createStore({
  actions: [TimeActions.travelBy],
  getInitialState: function() {
    return {year: new Date().getFullYear()};
  },
  travelBy: function(years) {
    this.setState({year: this.getState().year + years});
  }
});

var Counter = React.createClass({
  mixins: [DocBrown.storeMixin(new TimeStore())],

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
