'use strict'

var React = require('react');

module.exports = {

    componentDidMount: function() {
	this.props.onMount && this.props.onMount.call(this);
    },

    componentWillUnmount: function() {
	this.props.onUnmount && this.props.onUnmount.call(this);
    },

};
