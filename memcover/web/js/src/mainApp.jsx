'use strict'

var React = require('react');
var _ = require('lodash');
var ReactGridLayout = require('react-grid-layout');

var Context = require('context');

var reactify = require('./reactify');
var DataTable = require('./dataTable');
var BrainRegions = require('./brainRegions');
var SimpleVis = require('./simpleVis');

var PCPChart = reactify(require('./pcpChart'));

module.exports = React.createClass({
    getInitialState: function() {
	return {
	    "schema": {attributes:{}},
	    "morphoTable": this.props.morphoTable,
	    "measuresData": [],
	    "regionsCondition": null,
	    "includedRegions": []
	};
    },
    componentDidMount: function() {
	var rpc = Context.instance().rpc;
	var self = this;
	
	this.subscribeMorphoSelection();

	rpc.call("TableSrv.schema", [this.props.morphoTable])
	    .then(function(schema){
		console.log('***', schema);
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
 

	rpc.call("TableSrv.get_data", [this.props.morphoTable, "rows"])
	    .then(function(rows){self.setState({"measuresData": rows});})
	    .catch(function(e){console.error(e);});

	rpc.call('DynSelectSrv.new_categorical_condition', [this.props.morphoSelection, "region"])
	    .then(function(condition){
		return rpc.call('ConditionSrv.include_all', [condition])
		    .then(function(){return rpc.call('ConditionSrv.included_categories', [condition]);})
		    .then(function(categories) {
			self.subscribeCategoricalCondition(condition, "includedRegions");
			self.setState({"regionsCondition": condition, "includedRegions": categories});
		    });
	    })
	    .catch(function(e){console.error(e);});
    },

    subscribeMorphoSelection: function() {
	var rpc = Context.instance().rpc;
	var hub = Context.instance().hub;
	var self = this;

	hub.subscribe(this.props.morphoSelection + ':change', function(){	    
	    rpc.call('DynSelectSrv.view_args', [self.props.morphoSelection])
		.then(function(viewArgs){
		    console.log("viewArgs", viewArgs);
		    return rpc.call("TableSrv.find", [self.props.morphoTable, viewArgs.query, viewArgs.projection]);
		})
		.then(function(tableView){
		    return rpc.call("TableSrv.get_data", [tableView, "rows"])
			.then(function(rows){self.setState({"measuresData": rows});})
		})
		.catch(function(e){console.error(e);});
	});
    },

    subscribeCategoricalCondition: function(condition, stateSlot) {
	var rpc = Context.instance().rpc;
	var hub = Context.instance().hub;
	var self = this;
	
	hub.subscribe(condition + ':change', function(){	    
	    rpc.call('ConditionSrv.included_categories', [condition])
		.then(function(categories) {
		    var newCategories = {};
		    newCategories[stateSlot] = categories;
		    self.setState(newCategories);
		})
		.catch(function(e){console.error(e);});
	});	
    },

    toggleRegion: function(region) {
	var rpc = Context.instance().rpc;
	var self = this;

	rpc.call('ConditionSrv.toggle_category', [this.state.regionsCondition, region]);
    },

    render: function(){

	var columnNames = _.keys(this.state.schema.attributes);

	console.log("******", this.state);
	var contentWidth = document.getElementById('content').offsetWidth - 20;

	var layout = [{x: 0, y: 0, w: 6, h: 6, i:1}, 
	    {x: 6, y: 0, w: 3, h: 6, i:2}, 
	    {x: 0, y: 1, w: 12, h: 9, i:3, isDraggable:false}, 
	    {x: 0, y: 2, w: 12, h: 10, i:"table", isDraggable:false}
	];

	return (
	    <ReactGridLayout className="layout" layout={layout} cols={12} rowHeight={50}>
	      <div key={1}><SimpleVis table={this.props.morphoTable}/></div>
	      <div key={2}>
		<BrainRegions 
			width={350} 
			includedRegions={this.state.includedRegions}
			onClickRegion={this.toggleRegion}></BrainRegions>
	      </div>
	      <div key={3}>
		<PCPChart 
			width={contentWidth} height={450} 
			margin={{top: 50, right: 10, bottom: 40, left: 50}}
			attributes={
			    _.chain(this.state.schema.attributes).values()
				.filter(function(d){return !_.include(["measure_id"], d.name); })
				.value()
			}
			data={this.state.measuresData}
			onBrush={function(extent){/*console.log(extent);*/}}
			>
		</PCPChart>
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
