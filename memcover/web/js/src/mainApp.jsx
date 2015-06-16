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
var BoxChart = reactify(require('./boxChart'), "BoxChart");
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
    },

    getFacetedData: function(table, selection, attr, facetAttr) {
	var rpc = Context.instance().rpc;

	return rpc.call('DynSelectSrv.query', [selection])
	    .then(function (query) {
		var aggregation = [{$match: query},
		    {$group: {_id: '$'+facetAttr, 
			'list': {$push: '$'+attr},
			'max': {$max: '$'+attr},
			'min': {$min: '$'+attr}
		    }
		    },
		    {$project: {facetAttr: '$_id', _id: false, 'list':true, 'max':true, 'min':true}}
		];
		//console.log(JSON.stringify(aggregation));
		return rpc.call('TableSrv.aggregate', [table, aggregation]);
	    })
	    .then(function (tableview) {return rpc.call('TableSrv.get_data', [tableview]);});
    },

    linkFacetedData: function(table, selection, attr, facetAttr, onChange) {
	var rpc = Context.instance().rpc;
	var hub = Context.instance().hub;

	hub.subscribe(selection + ':change', function(){	    
	    Store.getFacetedData(table, selection, attr, facetAttr)
		.then( onChange )
		.catch(function(e){console.error(e);});
	});

	Store.getFacetedData(table, selection, attr, facetAttr)
	    .then( onChange )
	    .catch(function(e){console.error(e);});
    }


}





module.exports = React.createClass({
    getInitialState: function() {
	var layout = [
//	    {x:2, y: 0, w: 5, h: 6, i:"c0", handle:".card-title"}, 
	];

	var cards = {
// 	    "c0": {key:"c0", kind:"scatter", title: "Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)", config:{}}
	};

	var tables = {};
	tables[this.props.morphoTable] = {name: this.props.morphoTable, data: [], schema: {attributes:{}}, selection: this.props.morphoSelection};
	tables[this.props.clinicTable] = {name: this.props.clinicTable, data: [], schema: {attributes:{}}, selection: this.props.clinicSelection};

	var conditions = {};
//     - Conditions: {table: {conditionSet: {condition: {subscription: <>,  name: condition } } }
//     - Selections: {table: {conditionSet: {subscription: <>, name: condition } } }
//     - TableSubscriptions: {table: {subscription: <>, name: condition } }

// -------  To load saved state: 
//	var savedState = require('./savedState');
//	return JSON.parse(savedState);

	return {
	    "tables": tables,
	    "conditions": conditions,
	    "layout": layout,
	    "cards": cards
	};
    },

    putState: function(path, v) {
	var newState = _.set(this.state, path, v);
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

	if (this.state.layout.length === 0) var key = "c0";
	else var key = "c" + (parseInt(_.rest(_.last(this.state.layout).i)) + 1)

	card.key = key;
	card.onClose = this.removeCard.bind(this, key);
	this.state.layout.push({x:0, y: Y, w: 6, h: 6, i:key, handle:".card-anchor"});
	this.state.cards[key] = card;
	this.setState({layout:this.state.layout, cards: this.state.cards});

    },

    removeCard: function(key) {
	var cards = _.omit(this.state.cards, key);
	var layout = _.reject(this.state.layout, {i: key});

	this.setState({layout:layout, cards: cards});	
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
	var cards = _.values(this.state.cards);

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

	var creationVisMenuTabs = [
	    { kind: "table", title: "Data Table", options: { tables: tables, columns: columns } },
	    { kind: "pcp", title: "Parallel Coordinates", options: { tables: tables, columns: columns } },
	    { kind: "scatter", title: "Scatter Plot", options: { tables: tables, columns: quantitativeColumns } },
	    { kind: "box", title: "Box Plot", options: { tables: tables, categoricalColumns: categoricalColumns, quantitativeColumns: quantitativeColumns } },
	];

	var creationFilterMenuTabs = [
	    { kind: "regions", title: "Regions", options: {}},
	    { kind: "categoricalFilter", title: "Categorical Filter", options: { tables: tables, columns: categoricalColumns } },
	];

	return (
	    <div className="mainApp">

	      <Navbar brand='Memcover' fixedTop>
		<ModalTrigger modal={<CardCreationMenu tabs={creationVisMenuTabs} onCreateCard={this.addCard}/>}>
		  <Button className="navbar-btn pull-right" bsStyle="primary"> 
		    <Glyphicon glyph='plus' /> Add Visualization 
		  </Button> 
		</ModalTrigger>

		<ModalTrigger modal={<CardCreationMenu tabs={creationFilterMenuTabs} onCreateCard={this.addCard}/>}>
		  <Button className="navbar-btn pull-right" bsStyle="primary" style={ {"margin-right":10} }> 
		    <Glyphicon glyph='plus' /> Add Filter
		  </Button> 
		</ModalTrigger>

		<Button className="navbar-btn pull-right" style={ {"margin-right":10} }> 
		  <Glyphicon glyph='save' /> Export Excell 
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
			     var values = []; // NaN Filtered 
			     _.reduce(self.state.tables[card.config.table].data, function(acc, row) {
				 if ( _.isNumber(row[card.config.xColumn]) && _.isNumber(row[card.config.yColumn]) ) {
				     acc.push({x: row[card.config.xColumn], y: row[card.config.yColumn]});
				 }
				 return acc;
			     }, values);
			     var data = [{ name: "series1", values: values}];
			     
			     component = (<ScatterChart {...size} {...card.config} data={data}/>);
			     break;
			 case "regions":
			     component = self.renderRegionsCard(card, size);
			     break;
			 case "categoricalFilter":
			     component =  self.renderCategroricalFilterCard(card, size);
			     break;
			 case "box":
			     var table = card.config.table;
			     var selection = self.state.tables[table].selection;
			     var attr = card.config.attr;
			     var facetAttr = card.config.facetAttr;

			     var distributions = _.get(self.state.cards[card.key], "data", []);
			     var saveData = function(data) {
				 console.log(data);
				 self.putState( ["cards", card.key, "data"], [data] );
			     };
			     var linkData = Store.linkFacetedData.bind(self, table, selection, attr, facetAttr, saveData);

			     var margin = {top: 20, right: 10, bottom: 20, left: 80};
			     component = (<BoxChart {...size} margin={margin} distributions={distributions} onMount={linkData}/>)
			     break;
		     }

		     return (
			 <div key={card.key}>
			   <Card key={card.key} onClose={card.onClose} title={card.title} size={size}>
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



