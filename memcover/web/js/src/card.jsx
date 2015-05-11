'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	var title = this.props.title;

	return (
	    <div className="card">
	      <h4><div className="card-title">{title}</div></h4>
	      <div className="card-content">
		{this.props.children}		
	      </div>
	    </div>
	);
    }
});
