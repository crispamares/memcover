'use strict'

var React = require('react');
var d3 = require('d3');
var _ = require('lodash');

var reactify = require('./reactify');
var LifecycleMixin = require('./lifecycleMixin');
var BS = require('react-bootstrap');

var RangeSlider = reactify(require('./rangeSlider'), "RangeSlider");

module.exports = React.createClass({
    mixins: [LifecycleMixin],

    getDefaultProps: function() {
	return {
	    domain: {min: 0, max: 1},
	    extent: [0,1],
	    height: 45
	};
    },

    render: function() {

	var onChange = _.throttle(this.props.onChange, 100);
	var domain = this.props.domain;
	var extent =  this.props.extent;

	return (
            <RangeSlider domain={domain}
		    extent={extent}
		    onMove={onChange}
		    width={this.props.width} 
		    height={this.props.height}>
	    </RangeSlider>
	)
    }
});
