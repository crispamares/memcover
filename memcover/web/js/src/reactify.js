var ChartContainerMixin = require('./chartContainerMixin');

module.exports = function(chart, displayName){
    return React.createClass({displayName: displayName, mixins : [ChartContainerMixin, chart]});
};
