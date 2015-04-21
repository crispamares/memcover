'use strict'

var React = require('react');
var BarChart = require('react-d3/barchart').BarChart;

var Context = require('context');

// Data is like: [{value:25, label:"P1"},{value:45, label:"P2"}]
module.exports = React.createClass({
    getInitialState: function() {
	return {
	    "data": []
	};
    },
    componentDidMount: function() {
	var rpc = Context.instance().rpc;
	var self = this;
	var pipeline = [
	    {$match : {"tint": "NISSL"}},
	    {$group : {_id: "$patient", value: {$sum: "$cells/volume (mm3)"} } },
	    {$project : { label: "$_id", value:1 , _id: 0}},
	    {$sort : { value: -1 } }
	];
	rpc.call('TableSrv.aggregate', [this.props.table, pipeline])
	    .then(function(view) {
		return rpc.call("TableSrv.get_data", [view, "rows"])
	    })
	    .then(function(rows){
		self.setState({"data": rows});
	    })
	    .catch(function(e){console.error(e);});
    },
    render: function(){
	return (
	    <BarChart
		    data={this.state.data}
		    width={600}
		    height={200}
		    margins={{top: 20, right: 30, bottom: 30, left: 60}}
		    fill={'#3182bd'}
		    title='Cells/Vol - NISSL'>
	    </BarChart>	
	);
    }
});
