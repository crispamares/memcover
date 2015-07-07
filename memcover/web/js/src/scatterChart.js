var c3 = require('c3');
var _ = require('lodash');

module.exports = {
    createChart: function(container, props, state){},
    cleanChart: function(container, props, state){},
    update: function(container, nextProps, nextState){

	var chart = c3.generate({
	    bindto: container,
	    size: {
		height: nextProps.height,
		width: nextProps.width
	    },
	    interaction: {enabled: false},
	    data: {
		type: "scatter",
		json: nextProps.data,
		keys: {x: 'x', value:['y']},
		names: {x: nextProps.xColumn, y: nextProps.yColumn}
	    },
	    axis: {
		x: {
		    label: nextProps.xColumn,
		    tick: {fit: false}
		},
		y: {
		    label: nextProps.yColumn
		}
	    }
	});
    }
};
