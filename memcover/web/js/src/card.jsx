'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	var title = this.props.title;

	/* var child = React.cloneElement(
	   React.Children.only(this.props.children), 
	   {width: this.props.width, height: this.props.height}); */

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
