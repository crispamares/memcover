"use strict"

var React = require('react');
Object.assign = Object.assign || require('object-assign');
var FixedDataTable = require('fixed-data-table');
var _ = require('lodash');

var Table = FixedDataTable.Table;
var Column = FixedDataTable.Column;


function isFloatBiggerThan1(n){
    return n === Number(n) && n % 1 !== 0 && n > 1;
}

module.exports = React.createClass({
    getInitialState: function() {
	 
	var initialColumnWith = (this.props.columnNames.length) ?
				Math.round(this.props.width / this.props.columnNames.length)
	                        : 0;
	var columnWidths = {};
	_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;});
	return {
	    "columnWidths": columnWidths
	};
    },
    getDefaultProps: function(){
	return {
	    rows: [],
	    columnNames: [],
	    decimals: 2,
	};
    },
    _rowGetter: function(i) {
	var row = this.props.rows[i];
	var decimals = this.props.decimals;
	return _.mapValues(row, function(d) { return isFloatBiggerThan1(d) ? d.toFixed(decimals) : d; }); 
    },
    _onColumnResizeEndCallback: function(newColumnWidth, dataKey) {
	this.state.columnWidths[dataKey] = newColumnWidth;
//	isColumnResizing = false;
    },
    render: function(){
	var columnNames = this.props.columnNames;
	var initialColumnWith = (this.props.columnNames.length) ?
				Math.round(this.props.width / this.props.columnNames.length)
	                        : 0;
	var columnWidths = {};
	_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;});

	if (this.props.rows.length === 0) return (<div></div>);

	return (
	    <Table
		    rowHeight={50}
		    rowGetter={this._rowGetter}
		    rowsCount={this.props.rows.length}
		    width={this.props.width}
		    height={this.props.height}
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



