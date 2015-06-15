'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	var title = this.props.title;

	/* var child = React.cloneElement(
	   React.Children.only(this.props.children), 
	   {width: this.props.width, height: this.props.height}); */
	var contentSize = {width: this.props.size.width + 5, height: this.props.size.height + 5};

	return (
	    <div className="card" key={this.props.key}>
	      <div className="card-title">
		<span className="btn btn-xs btn-default card-anchor glyphicon glyphicon-move pull-left" aria-hidden="true"></span>

		<span className="h4 card-anchor">{title}</span>

		<button className="card-close btn btn-xs btn-default glyphicon glyphicon-remove pull-right" aria-hidden="true" onClick={this.props.onClose}></button>

	      </div>
	      <div className="card-content" style={contentSize}>
		{this.props.children}		
	      </div>
	    </div>
	);
    }
});
