'use strict'

var React = require('react');
var d3 = require('d3');
var _ = require('lodash');

var LifecycleMixin = require('./lifecycleMixin');

module.exports = React.createClass({
    mixins: [LifecycleMixin],

    getDefaultProps: function() {
	return {
	    includedRegions: ["SUB", "DG", "CA3", "CA1"]
	};
    },

    componentDidMount: function() {
	var container = this.refs.container.getDOMNode();

	container.addEventListener("load", function(){
	    var svg = d3.select(container.contentDocument);

	    this.update(svg, this.props, this.state);
	}.bind(this));
    },

    shouldComponentUpdate: function(nextProps, nextState) {
	var container = this.refs.container.getDOMNode();
	container.setAttribute("width", nextProps.width);
	container.setAttribute("height", nextProps.height);

	var svg = d3.select(container.contentDocument);

	this.update(svg, nextProps, nextState);
	// render is not called again so the container is there until
	// the end.
	return false;
    },

    update: function(svg, props, state) {
	var self = this;

	var region = svg.selectAll("g.region")
	    .datum(function() { return this.id; })
	    .style("cursor", function(){return (props.onClickRegion) ? "pointer" : null})
	    .on("click", function(d){if (props.onClickRegion) {props.onClickRegion(d);};});

	region.selectAll("path")
	    .datum(function() { return this.parentNode.id; })
	    .style("fill", function(d){return (_.include(props.includedRegions, d)) ? "rgb(164, 0, 0)" : "#EEE";});

	region.selectAll("text")
	    .datum(function() { return this.parentNode.id; })
	    .style("fill", function(d){return (_.include(props.includedRegions, d)) ? "white" : "#333";});
	
	props.includedRegions.forEach(function(region){
	    svg.select("#"+region).select("text").style("fill", "white");
	});

    },

    render: function(){
	return (
            <div>
	      <object ref="container" id="svgobject" 
		      type="image/svg+xml"
		      width={this.props.width} 
		      height={this.props.height}
		      data="assets/hipo_foto.svg">
	      </object>
            </div>
	);
    }
});
