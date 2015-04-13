var ChartContainerMixin = require('./chartContainerMixin');

module.exports = function(chart){
    return React.createClass({mixins : [ChartContainerMixin, chart]});
};
