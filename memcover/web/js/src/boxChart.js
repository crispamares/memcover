var d3 = require('d3');
var _ = require('lodash');
require('./box');


module.exports = {
    createChart: function(container, props, state){
	var margin = this.props.margin;
	var width = this.props.width - margin.left - margin.right;
	var height = this.props.height - margin.top - margin.bottom;

	var svg = d3.select(container).append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .attr("class", "boxChart")
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var gXAxis = svg.append("g")
	    .attr("class", "x axis");

	var gYAxis = svg.append("g")
	    .attr("class", "y axis");

	var gBoxes = svg.append("g")
	    .attr("class", "boxes");

    },

    cleanChart: function(container, props, state){
	// unsubscribe things 
    },

    update: function(container, props, state) {
	if ( !(props.distributions.length)) {
	    d3.select(container).html('');
	    this.createChart(container, props, state);
	    return null
	};
	console.log("Update BOX"); 
	var self = this;
	var margin = props.margin;
	var width = props.width - margin.left - margin.right;
	var height = props.height - margin.top - margin.bottom;

	var boxWidth = 20;
	var boxMargin = 25;
	var boxGroupMargin = 20;

	var color = d3.scale.category10();

	var nDistributions = props.distributions.length;
	var distributions = _.flatten(_.forEach(props.distributions, function(dist, i){
	    return _.map(dist, function(v){return v.subset = i;});}));
	var factedData = _.groupBy(distributions, 'facetAttr');
	var nBoxGroups = d3.max(_.map(props.distributions, 'length'));
	
	var boxGroupWidth = nDistributions * (boxWidth + 2 * boxMargin);

	// -----------------------------
	//     Update the axes
	// -----------------------------

	var x = d3.scale.ordinal()
	    .domain(_.keys(factedData))
	    .rangePoints([0,width], 1);

	var y = d3.scale.linear()
	    .domain(self.getDomain(distributions))
	    .rangeRound([height, 0])
	    .nice();

	var boxPlot = d3.box()
	    .height(height)
	    .width(boxWidth)
	    .whiskers(iqr(1.5))
	    .domain(y.domain())
	    .tickFormat(function(){return "";}); // No labels

	var xGroup = d3.scale.linear()
	    .rangeRound([0, width])
	    .domain([0, nBoxGroups]);

	var xAxis =  d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis =  d3.svg.axis()
	    .scale(y)
	    .ticks(5)
	    .orient("left");
	
	// -----------------------------
	//     Update the layers
	// -----------------------------

	var realSvg = d3.select(container).select("svg");
	realSvg.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom);

	var svg = d3.select(container).select("svg > g")
	    .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

	var gXAxis = svg.select("g.x")
	    .attr("transform", "translate(0," + height + ")")
	    .transition().call(xAxis);

	var gYAxis = svg.select("g.y")
	    .transition().call(yAxis);

	var gBoxes = svg.select("g.boxes");

	// -----------------------------
	//     Update the boxPlots
	// -----------------------------

	var boxGroup = gBoxes.selectAll('g.boxGroup')
	    .data(_.values(factedData));
	boxGroup.enter().append('g')
	    .classed('boxGroup', true);

	var box = boxGroup.selectAll('g.box')
	    .data(function(d) { return d; });

	box.enter().append('g')
	    .classed('box', true);

	boxGroup.attr("transform", function(d,i) {return "translate(" + x(d[0].facetAttr) + ",0)";});

	box.attr("transform", function(d,i) {
	    var offset = - (boxWidth/2); //boxMargin + ((boxGroupWidth/2) * d.subset);
	    return "translate(" + offset + ",0)";})
	    .datum(function(d){return d.list;})
	    .call(boxPlot);
	
	box.exit().remove();
	boxGroup.exit().remove();

	return null;
    },

    getDomain : function(distributions) {
	var minmax = function(acc, v){
	    acc.min = Math.min(acc.min, v.min);
	    acc.max = Math.max(acc.max, v.max);
	    return acc;
	};
	var domain =  _.reduce(_.flatten(distributions), minmax, {'min':Infinity, 'max':-Infinity});	    
	return [domain.min, domain.max];
    }

};

// Returns a function to compute the interquartile range.
function iqr(k) {
    return function(d, i) {
	var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
	while (d[++i] < q1 - iqr);
	while (d[--j] > q3 + iqr);
	return [i, j];
    };
}
