'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	var self = this;
	var title = this.props.title;

	/* var child = React.cloneElement(
	   React.Children.only(this.props.children), 
	   {width: this.props.width, height: this.props.height}); */
	var contentSize = {width: this.props.size.width + 17, height: this.props.size.height + 17};
	var menuActions = this.props.menuActions || [];

	if (! _.isEmpty(menuActions)) {
	    var menu = (
		<div className="card-menu btn-group">
		  <button className="btn btn-xs btn-default dropdown-toggle" type="button" data-toggle="dropdown">
		    <span className="caret"></span>
		  </button>
		  <ul className="dropdown-menu dropdown-menu-right">
		    {
			menuActions.map(function(a){ 
			    var icon = "glyphicon glyphicon-" + a.icon;
			    var action = a.action.bind(self);
			    return (<li><a href="#" onClick={action}><span className={icon}> {a.label}</span></a></li>);})
		    }
		  </ul>
		</div>
	    );
	}
	return (
	    <div className="card" key={this.props.key}>
	      <div className="card-header" > 
		<div className="card-move btn btn-xs btn-default card-anchor glyphicon glyphicon-move" aria-hidden="true"></div>

		<span className="h4 card-anchor">{title}</span>

		{{menu}}
		<button className="card-close btn btn-xs btn-default glyphicon glyphicon-remove" aria-hidden="true" onClick={this.props.onClose}></button>

	      </div>
	      <div className="card-content" style={contentSize}>
		{this.props.children}
	      </div>
	    </div>
	);
    }
});
