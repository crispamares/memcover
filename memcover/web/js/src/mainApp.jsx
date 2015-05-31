'use strict'

var React = require('react');
var _ = require('lodash');
var ReactGridLayout = require('react-grid-layout');

var Context = require('context');

var reactify = require('./reactify');
var DataTable = require('./dataTable');
var BrainRegions = require('./brainRegions');
var CategoricalFilter = require('./categoricalFilter');
var SimpleVis = require('./simpleVis');
var Card = require('./card');
var CardCreationMenu = require('./cardCreationMenu');

var PCPChart = reactify(require('./pcpChart'), "PCPChart");
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
var ModalTrigger = BS.ModalTrigger;


var Store = {
    getSchema: function(tableName) {
	var rpc = Context.instance().rpc;
	
 	function getQuantitativeAttrs(schema) {
	    var attrs = _.pick(schema.attributes, function(value, key) {
		return value.attribute_type === "QUANTITATIVE" && ! value.shape.length;
	    });
	    return _(attrs).keys().sort().value();
	}

	var promise = rpc.call("TableSrv.schema", [tableName])
	    .then(function(schema) {
		console.log('***', schema);
		schema.attributes = _.mapValues(schema.attributes, function(v,k){v.name = k; return v;});
		schema.quantitative_attrs = getQuantitativeAttrs(schema);

		return schema;
	    })
	    .catch(function(e){console.error(e);});

	return promise;
    },

    getData: function(tableName) {
	var rpc = Context.instance().rpc;

	var promise = rpc.call("TableSrv.get_data", [tableName, "rows"])
	    .catch(function(e){console.error(e);});
	return promise;
    },
    
    linkTableToSelection: function(table, selection, onChange) {
	var rpc = Context.instance().rpc;
	var hub = Context.instance().hub;
	var self = this;

	hub.subscribe(selection + ':change', function(){	    
	    rpc.call('DynSelectSrv.view_args', [selection])
		.then(function(viewArgs){
		    console.log("viewArgs", viewArgs);
		    return rpc.call("TableSrv.find", [table, viewArgs.query, viewArgs.projection]);
		})
		.then(function(tableView){
		    return rpc.call("TableSrv.get_data", [tableView, "rows"])
			.then( onChange );
		})
		.catch(function(e){console.error(e);});
	});
    },
	
    /**
     * @param kind: "categorical", "quantitative"
     * @return: condition
     */
    createCondition: function(selection, column, kind) {
	var rpc = Context.instance().rpc;

	var method = "DynSelectSrv.new_" + kind + "_condition"

	var promise = rpc.call(method, [selection, column])
		.catch(function(e){console.error(e);});	

	return promise;
    },

    includeAll: function(condition) {
	var rpc = Context.instance().rpc;
	return rpc.call('ConditionSrv.include_all', [condition]);
    },

    getGrammar: function(condition) {
	var rpc = Context.instance().rpc;
	return rpc.call('ConditionSrv.grammar', [condition]);
    },



//		    .then(function(categories) {
//			self.subscribeCategoricalCondition(condition, "includedRegions");
//			self.setState({"regionsCondition": condition, "includedRegions": categories});
//		    });


	
    /**
     * Will create a new subscription and call onChange with the grammar of the condition
     * @param: onChange(grammar)
     */
    linkCondition: function(condition, onChange) {
	var rpc = Context.instance().rpc;
	var hub = Context.instance().hub;

	hub.subscribe(condition + ':change', function(){	    
	    rpc.call('ConditionSrv.grammar', [condition])
		.then( onChange )
		.catch(function(e){console.error(e);});
	});

	return rpc.call('ConditionSrv.grammar', [condition]).then( onChange );
    },

    toggleCategory: function(condition, category) {
	var rpc = Context.instance().rpc;
	return rpc.call('ConditionSrv.toggle_category', [condition, category]);
    }

}


