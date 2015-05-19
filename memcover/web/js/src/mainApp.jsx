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

/**
 *  Bootstrap requires
 */
var BS = require('react-bootstrap');
var Navbar = BS.Navbar;
var Nav = BS.Nav;
var NavItem = BS.NavItem;
var Button = BS.Button;
var Glyphicon = BS.Glyphicon;


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


module.exports = React.createClass({
    getInitialState: function() {

//	var layout = [
//	    {x: 8, y: 0, w: 4, h: 6, i:"c0", handle:".card-title"}, 
//	    {x: 3, y: 0, w: 5, h: 6, i:"c1", handle:".card-title"}, 
//	    {x: 0, y: 0, w: 3, h: 6, i:"c2", handle:".card-title"}, 
//	    {x: 0, y: 1, w: 12, h: 9, i:"c3", isDraggable:false}, 
//	    {x: 0, y: 2, w: 12, h: 10, i:"table", isDraggable:false}
//	];

	var layout = [
	    {x:2, y: 0, w: 5, h: 6, i:"c0", handle:".card-title"}, 
	    {x: 0, y: 2, w: 12, h: 10, i:"table", isDraggable:false}
	];

	var cards = [
	    {key:"c0", kind:"scatter", title: "Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)", config:{
		margins:{top: 20, right: 60, bottom: 60, left: 60},
		data:scatterData
	    }},
	    {key:"table", kind:"table", title: "", config:{}}
	];

	return {
	    "schema": {attributes:{}},
	    "morphoTable": this.props.morphoTable,
	    "measuresData": [],
	    "regionsCondition": null,
	    "includedRegions": [],
	    "layout": layout,
	    "cards": cards
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

    addCard: function() {
	var Y = _.max(this.state.layout, 'y') + 1;
	var key = "c" + this.state.layout.length
	this.state.layout.push({x:0, y: Y, w: 5, h: 6, i:key, handle:".card-title"});
	this.state.cards.push({key:key, kind:"table", title: "", config:{}});
	this.setState({layout:this.state.layout, cards: this.state.cards});

    },

    
    render: function(){
	var self = this;

	console.log("******", this.state);
	var contentWidth = document.getElementById('content').offsetWidth - 20;
	var rowHeight = 50;
	
	var layout = this.state.layout;
	var cards = this.state.cards;

	var computeWidth = function (key) {
	    var width = _.result(_.find(layout, {i: key}), "w");
	    console.log("width: ", key, (contentWidth/12) * width - 50 );
	    return (contentWidth/12) * width - 20;
	};
	var computeHeight = function (key) {
	    var height = _.result(_.find(layout, {i: key}), "h");
	    return rowHeight * height - 60;
	};

	var scatterCh = [];

	return (
	    <div className="mainApp">
	      <Navbar brand='Memcover' fixedTop>
		  <Button className="navbar-btn pull-right" bsStyle="primary" onClick={this.addCard}> 
		    <Glyphicon glyph='plus' /> Add Card 
		  </Button> 
	      </Navbar>

	      <ReactGridLayout className="layout" 
		      layout={layout} 
		      cols={12} 
		      rowHeight={rowHeight} 
		      useCSSTransforms={true} 
		      onLayoutChange={function(layout){self.setState({"layout":layout});}}
		      onResizeStop={function(layout, oldL, l, _, ev){/* console.log(ev);*/}}
		      >
		{
		    /*
		     * Render all the cards
		     */
		 cards.map(function(card){
		     var component = null;
		     var size = {width: computeWidth(card.key), height: computeHeight(card.key)};
		     switch (card.kind) {
			 case "scatter":
			     component = (<ScatterChart {...size} {...card.config} />);
			     break;
			 case "table":
			     var columnNames = _.keys(self.state.schema.attributes);
			     component = (<DataTable {...size} {...card.config} rows={self.state.measuresData} columnNames={columnNames}/>);
			     break;
		     }

		     return (
			 <div key={card.key}>
			 <Card key={card.key} title={card.title}>
			 {component}
			 </Card>
			 </div>			      
		     );
		 })
		 }
			 
	      </ReactGridLayout> 
	    </div>
	);
    }
});



//	      <div key={"c0"}>
//		<Card key={"c0"} title={"Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)"}>
//		  <ScatterChart 
//			  margins={{top: 20, right: 60, bottom: 60, left: 60}}
//			  data={scatterData}
//			  width={computeWidth("c0")}
//			  height={computeHeight("c0")}
//			  />
//		</Card>
//	      </div>
//	    
//	      <div key={"c1"}>
//		<Card title={"AT8 Cells/Vol per region"}>
//		  <img src="assets/boxplot.png"
//			  width={computeWidth("c1")}
//			  height={computeHeight("c1")}
//			  />
//		</Card>
//	      </div>
//	      <div key={"c2"}>
//		<Card title={"Regions"}>
//		  <BrainRegions 
//			  width={computeWidth("c2")}
//			  height={computeHeight("c2")}
//			  includedRegions={this.state.includedRegions}
//			  onClickRegion={this.toggleRegion}></BrainRegions>
//		</Card>
//	      </div>
//	      <div key={"c3"}>
//		<PCPChart 
//			width={computeWidth("c3")}
//			height={computeHeight("c3")}
//			margin={{top: 50, right: 40, bottom: 40, left: 40}}
//			attributes={
//			    _.chain(this.state.schema.attributes).values()
//				.filter(function(d){return !_.include(["measure_id"], d.name); })
//				.value()
//			}
//			data={this.state.measuresData}
//			onBrush={function(extent){/*console.log(extent);*/}}
//			>
//		</PCPChart>
//	      </div>
//	      <div key={"table"}>
//		<DataTable
//			rows={this.state.measuresData}
//			columnNames={columnNames}
//			width={computeWidth("table")}
//			height={computeHeight("table")}
//			>
//		</DataTable>
//	      </div>




