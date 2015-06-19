'use strict'

var d3 = require('d3');

var rangeSlider = {
    createChart: function(container, props, state){
	var svg = d3.select(container).append("svg").attr("class", "slider rangeSlider");
	var gAxis = svg.append("g").attr("class", "x axis");
	var slider = svg.append('g').attr("class", "brush");
    },

    cleanChart: function(container, props, state) {},

    update: function(container, nextProps, nextState) {

	var domain = nextProps.domain || {min:0, max:1};
	var extent = nextProps.extent || [domain.min, domain.max];

	var onStart = nextProps.onStart || null;
	var onMove = nextProps.onMove || null;
	var onEnd = nextProps.onEnd || null;

	var margin = {top: 5, left: 10, bottom: 20, right: 20};
	var width = nextProps.width;
	var height = nextProps.height;

	var slider_width = width - margin.left - margin.right;
	var slider_height = height - margin.top - margin.bottom;

	var x = d3.scale.linear()
	    .domain([domain.min, domain.max])
	    .range([0, slider_width])
	    .nice();

	var brush = d3.svg.brush()
	    .x(x)
	    .extent(extent)
	    .on("brushstart", brushstart)
	    .on("brush", brushmove)
	    .on("brushend", brushend);

	var axis =  d3.svg.axis()
	    .scale(x)
	    .ticks(5)
	    .orient("bottom");

	var svg = d3.select(container).select("svg.slider")
	    .style("width", width + "px")
	    .style("height", height + "px");

	var gAxis = svg.select("g.axis")
	    .attr("transform", "translate(" + margin.left + "," + (slider_height + margin.top)  + ")")
	    .call(axis);

	var slider = svg.select('g.brush')
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	    .call(brush);

	slider.selectAll("rect")
	    .attr("height", slider_height);
	slider.selectAll(".resize rect")
	    .style("visibility", "visible");
	slider.selectAll(".background")
	    .style("visibility", "visible");

	function brushstart() {
	    //svg.classed("selecting", true);
	    if (onStart) onStart(brush.extent());
	}

	function brushmove() {
	    // ############# CONTINUE HERE 
	    if (onMove) onMove(brush.extent());
	}

	function brushend() {
	    if (onEnd) onEnd(brush.extent());
	    //svg.classed("selecting", !d3.event.target.empty());
	}
    }
};

module.exports = rangeSlider;
