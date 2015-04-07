'use strict'

var React = require('react');
var FixedDataTable = require('fixed-data-table');
var _ = require('lodash');

var Table = FixedDataTable.Table;
var Column = FixedDataTable.Column;


module.exports = React.createClass({
    getInitialState: function() {
	
	var initialColumnWith = (this.props.columnNames.length) ?
				Math.round(this.props.tableWidth / this.props.columnNames.length)
	                        : 0;
	var columnWidths = {};
	_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})
	return {
	    "columnWidths": columnWidths
	};
    },
    getDefaultProps: function(){
	return {
	    rows: [],
	    columnNames: []
	}
    },
    _rowGetter: function(i) {return this.props.rows[i];},
    _onColumnResizeEndCallback: function(newColumnWidth, dataKey) {
	this.state.columnWidths[dataKey] = newColumnWidth;
//	isColumnResizing = false;
    },
    render: function(){
	var columnNames = this.props.columnNames;
	var initialColumnWith = (this.props.columnNames.length) ?
				Math.round(this.props.tableWidth / this.props.columnNames.length)
	                        : 0;
	var columnWidths = {};
	_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})

	if (this.props.rows.length == 0) return (<div></div>);

	return (
	    <Table
		    rowHeight={50}
		    rowGetter={this._rowGetter}
		    rowsCount={this.props.rows.length}
		    width={this.props.tableWidth}
		    height={this.props.tableHeight}
		    headerHeight={50}
		    onColumnResizeEndCallback={this._onColumnResizeEndCallback}>

	      {
		  this.props.columnNames.map(function(name){
		      return (
			  <Column
			  label={name}
			  width={columnWidths[name]}			  
			  dataKey={name}
			  isResizable={false}
			  />
		      );
		  })
	       }
	    </Table>
	);
    }
});



