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

	svg.append("g").attr("class", "foreground");
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
	console.log("UPDATE"); 
	var self = this;
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom;


	var axis = d3.svg.axis().orient("left");
	var scales = this._scales(width, height, props.data, props.attributes);
	var path = this._path(props.attributes, scales);
	var dragState = {};


	var svg = d3.select(container).select("svg > g");

	// Add foreground lines.
	var foreground = svg.select("g.foreground");
	var foregroundLines = foreground.selectAll("path")
	  .data(props.data, function(d){return d.measure_id;});
	foregroundLines.enter().append("path")
	    .attr("d", path)
	    .attr("class", function(d) {return d.patient;})
	    .attr("title", function(d) {return d.measure_id;});
	foregroundLines.exit().remove();

	var brushes = this._brushes(scales, props.attributes, props.onBrush, foreground);

	// Add a group element for each trait.
	var coordinates = svg.selectAll(".coordinate")
		.data(_.pluck(props.attributes, "name"), function(d){return d;});
	coordinates.enter().append("g")
		.attr("class", "coordinate")
		.attr("transform", function(d) { return "translate(" + scales.x(d) + ")"; })
		.call(d3.behavior.drag()
		      .origin(function(d) { return {x: scales.x(d)}; })
		      .on("dragstart", this._dragstart(props.attributes, dragState))
		      .on("drag", this._drag(scales, dragState, props.attributes, foregroundLines, path, coordinates))
		      .on("dragend", this._dragend(scales, props.attributes, width, path))
		     )
		.call(function(g) {
		    // Add an axis and title.
		    g.append("g")
			.attr("class", "axis")
			.each(function(d) { d3.select(this).call(axis.scale(scales.y[d])); })
		      .append("text")
			.attr("text-anchor", "middle")
			.attr("y", -9)
			.attr("class", "dimension")
			.text(function(d){return _.capitalize(String(d));});})
		.call(function(g) {
		    // Add a brush for each axis.
		    g.append("g")
			.attr("class", "brush")
			.each(function(d) { if (!_.isUndefined(props.onBrush)) {d3.select(this).call(brushes[d]);}; })
		       .selectAll("rect")
			.attr("x", -8)
			.attr("width", 16);});
	coordinates.exit().remove();

	return null;
    },

    _dragstart: function(attributes, dragState) {
	return function dragstart(d) {
	    dragState.i = _.pluck(attributes, "name").indexOf(d);
	};
    },

    _drag: function(scales, dragState, attributes, foregroundLines, path, g){
	var x = scales.x;
	
	return function drag(d) {
	    x.range()[dragState.i] = d3.event.x;
	    attributes.sort(function(a, b) { return x(a.name) - x(b.name); });
	    g.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
	    foregroundLines.attr("d", path);
	};
    },

    _dragend: function(scales, attributes, width, path) {
	var x = scales.x;

	return function dragend(d) {
	    x.domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
	    var t = d3.transition().duration(500);
	    t.selectAll(".coordinate").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
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
	});

	return {x: x, y: y};
    },

    _brushes: function(scales, attributes, onBrush, foreground) {
	if (_.isUndefined(onBrush)) return {};
	var brushes = {};
	var brush = this._brush(scales, brushes, foreground, onBrush);
	var brushstart = function() {d3.event.sourceEvent.stopPropagation();};
	attributes.forEach(function(d) {
		var name = d.name;
		if (d.attribute_type === "QUANTITATIVE") {
		    brushes[name] = d3.svg.brush()
			.y(scales.y[name])
			.on("brushstart", brushstart)
			.on("brush", brush);
		}
		else {//TODO: Add CATEGORICAL support
		    brushes[name] = function(){};
		    brushes[name].empty = function(){return true;};
		}
	});
	return brushes;
    },

    _brush: function(scales, brushes, foreground, onBrush){
	var triggerChangeThrottle = _.throttle(onBrush, 30);
	// Handles a brush event, toggling the display of foreground lines.
	return function () {
	    var actives = _.keys(brushes).filter( function(dim) { return !brushes[dim].empty(); });
	    var extents = _.zipObject(actives, actives.map(function(dim) { return brushes[dim].extent(); }));

	    foreground.selectAll("path")
		.attr('display', function(d) {
		    var isInside = actives.every(function(dim) {
			    //TODO: CATEGORICAL: console.log(extents[dim][0], "<=", d[dim], "&&",  d[dim], "<=" , extents[dim][1]);
			    return extents[dim][0] <= d[dim] && d[dim] <= extents[dim][1];
			});
		    return isInside ? null : 'none';
		});
	    triggerChangeThrottle(extents);
	};
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
