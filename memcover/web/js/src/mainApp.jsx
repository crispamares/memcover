'use strict'

var React = require('react');
var _ = require('lodash');
var ReactGridLayout = require('react-grid-layout');

var Context = require('context');

var DataTable = require('./dataTable');
var BrainRegions = require('./brainRegions');
var SimpleVis = require('./simpleVis');

module.exports = React.createClass({
    getInitialState: function() {
	return {
	    "schema": {attributes:{}},
	    "measuresTable": this.props.measuresTable,
	    "measuresData": []
	};
    },
    componentDidMount: function() {
	var rpc = Context.instance().rpc;
	var self = this;

	rpc.call("TableSrv.schema", [this.props.measuresTable])
	    .then(function(schema){
		schema.attributes = _.mapValues(schema.attributes, function(v,k){v.name = k; return v;});
		schema.quantitative_attrs = getQuantitativeAttrs(schema);

		function getQuantitativeAttrs(schema) {
		    var attrs = _.pick(schema.attributes, function(value, key) {
			return value.attribute_type === "QUANTITATIVE" && ! value.shape.length;
		    });
		    return _(attrs).keys().sort().value();
		}

		self.setState({"schema": schema});
	    })
	    .catch(function(e){console.error(e);});
 

	rpc.call("TableSrv.get_data", [this.props.measuresTable, "rows"])
	    .then(function(rows){self.setState({"measuresData": rows});})
	    .catch(function(e){console.error(e);});

    },
    render: function(){

	var columnNames = _.keys(this.state.schema.attributes);

	console.log("******", columnNames);
	var contentWidth = document.getElementById('content').offsetWidth - 20;

	var layout = [{x: 0, y: 0, w: 6, h: 6, i:1}, 
	    {x: 6, y: 0, w: 6, h: 6, i:2}, 
	    {x: 0, y: 1, w: 12, h: 10, i:"table"}
	];

	return (
	    <ReactGridLayout className="layout" layout={layout} cols={12} rowHeight={50}>
	      <div key={1}><SimpleVis data={[{value:25, label:"P1"},{value:45, label:"P2"}]}/></div>
	      <div key={2}>
		<BrainRegions width={"40%"}></BrainRegions>
	      </div>
	      <div key={"table"}>
		<DataTable 			  
			rows={this.state.measuresData}
			tableWidth={contentWidth}
			tableHeight={500}
			columnNames={columnNames}
			>
		</DataTable>
	      </div>
	    </ReactGridLayout> 
	);
    }
});
