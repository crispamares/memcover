'use strict'

var React = require('react');
var _ = require('lodash');

var BS = require('react-bootstrap');

module.exports = React.createClass({

    getDefaultProps: function() {
	return {
	    tables: {},
	    label: "Analysis",
	    header: "Export to Excel",
	    bsStyle: "default"
	};
    },

    openFileMenu: function(){
	this.refs.openFile.getDOMNode().click();
    },

    render: function() {
	var openFileMenu = this.openFileMenu; 
	var onSave = this.props.onSave;
	var onOpen = this.props.onOpen;
	var onExport = this.props.onExport;
	var header = this.props.header;
	return (

            <BS.DropdownButton className={this.props.className} 
		    style={this.props.style} 
		    bsStyle={this.props.bsStyle} 
		    title={this.props.label}>

	      <BS.MenuItem header> File </BS.MenuItem>
	      <BS.MenuItem onSelect={openFileMenu}> Open Analysis ... </BS.MenuItem>
	      <input style={{"display":"none"}} type="file" ref="openFile" onChange={onOpen}/>
	      <BS.MenuItem onSelect={onSave}> Save Analysis </BS.MenuItem>

	      <BS.MenuItem header> {header} </BS.MenuItem>
	      
	      {
		  _.values(this.props.tables).map(function(table, i) {
		      return(
                          <BS.MenuItem eventKey={i} onSelect={ onExport.bind(this, table) }> 
			  {table.name}
			  </BS.MenuItem>
		      )
		  })
	       }
            </BS.DropdownButton>
	)
    }

});
