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
	      <h4><div className="card-title">{title}</div></h4>
	      <div className="card-content" style={contentSize}>
		{this.props.children}		
	      </div>
	    </div>
	);
    }
});