module.exports = React.createClass({
    getInitialState: function() {
	var layout = [
//	    {x:2, y: 0, w: 5, h: 6, i:"c0", handle:".card-title"}, 
	];

	var cards = [
// 	    {key:"c0", kind:"scatter", title: "Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)", config:{}}
	];

	var tables = {};
	tables[this.props.morphoTable] = {name: this.props.morphoTable, data: [], schema: {attributes:{}}, selection: this.props.morphoSelection};
	tables[this.props.clinicTable] = {name: this.props.clinicTable, data: [], schema: {attributes:{}}, selection: this.props.clinicSelection};

	var conditions = {};
//     - Conditions: {table: {conditionSet: {condition: {subscription: <>,  name: condition } } }
//     - Selections: {table: {conditionSet: {subscription: <>, name: condition } } }
//     - TableSubscriptions: {table: {subscription: <>, name: condition } }

	return {
	    "tables": tables,
	    "conditions": conditions,
	    "regionsCondition": null,
	    "includedRegions": [],
	    "layout": layout,
	    "cards": cards
	};
    },

    putState: function(v, path) {
	var newState = _.set(this.state, v, path);
	this.setState(newState);
    },

    componentDidMount: function() {
	var self = this;

	_.forEach(this.state.tables, function(table){
	    Store.linkTableToSelection(table.name, table.selection, function(rows) {
		self.state.tables[table.name].data = rows;
		self.setState({"tables": self.state.tables}); 
	    });

	    Store.getSchema(table.name).then(function(schema){ 
		self.state.tables[table.name].schema = schema;
		self.setState({"tables": self.state.tables}); 
	    });

	    Store.getData(table.name).then(function(rows){ 
		self.state.tables[table.name].data = rows;
		self.setState({"tables": self.state.tables}); 
	    });

	});
	
    },

    addCard: function(card) {
	var Y = Math.max(0, _.max(this.state.layout, 'y')) + 1;
	var key = "c" + this.state.layout.length
	card.key = key;
	this.state.layout.push({x:0, y: Y, w: 6, h: 6, i:key, handle:".card-title"});
	this.state.cards.push(card);
	this.setState({layout:this.state.layout, cards: this.state.cards});

    },

    initCondition: function(kind, table, selection, column) {
	var self = this;
	Store.createCondition(selection, column, kind)
	    .then(function(condition) { 
		Store.includeAll(condition)
		    .then(function() { 
			Store.linkCondition( condition, function(grammar) {
			    self.putState(
				["conditions", table, selection, column],
				{name: condition, grammar: grammar});
			    console.log("GRAMMAR: ", grammar);
			}); 
		    });
	    });
    },

    renderRegionsCard: function(card, size) {
	var initRegions = this.initCondition.bind(this, "categorical", this.props.morphoTable, this.props.morphoSelection, "region");

	var conditionPath = ["conditions", this.props.morphoTable, this.props.morphoSelection, "region"];
	var condition = _.get(this.state, conditionPath.concat(["name"]));

	var component = (<BrainRegions {...size} 
			     onMount={initRegions}
			     includedRegions={_.get(this.state, conditionPath.concat(["grammar", "included_categories"]), [])}
			     onClickRegion={Store.toggleCategory.bind(this, condition)}>
	</BrainRegions>);
			     
	return component;
    },

    renderCategroricalFilterCard: function(card, size) {
	var table = card.config.table;
	var column = card.config.column;
	var selection = this.state.tables[table].selection;

	var initCondition = this.initCondition.bind(this, "categorical", table, selection, column);

	var conditionPath = ["conditions", table, selection, column];
	var condition = _.get(this.state, conditionPath.concat(["name"]));

	var included = _.get(this.state, conditionPath.concat(["grammar", "included_categories"]));
	var excluded = _.get(this.state, conditionPath.concat(["grammar", "excluded_categories"]));
	var categories = [];
	_.reduce(included, function(acc, category) {
	    acc.push({name: category, included: true});
	    return acc;
	}, categories);
	_.reduce(excluded, function(acc, category) {
	    acc.push({name: category, included: false});
	    return acc;
	}, categories);
	categories = _.sortBy(categories, "name");

	var component = (<CategoricalFilter {...size} 
				 onMount={initCondition}
				 categories={categories} 
				 onClickedCategory={Store.toggleCategory.bind(this, condition)} />);
	return component;
    },
    
    render: function(){
	var self = this;

	console.log("**** mainApp.state OnRender: ---> ", this.state);
	var contentWidth = document.getElementById('content').offsetWidth - 20;
	var rowHeight = 50;
	
	var layout = this.state.layout;
	var cards = this.state.cards;

	var computeWidth = function (key) {
	    var width = _.result(_.find(layout, {i: key}), "w");
	    return (contentWidth/12) * width - 20;
	};
	var computeHeight = function (key) {
	    var height = _.result(_.find(layout, {i: key}), "h");
	    return rowHeight * height - 60;
	};

	var tables = _.keys(self.state.tables);
	var columns = _.mapValues(self.state.tables, function(table){
	    return _.map(table.schema.attributes, 
		function(value, key){return {name: key, included: true};}
	    );
	});
	var quantitativeColumns = _.mapValues(self.state.tables, function(table){
	    return _.chain(table.schema.attributes)
		.filter({attribute_type: "QUANTITATIVE"})
		.map(function(value, key){return {name: value.name};})
		.value();
	});
	var categoricalColumns = _.mapValues(self.state.tables, function(table){
	    return _.chain(table.schema.attributes)
		.filter({attribute_type: "CATEGORICAL"})
		.map(function(value, key){return {name: value.name};})
		.value();
	});

	var creationMenuTabs = [
	    { kind: "table", title: "Data Table", options: { tables: tables, columns: columns } },
	    { kind: "pcp", title: "Parallel Coordinates", options: { tables: tables, columns: columns } },
	    { kind: "scatter", title: "Scatter Plot", options: { tables: tables, columns: quantitativeColumns } },
	    { kind: "regions", title: "Regions", options: {}},
	    { kind: "categoricalFilter", title: "Categorical Filter", options: { tables: tables, columns: categoricalColumns } },
	];

	return (
	    <div className="mainApp">

	      <Navbar brand='Memcover' fixedTop>
		<ModalTrigger modal={<CardCreationMenu tabs={creationMenuTabs} onCreateCard={this.addCard}/>}>
		  <Button className="navbar-btn pull-right" bsStyle="primary"> 
		    <Glyphicon glyph='plus' /> Add Card 
		  </Button> 
		</ModalTrigger>
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
			 case "table":
			     // var columnNames = _.keys(self.state.schema.attributes);
			     var columnNames = _.pluck(_.filter(card.config.columns, 'included'), 'name');
			     component = (<DataTable {...size} {...card.config} 
				 rows={self.state.tables[card.config.table].data} columnNames={columnNames}/>);
			     break;
			 case "pcp":
			     var columnNames = _.pluck(_.filter(card.config.columns, 'included'), 'name');
			     var attributes = _.map(columnNames, function(c){
				 return self.state.tables[card.config.table].schema.attributes[c];});
			     component = (<PCPChart {...size}
				 data={self.state.tables[card.config.table].data} 
				 margin={{top: 50, right: 40, bottom: 40, left: 40}}
				 attributes={attributes}
				 onBrush={function(extent){/*console.log(extent);*/}}
				 >
			     </PCPChart>);
			     break;
			 case "scatter":
			     var values = _.map(self.state.tables[card.config.table].data, function(row) {
				 return {x: row[card.config.xColumn], y: row[card.config.yColumn]};
			     });
			     var data = [{ name: "series1", values: values}];
			     
			     component = (<ScatterChart {...size} {...card.config} data={data}/>);
			     break;
			 case "regions":
			     component = self.renderRegionsCard(card, size);
			     break;
			 case "categoricalFilter":
			     component =  self.renderCategroricalFilterCard(card, size);
			     break;
			 
		     }

		     return (
			 <div key={card.key}>
			   <Card key={card.key} title={card.title} size={size}>
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




