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
	    .attr("class", "pcp")
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("svg:g").attr("class", "foreground");

	this.update(container, props, state);
    },

    cleanChart: function(container, props, state){
	// unsubscribe things 
    },

    update: function(container, props, state) {
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom;


	var axis = d3.svg.axis().orient("left");
	var scales = this._scales(width, height, props.data, props.attributes);
	var path = this._path(props.attributes, scales);


	var svg = d3.select(container).select("svg > g");
	console.log("svg", svg);

	// Add foreground lines.
	var foreground = svg.select("g.foreground");
	var lines = foreground.selectAll("path")
	  .data(props.data);
	lines.enter().append("path")
	    .attr("d", path)
	    .attr("class", function(d) {return d.patient;})
	    .attr("title", function(d) {return d.measure_id;});

	
	// Add a group element for each trait.
	var coordinates = svg.selectAll(".coordinate")
		.data(_.pluck(props.attributes, "name"));
	coordinates.enter().append("g")
		.attr("class", "coordinate")
		.attr("transform", function(d) { return "translate(" + scales.x(d) + ")"; })
		.call(d3.behavior.drag()
		      .origin(function(d) { return {x: scales.x(d)}; })
		      .on("dragstart", dragstart)
		      .on("drag", drag)
		      .on("dragend", dragend)
		     )
		// Add an axis and title.
	      .append("svg:g")
		.attr("class", "axis")
		.each(function(d) { d3.select(this).call(axis.scale(scales.y[d])); })
	      .append("svg:text")
		.attr("text-anchor", "middle")
		.attr("y", -9)
		.text(String);
    },

    _dragstart: function(attributes, state) {
	var attributes_names = _.pluck(attributes, "names");
	return function dragstart(d) {
	    state.i = attributes.indexOf(d);
	};
    },

    _drag: function(scales){
	var x = scales.x;
	return function drag(d) {
	    x.range()[i] = d3.event.x;
	    traits.sort(function(a, b) { return x(a) - x(b); });
	    g.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	    foreground.attr("d", path);
	};
    },

    _dragend: function() {
	return function dragend(d) {
	    x.domain(traits).rangePoints([0, w]);
	    var t = d3.transition().duration(500);
	    t.selectAll(".trait").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	    t.selectAll(".foreground path").attr("d", path);
	};
    },

    _scales: function(width, height, data, attributes) {
	var self = this;

	var x = d3.scale.ordinal().domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
	var y = {};

	attributes.forEach(function(d) {
	    var name = d.name;
	    if (d.attribute_type === 'QUANTITATIVE') {
		y[name] = d3.scale.linear()
		    .domain(d3.extent(data.filter(function(p){return !isNaN(p[name]);})
				      , function(p) { return p[name]; }))
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
    _brush: function(){
    },

    // Cousure. Returns the path for a given data point.
    _path : function (attributes, scales) {
	var line = d3.svg.line()
		.defined(function(d){return !isNaN(d[1]);});
	return function (d) {
	    return line(_.pluck(attributes, "name")
			.map(function(a) { return [scales.x(a), scales.y[a](d[a])]; }));  	
	};
    }

};
