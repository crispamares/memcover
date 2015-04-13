var d3 = require('d3');
var _ = require('lodash');

module.exports = {
    createChart: function(container, props, state){
	var margin = this.props.margin;
	var width = this.props.width - margin.left - margin.right;
	var height = this.props.height - margin.top - margin.bottom;

	var svg = d3.select(container).append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	this.update(container, props, state);
    },

    cleanChart: function(container, props, state){
	// unsubscribe things 
    },

    update: function(container, props, state) {
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom;

	var scales = this._scales(width, height, props.data, props.attributes);

    },

    _scales: function(width, height, data, attributes) {
	var self = this;

	var x = d3.scale.ordinal().domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
	var y = {};

	attributes.forEach(function(d) {
	    var name = d.name;
	    if (d.attribute_type === 'QUANTITATIVE') {
		y[name] = d3.scale.linear()
		    .domain(d3.extent(data, function(p) { return p[name]; }))
		    .range([height, 0]);
	    }
	    else if (d.attribute_type === 'CATEGORICAL') {
		y[name] = d3.scale.ordinal()
		    .domain(d3.set(_.pluck(data, name)).values())
		    .rangePoints([height, 0]);
	    }
	    y[name].brush = d3.svg.brush()
		.y(y[name])
		.on("brush", self._brush);
	});

	return {x: x, y: y};
    },
    _brush: function(){}
};
