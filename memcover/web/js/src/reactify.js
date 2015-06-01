var ChartContainerMixin = require('./chartContainerMixin');
var LifecycleMixin = require('./lifecycleMixin');

module.exports = function(chart, displayName){
    return React.createClass({displayName: displayName, mixins : [ChartContainerMixin, LifecycleMixin, chart]});
};
