'use strict'

var React = require('react');
var BarChart = require('react-d3/barchart').BarChart;


module.exports = React.createClass({
    render: function(){
	var data = this.props.data;
	return (
	    <BarChart
		    data={data}
		    width={500}
		    height={200}
		    fill={'#3182bd'}
		    title='Cells/Vol - NISSL'>
	    </BarChart>	
	);
    }
});
