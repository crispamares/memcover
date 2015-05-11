'use strict'

var React = require('react');
var _ = require('lodash');


module.exports = React.createClass({

    render: function() {
	return (
	    <div className="card">
	      <div className="card-title"> TITULiTO </div> 
	      <div className="card-content">
		{this.props.children}		
	      </div>
	    </div>
	);
    }
});
