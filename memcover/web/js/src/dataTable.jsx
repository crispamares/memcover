'use strict'

var React = require('react');
var FixedDataTable = require('fixed-data-table');
var _ = require('lodash');

var Table = FixedDataTable.Table;
var Column = FixedDataTable.Column;


module.exports = React.createClass({
    getInitialState: function() {
	var initialColumnWith = Math.round(this.props.tableWidth / this.props.columnNames.length);
	var columnWidths = {};
	_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})
	return {"columnWidths": columnWidths};
    },
    _onColumnResizeEndCallback: function(newColumnWidth, dataKey) {
	this.state.columnWidths[dataKey] = newColumnWidth;
//	isColumnResizing = false;
    },
    render: function(){
	var columnNames = this.props.columnNames;
	var columnWidths = this.state.columnWidths

	return (
	    <Table
		    rowHeight={50}
		    rowGetter={this.props.rowGetter}
		    rowsCount={this.props.rowsCount}
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



