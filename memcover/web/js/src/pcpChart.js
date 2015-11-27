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
	    .attr("class", "pcp")
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g").attr("class", "nanAxis");
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
	var self = this;
	var nanMargin = 50;
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom - nanMargin;
	var nanY = height + (nanMargin / 2);

	var axis = d3.svg.axis().orient("left");
	var scales = this._scales(width, height, props.data, props.attributes);
	var path = this._path(props.attributes, scales, nanY);
	var dragState = {};

	console.log("PCP:", props.data);

	var realSvg = d3.select(container).select("svg");
	realSvg.attr("width", props.width)
	    .attr("height", props.height);

	var svg = d3.select(container).select("svg > g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add foreground lines.
	var foreground = svg.select("g.foreground");
	var foregroundLines = foreground.selectAll("path")
	  .data(props.data, function(d){return d[props.index];});
	foregroundLines.enter().append("path");
	foregroundLines.attr("d", path)
//	    .attr("class", function(d) {return d.patient;})
	    .attr("title", function(d) {return d[props.index];});
	foregroundLines.exit().remove();

	var brushes = this._brushes(scales, props.attributes, props.onBrush, foreground);

	// Add a group element for each trait.
	var coordinates = svg.selectAll(".coordinate")
		.data(_.pluck(props.attributes, "name"), function(d){return d;});
	coordinates.enter().append("g").attr("class", "coordinate")
		.call(function(g) {
		    // Add an axis and title.
		    g.append("g")
			.attr("class", "axis")
		      .append("text")
			.attr("text-anchor", "middle")
			.attr("class", "dimension") ;})

		.call(function(g) {
		    // Add a brush for each axis.
		    g.append("g")
			.attr("class", "brush"); });
	coordinates
		.attr("transform", function(d) { return "translate(" + scales.x(d) + ")"; })
		.call(d3.behavior.drag()
		      .origin(function(d) { return {x: scales.x(d)}; })
		      .on("dragstart", this._dragstart(props.attributes, dragState))
		      .on("drag", this._drag(scales, dragState, props.attributes, foregroundLines, path, coordinates))
		      .on("dragend", this._dragend(scales, props.attributes, width, path, svg))
		     );
	coordinates.selectAll("g.axis")
	    .each(function(d) { d3.select(this).call(axis.scale(scales.y[d])); });
	coordinates.selectAll("g.brush")
		.each(function(d) { if (!_.isUndefined(props.onBrush)) {d3.select(this).call(brushes[d]);}; })
	    .selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);
	this._humanizeCoordinateLabels(coordinates.selectAll("text.dimension"), props.attributes);
	coordinates.exit().remove();


	// Nan Axis
	var x1 = scales.x.range()[0];
	var x2 = _.last(scales.x.range());
	var nanAxis = svg.selectAll("g.nanAxis").selectAll("g.axis").data(["nan"]);
	nanAxis.enter()
	    .append("g")
	    .attr("class", "axis")
	    .each(function(){
		d3.select(this).append("line");
		d3.select(this).append("text")
		    .text("NaN")
		    .attr("text-anchor", "right");
	    });
	nanAxis.attr("transform", "translate("+ 0 +", "+ nanY  +")");
	nanAxis.selectAll("line").attr({x1:x1, y1:0, x2:x2, y2:0});
	nanAxis.selectAll("text").attr("x", x1 - 40);

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

    _dragend: function(scales, attributes, width, path, svg) {
        var x = scales.x;
        var self = this;
        return function dragend(d) {
            x.domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
            var t = d3.transition().duration(500);
            t.selectAll(".coordinate").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
            t.selectAll(".foreground path").attr("d", path);

            // TODO: Sort Coordinates after the animation
            _.delay(function(){self.props.onAttributeSort(attributes)}, 500);
        };
    },

    _scales: function(width, height, data, attributes) {
        var self = this;

        var x = d3.scale.ordinal().domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
        var y = {};

        function sortCategories (rows, order) {
            return rows.sort(function(a,b){
                return d3.ascending(order.indexOf(a), order.indexOf(b));
            })
        }

        attributes.forEach(function(d) {
            var name = d.name;
            if (d.attribute_type === 'QUANTITATIVE') {
                y[name] = d3.scale.linear()
                .domain(d3.extent(data.filter(function(p){return !isNaN(p[name]);})
                , function(p) { return p[name]; }))
                .range([height, 0]);
            }
            else if (d.attribute_type === 'CATEGORICAL' || d.attribute_type === 'ORDINAL') {
                var domain = d3.set(_.pluck(data, name)).values();
                if (_.isArray(d.meta.order)) {
                    domain = sortCategories(domain, d.meta.order);
                }
                y[name] = d3.scale.ordinal()
                .domain(domain)
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
    _path : function (attributes, scales, nanY) {
	var line = d3.svg.line();
//		.defined(function(d){return !isNaN(d[1]);});  // Breaks the line
	return function (d) {
	    return line(_.pluck(attributes, "name")
			.map(function(a) {
			    var y = scales.y[a](d[a])
			    return [scales.x(a), !isNaN(y) ? y : nanY ]; }));
	};
    },

    _humanizeCoordinateLabels: function(textSelection, attributes) {
	textSelection.text(function(d){return _.capitalize(String(d));});
	textSelection.transition().attr("y", function(d,i){return (_.findIndex(attributes, {name:d}) %2)? -9 : -27;});
    }

};
