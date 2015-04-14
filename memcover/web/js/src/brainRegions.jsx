'use strict'

var React = require('react');
var d3 = require('d3');
var _ = require('lodash');

module.exports = React.createClass({

    getDefaultProps: function() {
	return {
	    includedRegions: ["SUB", "DB", "CA3", "CA1"]
	};
    },

    componentDidMount: function() {
	this.update();
    },

    componentDidUpdate: function() {
	this.update();
    },

    update: function() {
	var container = this.refs.container.getDOMNode();
	var svg = d3.select(container);

	console.log("chop", svg);

d3.xml("http://upload.wikimedia.org/wikipedia/commons/a/a0/Circle_-_black_simple.svg", 
        function(error, documentFragment) {

    if (error) {console.log(error); return;}

    var svgNode = documentFragment
                .getElementsByTagName("svg")[0];
    //use plain Javascript to extract the node

    main_chart_svg.node().appendChild(svgNode);
    //d3's selection.node() returns the DOM node, so we
    //can use plain Javascript to append content

    var innerSVG = main_chart_svg.select("svg");

    innerSVG.transition().duration(1000).delay(1000)
          .select("circle")
          .attr("r", 100);

});
	
    },

    render: function(){
	return (
            <div>
	      <object ref="container" id="svgobject" 
		      type="image/svg+xml"
8		      width={this.props.width} 
		      height={this.props.heght}
		      data="assets/hipo_map.svg">
	      </object>
            </div>
	);
    }
});
