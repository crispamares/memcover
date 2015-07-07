var d3 = require('d3');
var _ = require('lodash');

module.exports = {
    createChart: function(container, props, state) {
	var margin = this.props.margin;
	var width = this.props.width - margin.left - margin.right;
	var height = this.props.height - margin.top - margin.bottom;

	var svg = d3.select(container).append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .attr("class", "parset")
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    },

    cleanChart: function(container, props, state){
	// unsubscribe things 
    },

    update: function(container, props, state) {
	if ( !(props.attributes.length && props.data.length)) {
	    d3.select(container).html('');
	    this.createChart(container, props, state);
	    return null
	};
	var self = this;
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom;

	var realSvg = d3.select(container).select("svg");
	realSvg.attr("width", props.width)
	    .attr("height", props.height);

	var svg = d3.select(container).select("svg > g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var chart = d3.parsets()
	    .dimensions(props.attributes)
	    .value(function(d){return d[props.value];})
	    .width(width)
	    .height(height);

	svg.datum(props.data).call(chart);

	return null;
    }
};
