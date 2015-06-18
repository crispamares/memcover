'use strict'

var React = require('react');
var _ = require('lodash');

var BS = require('react-bootstrap');

module.exports = React.createClass({

    getDefaultProps: function() {
	return {
	    tables: {},
	    label: "Export",
	    header: "Export to Excel",
	    bsStyle: "default"
	};
    },

    render: function() {
	var handleClick = this.props.onSelection;
	var header = this.props.header;
	return (
            <BS.DropdownButton className={this.props.className} style={this.props.style} bsStyle={this.props.bsStyle} title={this.props.label}>
	      <BS.MenuItem header> {header} </BS.MenuItem>
	      
	      {
		  _.values(this.props.tables).map(function(table, i) {
		      return(
                          <BS.MenuItem eventKey={i} onSelect={ handleClick.bind(this, table) }> 
			  {table.name}
			  </BS.MenuItem>
		      )
		  })
	       }
            </BS.DropdownButton>
	)
    }

});
