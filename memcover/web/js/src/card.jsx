'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	var title = this.props.title;

	var width = 300;
	var height = 300;

	var child = React.Children.only(this.props.children);
	child.props.width = width;
	child.props.height = height;

	return (
	    <div className="card" key={this.props.key}>
	      <h4><div className="card-title">{title}</div></h4>
	      <div className="card-content">
		{this.props.children}		
	      </div>
	    </div>
	);
    }
});
