'use strict'

var React = require('react');
var _ = require('lodash');
var ReactGridLayout = require('react-grid-layout');

var Context = require('context');

var reactify = require('./reactify');
var DataTable = require('./dataTable');
var BrainRegions = require('./brainRegions');
var SimpleVis = require('./simpleVis');
var Card = require('./card');

var PCPChart = reactify(require('./pcpChart'));
var ScatterChart = require('react-d3/scatterchart').ScatterChart;

module.exports = React.createClass({
    getInitialState: function() {

	var layout = [
	    {x: 8, y: 0, w: 4, h: 6, i:0, handle:".card-title"}, 
	    {x: 3, y: 0, w: 5, h: 6, i:1, handle:".card-title"}, 
	    {x: 0, y: 0, w: 3, h: 6, i:2, handle:".card-title"}, 
	    {x: 0, y: 1, w: 12, h: 9, i:3, isDraggable:false}, 
	    {x: 0, y: 2, w: 12, h: 10, i:"table", isDraggable:false}
	];

	var cards = {
	    0: {i:0, grid: layout[0], constructor: ScatterChart, config:{title: "Scatter Chart"}}
	};

	return {
	    "schema": {attributes:{}},
	    "morphoTable": this.props.morphoTable,
	    "measuresData": [],
	    "regionsCondition": null,
	    "includedRegions": [],
	    "layout": layout
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
	var self = this;
	var columnNames = _.keys(this.state.schema.attributes);

	console.log("******", this.state);
	var contentWidth = document.getElementById('content').offsetWidth - 20;
	var rowHeight = 50;
	var scatterData = [
	    {
		name: "series1",
		values: [ 
		    { x: 4.5, y:	10093.0355127938 },
		    { x: 2, y:	9053.6006591816 },
		    { x: 5.5, y:	9709.7132826258 },
		    { x: 5.5, y:	4411.9646756317 },
		    { x: 4, y:	11871.6073443496 },
		    { x: 5, y:	8503.093763325 },
		    { x: 4.25, y:	9717.1988192271 },
		    { x: 4.75, y:	9739.9604497065 },
		    { x: 5, y:	7204.7118005418 },
		    { x: 5, y:	9935.2958133543 } 
		]
	    },
	];
	
	var layout = this.state.layout;
	var scatterCh = [];
	return (
	    <ReactGridLayout className="layout" 
		    layout={layout} 
		    cols={12} 
		    rowHeight={rowHeight} 
		    useCSSTransforms={true} 
		    onLayoutChange={function(layout){self.setState({"layout":layout});}}
		    onResizeStop={function(layout, oldL, l, _, ev){/* console.log(ev);*/}}
		    >
	      
	      <div key={0}>
		<Card key={0} title={"Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)"}>
		  <ScatterChart 
			  margins={{top: 20, right: 60, bottom: 60, left: 60}}
			  data={scatterData}
			  width={(contentWidth/12) * layout[0].w - 50} 
			  height={rowHeight * layout[0].h - 20}
			  />
		</Card>
	      </div>
	    
	      <div key={1}>
		<Card title={"AT8 Cells/Vol per region"}>
		  <img src="assets/boxplot.png" width={(contentWidth/12) * layout[1].w - 50}/>
		</Card>
	      </div>
	      <div key={2}>
		<Card title={"Regions"}>
		  <BrainRegions 
			  width={(contentWidth/12) * layout[2].w - 50} 
			  includedRegions={this.state.includedRegions}
			  onClickRegion={this.toggleRegion}></BrainRegions>
		</Card>
	      </div>
	      <div key={3}>
		<PCPChart 
			width={(contentWidth/12) * layout[3].w - 50} height={450} 
			margin={{top: 50, right: 40, bottom: 40, left: 40}}
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
			width={contentWidth -10}
			height={480}
			columnNames={columnNames}
			>
		</DataTable>
	      </div>
	    </ReactGridLayout> 
	);
    }
});
