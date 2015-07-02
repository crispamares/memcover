/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'
	var React = __webpack_require__(1);
	var _ = __webpack_require__(2);
	var when = __webpack_require__(5); 

	var App = __webpack_require__(3); 

	// ----------------------------------------------------------
	//  Setup indyva's conection 
	// ----------------------------------------------------------
	var Context = __webpack_require__(4);
	var context = new Context(window.location.hostname, 'ws', 19000);
	context.install();
	var session = 's'+String(Math.round((Math.random()*100000)));
	context.openSession(session);

	window.onbeforeunload = function() {return "The session will be lost";};
	window.onunload = function() {context.closeSession();};

	var rpc = context.rpc;
	var hub = context.hub;

	rpc.call('init', [])
	    .then(function(names){
		var props = {
		    morphoTable: names["morpho_table"],
		    morphoSelection: names["morpho_selection"],
		    clinicTable: names["clinic_table"],
		    clinicSelection: names["clinic_selection"],
		    joinedTable: names["joined_table"],
		    joinedSelection: names["joined_selection"]

	 	};
		React.render( React.createElement(App, React.__spread({},  props)), document.getElementById('content'));

	    })
	    .catch(function(e){console.error("ERROR: " + e.message); });


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = React;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = _;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var _ = __webpack_require__(2);
	var ReactGridLayout = __webpack_require__(20);

	var Context = __webpack_require__(4);
	//var saveAs = require('FileSaver');

	var reactify = __webpack_require__(6);
	var DataTable = __webpack_require__(7);
	var BrainRegions = __webpack_require__(8);
	var CategoricalFilter = __webpack_require__(9);
	var RangeFilter = __webpack_require__(10);
	var Card = __webpack_require__(11);
	var CardCreationMenu = __webpack_require__(12);
	var AnalysisMenu = __webpack_require__(13);

	var PCPChart = reactify(__webpack_require__(14), "PCPChart");
	var BoxChart = reactify(__webpack_require__(15), "BoxChart");
	var ScatterChart = reactify(__webpack_require__(16), "ScatterChart");

	/**
	 *  Bootstrap requires
	 */
	var BS = __webpack_require__(34);
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

	    isSelectionEmpty: function(selection) {
		var rpc = Context.instance().rpc;

		return rpc.call('DynSelectSrv.grammar_of_conditions', [selection])
		    .then(function (conditions) {
			if (conditions.length === 0) return true;
			if (_.any(conditions, {enabled: true})) return false;
			return true;
		    });	    
	    },

	    linkTableToSelection: function(table, selection, onChange) {
		var rpc = Context.instance().rpc;
		var hub = Context.instance().hub;

		hub.subscribe(selection + ':change', function(){
		    Store.isSelectionEmpty(selection)
			.then(function (empty) {
			    var view_args = {query: {}, projection: {}};
			    if (! empty) view_args = rpc.call('DynSelectSrv.view_args', [selection]);
			    return view_args;
			})
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
	     * @param kind: "categorical", "range"
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

	    enableCondition: function(condition) {
		var rpc = Context.instance().rpc;
		return rpc.call('ConditionSrv.enable', [condition]);
	    },

	    disableCondition: function(condition) {
		var rpc = Context.instance().rpc;
		return rpc.call('ConditionSrv.disable', [condition]);
	    },

	    toggleCategory: function(condition, category) {
		var rpc = Context.instance().rpc;
		return rpc.call('ConditionSrv.toggle_category', [condition, category]);
	    },

	    setRange: function(condition, range) {
		var rpc = Context.instance().rpc;

		return rpc.call('ConditionSrv.set_range', [condition, range[0], range[1], false]);
	    },

	    getFacetedData: function(table, selection, attr, facetAttr) {
		var rpc = Context.instance().rpc;

		return Store.isSelectionEmpty(selection)
		    .then(function (empty) {
			var query = null;
			if (empty) query = {};
			else query = rpc.call('DynSelectSrv.query', [selection]);
			return query;
			})
		    .then(function (query) {
			query[attr] = {$type : 1}; // Only Number types, not NaN
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
	    },

	    exportTable: function(table, fileName) {
		var rpc = Context.instance().rpc;

		rpc.call("export_dselect", [table.selection, table.name, fileName])
		    .then(function(d){ 
			var uri = "http://" + window.location.host + window.location.pathname + d;
			window.open(uri, fileName);
		    });
	    }
	}





	module.exports = React.createClass({displayName: "exports",
	    getInitialState: function() {
		var layout = [
	//	    {x:2, y: 0, w: 5, h: 6, i:"c0", handle:".card-title"}, 
		];

		var cards = {
	// 	    "c0": {key:"c0", kind:"scatter", title: "Avg Cells/Vol NISSL (mm3) vs Time Postmortem (hours)", config:{}}
		};

		var tables = {};
		//tables[this.props.morphoTable] = {name: this.props.morphoTable, data: [], schema: {attributes:{}}, selection: this.props.morphoSelection};
		//tables[this.props.clinicTable] = {name: this.props.clinicTable, data: [], schema: {attributes:{}}, selection: this.props.clinicSelection};
		tables[this.props.joinedTable] = {name: this.props.joinedTable, data: [], schema: {attributes:{}}, selection: this.props.joinedSelection};


		var conditions = {};
		var subscriptions = {};
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
		    "cards": cards,
		    "subscriptions": subscriptions
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
			self.state.subscriptions[table.name] = true;
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

	    loadAnalysis: function(ev) {
		var self = this;
		var when =  __webpack_require__(5);
		var rpc = Context.instance().rpc;

		var files = ev.target.files;
		var reader = new FileReader();
		reader.readAsText(files[0]);
		event.target.value = ""; // So same file rise onChange

		reader.onload = function() {
		    var analysis = JSON.parse(this.result);
		    var grammar = analysis.grammar;
		    var state = analysis.state;
		    
		    var tables = _.pluck(state.tables, "name");

		    rpc.call("DynSelectSrv.clear", [])
			.then(function(){return rpc.call("GrammarSrv.build", [grammar, tables]); }) 
			.done(function(){ self.setState(state); });
		};
	    },

	    saveAnalysis: function(state) {
		var when =  __webpack_require__(5);
		var rpc = Context.instance().rpc;

		var stateToSave = _.clone(state);
		stateToSave.subscriptions = {};

		rpc.call("GrammarSrv.new_root", ['root'])
		    .then(function(){ return when.map(_.pluck(stateToSave.tables, "selection"), function(dselect) {
			return rpc.call("DynSelectSrv.get_conditions", [dselect])
			    .then(function(conditions){ rpc.call("GrammarSrv.add_condition", ['root', conditions]);})
			    .then(function(){ rpc.call("GrammarSrv.add_dynamic", ['root', dselect]);});
		    });})
		    .then(function(){ return rpc.call("GrammarSrv.grammar", ['root']);})
		    .then(function(grammar){ 
			var analysis = {state: stateToSave, grammar: grammar};
			var blob = new Blob([JSON.stringify(analysis)], {type: "text/plain;charset=utf-8"});
			var date = new Date();
			saveAs(blob, "analysis_"+ date.toJSON() +".json");
		    })
		    .done(function() { rpc.call("GrammarSrv.del_root", ['root']);});
		    
	    },

	    addCard: function(card) {
		var Y = Math.max(0, _.max(this.state.layout, 'y')) + 1;

		if (this.state.layout.length === 0) var key = "c0";
		else var key = "c" + (parseInt(_.rest(_.last(this.state.layout).i)) + 1)

		card.key = key;
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
		var condition = _.get(this.state, ["conditions", table, selection, column, "name"]);

		var self = this;
		var linkCondition = function(condition) { 
		    if ( self.state.subscriptions[condition] ) return;
		    Store.linkCondition( condition, function(grammar) {
			self.state.subscriptions[condition] = true;
			self.putState(
			    ["conditions", table, selection, column],
			    {name: condition, grammar: grammar});
			console.log("GRAMMAR: ", grammar);
		    }); 
		};

		if (condition) {
		    console.log("Don't create a new condition. Already created");
		    Store.enableCondition(condition).done(function(){ linkCondition(condition) });
		    return;
		}
		console.log("Creating a new condition:", kind, table, selection);

		Store.createCondition(selection, column, kind)
		    .then(function(condition) { 
			if (kind === "categorical") Store.includeAll(condition).then(linkCondition.bind(self,condition));
			else linkCondition(condition);
		    });
	    },

	    renderRegionsCard: function(card, size) {
		console.log("RENDER REGIONS..........");
		var initRegions = this.initCondition.bind(this, "categorical", this.props.joinedTable, this.props.joinedSelection, "Region");

		var conditionPath = ["conditions", this.props.joinedTable, this.props.joinedSelection, "Region"];
		var condition = _.get(this.state, conditionPath.concat(["name"]));
		var disableCondition = Store.disableCondition.bind(this, condition);

		var component = (React.createElement(BrainRegions, React.__spread({},  size, 
				     {onMount: initRegions, 
				     onUnmount: disableCondition, 
				     includedRegions: _.get(this.state, conditionPath.concat(["grammar", "included_categories"]), []), 
				     onClickRegion: Store.toggleCategory.bind(this, condition)})
		));
				     
		return component;
	    },

	    renderCategroricalFilterCard: function(card, size) {
		var table = card.config.table;
		var column = card.config.column;
		var selection = this.state.tables[table].selection;

		var initCondition = this.initCondition.bind(this, "categorical", table, selection, column);

		var conditionPath = ["conditions", table, selection, column];
		var condition = _.get(this.state, conditionPath.concat(["name"]));
		var disableCondition = Store.disableCondition.bind(this, condition);

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

		var component = (React.createElement(CategoricalFilter, React.__spread({},  size, 
					 {onMount: initCondition, 
					 onUnmount: disableCondition, 
					 categories: categories, 
					 onClickedCategory: Store.toggleCategory.bind(this, condition)})));
		return component;
	    },



	    renderRangeFilterCard: function(card, size) {
		var table = card.config.table;
		var column = card.config.column;
		var selection = this.state.tables[table].selection;

		var initCondition = this.initCondition.bind(this, "range", table, selection, column);

		var conditionPath = ["conditions", table, selection, column];
		var condition = _.get(this.state, conditionPath.concat(["name"]));
		var disableCondition = Store.disableCondition.bind(this, condition);

		var domain = _.get(this.state, conditionPath.concat(["grammar", "domain"])) || {min:0, max:1};
		var range = _.get(this.state, conditionPath.concat(["grammar", "range"])) || domain;
		var extent = [ range['min'], range['max'] ];

		var component = (React.createElement(RangeFilter, React.__spread({},  size, 
					 {onMount: initCondition, 
					 onUnmount: disableCondition, 
					 domain: domain, 
					 extent: extent, 
					 onChange: Store.setRange.bind(this, condition)})));
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
		    return rowHeight * height - 40;
		};

		var tables = _.keys(self.state.tables);
		var columns = _.mapValues(self.state.tables, function(table){
		    return _.map(table.schema.attributes, 
			function(value, key){return {name: key, included: true};}
		    );
		});

		var columns = _.mapValues(self.state.tables, function(table){
		    return _.map(table.schema.attributes, function(v, key){return {name: v.name, attribute_type: v.attribute_type};});
		});
		var quantitativeColumns = _.mapValues(columns, function(tableColumns){
		    return _.filter(tableColumns, {attribute_type: "QUANTITATIVE"});
		});
		var categoricalColumns = _.mapValues(columns, function(tableColumns){
		    return _.filter(tableColumns, {attribute_type: "CATEGORICAL"});
		});

		var creationVisMenuTabs = [
		    { kind: "table", title: "Data Table", options: { tables: tables, columns: columns } },
		    { kind: "pcp", title: "Parallel Coordinates", options: { tables: tables, columns: columns } },
		    { kind: "scatter", title: "Scatter Plot", options: { tables: tables, columns: quantitativeColumns } },
		    { kind: "box", title: "Box Plot", options: { tables: tables, categoricalColumns: categoricalColumns, quantitativeColumns: quantitativeColumns } },
		];

		var creationFilterMenuTabs = [
		    { kind: "regions", title: "Regions", options: {}},
		    { kind: "columnFilter", title: "Columns Filter", options: { tables: tables, columns: columns } },
		];

		return (
		    React.createElement("div", {className: "mainApp"}, 

		      React.createElement(Navbar, {brand: "Memcover", fixedTop: true}, 
			React.createElement(ModalTrigger, {modal: React.createElement(CardCreationMenu, {tabs: creationVisMenuTabs, onCreateCard: this.addCard})}, 
			  React.createElement(Button, {className: "navbar-btn pull-right", bsStyle: "primary"}, 
			    React.createElement(Glyphicon, {glyph: "plus"}), " Visualization" 
			  )
			), 

			React.createElement(ModalTrigger, {modal: React.createElement(CardCreationMenu, {tabs: creationFilterMenuTabs, onCreateCard: this.addCard})}, 
			  React.createElement(Button, {className: "navbar-btn pull-right", bsStyle: "primary", style:  {"margin-right":10} }, 
			    React.createElement(Glyphicon, {glyph: "plus"}), " Filter"
			  )
			), 

	                React.createElement(AnalysisMenu, {className: "navbar-btn pull-right", 
				style:  {"margin-right":10}, 
				tables: this.state.tables, 
				onExport: function(table){Store.exportTable(table, table.name);}, 
				onOpen: self.loadAnalysis, 
		                onSave: self.saveAnalysis.bind(self, self.state)
				}
			  
			)

		      ), 


		      React.createElement(ReactGridLayout, {className: "layout", 
			      layout: layout, 
			      cols: 12, 
			      rowHeight: rowHeight, 
			      useCSSTransforms: true, 
			      onLayoutChange: function(layout){self.setState({"layout":layout});}, 
			      onResizeStop: function(layout, oldL, l, _, ev){/* console.log(ev);*/}
			      }, 
			

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
				     component = (React.createElement(DataTable, React.__spread({},  size,  card.config, 
					 {rows: self.state.tables[card.config.table].data, columnNames: columnNames})));
				     break;
				 case "pcp":
				     var columnNames = _.pluck(_.filter(card.config.columns, 'included'), 'name');
				     var attributes = _.map(columnNames, function(c){
					 return self.state.tables[card.config.table].schema.attributes[c];});
				     component = (React.createElement(PCPChart, React.__spread({},  size, 
					 {data: self.state.tables[card.config.table].data, 
					 margin: {top: 50, right: 40, bottom: 10, left: 40}, 
					 attributes: attributes, 
					 onBrush: function(extent){/*console.log(extent);*/}, 
					 onAttributeSort:  function(attributes){ 
					     var columns = _.map(attributes, function(attr){return {name: attr.name, included: true}});
					     self.putState( ["cards", card.key, "config", "columns"], columns );}
					 
					 })
				     ));
				     break;
				 case "scatter":
				     var data = []
				     // Filter NaNs 
				     _.reduce(self.state.tables[card.config.table].data, function(acc, row) {
					 if ( _.isNumber(row[card.config.xColumn]) && _.isNumber(row[card.config.yColumn]) ) {
					     acc.push({x: row[card.config.xColumn], y: row[card.config.yColumn]});
					 }
					 return acc;
				     }, data);
				     
				     component = (React.createElement(ScatterChart, React.__spread({},  size,  card.config, {data: data})));
				     break;
				 case "regions":
				     component = self.renderRegionsCard(card, size);
				     break;
				 case "categoricalFilter":
				     component =  self.renderCategroricalFilterCard(card, size);
				     break;
				 case "rangeFilter":
				     component =  self.renderRangeFilterCard(card, _.set(size, "height", 45));
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
				     // TODO: add subscription to state.subscriptions
				     var linkData = Store.linkFacetedData.bind(self, table, selection, attr, facetAttr, saveData);

				     var margin = {top: 20, right: 10, bottom: 20, left: 80};
				     component = (React.createElement(BoxChart, React.__spread({},  size, {margin: margin, distributions: distributions, onMount: linkData})))
				     break;
			     }

			     return (
				 React.createElement("div", {key: card.key}, 
				   React.createElement(Card, {key: card.key, onClose: self.removeCard.bind(self, card.key), title: card.title, size: size}, 
				     component
				   )
				 )			      
			     );
			 })
			 
				 
		      )
		    )
		);
	    }
	});





/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5), __webpack_require__(17), __webpack_require__(18), __webpack_require__(19)], __WEBPACK_AMD_DEFINE_RESULT__ = function(when, ReconnectingWebSocket, WsRpc, Hub) {

	    var Context = function(server, path, port){
		var self = this;

		this.path = path || 'ws';
		this.port = port || parseInt(window.location.port);
		this.server = server || window.location.hostname;

		this.session = null;
	    };

	    /// The server to connect to.
	    Context.prototype.server = window.location.hostname;
	    /// The port to connect to.
	    Context.prototype.port = window.location.port;
	    /// The path where the WS serever is listening
	    Context.prototype.path = 'ws';

	    /// The session name.
	    Context.prototype.session = null;

	    /// The installed instance
	    Context.prototype._instance = null;
	    /// WsRpc instance
	    Context.prototype._rpc = null;
	    /// WsRpc instance
	    Context.prototype._hub = null;

	    // Class method
	    Context.instance = function() {
		if (Context.prototype._instance == null) Context.prototype._instance = new Context();
		return Context.prototype._instance;
	    };
	    Context.prototype.install = function() {
		if (Context.prototype._instance) throw new Error("Context already installed");
		Context.prototype._instance = this;
	    };

	    /**
	     * The singleton creator of WsRpc
	     *
	     * @property rpc
	     * @return		 WsRpc instance
	     */    
	    Object.defineProperty(Context.prototype, "rpc", {
		get: function(){
		    if (this._rpc === null) {
			this._rpc = new WsRpc(this.server, this.path, this.port);
			this._rpc.extend(this);
		    }
		    return this._rpc;
		}
	    });

	    /**
	     * The singleton creator of Hub
	     *
	     * @property hub
	     * @return		 Hub instance
	     */    
	    Object.defineProperty(Context.prototype, "hub", {
		get: function(){
		    if (this._hub === null) {
			this._hub = new Hub(this.server, this.port+1, this.rpc, this.session);
		    }
		    return this._hub;
		}
	    });

	    /**
	     * Modifies in-place the request to add context information
	     * @fn modifyRequest
	     * @memberof Context
	     *
	     * @param request    The JSON-RPC request.
	     */
	    Context.prototype.modifyRequest = function (request) {
		if (this.session === null) return;
		var _context = {session: this.session};
		if (Array.isArray(request.params)) {
		    request.params = {
			_params: request.params,
			_context: _context
		    };
		} 
		else {
		    request.params._context = _context;
		}
	    };

	    /**
	     * Open a new session and include it in the Context so any later
	     * call will execute in the context of this session
	     * @fn openSession
	     * @memberof Context
	     *
	     * @param session    The session name.
	     */
	    Context.prototype.openSession = function (session) {
		var self = this;
		var promise = this.rpc.call('SessionSrv.open_session', [session])
		    .then(function(){self.session = session;});
		this.session = session;
		return promise;
	    };

	    /**
	     * Open a new session and include it in the session so any later
	     * call will execute in the context of this session
	     * @fn closeSession
	     * @memberof Context
	     *
	     */
	    Context.prototype.closeSession = function () {
		var self = this;
		var promise = this.rpc.call('SessionSrv.close_session', [this.session])
		    .then(function(){self.session = null;});
		return promise;
	    };

	    /**
	     * Use a session including it in the Context so any later call
	     * will execute in the context of this session
	     * @fn closeSession
	     * @memberof Context
	     * @return isNew (Bool) Return if the session requested was
	     *                      already open in the server or if was
	     *                      created by this call.
	     */
	    Context.prototype.useSession = function (session) {
		var self = this;
		var promise = this.rpc.call('SessionSrv.use_session', [session])
		    .then(function(isNew){
			self.session = session;
			return isNew;
		    });
		return promise;
	    };

	    return Context;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));



/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */

	/**
	 * Promises/A+ and when() implementation
	 * when is part of the cujoJS family of libraries (http://cujojs.com/)
	 * @author Brian Cavalier
	 * @author John Hann
	 * @version 3.7.2
	 */
	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

		var timed = __webpack_require__(22);
		var array = __webpack_require__(23);
		var flow = __webpack_require__(24);
		var fold = __webpack_require__(25);
		var inspect = __webpack_require__(26);
		var generate = __webpack_require__(27);
		var progress = __webpack_require__(28);
		var withThis = __webpack_require__(29);
		var unhandledRejection = __webpack_require__(30);
		var TimeoutError = __webpack_require__(31);

		var Promise = [array, flow, fold, generate, progress,
			inspect, withThis, timed, unhandledRejection]
			.reduce(function(Promise, feature) {
				return feature(Promise);
			}, __webpack_require__(32));

		var apply = __webpack_require__(33)(Promise);

		// Public API

		when.promise     = promise;              // Create a pending promise
		when.resolve     = Promise.resolve;      // Create a resolved promise
		when.reject      = Promise.reject;       // Create a rejected promise

		when.lift        = lift;                 // lift a function to return promises
		when['try']      = attempt;              // call a function and return a promise
		when.attempt     = attempt;              // alias for when.try

		when.iterate     = Promise.iterate;      // DEPRECATED (use cujojs/most streams) Generate a stream of promises
		when.unfold      = Promise.unfold;       // DEPRECATED (use cujojs/most streams) Generate a stream of promises

		when.join        = join;                 // Join 2 or more promises

		when.all         = all;                  // Resolve a list of promises
		when.settle      = settle;               // Settle a list of promises

		when.any         = lift(Promise.any);    // One-winner race
		when.some        = lift(Promise.some);   // Multi-winner race
		when.race        = lift(Promise.race);   // First-to-settle race

		when.map         = map;                  // Array.map() for promises
		when.filter      = filter;               // Array.filter() for promises
		when.reduce      = lift(Promise.reduce);       // Array.reduce() for promises
		when.reduceRight = lift(Promise.reduceRight);  // Array.reduceRight() for promises

		when.isPromiseLike = isPromiseLike;      // Is something promise-like, aka thenable

		when.Promise     = Promise;              // Promise constructor
		when.defer       = defer;                // Create a {promise, resolve, reject} tuple

		// Error types

		when.TimeoutError = TimeoutError;

		/**
		 * Get a trusted promise for x, or by transforming x with onFulfilled
		 *
		 * @param {*} x
		 * @param {function?} onFulfilled callback to be called when x is
		 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
		 *   will be invoked immediately.
		 * @param {function?} onRejected callback to be called when x is
		 *   rejected.
		 * @param {function?} onProgress callback to be called when progress updates
		 *   are issued for x. @deprecated
		 * @returns {Promise} a new promise that will fulfill with the return
		 *   value of callback or errback or the completion value of promiseOrValue if
		 *   callback and/or errback is not supplied.
		 */
		function when(x, onFulfilled, onRejected, onProgress) {
			var p = Promise.resolve(x);
			if (arguments.length < 2) {
				return p;
			}

			return p.then(onFulfilled, onRejected, onProgress);
		}

		/**
		 * Creates a new promise whose fate is determined by resolver.
		 * @param {function} resolver function(resolve, reject, notify)
		 * @returns {Promise} promise whose fate is determine by resolver
		 */
		function promise(resolver) {
			return new Promise(resolver);
		}

		/**
		 * Lift the supplied function, creating a version of f that returns
		 * promises, and accepts promises as arguments.
		 * @param {function} f
		 * @returns {Function} version of f that returns promises
		 */
		function lift(f) {
			return function() {
				for(var i=0, l=arguments.length, a=new Array(l); i<l; ++i) {
					a[i] = arguments[i];
				}
				return apply(f, this, a);
			};
		}

		/**
		 * Call f in a future turn, with the supplied args, and return a promise
		 * for the result.
		 * @param {function} f
		 * @returns {Promise}
		 */
		function attempt(f /*, args... */) {
			/*jshint validthis:true */
			for(var i=0, l=arguments.length-1, a=new Array(l); i<l; ++i) {
				a[i] = arguments[i+1];
			}
			return apply(f, this, a);
		}

		/**
		 * Creates a {promise, resolver} pair, either or both of which
		 * may be given out safely to consumers.
		 * @return {{promise: Promise, resolve: function, reject: function, notify: function}}
		 */
		function defer() {
			return new Deferred();
		}

		function Deferred() {
			var p = Promise._defer();

			function resolve(x) { p._handler.resolve(x); }
			function reject(x) { p._handler.reject(x); }
			function notify(x) { p._handler.notify(x); }

			this.promise = p;
			this.resolve = resolve;
			this.reject = reject;
			this.notify = notify;
			this.resolver = { resolve: resolve, reject: reject, notify: notify };
		}

		/**
		 * Determines if x is promise-like, i.e. a thenable object
		 * NOTE: Will return true for *any thenable object*, and isn't truly
		 * safe, since it may attempt to access the `then` property of x (i.e.
		 *  clever/malicious getters may do weird things)
		 * @param {*} x anything
		 * @returns {boolean} true if x is promise-like
		 */
		function isPromiseLike(x) {
			return x && typeof x.then === 'function';
		}

		/**
		 * Return a promise that will resolve only once all the supplied arguments
		 * have resolved. The resolution value of the returned promise will be an array
		 * containing the resolution values of each of the arguments.
		 * @param {...*} arguments may be a mix of promises and values
		 * @returns {Promise}
		 */
		function join(/* ...promises */) {
			return Promise.all(arguments);
		}

		/**
		 * Return a promise that will fulfill once all input promises have
		 * fulfilled, or reject when any one input promise rejects.
		 * @param {array|Promise} promises array (or promise for an array) of promises
		 * @returns {Promise}
		 */
		function all(promises) {
			return when(promises, Promise.all);
		}

		/**
		 * Return a promise that will always fulfill with an array containing
		 * the outcome states of all input promises.  The returned promise
		 * will only reject if `promises` itself is a rejected promise.
		 * @param {array|Promise} promises array (or promise for an array) of promises
		 * @returns {Promise} promise for array of settled state descriptors
		 */
		function settle(promises) {
			return when(promises, Promise.settle);
		}

		/**
		 * Promise-aware array map function, similar to `Array.prototype.map()`,
		 * but input array may contain promises or values.
		 * @param {Array|Promise} promises array of anything, may contain promises and values
		 * @param {function(x:*, index:Number):*} mapFunc map function which may
		 *  return a promise or value
		 * @returns {Promise} promise that will fulfill with an array of mapped values
		 *  or reject if any input promise rejects.
		 */
		function map(promises, mapFunc) {
			return when(promises, function(promises) {
				return Promise.map(promises, mapFunc);
			});
		}

		/**
		 * Filter the provided array of promises using the provided predicate.  Input may
		 * contain promises and values
		 * @param {Array|Promise} promises array of promises and values
		 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
		 *  Must return truthy (or promise for truthy) for items to retain.
		 * @returns {Promise} promise that will fulfill with an array containing all items
		 *  for which predicate returned truthy.
		 */
		function filter(promises, predicate) {
			return when(promises, function(promises) {
				return Promise.filter(promises, predicate);
			});
		}

		return when;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	})(__webpack_require__(40));


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var ChartContainerMixin = __webpack_require__(35);
	var LifecycleMixin = __webpack_require__(36);

	module.exports = function(chart, displayName){
	    return React.createClass({displayName: displayName, mixins : [ChartContainerMixin, LifecycleMixin, chart]});
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	Object.assign = Object.assign || __webpack_require__(39);
	var FixedDataTable = __webpack_require__(43);
	var _ = __webpack_require__(2);

	var Table = FixedDataTable.Table;
	var Column = FixedDataTable.Column;


	module.exports = React.createClass({displayName: "exports",
	    getInitialState: function() {
		 
		var initialColumnWith = (this.props.columnNames.length) ?
					Math.round(this.props.width / this.props.columnNames.length)
		                        : 0;
		var columnWidths = {};
		_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})
		return {
		    "columnWidths": columnWidths
		};
	    },
	    getDefaultProps: function(){
		return {
		    rows: [],
		    columnNames: []
		}
	    },
	    _rowGetter: function(i) {return this.props.rows[i];},
	    _onColumnResizeEndCallback: function(newColumnWidth, dataKey) {
		this.state.columnWidths[dataKey] = newColumnWidth;
	//	isColumnResizing = false;
	    },
	    render: function(){
		var columnNames = this.props.columnNames;
		var initialColumnWith = (this.props.columnNames.length) ?
					Math.round(this.props.width / this.props.columnNames.length)
		                        : 0;
		var columnWidths = {};
		_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})

		if (this.props.rows.length == 0) return (React.createElement("div", null));

		return (
		    React.createElement(Table, {
			    rowHeight: 50, 
			    rowGetter: this._rowGetter, 
			    rowsCount: this.props.rows.length, 
			    width: this.props.width, 
			    height: this.props.height, 
			    headerHeight: 50, 
			    onColumnResizeEndCallback: this._onColumnResizeEndCallback}, 

		      
			  this.props.columnNames.map(function(name){
			      return (
				  React.createElement(Column, {
				  label: name, 
				  width: columnWidths[name], 			  
				  dataKey: name, 
				  isResizable: false}
				  )
			      );
			  })
		       
		    )
		);
	    }
	});





/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(21);
	var _ = __webpack_require__(2);

	var LifecycleMixin = __webpack_require__(36);

	module.exports = React.createClass({displayName: "exports",
	    mixins: [LifecycleMixin],

	    getDefaultProps: function() {
		return {
		    includedRegions: ["SUB", "DG", "CA3", "CA1"]
		};
	    },

	    componentDidMount: function() {
		var container = this.refs.container.getDOMNode();

		container.addEventListener("load", function(){
		    var svg = d3.select(container.contentDocument);

		    this.update(svg, this.props, this.state);
		}.bind(this));
	    },

	    shouldComponentUpdate: function(nextProps, nextState) {
		var container = this.refs.container.getDOMNode();
		container.setAttribute("width", nextProps.width - 10);
		container.setAttribute("height", nextProps.height - 10);

		var svg = d3.select(container.contentDocument);

		this.update(svg, nextProps, nextState);
		// render is not called again so the container is there until
		// the end.
		return false;
	    },

	    update: function(svg, props, state) {
		var self = this;

		var region = svg.selectAll("g.region")
		    .datum(function() { return this.id; })
		    .style("cursor", function(){return (props.onClickRegion) ? "pointer" : null})
		    .on("click", function(d){if (props.onClickRegion) {props.onClickRegion(d);};});

		region.selectAll("path")
		    .datum(function() { return this.parentNode.id; })
		    .style("fill", function(d){return (_.include(props.includedRegions, d)) ? "rgb(49, 130, 189)" : "#EEE";});

		region.selectAll("text")
		    .datum(function() { return this.parentNode.id; })
		    .style("fill", function(d){return (_.include(props.includedRegions, d)) ? "white" : "#333";});
		
		props.includedRegions.forEach(function(region){
		    svg.select("#"+region).select("text").style("fill", "white");
		});

	    },

	    render: function(){
		return (
	            React.createElement("div", null, 
		      React.createElement("object", {ref: "container", id: "svgobject", 
			      type: "image/svg+xml", 
			      width: this.props.width, 
			      height: this.props.height, 
			      data: "assets/hipo_foto.svg"}
		      )
	            )
		);
	    }
	});


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(21);
	var _ = __webpack_require__(2);

	var LifecycleMixin = __webpack_require__(36);
	var BS = __webpack_require__(34);
	var Input = BS.Input;


	module.exports = React.createClass({displayName: "exports",
	    mixins: [LifecycleMixin],

	    getDefaultProps: function() {
		return {
		    categories: []  // {name: "cat1", included: false}
		};
	    },

	    render: function() {
		var onClickedCategory = this.props.onClickedCategory;

		return (
		    React.createElement("form", {className: "form-inline"}, 
		      
			  this.props.categories.map(function(category, i){
			      return (React.createElement(Input, {style:  {"margin-left": 20}, type: "checkbox", ref: "cat" + i, key: "cat" + category.name, 
				  label: category.name, checked: category.included, 
					      onChange: onClickedCategory.bind(this, category.name)})
			      );
			  })
		       
	            )
		)
	    }

	});


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(21);
	var _ = __webpack_require__(2);

	var reactify = __webpack_require__(6);
	var LifecycleMixin = __webpack_require__(36);
	var BS = __webpack_require__(34);

	var RangeSlider = reactify(__webpack_require__(37), "RangeSlider");

	module.exports = React.createClass({displayName: "exports",
	    mixins: [LifecycleMixin],

	    getDefaultProps: function() {
		return {
		    domain: {min: 0, max: 1},
		    extent: [0,1],
		    height: 45
		};
	    },

	    render: function() {

		var onChange = _.throttle(this.props.onChange, 100);
		var domain = this.props.domain;
		var extent =  this.props.extent;

		return (
	            React.createElement(RangeSlider, {domain: domain, 
			    extent: extent, 
			    onMove: onChange, 
			    width: this.props.width, 
			    height: this.props.height}
		    )
		)
	    }
	});


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var _ = __webpack_require__(2);


	module.exports = React.createClass({displayName: "exports",

	    render: function() {
		var title = this.props.title;

		/* var child = React.cloneElement(
		   React.Children.only(this.props.children), 
		   {width: this.props.width, height: this.props.height}); */
		var contentSize = {width: this.props.size.width + 15, height: this.props.size.height + 15};

		return (
		    React.createElement("div", {className: "card", key: this.props.key}, 
		      React.createElement("div", {className: "card-header"}, 
			React.createElement("div", {className: "card-move btn btn-xs btn-default card-anchor glyphicon glyphicon-move", "aria-hidden": "true"}), 

			React.createElement("span", {className: "h4 card-anchor"}, title), 

			React.createElement("button", {className: "card-close btn btn-xs btn-default glyphicon glyphicon-remove", "aria-hidden": "true", onClick: this.props.onClose})

		      ), 
		      React.createElement("div", {className: "card-content", style: contentSize}, 
			this.props.children		
		      )
		    )
		);
	    }
	});


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var _ = __webpack_require__(2);

	/**
	 *  Bootstrap requires
	 */
	var BS = __webpack_require__(34);
	var Button = BS.Button;
	var Modal = BS.Modal;
	var TabbedArea = BS.TabbedArea;
	var TabPane = BS.TabPane;
	var Input = BS.Input;
	var Col = BS.Col;

	var CardCreationMenu = React.createClass({displayName: "CardCreationMenu",
	    getInitialState: function() {
		return {
		    activeTab: this.props.tabs[0].kind
		};
	    },

	    handleCreateCard: function() {

		var config = this.refs[this.state.activeTab].getConfig();
		var card = {kind:this.state.activeTab, title: config.table, config: config};

		switch (this.state.activeTab) {
		    // Nothing special for: ["table", "pcp", "regions"]
		    case "scatter":
			card.title = _.capitalize(config.xColumn) + " VS " + _.capitalize(config.yColumn);
			break;
		    case "columnFilter":
			card.title = _.capitalize(config.column) + " - " + config.table;
			card.kind = (config.attribute_type === "QUANTITATIVE") ? "rangeFilter" : "categoricalFilter";
			break;
		    case "box":
			card.title = _.capitalize(config.attr) + " split by: " + config.facetAttr;
			break;
		}

		this.props.onRequestHide();
		this.props.onCreateCard(card);
	    },

	    handleSelectTab: function(activeTab) {
		this.setState({activeTab: activeTab});
	    },

	    render: function(){ 
		var tabs = this.props.tabs

		return (
		    React.createElement(Modal, React.__spread({},  this.props, {bsSize: "large", title: "Add new card", animation: true}), 
		      React.createElement("div", {className: "modal-body"}, 
			
			React.createElement(TabbedArea, {activeKey: this.state.activeTab, onSelect: this.handleSelectTab}, 
			  
			      tabs.map(function(tab) {
				  var tabNode = null;
				  switch (tab.kind) {
				      case "table":
				      case "pcp":
					  tabNode = React.createElement(DataTableMenu, {ref: tab.kind, options: tab.options});
					  break;
				      case "scatter":
					  tabNode = React.createElement(ScatterMenu, {ref: tab.kind, options: tab.options});
					  break;
				      case "regions":
					  tabNode = React.createElement(RegionsMenu, {ref: tab.kind, options: tab.options});
					  break;
				      case "columnFilter":
					  tabNode = React.createElement(ColumnFilterMenu, {ref: tab.kind, options: tab.options});
					  break;
				      case "box":
					  tabNode = React.createElement(BoxMenu, {ref: tab.kind, options: tab.options});
					  break;
				  }
				  return (
				      React.createElement(TabPane, {eventKey: tab.kind, tab: tab.title}, 
					tabNode
				      )			  
				  );
			      })
			  
			)
			
		      ), 
		      React.createElement("div", {className: "modal-footer"}, 
			React.createElement(Button, {onClick: this.props.onRequestHide}, "Close"), 
			React.createElement(Button, {onClick: this.handleCreateCard, bsStyle: "primary"}, "Create Card")
		      )
		    )
		);
	    }
	});

	module.exports = CardCreationMenu;

	/**
	 * Shows a table selection only when props.tables has more than one item
	 */
	var TableMenuItem = React.createClass({displayName: "TableMenuItem",
	    render: function() {
		if (this.props.tables.length > 1) {
		    return (
			React.createElement(Input, {type: "select", label: "Data Table", ref: "table", valueLink: this.props.tableLink}, 
		        
			    this.props.tables.map(function(table, i){
				return (React.createElement("option", {key: "table" + i, value: table}, " ", table, " "));
			    })
			 
	              )
		    )
		}
		else {
		    return (React.createElement("div", null));
		}
	    }
	});

	var RadioColumnsMenuItem = React.createClass({displayName: "RadioColumnsMenuItem",
	    render: function() {
		
		return (
			  React.createElement("form", null, 
			    React.createElement("div", null, 
			      React.createElement("label", null, " ", this.props.label, " ")
			    ), 
			    React.createElement("div", {className: "radio"}, 
			      
				  this.props.columns.map(function(column, i){
				      return (
					  React.createElement("label", {className: "radio"}, 
					  React.createElement("input", {type: "radio", name: "columns", ref: "col" + i, key: "col" + column.name, 
					  defaultChecked: column.included}), 
					  column.name
					  )
				      );
				  })
			       
			    )
			  )

		)}    
	});


	var DummyMenu = React.createClass({displayName: "DummyMenu",
	    getConfig: function() { return {};},
	    render: function() { return (React.createElement("span", null));}
	});

	var RegionsMenu = React.createClass({displayName: "RegionsMenu",
	    getConfig: function() { return {};},
	    render: function() { return ( 
		React.createElement("div", {style: {"text-align": "center"}}, 
		  React.createElement("img", {height: "200px", style: {margin: "20px auto 0 auto"}, src: "assets/hipo_foto.svg"})
		)
	    );}
	});


	var DataTableMenu = React.createClass({displayName: "DataTableMenu",

	    // options: { 
	    //     tables:["morpho", "clinic"],
	    //     columns:[
	    // 	     {name: "col1", included: true}, 
	    // 	     {name: "col2", included: false}
	    //     ]
	    // }
	    mixins: [React.addons.LinkedStateMixin],
	    getInitialState: function() {
		return {
		    table: this.props.options.tables[0],
		    columns: this.props.options.columns
		};
	    },

	    getConfig: function() {
		var self = this;
	//	var columns = this.props.options.columns[ this.state.table ].map(
	//	    function(column, i){return {name: column.name, included: self.refs["col"+i].getChecked()};})
		var columns = this.state.columns[this.state.table];
		return {
		    table: this.state.table,
		    columns: columns
		};
	    },

	    handleCheck: function(table, column_i, checked) {
		var state = _.set(this.state, ["columns", table, column_i, "included"], checked);
		console.log(state);
		this.setState(state);
	    },

	    handleMultiCheck: function(table, checked) {
		var columns = this.state.columns[table];
		columns = _.map(columns, function(column) {column.included = checked; return column;});
		var state = _.set(this.state, ["columns", table], columns);
		this.setState(state);
	    },

	    render: function() {
		var options = this.props.options;
		var columns = this.state.columns[this.state.table];
		var handleCheck = this.handleCheck.bind(this, this.state.table);
		var handleMultiCheck = this.handleMultiCheck.bind(this, this.state.table);
		return (
	            React.createElement("div", null, 
	              React.createElement("div", {className: "row"}, 
			React.createElement("div", {className: "col-sm-12"}, 
			  React.createElement("form", {style:  {position: "relative"} }, 
			    React.createElement(TableMenuItem, {tableLink: this.linkState('table'), tables: options.tables}, " "), 
			    React.createElement("label", null, " Columns: "), 
			    React.createElement(BS.ButtonGroup, {style:  {position: "absolute", right: "0px"} }, 
	                      React.createElement(Button, {onClick: function(){handleMultiCheck(true)}}, " Select All "), 
	                      React.createElement(Button, {onClick: function(){handleMultiCheck(false)}}, " Unselect All ")
			    ), 
			    
				columns.map(function(column, i){
				    return (React.createElement(Input, {type: "checkbox", ref: "col" + i, key: "col" + column.name, 
					label: column.name, onChange: function(ev) {handleCheck(i, ev.target.checked)}, checked: column.included}));
				})
			     
			  )
			)
		      )
		    )
		);

	    }
	});



	var ScatterMenu = React.createClass({displayName: "ScatterMenu",

	    // options: { 
	    //     tables:["morpho", "clinic"],
	    //     attributes:[
	    // 	     {name: "attr1", attribute_type: "QUANTITATIVE", included: true}, 
	    //     ]
	    // }
	    mixins: [React.addons.LinkedStateMixin],
	    getInitialState: function() {
		var table = this.props.table || this.props.options.tables[0];
		return {
		    table: table,
		    xColumn: this.props.xColumn || this.props.options.columns[table][0].name,
		    yColumn: this.props.yColumn || this.props.options.columns[table][0].name,
		};
	    },

	    getConfig: function() {
		return {
		    table: this.state.table,
		    xColumn: this.state.xColumn,
		    yColumn: this.state.yColumn,
		};
	    },

	    handleTableChange: function(table) {
		this.setState({
		    table: table,
		    xColumn: this.props.options.columns[table][0].name,
		    yColumn: this.props.options.columns[table][0].name,
		});
	    },

	    render: function() {
		var options = this.props.options;
		var columns = options.columns[this.state.table];
		var tableLink = {
		    value: this.state.table,
		    requestChange: this.handleTableChange
		};

		return (
	            React.createElement("div", null, 
	              React.createElement("form", null, 
	 		React.createElement(TableMenuItem, {tableLink: tableLink, tables: options.tables})
		      ), 

		      React.createElement(Input, {type: "select", label: "X Coordinate", ref: "x", valueLink: this.linkState('xColumn')}, 
		      
			  columns.map(function(column, i){ return (React.createElement("option", {key: column.name, value: column.name}, " ", column.name, " ")); })
		       
		      ), 

		      React.createElement(Input, {type: "select", label: "Y Coordinate", ref: "y", valueLink: this.linkState('yColumn')}, 
		      
			  columns.map(function(column, i){ return (React.createElement("option", {key: column.name, value: column.name}, " ", column.name, " ")); })
		       
		      )

	            )
		);

	    }
	});


	var ColumnFilterMenu = React.createClass({displayName: "ColumnFilterMenu",

	    mixins: [React.addons.LinkedStateMixin],
	    getInitialState: function() {
		var table = this.props.table || this.props.options.tables[0];
		return {
		    table: table,
		    column: this.props.column || this.props.options.columns[table][0].name,
		};
	    },

	    getConfig: function() {
		var attribute_type = _.find(this.props.options.columns[this.state.table], {name: this.state.column}).attribute_type;
		return {
		    table: this.state.table,
		    column: this.state.column,
		    attribute_type: attribute_type
		};
	    },

	    handleTableChange: function(table) {
		this.setState({
		    table: table,
		    column: this.props.options.columns[table][0].name,
		});
	    },

	    render: function() {
		var options = this.props.options;
		var columns = options.columns[this.state.table];
		var tableLink = {
		    value: this.state.table,
		    requestChange: this.handleTableChange
		};

		return (
	            React.createElement("div", null, 
	              React.createElement("form", null, 
	 		React.createElement(TableMenuItem, {tableLink: tableLink, tables: options.tables})
		      ), 

		      React.createElement(Input, {type: "select", label: "Column", ref: "col", valueLink: this.linkState('column')}, 
		      
			  columns.map(function(column, i){ return (React.createElement("option", {key: column.name, value: column.name}, " ", column.name, " ")); })
		       
		      )

	            )
		);

	    }
	});


	var BoxMenu = React.createClass({displayName: "BoxMenu",

	    // options: { 
	    //     tables:["morpho", "clinic"],
	    //     attributes:[
	    // 	     {name: "attr1", attribute_type: "QUANTITATIVE", included: true}, 
	    //     ]
	    // }
	    mixins: [React.addons.LinkedStateMixin],
	    getInitialState: function() {
		var table = this.props.table || this.props.options.tables[0];
		return {
		    table: table,
		    attr: this.props.attr || this.props.options.quantitativeColumns[table][0].name,
		    facetAttr: this.props.facetAttr || this.props.options.categoricalColumns[table][0].name,
		};
	    },

	    getConfig: function() {
		return {
		    table: this.state.table,
		    attr: this.state.attr,
		    facetAttr: this.state.facetAttr,
		};
	    },

	    handleTableChange: function(table) {
		this.setState({
		    table: table,
		    attr: this.props.options.quantitativeColumns[table][0].name,
		    facetAttr: this.props.options.categoricalColumns[table][0].name,
		});
	    },

	    render: function() {
		var options = this.props.options;
		var attrs = options.quantitativeColumns[this.state.table];
		var facetAttrs = options.categoricalColumns[this.state.table];
		var tableLink = {
		    value: this.state.table,
		    requestChange: this.handleTableChange
		};

		return (
	            React.createElement("div", null, 
	              React.createElement("form", null, 
	 		React.createElement(TableMenuItem, {tableLink: tableLink, tables: options.tables})
		      ), 

		      React.createElement(Input, {type: "select", label: "Column", ref: "attr", valueLink: this.linkState('attr')}, 
		      
			  attrs.map(function(column, i){ return (React.createElement("option", {key: column.name, value: column.name}, " ", column.name, " ")); })
		       
		      ), 

		      React.createElement(Input, {type: "select", label: "Split By", ref: "facetAttr", valueLink: this.linkState('facetAttr')}, 
		      
			  facetAttrs.map(function(column, i){ return (React.createElement("option", {key: column.name, value: column.name}, " ", column.name, " ")); })
		       
		      )

	            )
		);

	    }
	});




/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var _ = __webpack_require__(2);

	var BS = __webpack_require__(34);

	module.exports = React.createClass({displayName: "exports",

	    getDefaultProps: function() {
		return {
		    tables: {},
		    label: "Analysis",
		    header: "Export to Excel",
		    bsStyle: "default"
		};
	    },

	    openFileMenu: function(){
		this.refs.openFile.getDOMNode().click();
	    },

	    render: function() {
		var openFileMenu = this.openFileMenu; 
		var onSave = this.props.onSave;
		var onOpen = this.props.onOpen;
		var onExport = this.props.onExport;
		var header = this.props.header;
		return (

	            React.createElement(BS.DropdownButton, {className: this.props.className, 
			    style: this.props.style, 
			    bsStyle: this.props.bsStyle, 
			    title: this.props.label}, 

		      React.createElement(BS.MenuItem, {header: true}, " File "), 
		      React.createElement(BS.MenuItem, {onSelect: openFileMenu}, " Open Analysis ... "), 
		      React.createElement("input", {style: {"display":"none"}, type: "file", ref: "openFile", onChange: onOpen}), 
		      React.createElement(BS.MenuItem, {onSelect: onSave}, " Save Analysis "), 

		      React.createElement(BS.MenuItem, {header: true}, " ", header, " "), 
		      
		      
			  _.values(this.props.tables).map(function(table, i) {
			      return(
	                          React.createElement(BS.MenuItem, {eventKey: i, onSelect:  onExport.bind(this, table) }, 
				  table.name
				  )
			      )
			  })
		       
	            )
		)
	    }

	});


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var d3 = __webpack_require__(21);
	var _ = __webpack_require__(2);

	module.exports = {
	    createChart: function(container, props, state) {
		var margin = this.props.margin;
		var width = this.props.width - margin.left - margin.right;
		var height = this.props.height - margin.top - margin.bottom;

		var svg = d3.select(container).append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		    .attr("class", "pcp")
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		svg.append("g").attr("class", "nanAxis");
		svg.append("g").attr("class", "foreground");

	    },

	    cleanChart: function(container, props, state){
		// unsubscribe things 
	    },

	    update: function(container, props, state) {
		if ( !(props.attributes.length && props.data.length)) {
		    d3.select(container).html('');
		    this.createChart(container, props, state);
		    return null
		};
		var self = this;
		var nanMargin = 50;
		var margin = props.margin;
		var width = props.width - margin.left - margin.right;
		var height = props.height - margin.top - margin.bottom - nanMargin;
		var nanY = height + (nanMargin / 2);

		var axis = d3.svg.axis().orient("left");
		var scales = this._scales(width, height, props.data, props.attributes);
		var path = this._path(props.attributes, scales, nanY);
		var dragState = {};


		var realSvg = d3.select(container).select("svg");
		realSvg.attr("width", props.width)
		    .attr("height", props.height);

		var svg = d3.select(container).select("svg > g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		// Add foreground lines.
		var foreground = svg.select("g.foreground");
		var foregroundLines = foreground.selectAll("path")
		  .data(props.data, function(d){return d.measure_id;});
		foregroundLines.enter().append("path");
		foregroundLines.attr("d", path)
		    .attr("class", function(d) {return d.patient;})
		    .attr("title", function(d) {return d.measure_id;});
		foregroundLines.exit().remove();

		var brushes = this._brushes(scales, props.attributes, props.onBrush, foreground);

		// Add a group element for each trait.
		var coordinates = svg.selectAll(".coordinate")
			.data(_.pluck(props.attributes, "name"), function(d){return d;});
		coordinates.enter().append("g").attr("class", "coordinate")
			.call(function(g) {
			    // Add an axis and title.
			    g.append("g")
				.attr("class", "axis")
			      .append("text")
				.attr("text-anchor", "middle")
				.attr("class", "dimension") ;})

			.call(function(g) {
			    // Add a brush for each axis.
			    g.append("g")
				.attr("class", "brush"); });
		coordinates
			.attr("transform", function(d) { return "translate(" + scales.x(d) + ")"; })
			.call(d3.behavior.drag()
			      .origin(function(d) { return {x: scales.x(d)}; })
			      .on("dragstart", this._dragstart(props.attributes, dragState))
			      .on("drag", this._drag(scales, dragState, props.attributes, foregroundLines, path, coordinates))
			      .on("dragend", this._dragend(scales, props.attributes, width, path, svg))
			     );
		coordinates.selectAll("g.axis")
		    .each(function(d) { d3.select(this).call(axis.scale(scales.y[d])); });
		coordinates.selectAll("g.brush")
			.each(function(d) { if (!_.isUndefined(props.onBrush)) {d3.select(this).call(brushes[d]);}; })
		    .selectAll("rect")
			.attr("x", -8)
			.attr("width", 16);
		this._humanizeCoordinateLabels(coordinates.selectAll("text.dimension"), props.attributes);
		coordinates.exit().remove();


		// Nan Axis
		var x1 = scales.x.range()[0];
		var x2 = _.last(scales.x.range());
		var nanAxis = svg.selectAll("g.nanAxis").selectAll("g.axis").data(["nan"]);
		nanAxis.enter()
		    .append("g")
		    .attr("class", "axis")
		    .each(function(){
			d3.select(this).append("line");
			d3.select(this).append("text")
			    .text("NaN")
			    .attr("text-anchor", "right");
		    });
		nanAxis.attr("transform", "translate("+ 0 +", "+ nanY  +")");
		nanAxis.selectAll("line").attr({x1:x1, y1:0, x2:x2, y2:0});
		nanAxis.selectAll("text").attr("x", x1 - 40);

		return null;
	    },

	    _dragstart: function(attributes, dragState) {
		return function dragstart(d) {
		    dragState.i = _.pluck(attributes, "name").indexOf(d);
		};
	    },

	    _drag: function(scales, dragState, attributes, foregroundLines, path, g){
		var x = scales.x;
		
		return function drag(d) {
		    x.range()[dragState.i] = d3.event.x;
		    attributes.sort(function(a, b) { return x(a.name) - x(b.name); });
		    g.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
		    foregroundLines.attr("d", path);
		};
	    },

	    _dragend: function(scales, attributes, width, path, svg) {
		var x = scales.x;
		var self = this;
		return function dragend(d) {
		    x.domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
		    var t = d3.transition().duration(500);
		    t.selectAll(".coordinate").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
		    t.selectAll(".foreground path").attr("d", path);

		    // TODO: Sort Coordinates after the animation
		    _.delay(function(){self.props.onAttributeSort(attributes)}, 500);
		};
	    },

	    _scales: function(width, height, data, attributes) {
		var self = this;

		var x = d3.scale.ordinal().domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
		var y = {};

		function sortRegions (rows) {
		    return rows.sort(function(a,b){
			var order = ["DG", "CA3", "CA1", "SUB"];
			return d3.ascending(order.indexOf(a), order.indexOf(b)); 
		    })
		}

		attributes.forEach(function(d) {
		    var name = d.name;
		    if (d.attribute_type === 'QUANTITATIVE') {
			y[name] = d3.scale.linear()
			    .domain(d3.extent(data.filter(function(p){return !isNaN(p[name]);})
					      , function(p) { return p[name]; }))
			    .range([height, 0]);
		    }
		    else if (d.attribute_type === 'CATEGORICAL') {
			var domain = d3.set(_.pluck(data, name)).values();
			domain = (d.name == "Region") ? sortRegions(domain) : domain;
			y[name] = d3.scale.ordinal()
			    .domain(domain)
			    .rangePoints([height, 0]);
		    }
		});

		return {x: x, y: y};
	    },


	    _brushes: function(scales, attributes, onBrush, foreground) {
		if (_.isUndefined(onBrush)) return {};
		var brushes = {};
		var brush = this._brush(scales, brushes, foreground, onBrush);
		var brushstart = function() {d3.event.sourceEvent.stopPropagation();};
		attributes.forEach(function(d) {
			var name = d.name;
			if (d.attribute_type === "QUANTITATIVE") {
			    brushes[name] = d3.svg.brush()
				.y(scales.y[name])
				.on("brushstart", brushstart)
				.on("brush", brush);
			}
			else {//TODO: Add CATEGORICAL support
			    brushes[name] = function(){};
			    brushes[name].empty = function(){return true;};
			}
		});
		return brushes;
	    },

	    _brush: function(scales, brushes, foreground, onBrush){
		var triggerChangeThrottle = _.throttle(onBrush, 30);
		// Handles a brush event, toggling the display of foreground lines.
		return function () {
		    var actives = _.keys(brushes).filter( function(dim) { return !brushes[dim].empty(); });
		    var extents = _.zipObject(actives, actives.map(function(dim) { return brushes[dim].extent(); }));

		    foreground.selectAll("path")
			.attr('display', function(d) {
			    var isInside = actives.every(function(dim) {
				    //TODO: CATEGORICAL: console.log(extents[dim][0], "<=", d[dim], "&&",  d[dim], "<=" , extents[dim][1]);
				    return extents[dim][0] <= d[dim] && d[dim] <= extents[dim][1];
				});
			    return isInside ? null : 'none';
			});
		    triggerChangeThrottle(extents);
		};
	    },

	    // Cousure. Returns the path for a given data point.
	    _path : function (attributes, scales, nanY) {
		var line = d3.svg.line();
	//		.defined(function(d){return !isNaN(d[1]);});  // Breaks the line
		return function (d) {
		    return line(_.pluck(attributes, "name")
				.map(function(a) { 
				    var y = scales.y[a](d[a])
				    return [scales.x(a), !isNaN(y) ? y : nanY ]; }));
		};
	    },

	    _humanizeCoordinateLabels: function(textSelection, attributes) {
		textSelection.text(function(d){return _.capitalize(String(d));});
		textSelection.transition().attr("y", function(d,i){return (_.findIndex(attributes, {name:d}) %2)? -9 : -27;});
	    }

	};


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var d3 = __webpack_require__(21);
	var _ = __webpack_require__(2);
	__webpack_require__(38);


	module.exports = {
	    createChart: function(container, props, state){
		var margin = this.props.margin;
		var width = this.props.width - margin.left - margin.right;
		var height = this.props.height - margin.top - margin.bottom;

		var svg = d3.select(container).append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		    .attr("class", "boxChart")
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var gXAxis = svg.append("g")
		    .attr("class", "x axis");

		var gYAxis = svg.append("g")
		    .attr("class", "y axis");

		var gBoxes = svg.append("g")
		    .attr("class", "boxes");

	    },

	    cleanChart: function(container, props, state){
		// unsubscribe things 
	    },

	    update: function(container, props, state) {
		if ( !(props.distributions.length)) {
		    d3.select(container).html('');
		    this.createChart(container, props, state);
		    return null
		};
		console.log("Update BOX"); 
		var self = this;
		var margin = props.margin;
		var width = props.width - margin.left - margin.right;
		var height = props.height - margin.top - margin.bottom;

		var boxWidth = 20;
		var boxMargin = 25;
		var boxGroupMargin = 20;

		var color = d3.scale.category10();

		var nDistributions = props.distributions.length;
		var distributions = _.flatten(_.forEach(props.distributions, function(dist, i){
		    return _.map(dist, function(v){return v.subset = i;});}));
		var factedData = _.groupBy(distributions, 'facetAttr');
		var nBoxGroups = d3.max(_.map(props.distributions, 'length'));
		
		var boxGroupWidth = nDistributions * (boxWidth + 2 * boxMargin);

		// -----------------------------
		//     Update the axes
		// -----------------------------

		var x = d3.scale.ordinal()
		    .domain(_.keys(factedData))
		    .rangePoints([0,width], 1);

		var y = d3.scale.linear()
		    .domain(self.getDomain(distributions))
		    .rangeRound([height, 0])
		    .nice();

		var boxPlot = d3.box()
		    .height(height)
		    .width(boxWidth)
		    .whiskers(iqr(1.5))
		    .domain(y.domain())
		    .tickFormat(function(){return "";}); // No labels

		var xGroup = d3.scale.linear()
		    .rangeRound([0, width])
		    .domain([0, nBoxGroups]);

		var xAxis =  d3.svg.axis()
		    .scale(x)
		    .orient("bottom");

		var yAxis =  d3.svg.axis()
		    .scale(y)
		    .ticks(5)
		    .orient("left");
		
		// -----------------------------
		//     Update the layers
		// -----------------------------

		var realSvg = d3.select(container).select("svg");
		realSvg.attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom);

		var svg = d3.select(container).select("svg > g")
		    .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

		var gXAxis = svg.select("g.x")
		    .attr("transform", "translate(0," + height + ")")
		    .transition().call(xAxis);

		var gYAxis = svg.select("g.y")
		    .transition().call(yAxis);

		var gBoxes = svg.select("g.boxes");

		// -----------------------------
		//     Update the boxPlots
		// -----------------------------

		var boxGroup = gBoxes.selectAll('g.boxGroup')
		    .data(_.values(factedData));
		boxGroup.enter().append('g')
		    .classed('boxGroup', true);

		var box = boxGroup.selectAll('g.box')
		    .data(function(d) { return d; });

		box.enter().append('g')
		    .classed('box', true);

		boxGroup.attr("transform", function(d,i) {return "translate(" + x(d[0].facetAttr) + ",0)";});

		box.attr("transform", function(d,i) {
		    var offset = - (boxWidth/2); //boxMargin + ((boxGroupWidth/2) * d.subset);
		    return "translate(" + offset + ",0)";})
		    .datum(function(d){return d.list;})
		    .call(boxPlot);
		
		box.exit().remove();
		boxGroup.exit().remove();

		return null;
	    },

	    getDomain : function(distributions) {
		var minmax = function(acc, v){
		    acc.min = Math.min(acc.min, v.min);
		    acc.max = Math.max(acc.max, v.max);
		    return acc;
		};
		var domain =  _.reduce(_.flatten(distributions), minmax, {'min':Infinity, 'max':-Infinity});	    
		return [domain.min, domain.max];
	    }

	};

	// Returns a function to compute the interquartile range.
	function iqr(k) {
	    return function(d, i) {
		var q1 = d.quartiles[0],
	        q3 = d.quartiles[2],
	        iqr = (q3 - q1) * k,
	        i = -1,
	        j = d.length;
		while (d[++i] < q1 - iqr);
		while (d[--j] > q3 + iqr);
		return [i, j];
	    };
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var c3 = __webpack_require__(103);
	var _ = __webpack_require__(2);

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



/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;// MIT License:
	//
	// Copyright (c) 2010-2012, Joe Walnes
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the "Software"), to deal
	// in the Software without restriction, including without limitation the rights
	// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	// copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	// THE SOFTWARE.

	!function() {
	/**
	 * This behaves like a WebSocket in every way, except if it fails to connect,
	 * or it gets disconnected, it will repeatedly poll until it succesfully connects
	 * again.
	 *
	 * It is API compatible, so when you have:
	 *   ws = new WebSocket('ws://....');
	 * you can replace with:
	 *   ws = new ReconnectingWebSocket('ws://....');
	 *
	 * The event stream will typically look like:
	 *  onconnecting
	 *  onopen
	 *  onmessage
	 *  onmessage
	 *  onclose // lost connection
	 *  onconnecting
	 *  onopen  // sometime later...
	 *  onmessage
	 *  onmessage
	 *  etc... 
	 *
	 * It is API compatible with the standard WebSocket API.
	 *
	 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
	 * - Joe Walnes
	 */
	    var ReconnectingWebSocket = function (url, protocols) {
		protocols = protocols || [];

		// These can be altered by calling code.
		this.debug = false;
		this.reconnectInterval = 1000;
		this.timeoutInterval = 2000;

		var self = this;
		var ws;
		var forcedClose = false;
		var timedOut = false;
		
		this.url = url;
		this.protocols = protocols;
		this.readyState = WebSocket.CONNECTING;
		this.URL = url; // Public API

		this.onopen = function(event) {
		};

		this.onclose = function(event) {
		};

		this.onconnecting = function(event) {
		};

		this.onmessage = function(event) {
		};

		this.onerror = function(event) {
		};

		function connect(reconnectAttempt) {
	            ws = new WebSocket(url, protocols);
	            
	            self.onconnecting();
	            if (self.debug || ReconnectingWebSocket.debugAll) {
			console.debug('ReconnectingWebSocket', 'attempt-connect', url);
	            }
	            
	            var localWs = ws;
	            var timeout = setTimeout(function() {
						 if (self.debug || ReconnectingWebSocket.debugAll) {
						     console.debug('ReconnectingWebSocket', 'connection-timeout', url);
						 }
						 timedOut = true;
						 localWs.close();
						 timedOut = false;
					     }, self.timeoutInterval);
	            
	            ws.onopen = function(event) {
			clearTimeout(timeout);
			if (self.debug || ReconnectingWebSocket.debugAll) {
	                    console.debug('ReconnectingWebSocket', 'onopen', url);
			}
			self.readyState = WebSocket.OPEN;
			reconnectAttempt = false;
			self.onopen(event);
	            };
	            
	            ws.onclose = function(event) {
			clearTimeout(timeout);
			ws = null;
			if (forcedClose) {
	                    self.readyState = WebSocket.CLOSED;
	                    self.onclose(event);
			} else {
	                    self.readyState = WebSocket.CONNECTING;
	                    self.onconnecting();
	                    if (!reconnectAttempt && !timedOut) {
				if (self.debug || ReconnectingWebSocket.debugAll) {
	                            console.debug('ReconnectingWebSocket', 'onclose', url);
				}
				self.onclose(event);
	                    }
	                    setTimeout(function() {
					   connect(true);
				       }, self.reconnectInterval);
			}
	            };
	            ws.onmessage = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
	                    console.debug('ReconnectingWebSocket', 'onmessage', url, event.data);
			}
	        	self.onmessage(event);
	            };
	            ws.onerror = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
	                    console.debug('ReconnectingWebSocket', 'onerror', url, event);
			}
			self.onerror(event);
	            };
		}
		connect(url);

		this.send = function(data) {
	            if (ws) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
	                    console.debug('ReconnectingWebSocket', 'send', url, data);
			}
			return ws.send(data);
	            } else {
			throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
	            }
		};

		this.close = function() {
	            forcedClose = true;
	            if (ws) {
			ws.close();
	            }
		};

		/**
		 * Additional public API method to refresh the connection if still open (close, re-open).
		 * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
		 */
		this.refresh = function() {
	            if (ws) {
			ws.close();
	            }
		};
	    };

	    /**
	     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
	     */
	    ReconnectingWebSocket.debugAll = false;

	    /**
	     * Compatibility with AMD and Requirejs
	     */
	    if (true) {
		console.debug("Requirejs found");
		!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {return ReconnectingWebSocket;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module === "object" && module.exports) {
		module.exports = ReconnectingWebSocket;
	    } else {
		this.ReconnectingWebSocket = ReconnectingWebSocket;
	    }

	    //return ReconnectingWebSocket;
	}();


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5), __webpack_require__(17)], __WEBPACK_AMD_DEFINE_RESULT__ = function(when, ReconnectingWebSocket) {

	    var WsRpc = function(server, path, port){
		var self = this;

		this._out_queue = [];
		this._futures = {};
		this.ws = new ReconnectingWebSocket('ws://' + server + ':' + String(port) + '/' + path);
		this.ws.onmessage = function(event) { self._onmessage(event); };
		this.ws.onopen = function(event) { self._flush(); };


	    };

	    /// Holding the WebSocket on default getsocket.
	    WsRpc.prototype.ws = null;
	    /// Object <id>: when.deferred
	    WsRpc.prototype._futures = {};
	    /// The next JSON-WsRpc request id.
	    WsRpc.prototype._current_id = 1;
	    /// The not ready queue
	    WsRpc.prototype._out_queue = [];
	    /// The list of extenders
	    WsRpc.prototype._extenders = [];

	    /**
	     * @fn call
	     * @memberof WsRpc
	     *
	     * @param method     The method to run on JSON-RPC server.
	     * @param params     The params; an array or object.
	     * @return		 A when.promise 
	     */
	    WsRpc.prototype.call = function call(method, params) {
		// Construct the JSON-RPC 2.0 request.
		var request = {
		    jsonrpc : '2.0',
		    method  : method,
		    params  : params,
		    id      : this._current_id++  // Increase the id counter to match request/response
		};

		this._extenders.forEach(function(extender) {
		    extender.modifyRequest(request);
		});
		
		var deferred = when.defer();
		this._futures[request.id] = deferred;

		var request_json = JSON.stringify(request);
		this._send(request_json);

		return deferred.promise;
	    };   

	    /**
	     * This is an extension point mechanism to add objects that can
	     * modify the request before sending it. The 'extenders' need to
	     * have a method named `modifyRequest` which accepts one param,
	     * the JSON-RPC request object.
	     * 
	     * @fn extend
	     * @memberof WsRpc
	     *
	     * @param extender    An object with a method `modifyRequest`
	     */
	    WsRpc.prototype.extend = function(extender) {
		this._extenders.push(extender);
	    };


	    /**
	     * Internal method that sends a message through the Web Socket
	     * only if the connection is ready, otherwise the message is
	     * queued until the _flush method is called.
	     * 
	     * @fn _send
	     * @memberof WsRpc
	     *
	     * @param request_json     The JSON-RPC request.
	     */
	    WsRpc.prototype._send = function(request_json) {
		if (this.ws.readyState == 1) {
		    this.ws.send(request_json);
		}
		else {
		    this._out_queue.push(request_json);
		}
	    };

	    WsRpc.prototype._flush = function (){
		var self = this;
		this._out_queue.forEach(
		    function(request_json) {
			self.ws.send(request_json);
		    });
		this._out_queue = [];
	    };

	    /**
	     * Internal handler for the websocket messages.  It determines if
	     * the message is a JSON-RPC response, and if so, tries to couple
	     * it with a given deferred. Otherwise, it falls back to given
	     * external onerror-handler, if any.
	     *
	     * @param event The websocket onmessage-event.
	     */
	    WsRpc.prototype._onmessage = function(event) {
		// Check if this could be a JSON RPC message.
		try {
		    var response = JSON.parse(event.data);

		    if (typeof response === 'object'
			&& 'jsonrpc' in response
			&& response.jsonrpc === '2.0') {

			/// This is a bad response. Failure in the protocol
			if ('error' in response && response.id === null) {
			    if (typeof this.onerror === 'function') {
				this.onerror(event);
			    }
			}
			else if (this._futures[response.id]) {
			    // Get the deferred.
			    var deferred = this._futures[response.id];		
			    // Delete the deferred from the storage.
			    delete this._futures[response.id];

			    if ('result' in response) {
				// Resolve with result as parameter.
				deferred.resolve(response.result);
			    }
			    else if ('error' in response){
				// Reject with the error object as parameter.
				deferred.reject(response.error);		    
			    }
			}

			return;
		    }
		}
		catch (err) {
		    // Probably an error while parsing a non json-string as json.  
		    // All real JSON-RPC cases are
		    // handled above, and the fallback method is called below.
		    console.log('*** Error no handled', err, this);
		}
		// This is not a JSON-RPC response. 
		new Error('This is not a JSON-RPC response' + String(response));
	    };
	    return WsRpc;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));



/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(17)], __WEBPACK_AMD_DEFINE_RESULT__ = function(ReconnectingWebSocket) {

	    var Hub = function(server, port, rpc, gateway){
		var self = this;

		this._subscriptions = {};
		this._rpc = rpc;
		this._gateway = gateway;
		this._rpc.call('HubSrv.new_gateway',[gateway,'ws', port]).then( 
		    function (port) {
			self.ws = new ReconnectingWebSocket('ws://' + server + ':' +String(port)+ '/hub/' + gateway);	
		    	self.ws.onmessage = function(event) { self._onmessage(event); };
		    });

		//this.ws.onopen = function(event) { self._onopen(); };
		//this.ws.onclose = function(event) { self._onclose(); };
	    };

	    /// Holding the WebSocket on default getsocket.
	    Hub.prototype.ws = null;
	    /// Object topic: callback
	    Hub.prototype._subscriptions = {};
	    
	    Hub.prototype.publish = function(topic, msg) {
		return this._rpc.call('HubSrv.publish',[topic, msg]);
	    };

	    Hub.prototype._subscribe = function(topic, callback, only_once, context) {
		context = context || null;
		var new_topic = ! Boolean(this._subscriptions[topic]);
		this._subscriptions[topic] = this._subscriptions[topic] || [];
		this._subscriptions[topic].push({only_once: only_once || false, 
						 callback: callback,
						 context: context});
		if (new_topic) {
		    if (only_once)
			return this._rpc.call('HubSrv.subscribe_once',[this._gateway, topic]);	    
		    else
			return this._rpc.call('HubSrv.subscribe',[this._gateway, topic]);	    
		}

		return true;
	    };

	    Hub.prototype.subscribe = function(topic, callback, context) {
		return this._subscribe(topic, callback, false, context);
	    };

	    Hub.prototype.subscribe_once = function(topic, callback, context) {
		return this._subscribe(topic, callback, true, context);
	    };

	    Hub.prototype.unsubscribe = function(topic, callback, context) {
		context = context || null;
		if (! (topic in this._subscriptions) )
		{
		    throw new Error('There is no topic: "'+topic+'" to unsubscribe');
		}

		var subscriptions = this._subscriptions[topic];
		var i=0, length= subscriptions.length, subs = null;
		for (;i < length;i++) {
		    if (subscriptions[i].callback === callback &&
		       !context || subscriptions[i].context === context) {
			subscriptions.splice(i, 1);
			
			// Adjust counter and length for removed item
	                i--;
	                length--;
		    }
		}
		if (callback === undefined || subscriptions.length == 0) {
		    delete this._subscriptions[topic];
		    return this._rpc.call('HubSrv.unsubscribe',[this._gateway, topic]);	    
		}
		return true;
	    };

	    /**
	     * Unsubscribe to everithing
	     * @ return: when.promise
	     */
	    Hub.prototype.clear = function() {
	//	var deferred = when.defer();
		this._subscriptions = {};
		return this._rpc.call('HubSrv.clear',[this._gateway]);
	    };


	    Hub.prototype.internal_publish = function(topic, msg) {
		var subscriptions = this._subscriptions[topic] || [];
		var i=0, length = subscriptions.length, subs = null;
		for (;i < length; i++) {
		    subs = subscriptions[i];
		    subs.callback.apply(subs.context, [topic, msg]);
		    if (subs.only_once)
			this.unsubscribe(topic, subs.callback, subs.context);
		}
	    };

	    Hub.prototype._onmessage = function(event) {
		var data = JSON.parse(event.data);

		this.internal_publish(data.topic, data.msg);
	    };
	    return Hub;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(41);
	module.exports.Responsive = __webpack_require__(42);


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = d3;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var env = __webpack_require__(44);
		var TimeoutError = __webpack_require__(31);

		function setTimeout(f, ms, x, y) {
			return env.setTimer(function() {
				f(x, y, ms);
			}, ms);
		}

		return function timed(Promise) {
			/**
			 * Return a new promise whose fulfillment value is revealed only
			 * after ms milliseconds
			 * @param {number} ms milliseconds
			 * @returns {Promise}
			 */
			Promise.prototype.delay = function(ms) {
				var p = this._beget();
				this._handler.fold(handleDelay, ms, void 0, p._handler);
				return p;
			};

			function handleDelay(ms, x, h) {
				setTimeout(resolveDelay, ms, x, h);
			}

			function resolveDelay(x, h) {
				h.resolve(x);
			}

			/**
			 * Return a new promise that rejects after ms milliseconds unless
			 * this promise fulfills earlier, in which case the returned promise
			 * fulfills with the same value.
			 * @param {number} ms milliseconds
			 * @param {Error|*=} reason optional rejection reason to use, defaults
			 *   to a TimeoutError if not provided
			 * @returns {Promise}
			 */
			Promise.prototype.timeout = function(ms, reason) {
				var p = this._beget();
				var h = p._handler;

				var t = setTimeout(onTimeout, ms, reason, p._handler);

				this._handler.visit(h,
					function onFulfill(x) {
						env.clearTimer(t);
						this.resolve(x); // this = h
					},
					function onReject(x) {
						env.clearTimer(t);
						this.reject(x); // this = h
					},
					h.notify);

				return p;
			};

			function onTimeout(reason, h, ms) {
				var e = typeof reason === 'undefined'
					? new TimeoutError('timed out after ' + ms + 'ms')
					: reason;
				h.reject(e);
			}

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var state = __webpack_require__(45);
		var applier = __webpack_require__(33);

		return function array(Promise) {

			var applyFold = applier(Promise);
			var toPromise = Promise.resolve;
			var all = Promise.all;

			var ar = Array.prototype.reduce;
			var arr = Array.prototype.reduceRight;
			var slice = Array.prototype.slice;

			// Additional array combinators

			Promise.any = any;
			Promise.some = some;
			Promise.settle = settle;

			Promise.map = map;
			Promise.filter = filter;
			Promise.reduce = reduce;
			Promise.reduceRight = reduceRight;

			/**
			 * When this promise fulfills with an array, do
			 * onFulfilled.apply(void 0, array)
			 * @param {function} onFulfilled function to apply
			 * @returns {Promise} promise for the result of applying onFulfilled
			 */
			Promise.prototype.spread = function(onFulfilled) {
				return this.then(all).then(function(array) {
					return onFulfilled.apply(this, array);
				});
			};

			return Promise;

			/**
			 * One-winner competitive race.
			 * Return a promise that will fulfill when one of the promises
			 * in the input array fulfills, or will reject when all promises
			 * have rejected.
			 * @param {array} promises
			 * @returns {Promise} promise for the first fulfilled value
			 */
			function any(promises) {
				var p = Promise._defer();
				var resolver = p._handler;
				var l = promises.length>>>0;

				var pending = l;
				var errors = [];

				for (var h, x, i = 0; i < l; ++i) {
					x = promises[i];
					if(x === void 0 && !(i in promises)) {
						--pending;
						continue;
					}

					h = Promise._handler(x);
					if(h.state() > 0) {
						resolver.become(h);
						Promise._visitRemaining(promises, i, h);
						break;
					} else {
						h.visit(resolver, handleFulfill, handleReject);
					}
				}

				if(pending === 0) {
					resolver.reject(new RangeError('any(): array must not be empty'));
				}

				return p;

				function handleFulfill(x) {
					/*jshint validthis:true*/
					errors = null;
					this.resolve(x); // this === resolver
				}

				function handleReject(e) {
					/*jshint validthis:true*/
					if(this.resolved) { // this === resolver
						return;
					}

					errors.push(e);
					if(--pending === 0) {
						this.reject(errors);
					}
				}
			}

			/**
			 * N-winner competitive race
			 * Return a promise that will fulfill when n input promises have
			 * fulfilled, or will reject when it becomes impossible for n
			 * input promises to fulfill (ie when promises.length - n + 1
			 * have rejected)
			 * @param {array} promises
			 * @param {number} n
			 * @returns {Promise} promise for the earliest n fulfillment values
			 *
			 * @deprecated
			 */
			function some(promises, n) {
				/*jshint maxcomplexity:7*/
				var p = Promise._defer();
				var resolver = p._handler;

				var results = [];
				var errors = [];

				var l = promises.length>>>0;
				var nFulfill = 0;
				var nReject;
				var x, i; // reused in both for() loops

				// First pass: count actual array items
				for(i=0; i<l; ++i) {
					x = promises[i];
					if(x === void 0 && !(i in promises)) {
						continue;
					}
					++nFulfill;
				}

				// Compute actual goals
				n = Math.max(n, 0);
				nReject = (nFulfill - n + 1);
				nFulfill = Math.min(n, nFulfill);

				if(n > nFulfill) {
					resolver.reject(new RangeError('some(): array must contain at least '
					+ n + ' item(s), but had ' + nFulfill));
				} else if(nFulfill === 0) {
					resolver.resolve(results);
				}

				// Second pass: observe each array item, make progress toward goals
				for(i=0; i<l; ++i) {
					x = promises[i];
					if(x === void 0 && !(i in promises)) {
						continue;
					}

					Promise._handler(x).visit(resolver, fulfill, reject, resolver.notify);
				}

				return p;

				function fulfill(x) {
					/*jshint validthis:true*/
					if(this.resolved) { // this === resolver
						return;
					}

					results.push(x);
					if(--nFulfill === 0) {
						errors = null;
						this.resolve(results);
					}
				}

				function reject(e) {
					/*jshint validthis:true*/
					if(this.resolved) { // this === resolver
						return;
					}

					errors.push(e);
					if(--nReject === 0) {
						results = null;
						this.reject(errors);
					}
				}
			}

			/**
			 * Apply f to the value of each promise in a list of promises
			 * and return a new list containing the results.
			 * @param {array} promises
			 * @param {function(x:*, index:Number):*} f mapping function
			 * @returns {Promise}
			 */
			function map(promises, f) {
				return Promise._traverse(f, promises);
			}

			/**
			 * Filter the provided array of promises using the provided predicate.  Input may
			 * contain promises and values
			 * @param {Array} promises array of promises and values
			 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
			 *  Must return truthy (or promise for truthy) for items to retain.
			 * @returns {Promise} promise that will fulfill with an array containing all items
			 *  for which predicate returned truthy.
			 */
			function filter(promises, predicate) {
				var a = slice.call(promises);
				return Promise._traverse(predicate, a).then(function(keep) {
					return filterSync(a, keep);
				});
			}

			function filterSync(promises, keep) {
				// Safe because we know all promises have fulfilled if we've made it this far
				var l = keep.length;
				var filtered = new Array(l);
				for(var i=0, j=0; i<l; ++i) {
					if(keep[i]) {
						filtered[j++] = Promise._handler(promises[i]).value;
					}
				}
				filtered.length = j;
				return filtered;

			}

			/**
			 * Return a promise that will always fulfill with an array containing
			 * the outcome states of all input promises.  The returned promise
			 * will never reject.
			 * @param {Array} promises
			 * @returns {Promise} promise for array of settled state descriptors
			 */
			function settle(promises) {
				return all(promises.map(settleOne));
			}

			function settleOne(p) {
				var h = Promise._handler(p);
				if(h.state() === 0) {
					return toPromise(p).then(state.fulfilled, state.rejected);
				}

				h._unreport();
				return state.inspect(h);
			}

			/**
			 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
			 * input may contain promises and/or values, and reduceFunc
			 * may return either a value or a promise, *and* initialValue may
			 * be a promise for the starting value.
			 * @param {Array|Promise} promises array or promise for an array of anything,
			 *      may contain a mix of promises and values.
			 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
			 * @returns {Promise} that will resolve to the final reduced value
			 */
			function reduce(promises, f /*, initialValue */) {
				return arguments.length > 2 ? ar.call(promises, liftCombine(f), arguments[2])
						: ar.call(promises, liftCombine(f));
			}

			/**
			 * Traditional reduce function, similar to `Array.prototype.reduceRight()`, but
			 * input may contain promises and/or values, and reduceFunc
			 * may return either a value or a promise, *and* initialValue may
			 * be a promise for the starting value.
			 * @param {Array|Promise} promises array or promise for an array of anything,
			 *      may contain a mix of promises and values.
			 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
			 * @returns {Promise} that will resolve to the final reduced value
			 */
			function reduceRight(promises, f /*, initialValue */) {
				return arguments.length > 2 ? arr.call(promises, liftCombine(f), arguments[2])
						: arr.call(promises, liftCombine(f));
			}

			function liftCombine(f) {
				return function(z, x, i) {
					return applyFold(f, void 0, [z,x,i]);
				};
			}
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function flow(Promise) {

			var resolve = Promise.resolve;
			var reject = Promise.reject;
			var origCatch = Promise.prototype['catch'];

			/**
			 * Handle the ultimate fulfillment value or rejection reason, and assume
			 * responsibility for all errors.  If an error propagates out of result
			 * or handleFatalError, it will be rethrown to the host, resulting in a
			 * loud stack track on most platforms and a crash on some.
			 * @param {function?} onResult
			 * @param {function?} onError
			 * @returns {undefined}
			 */
			Promise.prototype.done = function(onResult, onError) {
				this._handler.visit(this._handler.receiver, onResult, onError);
			};

			/**
			 * Add Error-type and predicate matching to catch.  Examples:
			 * promise.catch(TypeError, handleTypeError)
			 *   .catch(predicate, handleMatchedErrors)
			 *   .catch(handleRemainingErrors)
			 * @param onRejected
			 * @returns {*}
			 */
			Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
				if (arguments.length < 2) {
					return origCatch.call(this, onRejected);
				}

				if(typeof onRejected !== 'function') {
					return this.ensure(rejectInvalidPredicate);
				}

				return origCatch.call(this, createCatchFilter(arguments[1], onRejected));
			};

			/**
			 * Wraps the provided catch handler, so that it will only be called
			 * if the predicate evaluates truthy
			 * @param {?function} handler
			 * @param {function} predicate
			 * @returns {function} conditional catch handler
			 */
			function createCatchFilter(handler, predicate) {
				return function(e) {
					return evaluatePredicate(e, predicate)
						? handler.call(this, e)
						: reject(e);
				};
			}

			/**
			 * Ensures that onFulfilledOrRejected will be called regardless of whether
			 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
			 * receive the promises' value or reason.  Any returned value will be disregarded.
			 * onFulfilledOrRejected may throw or return a rejected promise to signal
			 * an additional error.
			 * @param {function} handler handler to be called regardless of
			 *  fulfillment or rejection
			 * @returns {Promise}
			 */
			Promise.prototype['finally'] = Promise.prototype.ensure = function(handler) {
				if(typeof handler !== 'function') {
					return this;
				}

				return this.then(function(x) {
					return runSideEffect(handler, this, identity, x);
				}, function(e) {
					return runSideEffect(handler, this, reject, e);
				});
			};

			function runSideEffect (handler, thisArg, propagate, value) {
				var result = handler.call(thisArg);
				return maybeThenable(result)
					? propagateValue(result, propagate, value)
					: propagate(value);
			}

			function propagateValue (result, propagate, x) {
				return resolve(result).then(function () {
					return propagate(x);
				});
			}

			/**
			 * Recover from a failure by returning a defaultValue.  If defaultValue
			 * is a promise, it's fulfillment value will be used.  If defaultValue is
			 * a promise that rejects, the returned promise will reject with the
			 * same reason.
			 * @param {*} defaultValue
			 * @returns {Promise} new promise
			 */
			Promise.prototype['else'] = Promise.prototype.orElse = function(defaultValue) {
				return this.then(void 0, function() {
					return defaultValue;
				});
			};

			/**
			 * Shortcut for .then(function() { return value; })
			 * @param  {*} value
			 * @return {Promise} a promise that:
			 *  - is fulfilled if value is not a promise, or
			 *  - if value is a promise, will fulfill with its value, or reject
			 *    with its reason.
			 */
			Promise.prototype['yield'] = function(value) {
				return this.then(function() {
					return value;
				});
			};

			/**
			 * Runs a side effect when this promise fulfills, without changing the
			 * fulfillment value.
			 * @param {function} onFulfilledSideEffect
			 * @returns {Promise}
			 */
			Promise.prototype.tap = function(onFulfilledSideEffect) {
				return this.then(onFulfilledSideEffect)['yield'](this);
			};

			return Promise;
		};

		function rejectInvalidPredicate() {
			throw new TypeError('catch predicate must be a function');
		}

		function evaluatePredicate(e, predicate) {
			return isError(predicate) ? e instanceof predicate : predicate(e);
		}

		function isError(predicate) {
			return predicate === Error
				|| (predicate != null && predicate.prototype instanceof Error);
		}

		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function identity(x) {
			return x;
		}

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */
	/** @author Jeff Escalante */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function fold(Promise) {

			Promise.prototype.fold = function(f, z) {
				var promise = this._beget();

				this._handler.fold(function(z, x, to) {
					Promise._handler(z).fold(function(x, z, to) {
						to.resolve(f.call(this, z, x));
					}, x, this, to);
				}, z, promise._handler.receiver, promise._handler);

				return promise;
			};

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var inspect = __webpack_require__(45).inspect;

		return function inspection(Promise) {

			Promise.prototype.inspect = function() {
				return inspect(Promise._handler(this));
			};

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function generate(Promise) {

			var resolve = Promise.resolve;

			Promise.iterate = iterate;
			Promise.unfold = unfold;

			return Promise;

			/**
			 * @deprecated Use github.com/cujojs/most streams and most.iterate
			 * Generate a (potentially infinite) stream of promised values:
			 * x, f(x), f(f(x)), etc. until condition(x) returns true
			 * @param {function} f function to generate a new x from the previous x
			 * @param {function} condition function that, given the current x, returns
			 *  truthy when the iterate should stop
			 * @param {function} handler function to handle the value produced by f
			 * @param {*|Promise} x starting value, may be a promise
			 * @return {Promise} the result of the last call to f before
			 *  condition returns true
			 */
			function iterate(f, condition, handler, x) {
				return unfold(function(x) {
					return [x, f(x)];
				}, condition, handler, x);
			}

			/**
			 * @deprecated Use github.com/cujojs/most streams and most.unfold
			 * Generate a (potentially infinite) stream of promised values
			 * by applying handler(generator(seed)) iteratively until
			 * condition(seed) returns true.
			 * @param {function} unspool function that generates a [value, newSeed]
			 *  given a seed.
			 * @param {function} condition function that, given the current seed, returns
			 *  truthy when the unfold should stop
			 * @param {function} handler function to handle the value produced by unspool
			 * @param x {*|Promise} starting value, may be a promise
			 * @return {Promise} the result of the last value produced by unspool before
			 *  condition returns true
			 */
			function unfold(unspool, condition, handler, x) {
				return resolve(x).then(function(seed) {
					return resolve(condition(seed)).then(function(done) {
						return done ? seed : resolve(unspool(seed)).spread(next);
					});
				});

				function next(item, newSeed) {
					return resolve(handler(item)).then(function() {
						return unfold(unspool, condition, handler, newSeed);
					});
				}
			}
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function progress(Promise) {

			/**
			 * @deprecated
			 * Register a progress handler for this promise
			 * @param {function} onProgress
			 * @returns {Promise}
			 */
			Promise.prototype.progress = function(onProgress) {
				return this.then(void 0, void 0, onProgress);
			};

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function addWith(Promise) {
			/**
			 * Returns a promise whose handlers will be called with `this` set to
			 * the supplied receiver.  Subsequent promises derived from the
			 * returned promise will also have their handlers called with receiver
			 * as `this`. Calling `with` with undefined or no arguments will return
			 * a promise whose handlers will again be called in the usual Promises/A+
			 * way (no `this`) thus safely undoing any previous `with` in the
			 * promise chain.
			 *
			 * WARNING: Promises returned from `with`/`withThis` are NOT Promises/A+
			 * compliant, specifically violating 2.2.5 (http://promisesaplus.com/#point-41)
			 *
			 * @param {object} receiver `this` value for all handlers attached to
			 *  the returned promise.
			 * @returns {Promise}
			 */
			Promise.prototype['with'] = Promise.prototype.withThis = function(receiver) {
				var p = this._beget();
				var child = p._handler;
				child.receiver = receiver;
				this._handler.chain(child, receiver);
				return p;
			};

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));



/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var setTimer = __webpack_require__(44).setTimer;
		var format = __webpack_require__(46);

		return function unhandledRejection(Promise) {

			var logError = noop;
			var logInfo = noop;
			var localConsole;

			if(typeof console !== 'undefined') {
				// Alias console to prevent things like uglify's drop_console option from
				// removing console.log/error. Unhandled rejections fall into the same
				// category as uncaught exceptions, and build tools shouldn't silence them.
				localConsole = console;
				logError = typeof localConsole.error !== 'undefined'
					? function (e) { localConsole.error(e); }
					: function (e) { localConsole.log(e); };

				logInfo = typeof localConsole.info !== 'undefined'
					? function (e) { localConsole.info(e); }
					: function (e) { localConsole.log(e); };
			}

			Promise.onPotentiallyUnhandledRejection = function(rejection) {
				enqueue(report, rejection);
			};

			Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
				enqueue(unreport, rejection);
			};

			Promise.onFatalRejection = function(rejection) {
				enqueue(throwit, rejection.value);
			};

			var tasks = [];
			var reported = [];
			var running = null;

			function report(r) {
				if(!r.handled) {
					reported.push(r);
					logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
				}
			}

			function unreport(r) {
				var i = reported.indexOf(r);
				if(i >= 0) {
					reported.splice(i, 1);
					logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
				}
			}

			function enqueue(f, x) {
				tasks.push(f, x);
				if(running === null) {
					running = setTimer(flush, 0);
				}
			}

			function flush() {
				running = null;
				while(tasks.length > 0) {
					tasks.shift()(tasks.shift());
				}
			}

			return Promise;
		};

		function throwit(e) {
			throw e;
		}

		function noop() {}

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		/**
		 * Custom error type for promises rejected by promise.timeout
		 * @param {string} message
		 * @constructor
		 */
		function TimeoutError (message) {
			Error.call(this);
			this.message = message;
			this.name = TimeoutError.name;
			if (typeof Error.captureStackTrace === 'function') {
				Error.captureStackTrace(this, TimeoutError);
			}
		}

		TimeoutError.prototype = Object.create(Error.prototype);
		TimeoutError.prototype.constructor = TimeoutError;

		return TimeoutError;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

		var makePromise = __webpack_require__(47);
		var Scheduler = __webpack_require__(48);
		var async = __webpack_require__(44).asap;

		return makePromise({
			scheduler: new Scheduler(async)
		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	})(__webpack_require__(40));


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		makeApply.tryCatchResolve = tryCatchResolve;

		return makeApply;

		function makeApply(Promise, call) {
			if(arguments.length < 2) {
				call = tryCatchResolve;
			}

			return apply;

			function apply(f, thisArg, args) {
				var p = Promise._defer();
				var l = args.length;
				var params = new Array(l);
				callAndResolve({ f:f, thisArg:thisArg, args:args, params:params, i:l-1, call:call }, p._handler);

				return p;
			}

			function callAndResolve(c, h) {
				if(c.i < 0) {
					return call(c.f, c.thisArg, c.params, h);
				}

				var handler = Promise._handler(c.args[c.i]);
				handler.fold(callAndResolveNext, c, void 0, h);
			}

			function callAndResolveNext(c, x, h) {
				c.params[c.i] = x;
				c.i -= 1;
				callAndResolve(c, h);
			}
		}

		function tryCatchResolve(f, thisArg, args, resolver) {
			try {
				resolver.resolve(f.apply(thisArg, args));
			} catch(e) {
				resolver.reject(e);
			}
		}

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));




/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _Accordion = __webpack_require__(49);

	var _Accordion2 = _interopRequireDefault(_Accordion);

	var _Affix = __webpack_require__(50);

	var _Affix2 = _interopRequireDefault(_Affix);

	var _AffixMixin = __webpack_require__(51);

	var _AffixMixin2 = _interopRequireDefault(_AffixMixin);

	var _Alert = __webpack_require__(52);

	var _Alert2 = _interopRequireDefault(_Alert);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _Badge = __webpack_require__(54);

	var _Badge2 = _interopRequireDefault(_Badge);

	var _Button = __webpack_require__(55);

	var _Button2 = _interopRequireDefault(_Button);

	var _ButtonGroup = __webpack_require__(56);

	var _ButtonGroup2 = _interopRequireDefault(_ButtonGroup);

	var _ButtonInput = __webpack_require__(57);

	var _ButtonInput2 = _interopRequireDefault(_ButtonInput);

	var _ButtonToolbar = __webpack_require__(58);

	var _ButtonToolbar2 = _interopRequireDefault(_ButtonToolbar);

	var _CollapsableNav = __webpack_require__(59);

	var _CollapsableNav2 = _interopRequireDefault(_CollapsableNav);

	var _CollapsibleNav = __webpack_require__(60);

	var _CollapsibleNav2 = _interopRequireDefault(_CollapsibleNav);

	var _Carousel = __webpack_require__(61);

	var _Carousel2 = _interopRequireDefault(_Carousel);

	var _CarouselItem = __webpack_require__(62);

	var _CarouselItem2 = _interopRequireDefault(_CarouselItem);

	var _Col = __webpack_require__(63);

	var _Col2 = _interopRequireDefault(_Col);

	var _CollapsableMixin = __webpack_require__(64);

	var _CollapsableMixin2 = _interopRequireDefault(_CollapsableMixin);

	var _CollapsibleMixin = __webpack_require__(65);

	var _CollapsibleMixin2 = _interopRequireDefault(_CollapsibleMixin);

	var _DropdownButton = __webpack_require__(66);

	var _DropdownButton2 = _interopRequireDefault(_DropdownButton);

	var _DropdownMenu = __webpack_require__(67);

	var _DropdownMenu2 = _interopRequireDefault(_DropdownMenu);

	var _DropdownStateMixin = __webpack_require__(68);

	var _DropdownStateMixin2 = _interopRequireDefault(_DropdownStateMixin);

	var _FadeMixin = __webpack_require__(69);

	var _FadeMixin2 = _interopRequireDefault(_FadeMixin);

	var _Glyphicon = __webpack_require__(70);

	var _Glyphicon2 = _interopRequireDefault(_Glyphicon);

	var _Grid = __webpack_require__(71);

	var _Grid2 = _interopRequireDefault(_Grid);

	var _Input = __webpack_require__(72);

	var _Input2 = _interopRequireDefault(_Input);

	var _Interpolate = __webpack_require__(73);

	var _Interpolate2 = _interopRequireDefault(_Interpolate);

	var _Jumbotron = __webpack_require__(74);

	var _Jumbotron2 = _interopRequireDefault(_Jumbotron);

	var _Label = __webpack_require__(75);

	var _Label2 = _interopRequireDefault(_Label);

	var _ListGroup = __webpack_require__(76);

	var _ListGroup2 = _interopRequireDefault(_ListGroup);

	var _ListGroupItem = __webpack_require__(77);

	var _ListGroupItem2 = _interopRequireDefault(_ListGroupItem);

	var _MenuItem = __webpack_require__(78);

	var _MenuItem2 = _interopRequireDefault(_MenuItem);

	var _Modal = __webpack_require__(79);

	var _Modal2 = _interopRequireDefault(_Modal);

	var _Nav = __webpack_require__(80);

	var _Nav2 = _interopRequireDefault(_Nav);

	var _Navbar = __webpack_require__(81);

	var _Navbar2 = _interopRequireDefault(_Navbar);

	var _NavItem = __webpack_require__(82);

	var _NavItem2 = _interopRequireDefault(_NavItem);

	var _ModalTrigger = __webpack_require__(83);

	var _ModalTrigger2 = _interopRequireDefault(_ModalTrigger);

	var _OverlayTrigger = __webpack_require__(84);

	var _OverlayTrigger2 = _interopRequireDefault(_OverlayTrigger);

	var _OverlayMixin = __webpack_require__(85);

	var _OverlayMixin2 = _interopRequireDefault(_OverlayMixin);

	var _PageHeader = __webpack_require__(86);

	var _PageHeader2 = _interopRequireDefault(_PageHeader);

	var _Panel = __webpack_require__(87);

	var _Panel2 = _interopRequireDefault(_Panel);

	var _PanelGroup = __webpack_require__(88);

	var _PanelGroup2 = _interopRequireDefault(_PanelGroup);

	var _PageItem = __webpack_require__(89);

	var _PageItem2 = _interopRequireDefault(_PageItem);

	var _Pager = __webpack_require__(90);

	var _Pager2 = _interopRequireDefault(_Pager);

	var _Popover = __webpack_require__(91);

	var _Popover2 = _interopRequireDefault(_Popover);

	var _ProgressBar = __webpack_require__(92);

	var _ProgressBar2 = _interopRequireDefault(_ProgressBar);

	var _Row = __webpack_require__(93);

	var _Row2 = _interopRequireDefault(_Row);

	var _SplitButton = __webpack_require__(94);

	var _SplitButton2 = _interopRequireDefault(_SplitButton);

	var _SubNav = __webpack_require__(95);

	var _SubNav2 = _interopRequireDefault(_SubNav);

	var _TabbedArea = __webpack_require__(96);

	var _TabbedArea2 = _interopRequireDefault(_TabbedArea);

	var _Table = __webpack_require__(97);

	var _Table2 = _interopRequireDefault(_Table);

	var _TabPane = __webpack_require__(98);

	var _TabPane2 = _interopRequireDefault(_TabPane);

	var _Thumbnail = __webpack_require__(99);

	var _Thumbnail2 = _interopRequireDefault(_Thumbnail);

	var _Tooltip = __webpack_require__(100);

	var _Tooltip2 = _interopRequireDefault(_Tooltip);

	var _Well = __webpack_require__(101);

	var _Well2 = _interopRequireDefault(_Well);

	var _styleMaps = __webpack_require__(102);

	var _styleMaps2 = _interopRequireDefault(_styleMaps);

	exports['default'] = {
	  Accordion: _Accordion2['default'],
	  Affix: _Affix2['default'],
	  AffixMixin: _AffixMixin2['default'],
	  Alert: _Alert2['default'],
	  BootstrapMixin: _BootstrapMixin2['default'],
	  Badge: _Badge2['default'],
	  Button: _Button2['default'],
	  ButtonGroup: _ButtonGroup2['default'],
	  ButtonInput: _ButtonInput2['default'],
	  ButtonToolbar: _ButtonToolbar2['default'],
	  CollapsableNav: _CollapsableNav2['default'],
	  CollapsibleNav: _CollapsibleNav2['default'],
	  Carousel: _Carousel2['default'],
	  CarouselItem: _CarouselItem2['default'],
	  Col: _Col2['default'],
	  CollapsableMixin: _CollapsableMixin2['default'],
	  CollapsibleMixin: _CollapsibleMixin2['default'],
	  DropdownButton: _DropdownButton2['default'],
	  DropdownMenu: _DropdownMenu2['default'],
	  DropdownStateMixin: _DropdownStateMixin2['default'],
	  FadeMixin: _FadeMixin2['default'],
	  Glyphicon: _Glyphicon2['default'],
	  Grid: _Grid2['default'],
	  Input: _Input2['default'],
	  Interpolate: _Interpolate2['default'],
	  Jumbotron: _Jumbotron2['default'],
	  Label: _Label2['default'],
	  ListGroup: _ListGroup2['default'],
	  ListGroupItem: _ListGroupItem2['default'],
	  MenuItem: _MenuItem2['default'],
	  Modal: _Modal2['default'],
	  Nav: _Nav2['default'],
	  Navbar: _Navbar2['default'],
	  NavItem: _NavItem2['default'],
	  ModalTrigger: _ModalTrigger2['default'],
	  OverlayTrigger: _OverlayTrigger2['default'],
	  OverlayMixin: _OverlayMixin2['default'],
	  PageHeader: _PageHeader2['default'],
	  Panel: _Panel2['default'],
	  PanelGroup: _PanelGroup2['default'],
	  PageItem: _PageItem2['default'],
	  Pager: _Pager2['default'],
	  Popover: _Popover2['default'],
	  ProgressBar: _ProgressBar2['default'],
	  Row: _Row2['default'],
	  SplitButton: _SplitButton2['default'],
	  SubNav: _SubNav2['default'],
	  TabbedArea: _TabbedArea2['default'],
	  Table: _Table2['default'],
	  TabPane: _TabPane2['default'],
	  Thumbnail: _Thumbnail2['default'],
	  Tooltip: _Tooltip2['default'],
	  Well: _Well2['default'],
	  styleMaps: _styleMaps2['default']
	};
	module.exports = exports['default'];

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);

	module.exports = {
	    getDefaultProps: function() {
		var margin = {top: 20, right: 10, bottom: 20, left: 10};
		return {
		    margin: margin
		};
	    },

	    componentDidMount: function() {
		var container = this.refs.container.getDOMNode();
		this.createChart(container, this.props, this.state);
		this.update(container, this.props, this.state);
	    },

	    componentWillUnmount: function() {
		var container = this.refs.container.getDOMNode();
		this.cleanChart(container, this.props, this.state);
	    },

	    shouldComponentUpdate: function(nextProps, nextState) {
		var container = this.refs.container.getDOMNode();
		this.update(container, nextProps, nextState);
		// render is not called again so the container is there until
		// the end.
		return false;
	    },

	    render: function(){
		return (
	            React.createElement("div", {ref: "container"})
		);
	    }
	};


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);

	module.exports = {

	    componentDidMount: function() {
		this.props.onMount && this.props.onMount();
	    },

	    componentWillUnmount: function() {
		this.props.onUnmount && this.props.onUnmount();
	    },

	};


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var d3 = __webpack_require__(21);

	var rangeSlider = {
	    createChart: function(container, props, state){
		var svg = d3.select(container).append("svg").attr("class", "slider rangeSlider");
		var gAxis = svg.append("g").attr("class", "x axis");
		var slider = svg.append('g').attr("class", "brush");
	    },

	    cleanChart: function(container, props, state) {},

	    update: function(container, nextProps, nextState) {

		var domain = nextProps.domain || {min:0, max:1};
		var extent = nextProps.extent || [domain.min, domain.max];

		var onStart = nextProps.onStart || null;
		var onMove = nextProps.onMove || null;
		var onEnd = nextProps.onEnd || null;

		var margin = {top: 5, left: 10, bottom: 20, right: 20};
		var width = nextProps.width;
		var height = nextProps.height;

		var slider_width = width - margin.left - margin.right;
		var slider_height = height - margin.top - margin.bottom;

		var x = d3.scale.linear()
		    .domain([domain.min, domain.max])
		    .range([0, slider_width])
		    .nice();

		var brush = d3.svg.brush()
		    .x(x)
		    .extent(extent)
		    .on("brushstart", brushstart)
		    .on("brush", brushmove)
		    .on("brushend", brushend);

		var axis =  d3.svg.axis()
		    .scale(x)
		    .ticks(5)
		    .orient("bottom");

		var svg = d3.select(container).select("svg.slider")
		    .style("width", width + "px")
		    .style("height", height + "px");

		var gAxis = svg.select("g.axis")
		    .attr("transform", "translate(" + margin.left + "," + (slider_height + margin.top)  + ")")
		    .call(axis);

		var slider = svg.select('g.brush')
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		    .call(brush);

		slider.selectAll("rect")
		    .attr("height", slider_height);
		slider.selectAll(".resize rect")
		    .style("visibility", "visible");
		slider.selectAll(".background")
		    .style("visibility", "visible");

		function brushstart() {
		    //svg.classed("selecting", true);
		    if (onStart) onStart(brush.extent());
		}

		function brushmove() {
		    // ############# CONTINUE HERE 
		    if (onMove) onMove(brush.extent());
		}

		function brushend() {
		    if (onEnd) onEnd(brush.extent());
		    //svg.classed("selecting", !d3.event.target.empty());
		}
	    }
	};

	module.exports = rangeSlider;


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var d3 = __webpack_require__(21);

	// Source: http://bl.ocks.org/mbostock/4061502
	// Inspired by http://informationandvisualization.de/blog/box-plot
	d3.box = function() {
	  var width = 1,
	      height = 1,
	      duration = 0,
	      domain = null,
	      value = Number,
	      whiskers = boxWhiskers,
	      quartiles = boxQuartiles,
	      tickFormat = null;

	  // For each small multiple…
	  function box(g) {
	    g.each(function(d, i) {
	      d = d.map(value).sort(d3.ascending);
	      var g = d3.select(this),
	          n = d.length,
	          min = d[0],
	          max = d[n - 1];

	      // Compute quartiles. Must return exactly 3 elements.
	      var quartileData = d.quartiles = quartiles(d);

	      // Compute whiskers. Must return exactly 2 elements, or null.
	      var whiskerIndices = whiskers && whiskers.call(this, d, i),
	          whiskerData = whiskerIndices && whiskerIndices.map(function(i) { return d[i]; });

	      // Compute outliers. If no whiskers are specified, all data are "outliers".
	      // We compute the outliers as indices, so that we can join across transitions!
	      var outlierIndices = whiskerIndices
	          ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
	          : d3.range(n);

	      // Compute the new x-scale.
	      var x1 = d3.scale.linear()
	          .domain(domain && domain.call(this, d, i) || [min, max])
	          .range([height, 0]);

	      // Retrieve the old x-scale, if this is an update.
	      var x0 = this.__chart__ || d3.scale.linear()
	          .domain([0, Infinity])
	          .range(x1.range());

	      // Stash the new scale.
	      this.__chart__ = x1;

	      // Note: the box, median, and box tick elements are fixed in number,
	      // so we only have to handle enter and update. In contrast, the outliers
	      // and other elements are variable, so we need to exit them! Variable
	      // elements also fade in and out.

	      // Update center line: the vertical line spanning the whiskers.
	      var center = g.selectAll("line.center")
	          .data(whiskerData ? [whiskerData] : []);

	      center.enter().insert("line", "rect")
	          .attr("class", "center")
	          .attr("x1", width / 2)
	          .attr("y1", function(d) { return x0(d[0]); })
	          .attr("x2", width / 2)
	          .attr("y2", function(d) { return x0(d[1]); })
	          .style("opacity", 1e-6)
	        .transition()
	          .duration(duration)
	          .style("opacity", 1)
	          .attr("y1", function(d) { return x1(d[0]); })
	          .attr("y2", function(d) { return x1(d[1]); });

	      center.transition()
	          .duration(duration)
	          .style("opacity", 1)
	          .attr("y1", function(d) { return x1(d[0]); })
	          .attr("y2", function(d) { return x1(d[1]); });

	      center.exit().transition()
	          .duration(duration)
	          .style("opacity", 1e-6)
	          .attr("y1", function(d) { return x1(d[0]); })
	          .attr("y2", function(d) { return x1(d[1]); })
	          .remove();

	      // Update innerquartile box.
	      var box = g.selectAll("rect.box")
	          .data([quartileData]);

	      box.enter().append("rect")
	          .attr("class", "box")
	          .attr("x", 0)
	          .attr("y", function(d) { return x0(d[2]); })
	          .attr("width", width)
	          .attr("height", function(d) { return x0(d[0]) - x0(d[2]); })
	        .transition()
	          .duration(duration)
	          .attr("y", function(d) { return x1(d[2]); })
	          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

	      box.transition()
	          .duration(duration)
	          .attr("y", function(d) { return x1(d[2]); })
	          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

	      // Update median line.
	      var medianLine = g.selectAll("line.median")
	          .data([quartileData[1]]);

	      medianLine.enter().append("line")
	          .attr("class", "median")
	          .attr("x1", 0)
	          .attr("y1", x0)
	          .attr("x2", width)
	          .attr("y2", x0)
	        .transition()
	          .duration(duration)
	          .attr("y1", x1)
	          .attr("y2", x1);

	      medianLine.transition()
	          .duration(duration)
	          .attr("y1", x1)
	          .attr("y2", x1);

	      // Update whiskers.
	      var whisker = g.selectAll("line.whisker")
	          .data(whiskerData || []);

	      whisker.enter().insert("line", "circle, text")
	          .attr("class", "whisker")
	          .attr("x1", 0)
	          .attr("y1", x0)
	          .attr("x2", width)
	          .attr("y2", x0)
	          .style("opacity", 1e-6)
	        .transition()
	          .duration(duration)
	          .attr("y1", x1)
	          .attr("y2", x1)
	          .style("opacity", 1);

	      whisker.transition()
	          .duration(duration)
	          .attr("y1", x1)
	          .attr("y2", x1)
	          .style("opacity", 1);

	      whisker.exit().transition()
	          .duration(duration)
	          .attr("y1", x1)
	          .attr("y2", x1)
	          .style("opacity", 1e-6)
	          .remove();

	      // Update outliers.
	      var outlier = g.selectAll("circle.outlier")
	          .data(outlierIndices, Number);

	      outlier.enter().insert("circle", "text")
	          .attr("class", "outlier")
	          .attr("r", 5)
	          .attr("cx", width / 2)
	          .attr("cy", function(i) { return x0(d[i]); })
	          .style("opacity", 1e-6)
	        .transition()
	          .duration(duration)
	          .attr("cy", function(i) { return x1(d[i]); })
	          .style("opacity", 1);

	      outlier.transition()
	          .duration(duration)
	          .attr("cy", function(i) { return x1(d[i]); })
	          .style("opacity", 1);

	      outlier.exit().transition()
	          .duration(duration)
	          .attr("cy", function(i) { return x1(d[i]); })
	          .style("opacity", 1e-6)
	          .remove();

	      // Compute the tick format.
	      var format = tickFormat || x1.tickFormat(8);

	      // Update box ticks.
	      var boxTick = g.selectAll("text.box")
	          .data(quartileData);

	      boxTick.enter().append("text")
	          .attr("class", "box")
	          .attr("dy", ".3em")
	          .attr("dx", function(d, i) { return i & 1 ? 6 : -6 })
	          .attr("x", function(d, i) { return i & 1 ? width : 0 })
	          .attr("y", x0)
	          .attr("text-anchor", function(d, i) { return i & 1 ? "start" : "end"; })
	          .text(format)
	        .transition()
	          .duration(duration)
	          .attr("y", x1);

	      boxTick.transition()
	          .duration(duration)
	          .text(format)
	          .attr("y", x1);

	      // Update whisker ticks. These are handled separately from the box
	      // ticks because they may or may not exist, and we want don't want
	      // to join box ticks pre-transition with whisker ticks post-.
	      var whiskerTick = g.selectAll("text.whisker")
	          .data(whiskerData || []);

	      whiskerTick.enter().append("text")
	          .attr("class", "whisker")
	          .attr("dy", ".3em")
	          .attr("dx", 6)
	          .attr("x", width)
	          .attr("y", x0)
	          .text(format)
	          .style("opacity", 1e-6)
	        .transition()
	          .duration(duration)
	          .attr("y", x1)
	          .style("opacity", 1);

	      whiskerTick.transition()
	          .duration(duration)
	          .text(format)
	          .attr("y", x1)
	          .style("opacity", 1);

	      whiskerTick.exit().transition()
	          .duration(duration)
	          .attr("y", x1)
	          .style("opacity", 1e-6)
	          .remove();
	    });
	    d3.timer.flush();
	  }

	  box.width = function(x) {
	    if (!arguments.length) return width;
	    width = x;
	    return box;
	  };

	  box.height = function(x) {
	    if (!arguments.length) return height;
	    height = x;
	    return box;
	  };

	  box.tickFormat = function(x) {
	    if (!arguments.length) return tickFormat;
	    tickFormat = x;
	    return box;
	  };

	  box.duration = function(x) {
	    if (!arguments.length) return duration;
	    duration = x;
	    return box;
	  };

	  box.domain = function(x) {
	    if (!arguments.length) return domain;
	    domain = x == null ? x : d3.functor(x);
	    return box;
	  };

	  box.value = function(x) {
	    if (!arguments.length) return value;
	    value = x;
	    return box;
	  };

	  box.whiskers = function(x) {
	    if (!arguments.length) return whiskers;
	    whiskers = x;
	    return box;
	  };

	  box.quartiles = function(x) {
	    if (!arguments.length) return quartiles;
	    quartiles = x;
	    return box;
	  };

	  return box;
	};

	function boxWhiskers(d) {
	  return [0, d.length - 1];
	}

	function boxQuartiles(d) {
	  return [
	    d3.quantile(d, .25),
	    d3.quantile(d, .5),
	    d3.quantile(d, .75)
	  ];
	}




/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function ToObject(val) {
		if (val == null) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	module.exports = Object.assign || function (target, source) {
		var from;
		var keys;
		var to = ToObject(target);

		for (var s = 1; s < arguments.length; s++) {
			from = arguments[s];
			keys = Object.keys(Object(from));

			for (var i = 0; i < keys.length; i++) {
				to[keys[i]] = from[keys[i]];
			}
		}

		return to;
	};


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _objectWithoutProperties = function (obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(1);
	var GridItem = __webpack_require__(105);
	var utils = __webpack_require__(106);
	var PureDeepRenderMixin = __webpack_require__(107);
	var WidthListeningMixin = __webpack_require__(108);

	/**
	 * A reactive, fluid grid layout with draggable, resizable components.
	 */
	var ReactGridLayout = React.createClass({
	  displayName: 'ReactGridLayout',

	  mixins: [PureDeepRenderMixin, WidthListeningMixin],

	  propTypes: {
	    //
	    // Basic props
	    //

	    // If true, the container height swells and contracts to fit contents
	    autoSize: React.PropTypes.bool,
	    // # of cols.
	    cols: React.PropTypes.number,

	    // A selector that will not be draggable.
	    draggableCancel: React.PropTypes.string,
	    // A selector for the draggable handler
	    draggableHandle: React.PropTypes.string,

	    // layout is an array of object with the format:
	    // {x: Number, y: Number, w: Number, h: Number}
	    layout: function layout(props, propName, componentName) {
	      var layout = props.layout;
	      // I hope you're setting the _grid property on the grid items
	      if (layout === undefined) {
	        return;
	      }utils.validateLayout(layout, 'layout');
	    },

	    layouts: function layouts(props, propName, componentName) {
	      if (props.layouts) {
	        throw new Error('ReactGridLayout does not use `layouts`: Use ReactGridLayout.Responsive.');
	      }
	    },

	    // margin between items [x, y] in px
	    margin: React.PropTypes.array,
	    // Rows have a static height, but you can change this based on breakpoints if you like
	    rowHeight: React.PropTypes.number,

	    //
	    // Flags
	    //
	    isDraggable: React.PropTypes.bool,
	    isResizable: React.PropTypes.bool,
	    // Use CSS transforms instead of top/left
	    useCSSTransforms: React.PropTypes.bool,

	    //
	    // Callbacks
	    //

	    // Callback so you can save the layout.
	    // Calls back with (currentLayout, allLayouts). allLayouts are keyed by breakpoint.
	    onLayoutChange: React.PropTypes.func,

	    // Calls when drag starts. Callback is of the signature (layout, oldItem, newItem, placeholder, e).
	    // All callbacks below have the same signature. 'start' and 'stop' callbacks omit the 'placeholder'.
	    onDragStart: React.PropTypes.func,
	    // Calls on each drag movement.
	    onDrag: React.PropTypes.func,
	    // Calls when drag is complete.
	    onDragStop: React.PropTypes.func,
	    //Calls when resize starts.
	    onResizeStart: React.PropTypes.func,
	    // Calls when resize movement happens.
	    onResize: React.PropTypes.func,
	    // Calls when resize is complete.
	    onResizeStop: React.PropTypes.func,

	    //
	    // Other validations
	    //

	    // Children must not have duplicate keys.
	    children: function children(props, propName, componentName) {
	      React.PropTypes.node.apply(this, arguments);
	      var children = props[propName];

	      // Check children keys for duplicates. Throw if found.
	      var keys = {};
	      React.Children.forEach(children, function (child, i, list) {
	        if (keys[child.key]) {
	          throw new Error('Duplicate child key found! This will cause problems in ReactGridLayout.');
	        }
	        keys[child.key] = true;
	      });
	    }
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      autoSize: true,
	      cols: 12,
	      rowHeight: 150,
	      layout: [],
	      margin: [10, 10],
	      isDraggable: true,
	      isResizable: true,
	      useCSSTransforms: true,
	      onLayoutChange: function onLayoutChange() {},
	      onDragStart: function onDragStart() {},
	      onDrag: function onDrag() {},
	      onDragStop: function onDragStop() {},
	      onResizeStart: function onResizeStart() {},
	      onResize: function onResize() {},
	      onResizeStop: function onResizeStop() {}
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      activeDrag: null,
	      isMounted: false,
	      layout: utils.synchronizeLayoutWithChildren(this.props.layout, this.props.children, this.props.cols),
	      width: this.props.initialWidth
	    };
	  },

	  componentDidMount: function componentDidMount() {
	    // Call back with layout on mount. This should be done after correcting the layout width
	    // to ensure we don't rerender with the wrong width.
	    this.props.onLayoutChange(this.state.layout);
	    this.setState({ isMounted: true });
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    // This allows you to set the width manually if you like.
	    // Use manual width changes in combination with `listenToWindowResize: false`
	    if (nextProps.width !== this.props.width) this.onWidthChange(nextProps.width);

	    // If children change, regenerate the layout.
	    if (nextProps.children.length !== this.props.children.length) {
	      this.setState({
	        layout: utils.synchronizeLayoutWithChildren(this.state.layout, nextProps.children, nextProps.cols)
	      });
	    }

	    // Allow parent to set layout directly.
	    if (nextProps.layout && JSON.stringify(nextProps.layout) !== JSON.stringify(this.state.layout)) {
	      this.setState({
	        layout: utils.synchronizeLayoutWithChildren(nextProps.layout, nextProps.children, nextProps.cols)
	      });
	    }
	  },

	  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
	    // Call back so we can store the layout
	    // Do it only when a resize/drag is not active, otherwise there are way too many callbacks
	    if (this.state.layout !== prevState.layout && !this.state.activeDrag) {
	      this.props.onLayoutChange(this.state.layout, this.state.layouts);
	    }
	  },

	  /**
	   * Calculates a pixel value for the container.
	   * @return {String} Container height in pixels.
	   */
	  containerHeight: function containerHeight() {
	    if (!this.props.autoSize) {
	      return;
	    }return utils.bottom(this.state.layout) * this.props.rowHeight + this.props.margin[1] + 'px';
	  },

	  /**
	   * When the width changes, save it to state. This helps with left/width calculations.
	   */
	  onWidthChange: function onWidthChange(width) {
	    this.setState({ width: width });
	  },

	  /**
	   * When dragging starts
	   * @param {Number} i Index of the child
	   * @param {Number} x X position of the move
	   * @param {Number} y Y position of the move
	   * @param {Event} e The mousedown event
	   * @param {Element} element The current dragging DOM element
	   * @param {Object} position Drag information
	   */
	  onDragStart: function onDragStart(i, x, y, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var position = _ref.position;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);

	    // No need to clone, `l` hasn't changed.
	    this.props.onDragStart(layout, l, l, null, e);
	  },
	  /**
	   * Each drag movement create a new dragelement and move the element to the dragged location
	   * @param {Number} i Index of the child
	   * @param {Number} x X position of the move
	   * @param {Number} y Y position of the move
	   * @param {Event} e The mousedown event
	   * @param {Element} element The current dragging DOM element
	   * @param {Object} position Drag information
	   */
	  onDrag: function onDrag(i, x, y, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var position = _ref.position;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);
	    // Clone layout item so we can pass it to the callback.
	    var oldL = utils.clone(l);

	    // Create placeholder (display only)
	    var placeholder = {
	      w: l.w, h: l.h, x: l.x, y: l.y, placeholder: true, i: i
	    };

	    // Move the element to the dragged location.
	    layout = utils.moveElement(layout, l, x, y, true /* isUserAction */);

	    this.props.onDrag(layout, oldL, l, placeholder, e);

	    this.setState({
	      layout: utils.compact(layout),
	      activeDrag: placeholder
	    });
	  },

	  /**
	   * When dragging stops, figure out which position the element is closest to and update its x and y.
	   * @param  {Number} i Index of the child.
	   * @param {Number} i Index of the child
	   * @param {Number} x X position of the move
	   * @param {Number} y Y position of the move
	   * @param {Event} e The mousedown event
	   * @param {Element} element The current dragging DOM element
	   * @param {Object} position Drag information
	   */
	  onDragStop: function onDragStop(i, x, y, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var position = _ref.position;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);
	    var oldL = utils.clone(l);

	    // Move the element here
	    layout = utils.moveElement(layout, l, x, y, true /* isUserAction */);

	    this.props.onDragStop(layout, oldL, l, null, e);

	    // Set state
	    this.setState({ layout: utils.compact(layout), activeDrag: null });
	  },

	  onResizeStart: function onResizeStart(i, w, h, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var size = _ref.size;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);

	    // No need to clone, item hasn't changed
	    this.props.onResizeStart(layout, l, l, null, e);
	  },

	  onResize: function onResize(i, w, h, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var size = _ref.size;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);
	    var oldL = utils.clone(l);

	    // Set new width and height.
	    l.w = w;
	    l.h = h;

	    // Create placeholder element (display only)
	    var placeholder = {
	      w: w, h: h, x: l.x, y: l.y, placeholder: true, i: i
	    };

	    this.props.onResize(layout, oldL, l, placeholder, e);

	    // Re-compact the layout and set the drag placeholder.
	    this.setState({ layout: utils.compact(layout), activeDrag: placeholder });
	  },

	  onResizeStop: function onResizeStop(i, x, y, _ref) {
	    var e = _ref.e;
	    var element = _ref.element;
	    var size = _ref.size;

	    var layout = this.state.layout;
	    var l = utils.getLayoutItem(layout, i);
	    var oldL = utils.clone(l);

	    this.props.onResizeStop(layout, oldL, l, null, e);

	    this.setState({ activeDrag: null, layout: utils.compact(layout) });
	  },

	  /**
	   * Create a placeholder object.
	   * @return {Element} Placeholder div.
	   */
	  placeholder: function placeholder() {
	    if (!this.state.activeDrag) {
	      return '';
	    } // {...this.state.activeDrag} is pretty slow, actually
	    return React.createElement(
	      GridItem,
	      {
	        w: this.state.activeDrag.w,
	        h: this.state.activeDrag.h,
	        x: this.state.activeDrag.x,
	        y: this.state.activeDrag.y,
	        i: this.state.activeDrag.i,
	        isPlaceholder: true,
	        className: 'react-grid-placeholder',
	        containerWidth: this.state.width,
	        cols: this.props.cols,
	        margin: this.props.margin,
	        rowHeight: this.props.rowHeight,
	        isDraggable: false,
	        isResizable: false,
	        useCSSTransforms: this.props.useCSSTransforms
	      },
	      React.createElement('div', null)
	    );
	  },

	  /**
	   * Given a grid item, set its style attributes & surround in a <Draggable>.
	   * @param  {Element} child React element.
	   * @param  {Number}  i     Index of element.
	   * @return {Element}       Element wrapped in draggable and properly placed.
	   */
	  processGridItem: function processGridItem(child) {
	    var i = child.key;
	    var l = utils.getLayoutItem(this.state.layout, i);

	    // watchStart property tells Draggable to react to changes in the start param
	    // Must be turned off on the item we're dragging as the changes in `activeDrag` cause rerenders
	    var drag = this.state.activeDrag;
	    var moveOnStartChange = drag && drag.i === i ? false : true;

	    // Parse 'static'. Any properties defined directly on the grid item will take precedence.
	    var draggable, resizable;
	    if (l['static'] || this.props.isDraggable === false) draggable = false;
	    if (l['static'] || this.props.isResizable === false) resizable = false;

	    return React.createElement(
	      GridItem,
	      _extends({
	        containerWidth: this.state.width,
	        cols: this.props.cols,
	        margin: this.props.margin,
	        rowHeight: this.props.rowHeight,
	        moveOnStartChange: moveOnStartChange,
	        cancel: this.props.draggableCancel,
	        handle: this.props.draggableHandle,
	        onDragStop: this.onDragStop,
	        onDragStart: this.onDragStart,
	        onDrag: this.onDrag,
	        onResizeStart: this.onResizeStart,
	        onResize: this.onResize,
	        onResizeStop: this.onResizeStop,
	        isDraggable: draggable,
	        isResizable: resizable,
	        useCSSTransforms: this.props.useCSSTransforms && this.state.isMounted,
	        usePercentages: !this.state.isMounted
	      }, l),
	      child
	    );
	  },

	  render: function render() {
	    // Calculate classname
	    var _props = this.props;
	    var className = _props.className;

	    var props = _objectWithoutProperties(_props, ['className']);

	    className = 'react-grid-layout ' + (className || '');

	    return React.createElement(
	      'div',
	      _extends({}, props, { className: className, style: { height: this.containerHeight() } }),
	      React.Children.map(this.props.children, this.processGridItem),
	      this.placeholder()
	    );
	  }
	});

	module.exports = ReactGridLayout;

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _objectWithoutProperties = function (obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(1);
	var utils = __webpack_require__(106);
	var responsiveUtils = __webpack_require__(109);
	var PureDeepRenderMixin = __webpack_require__(107);
	var WidthListeningMixin = __webpack_require__(108);
	var ReactGridLayout = __webpack_require__(41);

	/**
	 * A wrapper around ReactGridLayout to support responsive breakpoints.
	 */
	var ResponsiveReactGridLayout = React.createClass({
	  displayName: 'ResponsiveReactGridLayout',

	  mixins: [PureDeepRenderMixin, WidthListeningMixin],

	  propTypes: {
	    //
	    // Basic props
	    //

	    // Optional, but if you are managing width yourself you may want to set the breakpoint
	    // yourself as well.
	    breakpoint: React.PropTypes.string,

	    // {name: pxVal}, e.g. {lg: 1200, md: 996, sm: 768, xs: 480}
	    breakpoints: React.PropTypes.object,

	    // # of cols. This is a breakpoint -> cols map
	    cols: React.PropTypes.object,

	    // layouts is an object mapping breakpoints to layouts.
	    // e.g. {lg: Layout, md: Layout, ...}
	    layouts: function layouts(props, propName, componentName) {
	      React.PropTypes.object.isRequired.apply(this, arguments);

	      var layouts = props.layouts;
	      Object.keys(layouts).map(function (k) {
	        utils.validateLayout(layouts[k], 'layouts.' + k);
	      });
	    },

	    //
	    // Callbacks
	    //

	    // Calls back with breakpoint and new # cols
	    onBreakpointChange: React.PropTypes.func,

	    // Callback so you can save the layout.
	    // Calls back with (currentLayout, allLayouts). allLayouts are keyed by breakpoint.
	    onLayoutChange: React.PropTypes.func
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
	      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
	      layouts: {},
	      onBreakpointChange: function onBreakpointChange() {},
	      onLayoutChange: function onLayoutChange() {}
	    };
	  },

	  getInitialState: function getInitialState() {
	    var breakpoint = this.props.breakpoint || responsiveUtils.getBreakpointFromWidth(this.props.breakpoints, this.props.initialWidth);
	    var cols = responsiveUtils.getColsFromBreakpoint(breakpoint, this.props.cols);

	    // Get the initial layout. This can tricky; we try to generate one however possible if one doesn't exist
	    // for this layout.
	    var initialLayout = responsiveUtils.findOrGenerateResponsiveLayout(this.props.layouts, this.props.breakpoints, breakpoint, breakpoint, cols);

	    return {
	      layout: initialLayout,
	      // storage for layouts obsoleted by breakpoints
	      layouts: this.props.layouts || {},
	      breakpoint: breakpoint,
	      cols: cols,
	      width: this.props.initialWidth
	    };
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    // This allows you to set the width manually if you like.
	    // Use manual width changes in combination with `listenToWindowResize: false`
	    if (nextProps.width) this.onWidthChange(nextProps.width);

	    // Allow parent to set breakpoint directly.
	    if (nextProps.breakpoint !== this.props.breakpoint) {
	      this.onWidthChange(this.state.width);
	    }

	    // Allow parent to set layouts directly.
	    if (nextProps.layouts && nextProps.layouts !== this.state.layouts) {
	      // Since we're setting an entirely new layout object, we must generate a new responsive layout
	      // if one does not exist.
	      var newLayout = responsiveUtils.findOrGenerateResponsiveLayout(nextProps.layouts, nextProps.breakpoints, this.state.breakpoint, this.state.breakpoint, this.state.cols);

	      this.setState({
	        layouts: nextProps.layouts,
	        layout: newLayout
	      });
	    }
	  },

	  /**
	   * Bubble this up, add `layouts` object.
	   * @param  {Array} layout Layout from inner Grid.
	   */
	  onLayoutChange: function onLayoutChange(layout) {
	    this.state.layouts[this.state.breakpoint] = layout;
	    this.setState({ layout: layout, layouts: this.state.layouts });
	    this.props.onLayoutChange(layout, this.state.layouts);
	  },

	  /**
	   * When the width changes work through breakpoints and reset state with the new width & breakpoint.
	   * Width changes are necessary to figure out the widget widths.
	   */
	  onWidthChange: function onWidthChange(width) {
	    // Set new breakpoint
	    var newState = { width: width };
	    newState.breakpoint = this.props.breakpoint || responsiveUtils.getBreakpointFromWidth(this.props.breakpoints, newState.width);
	    newState.cols = responsiveUtils.getColsFromBreakpoint(newState.breakpoint, this.props.cols);

	    // Breakpoint change
	    if (newState.cols !== this.state.cols) {

	      // Store the current layout
	      newState.layouts = this.state.layouts;
	      newState.layouts[this.state.breakpoint] = JSON.parse(JSON.stringify(this.state.layout));

	      // Find or generate a new one.
	      newState.layout = responsiveUtils.findOrGenerateResponsiveLayout(newState.layouts, this.props.breakpoints, newState.breakpoint, this.state.breakpoint, newState.cols);

	      // This adds missing items.
	      newState.layout = utils.synchronizeLayoutWithChildren(newState.layout, this.props.children, newState.cols);

	      // Store this new layout as well.
	      newState.layouts[newState.breakpoint] = newState.layout;

	      this.props.onBreakpointChange(newState.breakpoint, newState.cols);
	    }

	    this.setState(newState);
	  },

	  render: function render() {
	    // Don't pass responsive props to RGL.
	    /*jshint unused:false*/
	    var _props = this.props;
	    var layouts = _props.layouts;
	    var onBreakpointChange = _props.onBreakpointChange;
	    var breakpoints = _props.breakpoints;

	    var props = _objectWithoutProperties(_props, ['layouts', 'onBreakpointChange', 'breakpoints']);

	    return React.createElement(
	      ReactGridLayout,
	      _extends({}, props, {
	        layout: this.state.layout,
	        cols: this.state.cols,
	        listenToWindowResize: false,
	        onLayoutChange: this.onLayoutChange,
	        width: this.state.width }),
	      this.props.children
	    );
	  }
	});

	module.exports = ResponsiveReactGridLayout;

/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(110);


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;var require;/* WEBPACK VAR INJECTION */(function(process) {/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {
		/*jshint maxcomplexity:6*/

		// Sniff "best" async scheduling option
		// Prefer process.nextTick or MutationObserver, then check for
		// setTimeout, and finally vertx, since its the only env that doesn't
		// have setTimeout

		var MutationObs;
		var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

		// Default env
		var setTimer = function(f, ms) { return setTimeout(f, ms); };
		var clearTimer = function(t) { return clearTimeout(t); };
		var asap = function (f) { return capturedSetTimeout(f, 0); };

		// Detect specific env
		if (isNode()) { // Node
			asap = function (f) { return process.nextTick(f); };

		} else if (MutationObs = hasMutationObserver()) { // Modern browser
			asap = initMutationObserver(MutationObs);

		} else if (!capturedSetTimeout) { // vert.x
			var vertxRequire = require;
			var vertx = __webpack_require__(104);
			setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
			clearTimer = vertx.cancelTimer;
			asap = vertx.runOnLoop || vertx.runOnContext;
		}

		return {
			setTimer: setTimer,
			clearTimer: clearTimer,
			asap: asap
		};

		function isNode () {
			return typeof process !== 'undefined' && process !== null &&
				typeof process.nextTick === 'function';
		}

		function hasMutationObserver () {
			return (typeof MutationObserver === 'function' && MutationObserver) ||
				(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver);
		}

		function initMutationObserver(MutationObserver) {
			var scheduled;
			var node = document.createTextNode('');
			var o = new MutationObserver(run);
			o.observe(node, { characterData: true });

			function run() {
				var f = scheduled;
				scheduled = void 0;
				f();
			}

			var i = 0;
			return function (f) {
				scheduled = f;
				node.data = (i ^= 1);
			};
		}
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return {
			pending: toPendingState,
			fulfilled: toFulfilledState,
			rejected: toRejectedState,
			inspect: inspect
		};

		function toPendingState() {
			return { state: 'pending' };
		}

		function toRejectedState(e) {
			return { state: 'rejected', reason: e };
		}

		function toFulfilledState(x) {
			return { state: 'fulfilled', value: x };
		}

		function inspect(handler) {
			var state = handler.state();
			return state === 0 ? toPendingState()
				 : state > 0   ? toFulfilledState(handler.value)
				               : toRejectedState(handler.value);
		}

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return {
			formatError: formatError,
			formatObject: formatObject,
			tryStringify: tryStringify
		};

		/**
		 * Format an error into a string.  If e is an Error and has a stack property,
		 * it's returned.  Otherwise, e is formatted using formatObject, with a
		 * warning added about e not being a proper Error.
		 * @param {*} e
		 * @returns {String} formatted string, suitable for output to developers
		 */
		function formatError(e) {
			var s = typeof e === 'object' && e !== null && e.stack ? e.stack : formatObject(e);
			return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
		}

		/**
		 * Format an object, detecting "plain" objects and running them through
		 * JSON.stringify if possible.
		 * @param {Object} o
		 * @returns {string}
		 */
		function formatObject(o) {
			var s = String(o);
			if(s === '[object Object]' && typeof JSON !== 'undefined') {
				s = tryStringify(o, s);
			}
			return s;
		}

		/**
		 * Try to return the result of JSON.stringify(x).  If that fails, return
		 * defaultValue
		 * @param {*} x
		 * @param {*} defaultValue
		 * @returns {String|*} JSON.stringify(x) or defaultValue
		 */
		function tryStringify(x, defaultValue) {
			try {
				return JSON.stringify(x);
			} catch(e) {
				return defaultValue;
			}
		}

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(process) {/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		return function makePromise(environment) {

			var tasks = environment.scheduler;
			var emitRejection = initEmitRejection();

			var objectCreate = Object.create ||
				function(proto) {
					function Child() {}
					Child.prototype = proto;
					return new Child();
				};

			/**
			 * Create a promise whose fate is determined by resolver
			 * @constructor
			 * @returns {Promise} promise
			 * @name Promise
			 */
			function Promise(resolver, handler) {
				this._handler = resolver === Handler ? handler : init(resolver);
			}

			/**
			 * Run the supplied resolver
			 * @param resolver
			 * @returns {Pending}
			 */
			function init(resolver) {
				var handler = new Pending();

				try {
					resolver(promiseResolve, promiseReject, promiseNotify);
				} catch (e) {
					promiseReject(e);
				}

				return handler;

				/**
				 * Transition from pre-resolution state to post-resolution state, notifying
				 * all listeners of the ultimate fulfillment or rejection
				 * @param {*} x resolution value
				 */
				function promiseResolve (x) {
					handler.resolve(x);
				}
				/**
				 * Reject this promise with reason, which will be used verbatim
				 * @param {Error|*} reason rejection reason, strongly suggested
				 *   to be an Error type
				 */
				function promiseReject (reason) {
					handler.reject(reason);
				}

				/**
				 * @deprecated
				 * Issue a progress event, notifying all progress listeners
				 * @param {*} x progress event payload to pass to all listeners
				 */
				function promiseNotify (x) {
					handler.notify(x);
				}
			}

			// Creation

			Promise.resolve = resolve;
			Promise.reject = reject;
			Promise.never = never;

			Promise._defer = defer;
			Promise._handler = getHandler;

			/**
			 * Returns a trusted promise. If x is already a trusted promise, it is
			 * returned, otherwise returns a new trusted Promise which follows x.
			 * @param  {*} x
			 * @return {Promise} promise
			 */
			function resolve(x) {
				return isPromise(x) ? x
					: new Promise(Handler, new Async(getHandler(x)));
			}

			/**
			 * Return a reject promise with x as its reason (x is used verbatim)
			 * @param {*} x
			 * @returns {Promise} rejected promise
			 */
			function reject(x) {
				return new Promise(Handler, new Async(new Rejected(x)));
			}

			/**
			 * Return a promise that remains pending forever
			 * @returns {Promise} forever-pending promise.
			 */
			function never() {
				return foreverPendingPromise; // Should be frozen
			}

			/**
			 * Creates an internal {promise, resolver} pair
			 * @private
			 * @returns {Promise}
			 */
			function defer() {
				return new Promise(Handler, new Pending());
			}

			// Transformation and flow control

			/**
			 * Transform this promise's fulfillment value, returning a new Promise
			 * for the transformed result.  If the promise cannot be fulfilled, onRejected
			 * is called with the reason.  onProgress *may* be called with updates toward
			 * this promise's fulfillment.
			 * @param {function=} onFulfilled fulfillment handler
			 * @param {function=} onRejected rejection handler
			 * @param {function=} onProgress @deprecated progress handler
			 * @return {Promise} new promise
			 */
			Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
				var parent = this._handler;
				var state = parent.join().state();

				if ((typeof onFulfilled !== 'function' && state > 0) ||
					(typeof onRejected !== 'function' && state < 0)) {
					// Short circuit: value will not change, simply share handler
					return new this.constructor(Handler, parent);
				}

				var p = this._beget();
				var child = p._handler;

				parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

				return p;
			};

			/**
			 * If this promise cannot be fulfilled due to an error, call onRejected to
			 * handle the error. Shortcut for .then(undefined, onRejected)
			 * @param {function?} onRejected
			 * @return {Promise}
			 */
			Promise.prototype['catch'] = function(onRejected) {
				return this.then(void 0, onRejected);
			};

			/**
			 * Creates a new, pending promise of the same type as this promise
			 * @private
			 * @returns {Promise}
			 */
			Promise.prototype._beget = function() {
				return begetFrom(this._handler, this.constructor);
			};

			function begetFrom(parent, Promise) {
				var child = new Pending(parent.receiver, parent.join().context);
				return new Promise(Handler, child);
			}

			// Array combinators

			Promise.all = all;
			Promise.race = race;
			Promise._traverse = traverse;

			/**
			 * Return a promise that will fulfill when all promises in the
			 * input array have fulfilled, or will reject when one of the
			 * promises rejects.
			 * @param {array} promises array of promises
			 * @returns {Promise} promise for array of fulfillment values
			 */
			function all(promises) {
				return traverseWith(snd, null, promises);
			}

			/**
			 * Array<Promise<X>> -> Promise<Array<f(X)>>
			 * @private
			 * @param {function} f function to apply to each promise's value
			 * @param {Array} promises array of promises
			 * @returns {Promise} promise for transformed values
			 */
			function traverse(f, promises) {
				return traverseWith(tryCatch2, f, promises);
			}

			function traverseWith(tryMap, f, promises) {
				var handler = typeof f === 'function' ? mapAt : settleAt;

				var resolver = new Pending();
				var pending = promises.length >>> 0;
				var results = new Array(pending);

				for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
					x = promises[i];

					if (x === void 0 && !(i in promises)) {
						--pending;
						continue;
					}

					traverseAt(promises, handler, i, x, resolver);
				}

				if(pending === 0) {
					resolver.become(new Fulfilled(results));
				}

				return new Promise(Handler, resolver);

				function mapAt(i, x, resolver) {
					if(!resolver.resolved) {
						traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
					}
				}

				function settleAt(i, x, resolver) {
					results[i] = x;
					if(--pending === 0) {
						resolver.become(new Fulfilled(results));
					}
				}
			}

			function traverseAt(promises, handler, i, x, resolver) {
				if (maybeThenable(x)) {
					var h = getHandlerMaybeThenable(x);
					var s = h.state();

					if (s === 0) {
						h.fold(handler, i, void 0, resolver);
					} else if (s > 0) {
						handler(i, h.value, resolver);
					} else {
						resolver.become(h);
						visitRemaining(promises, i+1, h);
					}
				} else {
					handler(i, x, resolver);
				}
			}

			Promise._visitRemaining = visitRemaining;
			function visitRemaining(promises, start, handler) {
				for(var i=start; i<promises.length; ++i) {
					markAsHandled(getHandler(promises[i]), handler);
				}
			}

			function markAsHandled(h, handler) {
				if(h === handler) {
					return;
				}

				var s = h.state();
				if(s === 0) {
					h.visit(h, void 0, h._unreport);
				} else if(s < 0) {
					h._unreport();
				}
			}

			/**
			 * Fulfill-reject competitive race. Return a promise that will settle
			 * to the same state as the earliest input promise to settle.
			 *
			 * WARNING: The ES6 Promise spec requires that race()ing an empty array
			 * must return a promise that is pending forever.  This implementation
			 * returns a singleton forever-pending promise, the same singleton that is
			 * returned by Promise.never(), thus can be checked with ===
			 *
			 * @param {array} promises array of promises to race
			 * @returns {Promise} if input is non-empty, a promise that will settle
			 * to the same outcome as the earliest input promise to settle. if empty
			 * is empty, returns a promise that will never settle.
			 */
			function race(promises) {
				if(typeof promises !== 'object' || promises === null) {
					return reject(new TypeError('non-iterable passed to race()'));
				}

				// Sigh, race([]) is untestable unless we return *something*
				// that is recognizable without calling .then() on it.
				return promises.length === 0 ? never()
					 : promises.length === 1 ? resolve(promises[0])
					 : runRace(promises);
			}

			function runRace(promises) {
				var resolver = new Pending();
				var i, x, h;
				for(i=0; i<promises.length; ++i) {
					x = promises[i];
					if (x === void 0 && !(i in promises)) {
						continue;
					}

					h = getHandler(x);
					if(h.state() !== 0) {
						resolver.become(h);
						visitRemaining(promises, i+1, h);
						break;
					} else {
						h.visit(resolver, resolver.resolve, resolver.reject);
					}
				}
				return new Promise(Handler, resolver);
			}

			// Promise internals
			// Below this, everything is @private

			/**
			 * Get an appropriate handler for x, without checking for cycles
			 * @param {*} x
			 * @returns {object} handler
			 */
			function getHandler(x) {
				if(isPromise(x)) {
					return x._handler.join();
				}
				return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
			}

			/**
			 * Get a handler for thenable x.
			 * NOTE: You must only call this if maybeThenable(x) == true
			 * @param {object|function|Promise} x
			 * @returns {object} handler
			 */
			function getHandlerMaybeThenable(x) {
				return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
			}

			/**
			 * Get a handler for potentially untrusted thenable x
			 * @param {*} x
			 * @returns {object} handler
			 */
			function getHandlerUntrusted(x) {
				try {
					var untrustedThen = x.then;
					return typeof untrustedThen === 'function'
						? new Thenable(untrustedThen, x)
						: new Fulfilled(x);
				} catch(e) {
					return new Rejected(e);
				}
			}

			/**
			 * Handler for a promise that is pending forever
			 * @constructor
			 */
			function Handler() {}

			Handler.prototype.when
				= Handler.prototype.become
				= Handler.prototype.notify // deprecated
				= Handler.prototype.fail
				= Handler.prototype._unreport
				= Handler.prototype._report
				= noop;

			Handler.prototype._state = 0;

			Handler.prototype.state = function() {
				return this._state;
			};

			/**
			 * Recursively collapse handler chain to find the handler
			 * nearest to the fully resolved value.
			 * @returns {object} handler nearest the fully resolved value
			 */
			Handler.prototype.join = function() {
				var h = this;
				while(h.handler !== void 0) {
					h = h.handler;
				}
				return h;
			};

			Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
				this.when({
					resolver: to,
					receiver: receiver,
					fulfilled: fulfilled,
					rejected: rejected,
					progress: progress
				});
			};

			Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
				this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
			};

			Handler.prototype.fold = function(f, z, c, to) {
				this.when(new Fold(f, z, c, to));
			};

			/**
			 * Handler that invokes fail() on any handler it becomes
			 * @constructor
			 */
			function FailIfRejected() {}

			inherit(Handler, FailIfRejected);

			FailIfRejected.prototype.become = function(h) {
				h.fail();
			};

			var failIfRejected = new FailIfRejected();

			/**
			 * Handler that manages a queue of consumers waiting on a pending promise
			 * @constructor
			 */
			function Pending(receiver, inheritedContext) {
				Promise.createContext(this, inheritedContext);

				this.consumers = void 0;
				this.receiver = receiver;
				this.handler = void 0;
				this.resolved = false;
			}

			inherit(Handler, Pending);

			Pending.prototype._state = 0;

			Pending.prototype.resolve = function(x) {
				this.become(getHandler(x));
			};

			Pending.prototype.reject = function(x) {
				if(this.resolved) {
					return;
				}

				this.become(new Rejected(x));
			};

			Pending.prototype.join = function() {
				if (!this.resolved) {
					return this;
				}

				var h = this;

				while (h.handler !== void 0) {
					h = h.handler;
					if (h === this) {
						return this.handler = cycle();
					}
				}

				return h;
			};

			Pending.prototype.run = function() {
				var q = this.consumers;
				var handler = this.handler;
				this.handler = this.handler.join();
				this.consumers = void 0;

				for (var i = 0; i < q.length; ++i) {
					handler.when(q[i]);
				}
			};

			Pending.prototype.become = function(handler) {
				if(this.resolved) {
					return;
				}

				this.resolved = true;
				this.handler = handler;
				if(this.consumers !== void 0) {
					tasks.enqueue(this);
				}

				if(this.context !== void 0) {
					handler._report(this.context);
				}
			};

			Pending.prototype.when = function(continuation) {
				if(this.resolved) {
					tasks.enqueue(new ContinuationTask(continuation, this.handler));
				} else {
					if(this.consumers === void 0) {
						this.consumers = [continuation];
					} else {
						this.consumers.push(continuation);
					}
				}
			};

			/**
			 * @deprecated
			 */
			Pending.prototype.notify = function(x) {
				if(!this.resolved) {
					tasks.enqueue(new ProgressTask(x, this));
				}
			};

			Pending.prototype.fail = function(context) {
				var c = typeof context === 'undefined' ? this.context : context;
				this.resolved && this.handler.join().fail(c);
			};

			Pending.prototype._report = function(context) {
				this.resolved && this.handler.join()._report(context);
			};

			Pending.prototype._unreport = function() {
				this.resolved && this.handler.join()._unreport();
			};

			/**
			 * Wrap another handler and force it into a future stack
			 * @param {object} handler
			 * @constructor
			 */
			function Async(handler) {
				this.handler = handler;
			}

			inherit(Handler, Async);

			Async.prototype.when = function(continuation) {
				tasks.enqueue(new ContinuationTask(continuation, this));
			};

			Async.prototype._report = function(context) {
				this.join()._report(context);
			};

			Async.prototype._unreport = function() {
				this.join()._unreport();
			};

			/**
			 * Handler that wraps an untrusted thenable and assimilates it in a future stack
			 * @param {function} then
			 * @param {{then: function}} thenable
			 * @constructor
			 */
			function Thenable(then, thenable) {
				Pending.call(this);
				tasks.enqueue(new AssimilateTask(then, thenable, this));
			}

			inherit(Pending, Thenable);

			/**
			 * Handler for a fulfilled promise
			 * @param {*} x fulfillment value
			 * @constructor
			 */
			function Fulfilled(x) {
				Promise.createContext(this);
				this.value = x;
			}

			inherit(Handler, Fulfilled);

			Fulfilled.prototype._state = 1;

			Fulfilled.prototype.fold = function(f, z, c, to) {
				runContinuation3(f, z, this, c, to);
			};

			Fulfilled.prototype.when = function(cont) {
				runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
			};

			var errorId = 0;

			/**
			 * Handler for a rejected promise
			 * @param {*} x rejection reason
			 * @constructor
			 */
			function Rejected(x) {
				Promise.createContext(this);

				this.id = ++errorId;
				this.value = x;
				this.handled = false;
				this.reported = false;

				this._report();
			}

			inherit(Handler, Rejected);

			Rejected.prototype._state = -1;

			Rejected.prototype.fold = function(f, z, c, to) {
				to.become(this);
			};

			Rejected.prototype.when = function(cont) {
				if(typeof cont.rejected === 'function') {
					this._unreport();
				}
				runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
			};

			Rejected.prototype._report = function(context) {
				tasks.afterQueue(new ReportTask(this, context));
			};

			Rejected.prototype._unreport = function() {
				if(this.handled) {
					return;
				}
				this.handled = true;
				tasks.afterQueue(new UnreportTask(this));
			};

			Rejected.prototype.fail = function(context) {
				this.reported = true;
				emitRejection('unhandledRejection', this);
				Promise.onFatalRejection(this, context === void 0 ? this.context : context);
			};

			function ReportTask(rejection, context) {
				this.rejection = rejection;
				this.context = context;
			}

			ReportTask.prototype.run = function() {
				if(!this.rejection.handled && !this.rejection.reported) {
					this.rejection.reported = true;
					emitRejection('unhandledRejection', this.rejection) ||
						Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
				}
			};

			function UnreportTask(rejection) {
				this.rejection = rejection;
			}

			UnreportTask.prototype.run = function() {
				if(this.rejection.reported) {
					emitRejection('rejectionHandled', this.rejection) ||
						Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
				}
			};

			// Unhandled rejection hooks
			// By default, everything is a noop

			Promise.createContext
				= Promise.enterContext
				= Promise.exitContext
				= Promise.onPotentiallyUnhandledRejection
				= Promise.onPotentiallyUnhandledRejectionHandled
				= Promise.onFatalRejection
				= noop;

			// Errors and singletons

			var foreverPendingHandler = new Handler();
			var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

			function cycle() {
				return new Rejected(new TypeError('Promise cycle'));
			}

			// Task runners

			/**
			 * Run a single consumer
			 * @constructor
			 */
			function ContinuationTask(continuation, handler) {
				this.continuation = continuation;
				this.handler = handler;
			}

			ContinuationTask.prototype.run = function() {
				this.handler.join().when(this.continuation);
			};

			/**
			 * Run a queue of progress handlers
			 * @constructor
			 */
			function ProgressTask(value, handler) {
				this.handler = handler;
				this.value = value;
			}

			ProgressTask.prototype.run = function() {
				var q = this.handler.consumers;
				if(q === void 0) {
					return;
				}

				for (var c, i = 0; i < q.length; ++i) {
					c = q[i];
					runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
				}
			};

			/**
			 * Assimilate a thenable, sending it's value to resolver
			 * @param {function} then
			 * @param {object|function} thenable
			 * @param {object} resolver
			 * @constructor
			 */
			function AssimilateTask(then, thenable, resolver) {
				this._then = then;
				this.thenable = thenable;
				this.resolver = resolver;
			}

			AssimilateTask.prototype.run = function() {
				var h = this.resolver;
				tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

				function _resolve(x) { h.resolve(x); }
				function _reject(x)  { h.reject(x); }
				function _notify(x)  { h.notify(x); }
			};

			function tryAssimilate(then, thenable, resolve, reject, notify) {
				try {
					then.call(thenable, resolve, reject, notify);
				} catch (e) {
					reject(e);
				}
			}

			/**
			 * Fold a handler value with z
			 * @constructor
			 */
			function Fold(f, z, c, to) {
				this.f = f; this.z = z; this.c = c; this.to = to;
				this.resolver = failIfRejected;
				this.receiver = this;
			}

			Fold.prototype.fulfilled = function(x) {
				this.f.call(this.c, this.z, x, this.to);
			};

			Fold.prototype.rejected = function(x) {
				this.to.reject(x);
			};

			Fold.prototype.progress = function(x) {
				this.to.notify(x);
			};

			// Other helpers

			/**
			 * @param {*} x
			 * @returns {boolean} true iff x is a trusted Promise
			 */
			function isPromise(x) {
				return x instanceof Promise;
			}

			/**
			 * Test just enough to rule out primitives, in order to take faster
			 * paths in some code
			 * @param {*} x
			 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
			 */
			function maybeThenable(x) {
				return (typeof x === 'object' || typeof x === 'function') && x !== null;
			}

			function runContinuation1(f, h, receiver, next) {
				if(typeof f !== 'function') {
					return next.become(h);
				}

				Promise.enterContext(h);
				tryCatchReject(f, h.value, receiver, next);
				Promise.exitContext();
			}

			function runContinuation3(f, x, h, receiver, next) {
				if(typeof f !== 'function') {
					return next.become(h);
				}

				Promise.enterContext(h);
				tryCatchReject3(f, x, h.value, receiver, next);
				Promise.exitContext();
			}

			/**
			 * @deprecated
			 */
			function runNotify(f, x, h, receiver, next) {
				if(typeof f !== 'function') {
					return next.notify(x);
				}

				Promise.enterContext(h);
				tryCatchReturn(f, x, receiver, next);
				Promise.exitContext();
			}

			function tryCatch2(f, a, b) {
				try {
					return f(a, b);
				} catch(e) {
					return reject(e);
				}
			}

			/**
			 * Return f.call(thisArg, x), or if it throws return a rejected promise for
			 * the thrown exception
			 */
			function tryCatchReject(f, x, thisArg, next) {
				try {
					next.become(getHandler(f.call(thisArg, x)));
				} catch(e) {
					next.become(new Rejected(e));
				}
			}

			/**
			 * Same as above, but includes the extra argument parameter.
			 */
			function tryCatchReject3(f, x, y, thisArg, next) {
				try {
					f.call(thisArg, x, y, next);
				} catch(e) {
					next.become(new Rejected(e));
				}
			}

			/**
			 * @deprecated
			 * Return f.call(thisArg, x), or if it throws, *return* the exception
			 */
			function tryCatchReturn(f, x, thisArg, next) {
				try {
					next.notify(f.call(thisArg, x));
				} catch(e) {
					next.notify(e);
				}
			}

			function inherit(Parent, Child) {
				Child.prototype = objectCreate(Parent.prototype);
				Child.prototype.constructor = Child;
			}

			function snd(x, y) {
				return y;
			}

			function noop() {}

			function initEmitRejection() {
				/*global process, self, CustomEvent*/
				if(typeof process !== 'undefined' && process !== null
					&& typeof process.emit === 'function') {
					// Returning falsy here means to call the default
					// onPotentiallyUnhandledRejection API.  This is safe even in
					// browserify since process.emit always returns falsy in browserify:
					// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
					return function(type, rejection) {
						return type === 'unhandledRejection'
							? process.emit(type, rejection.value, rejection)
							: process.emit(type, rejection);
					};
				} else if(typeof self !== 'undefined' && typeof CustomEvent === 'function') {
					return (function(noop, self, CustomEvent) {
						var hasCustomEvent = false;
						try {
							var ev = new CustomEvent('unhandledRejection');
							hasCustomEvent = ev instanceof CustomEvent;
						} catch (e) {}

						return !hasCustomEvent ? noop : function(type, rejection) {
							var ev = new CustomEvent(type, {
								detail: {
									reason: rejection.value,
									key: rejection
								},
								bubbles: false,
								cancelable: true
							});

							return !self.dispatchEvent(ev);
						};
					}(noop, self, CustomEvent));
				}

				return noop;
			}

			return Promise;
		};
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

		// Credit to Twisol (https://github.com/Twisol) for suggesting
		// this type of extensible queue + trampoline approach for next-tick conflation.

		/**
		 * Async task scheduler
		 * @param {function} async function to schedule a single async function
		 * @constructor
		 */
		function Scheduler(async) {
			this._async = async;
			this._running = false;

			this._queue = this;
			this._queueLen = 0;
			this._afterQueue = {};
			this._afterQueueLen = 0;

			var self = this;
			this.drain = function() {
				self._drain();
			};
		}

		/**
		 * Enqueue a task
		 * @param {{ run:function }} task
		 */
		Scheduler.prototype.enqueue = function(task) {
			this._queue[this._queueLen++] = task;
			this.run();
		};

		/**
		 * Enqueue a task to run after the main task queue
		 * @param {{ run:function }} task
		 */
		Scheduler.prototype.afterQueue = function(task) {
			this._afterQueue[this._afterQueueLen++] = task;
			this.run();
		};

		Scheduler.prototype.run = function() {
			if (!this._running) {
				this._running = true;
				this._async(this.drain);
			}
		};

		/**
		 * Drain the handler queue entirely, and then the after queue
		 */
		Scheduler.prototype._drain = function() {
			var i = 0;
			for (; i < this._queueLen; ++i) {
				this._queue[i].run();
				this._queue[i] = void 0;
			}

			this._queueLen = 0;
			this._running = false;

			for (i = 0; i < this._afterQueueLen; ++i) {
				this._afterQueue[i].run();
				this._afterQueue[i] = void 0;
			}

			this._afterQueueLen = 0;
		};

		return Scheduler;

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(40)));


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _PanelGroup = __webpack_require__(88);

	var _PanelGroup2 = _interopRequireDefault(_PanelGroup);

	var Accordion = _react2['default'].createClass({
	  displayName: 'Accordion',

	  render: function render() {
	    return _react2['default'].createElement(
	      _PanelGroup2['default'],
	      _extends({}, this.props, { accordion: true }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Accordion;
	module.exports = exports['default'];

/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _AffixMixin = __webpack_require__(51);

	var _AffixMixin2 = _interopRequireDefault(_AffixMixin);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var Affix = _react2['default'].createClass({
	  displayName: 'Affix',

	  statics: {
	    domUtils: _utilsDomUtils2['default']
	  },

	  mixins: [_AffixMixin2['default']],

	  render: function render() {
	    var holderStyle = { top: this.state.affixPositionTop };

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, this.state.affixClass),
	        style: holderStyle }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Affix;
	module.exports = exports['default'];

/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsEventListener = __webpack_require__(112);

	var _utilsEventListener2 = _interopRequireDefault(_utilsEventListener);

	var AffixMixin = {
	  propTypes: {
	    offset: _react2['default'].PropTypes.number,
	    offsetTop: _react2['default'].PropTypes.number,
	    offsetBottom: _react2['default'].PropTypes.number
	  },

	  getInitialState: function getInitialState() {
	    return {
	      affixClass: 'affix-top'
	    };
	  },

	  getPinnedOffset: function getPinnedOffset(DOMNode) {
	    if (this.pinnedOffset) {
	      return this.pinnedOffset;
	    }

	    DOMNode.className = DOMNode.className.replace(/affix-top|affix-bottom|affix/, '');
	    DOMNode.className += DOMNode.className.length ? ' affix' : 'affix';

	    this.pinnedOffset = _utilsDomUtils2['default'].getOffset(DOMNode).top - window.pageYOffset;

	    return this.pinnedOffset;
	  },

	  checkPosition: function checkPosition() {
	    var DOMNode = undefined,
	        scrollHeight = undefined,
	        scrollTop = undefined,
	        position = undefined,
	        offsetTop = undefined,
	        offsetBottom = undefined,
	        affix = undefined,
	        affixType = undefined,
	        affixPositionTop = undefined;

	    // TODO: or not visible
	    if (!this.isMounted()) {
	      return;
	    }

	    DOMNode = _react2['default'].findDOMNode(this);
	    scrollHeight = document.documentElement.offsetHeight;
	    scrollTop = window.pageYOffset;
	    position = _utilsDomUtils2['default'].getOffset(DOMNode);

	    if (this.affixed === 'top') {
	      position.top += scrollTop;
	    }

	    offsetTop = this.props.offsetTop != null ? this.props.offsetTop : this.props.offset;
	    offsetBottom = this.props.offsetBottom != null ? this.props.offsetBottom : this.props.offset;

	    if (offsetTop == null && offsetBottom == null) {
	      return;
	    }
	    if (offsetTop == null) {
	      offsetTop = 0;
	    }
	    if (offsetBottom == null) {
	      offsetBottom = 0;
	    }

	    if (this.unpin != null && scrollTop + this.unpin <= position.top) {
	      affix = false;
	    } else if (offsetBottom != null && position.top + DOMNode.offsetHeight >= scrollHeight - offsetBottom) {
	      affix = 'bottom';
	    } else if (offsetTop != null && scrollTop <= offsetTop) {
	      affix = 'top';
	    } else {
	      affix = false;
	    }

	    if (this.affixed === affix) {
	      return;
	    }

	    if (this.unpin != null) {
	      DOMNode.style.top = '';
	    }

	    affixType = 'affix' + (affix ? '-' + affix : '');

	    this.affixed = affix;
	    this.unpin = affix === 'bottom' ? this.getPinnedOffset(DOMNode) : null;

	    if (affix === 'bottom') {
	      DOMNode.className = DOMNode.className.replace(/affix-top|affix-bottom|affix/, 'affix-bottom');
	      affixPositionTop = scrollHeight - offsetBottom - DOMNode.offsetHeight - _utilsDomUtils2['default'].getOffset(DOMNode).top;
	    }

	    this.setState({
	      affixClass: affixType,
	      affixPositionTop: affixPositionTop
	    });
	  },

	  checkPositionWithEventLoop: function checkPositionWithEventLoop() {
	    setTimeout(this.checkPosition, 0);
	  },

	  componentDidMount: function componentDidMount() {
	    this._onWindowScrollListener = _utilsEventListener2['default'].listen(window, 'scroll', this.checkPosition);
	    this._onDocumentClickListener = _utilsEventListener2['default'].listen(_utilsDomUtils2['default'].ownerDocument(this), 'click', this.checkPositionWithEventLoop);
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    if (this._onWindowScrollListener) {
	      this._onWindowScrollListener.remove();
	    }

	    if (this._onDocumentClickListener) {
	      this._onDocumentClickListener.remove();
	    }
	  },

	  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
	    if (prevState.affixClass === this.state.affixClass) {
	      this.checkPositionWithEventLoop();
	    }
	  }
	};

	exports['default'] = AffixMixin;
	module.exports = exports['default'];

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var Alert = _react2['default'].createClass({
	  displayName: 'Alert',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    onDismiss: _react2['default'].PropTypes.func,
	    dismissAfter: _react2['default'].PropTypes.number
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'alert',
	      bsStyle: 'info'
	    };
	  },

	  renderDismissButton: function renderDismissButton() {
	    return _react2['default'].createElement(
	      'button',
	      {
	        type: 'button',
	        className: 'close',
	        onClick: this.props.onDismiss,
	        'aria-hidden': 'true' },
	      '×'
	    );
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();
	    var isDismissable = !!this.props.onDismiss;

	    classes['alert-dismissable'] = isDismissable;

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      isDismissable ? this.renderDismissButton() : null,
	      this.props.children
	    );
	  },

	  componentDidMount: function componentDidMount() {
	    if (this.props.dismissAfter && this.props.onDismiss) {
	      this.dismissTimer = setTimeout(this.props.onDismiss, this.props.dismissAfter);
	    }
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    clearTimeout(this.dismissTimer);
	  }
	});

	exports['default'] = Alert;
	module.exports = exports['default'];

/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _styleMaps = __webpack_require__(102);

	var _styleMaps2 = _interopRequireDefault(_styleMaps);

	var _utilsCustomPropTypes = __webpack_require__(113);

	var _utilsCustomPropTypes2 = _interopRequireDefault(_utilsCustomPropTypes);

	var BootstrapMixin = {
	  propTypes: {
	    bsClass: _utilsCustomPropTypes2['default'].keyOf(_styleMaps2['default'].CLASSES),
	    bsStyle: _utilsCustomPropTypes2['default'].keyOf(_styleMaps2['default'].STYLES),
	    bsSize: _utilsCustomPropTypes2['default'].keyOf(_styleMaps2['default'].SIZES)
	  },

	  getBsClassSet: function getBsClassSet() {
	    var classes = {};

	    var bsClass = this.props.bsClass && _styleMaps2['default'].CLASSES[this.props.bsClass];
	    if (bsClass) {
	      classes[bsClass] = true;

	      var prefix = bsClass + '-';

	      var bsSize = this.props.bsSize && _styleMaps2['default'].SIZES[this.props.bsSize];
	      if (bsSize) {
	        classes[prefix + bsSize] = true;
	      }

	      var bsStyle = this.props.bsStyle && _styleMaps2['default'].STYLES[this.props.bsStyle];
	      if (this.props.bsStyle) {
	        classes[prefix + bsStyle] = true;
	      }
	    }

	    return classes;
	  },

	  prefixClass: function prefixClass(subClass) {
	    return _styleMaps2['default'].CLASSES[this.props.bsClass] + '-' + subClass;
	  }
	};

	exports['default'] = BootstrapMixin;
	module.exports = exports['default'];

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var Badge = _react2['default'].createClass({
	  displayName: 'Badge',

	  propTypes: {
	    pullRight: _react2['default'].PropTypes.bool
	  },

	  hasContent: function hasContent() {
	    return _utilsValidComponentChildren2['default'].hasValidComponent(this.props.children) || _react2['default'].Children.count(this.props.children) > 1 || typeof this.props.children === 'string' || typeof this.props.children === 'number';
	  },

	  render: function render() {
	    var classes = {
	      'pull-right': this.props.pullRight,
	      'badge': this.hasContent()
	    };
	    return _react2['default'].createElement(
	      'span',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Badge;
	module.exports = exports['default'];

/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var Button = _react2['default'].createClass({
	  displayName: 'Button',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    active: _react2['default'].PropTypes.bool,
	    disabled: _react2['default'].PropTypes.bool,
	    block: _react2['default'].PropTypes.bool,
	    navItem: _react2['default'].PropTypes.bool,
	    navDropdown: _react2['default'].PropTypes.bool,
	    componentClass: _react2['default'].PropTypes.node,
	    href: _react2['default'].PropTypes.string,
	    target: _react2['default'].PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'button',
	      bsStyle: 'default',
	      type: 'button'
	    };
	  },

	  render: function render() {
	    var classes = this.props.navDropdown ? {} : this.getBsClassSet();
	    var renderFuncName = undefined;

	    classes = _extends({
	      active: this.props.active,
	      'btn-block': this.props.block }, classes);

	    if (this.props.navItem) {
	      return this.renderNavItem(classes);
	    }

	    renderFuncName = this.props.href || this.props.target || this.props.navDropdown ? 'renderAnchor' : 'renderButton';

	    return this[renderFuncName](classes);
	  },

	  renderAnchor: function renderAnchor(classes) {

	    var Component = this.props.componentClass || 'a';
	    var href = this.props.href || '#';
	    classes.disabled = this.props.disabled;

	    return _react2['default'].createElement(
	      Component,
	      _extends({}, this.props, {
	        href: href,
	        className: (0, _classnames2['default'])(this.props.className, classes),
	        role: 'button' }),
	      this.props.children
	    );
	  },

	  renderButton: function renderButton(classes) {
	    var Component = this.props.componentClass || 'button';

	    return _react2['default'].createElement(
	      Component,
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  },

	  renderNavItem: function renderNavItem(classes) {
	    var liClasses = {
	      active: this.props.active
	    };

	    return _react2['default'].createElement(
	      'li',
	      { className: (0, _classnames2['default'])(liClasses) },
	      this.renderAnchor(classes)
	    );
	  }
	});

	exports['default'] = Button;
	module.exports = exports['default'];
	// eslint-disable-line object-shorthand

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var ButtonGroup = _react2['default'].createClass({
	  displayName: 'ButtonGroup',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    vertical: _react2['default'].PropTypes.bool,
	    justified: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'button-group'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();
	    classes['btn-group'] = !this.props.vertical;
	    classes['btn-group-vertical'] = this.props.vertical;
	    classes['btn-group-justified'] = this.props.justified;

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = ButtonGroup;
	module.exports = exports['default'];

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _Button = __webpack_require__(55);

	var _Button2 = _interopRequireDefault(_Button);

	var _FormGroup = __webpack_require__(117);

	var _FormGroup2 = _interopRequireDefault(_FormGroup);

	var _InputBase2 = __webpack_require__(118);

	var _InputBase3 = _interopRequireDefault(_InputBase2);

	function valueValidation(_ref, propName, componentName) {
	  var children = _ref.children;
	  var value = _ref.value;

	  if (children && value) {
	    return new Error('Both value and children cannot be passed to ButtonInput');
	  }
	  return _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.string, _react2['default'].PropTypes.number]).call(null, { children: children, value: value }, propName, componentName);
	}

	var ButtonInput = (function (_InputBase) {
	  function ButtonInput() {
	    _classCallCheck(this, ButtonInput);

	    if (_InputBase != null) {
	      _InputBase.apply(this, arguments);
	    }
	  }

	  _inherits(ButtonInput, _InputBase);

	  _createClass(ButtonInput, [{
	    key: 'renderFormGroup',
	    value: function renderFormGroup(children) {
	      var _props = this.props;
	      var bsStyle = _props.bsStyle;
	      var value = _props.value;

	      var other = _objectWithoutProperties(_props, ['bsStyle', 'value']);

	      // eslint-disable-line object-shorthand, no-unused-vars
	      return _react2['default'].createElement(
	        _FormGroup2['default'],
	        other,
	        children
	      );
	    }
	  }, {
	    key: 'renderInput',
	    value: function renderInput() {
	      var _props2 = this.props;
	      var children = _props2.children;
	      var value = _props2.value;

	      var other = _objectWithoutProperties(_props2, ['children', 'value']);

	      // eslint-disable-line object-shorthand
	      var val = children ? children : value;
	      return _react2['default'].createElement(_Button2['default'], _extends({}, other, { componentClass: 'input', ref: 'input', key: 'input', value: val }));
	    }
	  }]);

	  return ButtonInput;
	})(_InputBase3['default']);

	ButtonInput.defaultProps = {
	  type: 'button'
	};

	ButtonInput.propTypes = {
	  type: _react2['default'].PropTypes.oneOf(['button', 'reset', 'submit']),
	  bsStyle: function bsStyle(props) {
	    //defer to Button propTypes of bsStyle
	    return null;
	  },
	  children: valueValidation,
	  value: valueValidation
	};

	exports['default'] = ButtonInput;
	module.exports = exports['default'];

/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var ButtonToolbar = _react2['default'].createClass({
	  displayName: 'ButtonToolbar',

	  mixins: [_BootstrapMixin2['default']],

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'button-toolbar'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        role: 'toolbar',
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = ButtonToolbar;
	module.exports = exports['default'];

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsDeprecationWarning = __webpack_require__(115);

	var _utilsDeprecationWarning2 = _interopRequireDefault(_utilsDeprecationWarning);

	var _utilsObjectAssign = __webpack_require__(116);

	var _utilsObjectAssign2 = _interopRequireDefault(_utilsObjectAssign);

	var _CollapsibleNav = __webpack_require__(60);

	var specCollapsableNav = (0, _utilsObjectAssign2['default'])({}, _CollapsibleNav.specCollapsibleNav, {
	  componentDidMount: function componentDidMount() {
	    (0, _utilsDeprecationWarning2['default'])('CollapsableNav', 'CollapsibleNav', 'https://github.com/react-bootstrap/react-bootstrap/issues/425#issuecomment-97110963');
	  }
	});

	var CollapsableNav = _react2['default'].createClass(specCollapsableNav);

	exports['default'] = CollapsableNav;
	module.exports = exports['default'];

/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _CollapsibleMixin = __webpack_require__(65);

	var _CollapsibleMixin2 = _interopRequireDefault(_CollapsibleMixin);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsDeprecatedProperty = __webpack_require__(120);

	var _utilsDeprecatedProperty2 = _interopRequireDefault(_utilsDeprecatedProperty);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var specCollapsibleNav = {
	  mixins: [_BootstrapMixin2['default'], _CollapsibleMixin2['default']],

	  propTypes: {
	    onSelect: _react2['default'].PropTypes.func,
	    activeHref: _react2['default'].PropTypes.string,
	    activeKey: _react2['default'].PropTypes.any,
	    collapsable: _utilsDeprecatedProperty2['default'],
	    collapsible: _react2['default'].PropTypes.bool,
	    expanded: _react2['default'].PropTypes.bool,
	    eventKey: _react2['default'].PropTypes.any
	  },

	  getCollapsibleDOMNode: function getCollapsibleDOMNode() {
	    return this.getDOMNode();
	  },

	  getCollapsibleDimensionValue: function getCollapsibleDimensionValue() {
	    var height = 0;
	    var nodes = this.refs;
	    for (var key in nodes) {
	      if (nodes.hasOwnProperty(key)) {

	        var n = nodes[key].getDOMNode(),
	            h = n.offsetHeight,
	            computedStyles = _utilsDomUtils2['default'].getComputedStyles(n);

	        height += h + parseInt(computedStyles.marginTop, 10) + parseInt(computedStyles.marginBottom, 10);
	      }
	    }
	    return height;
	  },

	  render: function render() {
	    /*
	     * this.props.collapsible is set in NavBar when a eventKey is supplied.
	     */
	    var collapsible = this.props.collapsible || this.props.collapsable;
	    var classes = collapsible ? this.getCollapsibleClassSet() : {};
	    /*
	     * prevent duplicating navbar-collapse call if passed as prop.
	     * kind of overkill...
	     * good cadidate to have check implemented as an util that can
	     * also be used elsewhere.
	     */
	    if (this.props.className === undefined || this.props.className.split(' ').indexOf('navbar-collapse') === -2) {
	      classes['navbar-collapse'] = collapsible;
	    }

	    return _react2['default'].createElement(
	      'div',
	      { eventKey: this.props.eventKey, className: (0, _classnames2['default'])(this.props.className, classes) },
	      _utilsValidComponentChildren2['default'].map(this.props.children, collapsible ? this.renderCollapsibleNavChildren : this.renderChildren)
	    );
	  },

	  getChildActiveProp: function getChildActiveProp(child) {
	    if (child.props.active) {
	      return true;
	    }
	    if (this.props.activeKey != null) {
	      if (child.props.eventKey === this.props.activeKey) {
	        return true;
	      }
	    }
	    if (this.props.activeHref != null) {
	      if (child.props.href === this.props.activeHref) {
	        return true;
	      }
	    }

	    return child.props.active;
	  },

	  renderChildren: function renderChildren(child, index) {
	    var key = child.key ? child.key : index;
	    return (0, _react.cloneElement)(child, {
	      activeKey: this.props.activeKey,
	      activeHref: this.props.activeHref,
	      ref: 'nocollapse_' + key,
	      key: key,
	      navItem: true
	    });
	  },

	  renderCollapsibleNavChildren: function renderCollapsibleNavChildren(child, index) {
	    var key = child.key ? child.key : index;
	    return (0, _react.cloneElement)(child, {
	      active: this.getChildActiveProp(child),
	      activeKey: this.props.activeKey,
	      activeHref: this.props.activeHref,
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, this.props.onSelect),
	      ref: 'collapsible_' + key,
	      key: key,
	      navItem: true
	    });
	  }
	};

	var CollapsibleNav = _react2['default'].createClass(specCollapsibleNav);

	exports.specCollapsibleNav = specCollapsibleNav;
	exports['default'] = CollapsibleNav;

/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var Carousel = _react2['default'].createClass({
	  displayName: 'Carousel',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    slide: _react2['default'].PropTypes.bool,
	    indicators: _react2['default'].PropTypes.bool,
	    interval: _react2['default'].PropTypes.number,
	    controls: _react2['default'].PropTypes.bool,
	    pauseOnHover: _react2['default'].PropTypes.bool,
	    wrap: _react2['default'].PropTypes.bool,
	    onSelect: _react2['default'].PropTypes.func,
	    onSlideEnd: _react2['default'].PropTypes.func,
	    activeIndex: _react2['default'].PropTypes.number,
	    defaultActiveIndex: _react2['default'].PropTypes.number,
	    direction: _react2['default'].PropTypes.oneOf(['prev', 'next'])
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      slide: true,
	      interval: 5000,
	      pauseOnHover: true,
	      wrap: true,
	      indicators: true,
	      controls: true
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      activeIndex: this.props.defaultActiveIndex == null ? 0 : this.props.defaultActiveIndex,
	      previousActiveIndex: null,
	      direction: null
	    };
	  },

	  getDirection: function getDirection(prevIndex, index) {
	    if (prevIndex === index) {
	      return null;
	    }

	    return prevIndex > index ? 'prev' : 'next';
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    var activeIndex = this.getActiveIndex();

	    if (nextProps.activeIndex != null && nextProps.activeIndex !== activeIndex) {
	      clearTimeout(this.timeout);
	      this.setState({
	        previousActiveIndex: activeIndex,
	        direction: nextProps.direction != null ? nextProps.direction : this.getDirection(activeIndex, nextProps.activeIndex)
	      });
	    }
	  },

	  componentDidMount: function componentDidMount() {
	    this.waitForNext();
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    clearTimeout(this.timeout);
	  },

	  next: function next(e) {
	    if (e) {
	      e.preventDefault();
	    }

	    var index = this.getActiveIndex() + 1;
	    var count = _utilsValidComponentChildren2['default'].numberOf(this.props.children);

	    if (index > count - 1) {
	      if (!this.props.wrap) {
	        return;
	      }
	      index = 0;
	    }

	    this.handleSelect(index, 'next');
	  },

	  prev: function prev(e) {
	    if (e) {
	      e.preventDefault();
	    }

	    var index = this.getActiveIndex() - 1;

	    if (index < 0) {
	      if (!this.props.wrap) {
	        return;
	      }
	      index = _utilsValidComponentChildren2['default'].numberOf(this.props.children) - 1;
	    }

	    this.handleSelect(index, 'prev');
	  },

	  pause: function pause() {
	    this.isPaused = true;
	    clearTimeout(this.timeout);
	  },

	  play: function play() {
	    this.isPaused = false;
	    this.waitForNext();
	  },

	  waitForNext: function waitForNext() {
	    if (!this.isPaused && this.props.slide && this.props.interval && this.props.activeIndex == null) {
	      this.timeout = setTimeout(this.next, this.props.interval);
	    }
	  },

	  handleMouseOver: function handleMouseOver() {
	    if (this.props.pauseOnHover) {
	      this.pause();
	    }
	  },

	  handleMouseOut: function handleMouseOut() {
	    if (this.isPaused) {
	      this.play();
	    }
	  },

	  render: function render() {
	    var classes = {
	      carousel: true,
	      slide: this.props.slide
	    };

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes),
	        onMouseOver: this.handleMouseOver,
	        onMouseOut: this.handleMouseOut }),
	      this.props.indicators ? this.renderIndicators() : null,
	      _react2['default'].createElement(
	        'div',
	        { className: 'carousel-inner', ref: 'inner' },
	        _utilsValidComponentChildren2['default'].map(this.props.children, this.renderItem)
	      ),
	      this.props.controls ? this.renderControls() : null
	    );
	  },

	  renderPrev: function renderPrev() {
	    return _react2['default'].createElement(
	      'a',
	      { className: 'left carousel-control', href: '#prev', key: 0, onClick: this.prev },
	      _react2['default'].createElement('span', { className: 'glyphicon glyphicon-chevron-left' })
	    );
	  },

	  renderNext: function renderNext() {
	    return _react2['default'].createElement(
	      'a',
	      { className: 'right carousel-control', href: '#next', key: 1, onClick: this.next },
	      _react2['default'].createElement('span', { className: 'glyphicon glyphicon-chevron-right' })
	    );
	  },

	  renderControls: function renderControls() {
	    if (!this.props.wrap) {
	      var activeIndex = this.getActiveIndex();
	      var count = _utilsValidComponentChildren2['default'].numberOf(this.props.children);

	      return [activeIndex !== 0 ? this.renderPrev() : null, activeIndex !== count - 1 ? this.renderNext() : null];
	    }

	    return [this.renderPrev(), this.renderNext()];
	  },

	  renderIndicator: function renderIndicator(child, index) {
	    var className = index === this.getActiveIndex() ? 'active' : null;

	    return _react2['default'].createElement('li', {
	      key: index,
	      className: className,
	      onClick: this.handleSelect.bind(this, index, null) });
	  },

	  renderIndicators: function renderIndicators() {
	    var indicators = [];
	    _utilsValidComponentChildren2['default'].forEach(this.props.children, function (child, index) {
	      indicators.push(this.renderIndicator(child, index),

	      // Force whitespace between indicator elements, bootstrap
	      // requires this for correct spacing of elements.
	      ' ');
	    }, this);

	    return _react2['default'].createElement(
	      'ol',
	      { className: 'carousel-indicators' },
	      indicators
	    );
	  },

	  getActiveIndex: function getActiveIndex() {
	    return this.props.activeIndex != null ? this.props.activeIndex : this.state.activeIndex;
	  },

	  handleItemAnimateOutEnd: function handleItemAnimateOutEnd() {
	    this.setState({
	      previousActiveIndex: null,
	      direction: null
	    }, function () {
	      this.waitForNext();

	      if (this.props.onSlideEnd) {
	        this.props.onSlideEnd();
	      }
	    });
	  },

	  renderItem: function renderItem(child, index) {
	    var activeIndex = this.getActiveIndex();
	    var isActive = index === activeIndex;
	    var isPreviousActive = this.state.previousActiveIndex != null && this.state.previousActiveIndex === index && this.props.slide;

	    return (0, _react.cloneElement)(child, {
	      active: isActive,
	      ref: child.ref,
	      key: child.key ? child.key : index,
	      index: index,
	      animateOut: isPreviousActive,
	      animateIn: isActive && this.state.previousActiveIndex != null && this.props.slide,
	      direction: this.state.direction,
	      onAnimateOutEnd: isPreviousActive ? this.handleItemAnimateOutEnd : null
	    });
	  },

	  handleSelect: function handleSelect(index, direction) {
	    clearTimeout(this.timeout);

	    var previousActiveIndex = this.getActiveIndex();
	    direction = direction || this.getDirection(previousActiveIndex, index);

	    if (this.props.onSelect) {
	      this.props.onSelect(index, direction);
	    }

	    if (this.props.activeIndex == null && index !== previousActiveIndex) {
	      if (this.state.previousActiveIndex != null) {
	        // If currently animating don't activate the new index.
	        // TODO: look into queuing this canceled call and
	        // animating after the current animation has ended.
	        return;
	      }

	      this.setState({
	        activeIndex: index,
	        previousActiveIndex: previousActiveIndex,
	        direction: direction
	      });
	    }
	  }
	});

	exports['default'] = Carousel;
	module.exports = exports['default'];

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsTransitionEvents = __webpack_require__(119);

	var _utilsTransitionEvents2 = _interopRequireDefault(_utilsTransitionEvents);

	var CarouselItem = _react2['default'].createClass({
	  displayName: 'CarouselItem',

	  propTypes: {
	    direction: _react2['default'].PropTypes.oneOf(['prev', 'next']),
	    onAnimateOutEnd: _react2['default'].PropTypes.func,
	    active: _react2['default'].PropTypes.bool,
	    animateIn: _react2['default'].PropTypes.bool,
	    animateOut: _react2['default'].PropTypes.bool,
	    caption: _react2['default'].PropTypes.node,
	    index: _react2['default'].PropTypes.number
	  },

	  getInitialState: function getInitialState() {
	    return {
	      direction: null
	    };
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      animation: true
	    };
	  },

	  handleAnimateOutEnd: function handleAnimateOutEnd() {
	    if (this.props.onAnimateOutEnd && this.isMounted()) {
	      this.props.onAnimateOutEnd(this.props.index);
	    }
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    if (this.props.active !== nextProps.active) {
	      this.setState({
	        direction: null
	      });
	    }
	  },

	  componentDidUpdate: function componentDidUpdate(prevProps) {
	    if (!this.props.active && prevProps.active) {
	      _utilsTransitionEvents2['default'].addEndEventListener(_react2['default'].findDOMNode(this), this.handleAnimateOutEnd);
	    }

	    if (this.props.active !== prevProps.active) {
	      setTimeout(this.startAnimation, 20);
	    }
	  },

	  startAnimation: function startAnimation() {
	    if (!this.isMounted()) {
	      return;
	    }

	    this.setState({
	      direction: this.props.direction === 'prev' ? 'right' : 'left'
	    });
	  },

	  render: function render() {
	    var classes = {
	      item: true,
	      active: this.props.active && !this.props.animateIn || this.props.animateOut,
	      next: this.props.active && this.props.animateIn && this.props.direction === 'next',
	      prev: this.props.active && this.props.animateIn && this.props.direction === 'prev'
	    };

	    if (this.state.direction && (this.props.animateIn || this.props.animateOut)) {
	      classes[this.state.direction] = true;
	    }

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children,
	      this.props.caption ? this.renderCaption() : null
	    );
	  },

	  renderCaption: function renderCaption() {
	    return _react2['default'].createElement(
	      'div',
	      { className: 'carousel-caption' },
	      this.props.caption
	    );
	  }
	});

	exports['default'] = CarouselItem;
	module.exports = exports['default'];

/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _styleMaps = __webpack_require__(102);

	var _styleMaps2 = _interopRequireDefault(_styleMaps);

	var Col = _react2['default'].createClass({
	  displayName: 'Col',

	  propTypes: {
	    xs: _react2['default'].PropTypes.number,
	    sm: _react2['default'].PropTypes.number,
	    md: _react2['default'].PropTypes.number,
	    lg: _react2['default'].PropTypes.number,
	    xsOffset: _react2['default'].PropTypes.number,
	    smOffset: _react2['default'].PropTypes.number,
	    mdOffset: _react2['default'].PropTypes.number,
	    lgOffset: _react2['default'].PropTypes.number,
	    xsPush: _react2['default'].PropTypes.number,
	    smPush: _react2['default'].PropTypes.number,
	    mdPush: _react2['default'].PropTypes.number,
	    lgPush: _react2['default'].PropTypes.number,
	    xsPull: _react2['default'].PropTypes.number,
	    smPull: _react2['default'].PropTypes.number,
	    mdPull: _react2['default'].PropTypes.number,
	    lgPull: _react2['default'].PropTypes.number,
	    componentClass: _react2['default'].PropTypes.node.isRequired
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      componentClass: 'div'
	    };
	  },

	  render: function render() {
	    var ComponentClass = this.props.componentClass;
	    var classes = {};

	    Object.keys(_styleMaps2['default'].SIZES).forEach(function (key) {
	      var size = _styleMaps2['default'].SIZES[key];
	      var prop = size;
	      var classPart = size + '-';

	      if (this.props[prop]) {
	        classes['col-' + classPart + this.props[prop]] = true;
	      }

	      prop = size + 'Offset';
	      classPart = size + '-offset-';
	      if (this.props[prop] >= 0) {
	        classes['col-' + classPart + this.props[prop]] = true;
	      }

	      prop = size + 'Push';
	      classPart = size + '-push-';
	      if (this.props[prop] >= 0) {
	        classes['col-' + classPart + this.props[prop]] = true;
	      }

	      prop = size + 'Pull';
	      classPart = size + '-pull-';
	      if (this.props[prop] >= 0) {
	        classes['col-' + classPart + this.props[prop]] = true;
	      }
	    }, this);

	    return _react2['default'].createElement(
	      ComponentClass,
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Col;
	module.exports = exports['default'];

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _utilsObjectAssign = __webpack_require__(116);

	var _utilsObjectAssign2 = _interopRequireDefault(_utilsObjectAssign);

	var _utilsDeprecationWarning = __webpack_require__(115);

	var _utilsDeprecationWarning2 = _interopRequireDefault(_utilsDeprecationWarning);

	var _CollapsibleMixin = __webpack_require__(65);

	var _CollapsibleMixin2 = _interopRequireDefault(_CollapsibleMixin);

	var link = 'https://github.com/react-bootstrap/react-bootstrap/issues/425#issuecomment-97110963';

	var CollapsableMixin = (0, _utilsObjectAssign2['default'])({}, _CollapsibleMixin2['default'], {
	  getCollapsableClassSet: function getCollapsableClassSet(className) {
	    (0, _utilsDeprecationWarning2['default'])('CollapsableMixin.getCollapsableClassSet()', 'CollapsibleMixin.getCollapsibleClassSet()', link);
	    return _CollapsibleMixin2['default'].getCollapsibleClassSet.call(this, className);
	  },

	  getCollapsibleDOMNode: function getCollapsibleDOMNode() {
	    (0, _utilsDeprecationWarning2['default'])('CollapsableMixin.getCollapsableDOMNode()', 'CollapsibleMixin.getCollapsibleDOMNode()', link);
	    return this.getCollapsableDOMNode();
	  },

	  getCollapsibleDimensionValue: function getCollapsibleDimensionValue() {
	    (0, _utilsDeprecationWarning2['default'])('CollapsableMixin.getCollapsableDimensionValue()', 'CollapsibleMixin.getCollapsibleDimensionValue()', link);
	    return this.getCollapsableDimensionValue();
	  },

	  componentDidMount: function componentDidMount() {
	    (0, _utilsDeprecationWarning2['default'])('CollapsableMixin', 'CollapsibleMixin', link);
	  }
	});

	exports['default'] = CollapsableMixin;
	module.exports = exports['default'];

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsTransitionEvents = __webpack_require__(119);

	var _utilsTransitionEvents2 = _interopRequireDefault(_utilsTransitionEvents);

	var _utilsDeprecationWarning = __webpack_require__(115);

	var _utilsDeprecationWarning2 = _interopRequireDefault(_utilsDeprecationWarning);

	var CollapsibleMixin = {

	  propTypes: {
	    defaultExpanded: _react2['default'].PropTypes.bool,
	    expanded: _react2['default'].PropTypes.bool
	  },

	  getInitialState: function getInitialState() {
	    var defaultExpanded = this.props.defaultExpanded != null ? this.props.defaultExpanded : this.props.expanded != null ? this.props.expanded : false;

	    return {
	      expanded: defaultExpanded,
	      collapsing: false
	    };
	  },

	  componentWillUpdate: function componentWillUpdate(nextProps, nextState) {
	    var willExpanded = nextProps.expanded != null ? nextProps.expanded : nextState.expanded;
	    if (willExpanded === this.isExpanded()) {
	      return;
	    }

	    // if the expanded state is being toggled, ensure node has a dimension value
	    // this is needed for the animation to work and needs to be set before
	    // the collapsing class is applied (after collapsing is applied the in class
	    // is removed and the node's dimension will be wrong)

	    var node = this.getCollapsibleDOMNode();
	    var dimension = this.dimension();
	    var value = '0';

	    if (!willExpanded) {
	      value = this.getCollapsibleDimensionValue();
	    }

	    node.style[dimension] = value + 'px';

	    this._afterWillUpdate();
	  },

	  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
	    // check if expanded is being toggled; if so, set collapsing
	    this._checkToggleCollapsing(prevProps, prevState);

	    // check if collapsing was turned on; if so, start animation
	    this._checkStartAnimation();
	  },

	  // helps enable test stubs
	  _afterWillUpdate: function _afterWillUpdate() {},

	  _checkStartAnimation: function _checkStartAnimation() {
	    if (!this.state.collapsing) {
	      return;
	    }

	    var node = this.getCollapsibleDOMNode();
	    var dimension = this.dimension();
	    var value = this.getCollapsibleDimensionValue();

	    // setting the dimension here starts the transition animation
	    var result = undefined;
	    if (this.isExpanded()) {
	      result = value + 'px';
	    } else {
	      result = '0px';
	    }
	    node.style[dimension] = result;
	  },

	  _checkToggleCollapsing: function _checkToggleCollapsing(prevProps, prevState) {
	    var wasExpanded = prevProps.expanded != null ? prevProps.expanded : prevState.expanded;
	    var isExpanded = this.isExpanded();
	    if (wasExpanded !== isExpanded) {
	      if (wasExpanded) {
	        this._handleCollapse();
	      } else {
	        this._handleExpand();
	      }
	    }
	  },

	  _handleExpand: function _handleExpand() {
	    var _this = this;

	    var node = this.getCollapsibleDOMNode();
	    var dimension = this.dimension();

	    var complete = function complete() {
	      _this._removeEndEventListener(node, complete);
	      // remove dimension value - this ensures the collapsible item can grow
	      // in dimension after initial display (such as an image loading)
	      node.style[dimension] = '';
	      _this.setState({
	        collapsing: false
	      });
	    };

	    this._addEndEventListener(node, complete);

	    this.setState({
	      collapsing: true
	    });
	  },

	  _handleCollapse: function _handleCollapse() {
	    var _this2 = this;

	    var node = this.getCollapsibleDOMNode();

	    var complete = function complete() {
	      _this2._removeEndEventListener(node, complete);
	      _this2.setState({
	        collapsing: false
	      });
	    };

	    this._addEndEventListener(node, complete);

	    this.setState({
	      collapsing: true
	    });
	  },

	  // helps enable test stubs
	  _addEndEventListener: function _addEndEventListener(node, complete) {
	    _utilsTransitionEvents2['default'].addEndEventListener(node, complete);
	  },

	  // helps enable test stubs
	  _removeEndEventListener: function _removeEndEventListener(node, complete) {
	    _utilsTransitionEvents2['default'].removeEndEventListener(node, complete);
	  },

	  dimension: function dimension() {
	    if (typeof this.getCollapsableDimension === 'function') {
	      (0, _utilsDeprecationWarning2['default'])('CollapsableMixin.getCollapsableDimension()', 'CollapsibleMixin.getCollapsibleDimension()', 'https://github.com/react-bootstrap/react-bootstrap/issues/425#issuecomment-97110963');
	      return this.getCollapsableDimension();
	    }

	    return typeof this.getCollapsibleDimension === 'function' ? this.getCollapsibleDimension() : 'height';
	  },

	  isExpanded: function isExpanded() {
	    return this.props.expanded != null ? this.props.expanded : this.state.expanded;
	  },

	  getCollapsibleClassSet: function getCollapsibleClassSet(className) {
	    var classes = {};

	    if (typeof className === 'string') {
	      className.split(' ').forEach(function (subClasses) {
	        if (subClasses) {
	          classes[subClasses] = true;
	        }
	      });
	    }

	    classes.collapsing = this.state.collapsing;
	    classes.collapse = !this.state.collapsing;
	    classes['in'] = this.isExpanded() && !this.state.collapsing;

	    return classes;
	  }
	};

	exports['default'] = CollapsibleMixin;
	module.exports = exports['default'];

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _DropdownStateMixin = __webpack_require__(68);

	var _DropdownStateMixin2 = _interopRequireDefault(_DropdownStateMixin);

	var _Button = __webpack_require__(55);

	var _Button2 = _interopRequireDefault(_Button);

	var _ButtonGroup = __webpack_require__(56);

	var _ButtonGroup2 = _interopRequireDefault(_ButtonGroup);

	var _DropdownMenu = __webpack_require__(67);

	var _DropdownMenu2 = _interopRequireDefault(_DropdownMenu);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var DropdownButton = _react2['default'].createClass({
	  displayName: 'DropdownButton',

	  mixins: [_BootstrapMixin2['default'], _DropdownStateMixin2['default']],

	  propTypes: {
	    pullRight: _react2['default'].PropTypes.bool,
	    dropup: _react2['default'].PropTypes.bool,
	    title: _react2['default'].PropTypes.node,
	    href: _react2['default'].PropTypes.string,
	    onClick: _react2['default'].PropTypes.func,
	    onSelect: _react2['default'].PropTypes.func,
	    navItem: _react2['default'].PropTypes.bool,
	    noCaret: _react2['default'].PropTypes.bool,
	    buttonClassName: _react2['default'].PropTypes.string
	  },

	  render: function render() {
	    var renderMethod = this.props.navItem ? 'renderNavItem' : 'renderButtonGroup';

	    var caret = this.props.noCaret ? null : _react2['default'].createElement('span', { className: 'caret' });

	    return this[renderMethod]([_react2['default'].createElement(
	      _Button2['default'],
	      _extends({}, this.props, {
	        ref: 'dropdownButton',
	        className: (0, _classnames2['default'])('dropdown-toggle', this.props.buttonClassName),
	        onClick: (0, _utilsCreateChainedFunction2['default'])(this.props.onClick, this.handleDropdownClick),
	        key: 0,
	        navDropdown: this.props.navItem,
	        navItem: null,
	        title: null,
	        pullRight: null,
	        dropup: null }),
	      this.props.title,
	      ' ',
	      caret
	    ), _react2['default'].createElement(
	      _DropdownMenu2['default'],
	      {
	        ref: 'menu',
	        'aria-labelledby': this.props.id,
	        pullRight: this.props.pullRight,
	        key: 1 },
	      _utilsValidComponentChildren2['default'].map(this.props.children, this.renderMenuItem)
	    )]);
	  },

	  renderButtonGroup: function renderButtonGroup(children) {
	    var groupClasses = {
	      'open': this.state.open,
	      'dropup': this.props.dropup
	    };

	    return _react2['default'].createElement(
	      _ButtonGroup2['default'],
	      {
	        bsSize: this.props.bsSize,
	        className: (0, _classnames2['default'])(this.props.className, groupClasses) },
	      children
	    );
	  },

	  renderNavItem: function renderNavItem(children) {
	    var classes = {
	      'dropdown': true,
	      'open': this.state.open,
	      'dropup': this.props.dropup
	    };

	    return _react2['default'].createElement(
	      'li',
	      { className: (0, _classnames2['default'])(this.props.className, classes) },
	      children
	    );
	  },

	  renderMenuItem: function renderMenuItem(child, index) {
	    // Only handle the option selection if an onSelect prop has been set on the
	    // component or it's child, this allows a user not to pass an onSelect
	    // handler and have the browser preform the default action.
	    var handleOptionSelect = this.props.onSelect || child.props.onSelect ? this.handleOptionSelect : null;

	    return (0, _react.cloneElement)(child, {
	      // Capture onSelect events
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, handleOptionSelect),
	      key: child.key ? child.key : index
	    });
	  },

	  handleDropdownClick: function handleDropdownClick(e) {
	    e.preventDefault();

	    this.setDropdownState(!this.state.open);
	  },

	  handleOptionSelect: function handleOptionSelect(key) {
	    if (this.props.onSelect) {
	      this.props.onSelect(key);
	    }

	    this.setDropdownState(false);
	  }
	});

	exports['default'] = DropdownButton;
	module.exports = exports['default'];

/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var DropdownMenu = _react2['default'].createClass({
	  displayName: 'DropdownMenu',

	  propTypes: {
	    pullRight: _react2['default'].PropTypes.bool,
	    onSelect: _react2['default'].PropTypes.func
	  },

	  render: function render() {
	    var classes = {
	      'dropdown-menu': true,
	      'dropdown-menu-right': this.props.pullRight
	    };

	    return _react2['default'].createElement(
	      'ul',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes),
	        role: 'menu' }),
	      _utilsValidComponentChildren2['default'].map(this.props.children, this.renderMenuItem)
	    );
	  },

	  renderMenuItem: function renderMenuItem(child, index) {
	    return (0, _react.cloneElement)(child, {
	      // Capture onSelect events
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, this.props.onSelect),

	      // Force special props to be transferred
	      key: child.key ? child.key : index
	    });
	  }
	});

	exports['default'] = DropdownMenu;
	module.exports = exports['default'];

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsEventListener = __webpack_require__(112);

	var _utilsEventListener2 = _interopRequireDefault(_utilsEventListener);

	/**
	 * Checks whether a node is within
	 * a root nodes tree
	 *
	 * @param {DOMElement} node
	 * @param {DOMElement} root
	 * @returns {boolean}
	 */
	function isNodeInRoot(node, root) {
	  while (node) {
	    if (node === root) {
	      return true;
	    }
	    node = node.parentNode;
	  }

	  return false;
	}

	var DropdownStateMixin = {
	  getInitialState: function getInitialState() {
	    return {
	      open: false
	    };
	  },

	  setDropdownState: function setDropdownState(newState, onStateChangeComplete) {
	    if (newState) {
	      this.bindRootCloseHandlers();
	    } else {
	      this.unbindRootCloseHandlers();
	    }

	    this.setState({
	      open: newState
	    }, onStateChangeComplete);
	  },

	  handleDocumentKeyUp: function handleDocumentKeyUp(e) {
	    if (e.keyCode === 27) {
	      this.setDropdownState(false);
	    }
	  },

	  handleDocumentClick: function handleDocumentClick(e) {
	    // If the click originated from within this component
	    // don't do anything.
	    if (isNodeInRoot(e.target, _react2['default'].findDOMNode(this))) {
	      return;
	    }

	    this.setDropdownState(false);
	  },

	  bindRootCloseHandlers: function bindRootCloseHandlers() {
	    var doc = _utilsDomUtils2['default'].ownerDocument(this);

	    this._onDocumentClickListener = _utilsEventListener2['default'].listen(doc, 'click', this.handleDocumentClick);
	    this._onDocumentKeyupListener = _utilsEventListener2['default'].listen(doc, 'keyup', this.handleDocumentKeyUp);
	  },

	  unbindRootCloseHandlers: function unbindRootCloseHandlers() {
	    if (this._onDocumentClickListener) {
	      this._onDocumentClickListener.remove();
	    }

	    if (this._onDocumentKeyupListener) {
	      this._onDocumentKeyupListener.remove();
	    }
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    this.unbindRootCloseHandlers();
	  }
	};

	exports['default'] = DropdownStateMixin;
	module.exports = exports['default'];

/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	// TODO: listen for onTransitionEnd to remove el
	function getElementsAndSelf(root, classes) {
	  var els = root.querySelectorAll('.' + classes.join('.'));

	  els = [].map.call(els, function (e) {
	    return e;
	  });

	  for (var i = 0; i < classes.length; i++) {
	    if (!root.className.match(new RegExp('\\b' + classes[i] + '\\b'))) {
	      return els;
	    }
	  }
	  els.unshift(root);
	  return els;
	}

	exports['default'] = {
	  _fadeIn: function _fadeIn() {
	    var els = undefined;

	    if (this.isMounted()) {
	      els = getElementsAndSelf(_react2['default'].findDOMNode(this), ['fade']);

	      if (els.length) {
	        els.forEach(function (el) {
	          el.className += ' in';
	        });
	      }
	    }
	  },

	  _fadeOut: function _fadeOut() {
	    var els = getElementsAndSelf(this._fadeOutEl, ['fade', 'in']);

	    if (els.length) {
	      els.forEach(function (el) {
	        el.className = el.className.replace(/\bin\b/, '');
	      });
	    }

	    setTimeout(this._handleFadeOutEnd, 300);
	  },

	  _handleFadeOutEnd: function _handleFadeOutEnd() {
	    if (this._fadeOutEl && this._fadeOutEl.parentNode) {
	      this._fadeOutEl.parentNode.removeChild(this._fadeOutEl);
	    }
	  },

	  componentDidMount: function componentDidMount() {
	    if (document.querySelectorAll) {
	      // Firefox needs delay for transition to be triggered
	      setTimeout(this._fadeIn, 20);
	    }
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    var els = getElementsAndSelf(_react2['default'].findDOMNode(this), ['fade']),
	        container = this.props.container && _react2['default'].findDOMNode(this.props.container) || _utilsDomUtils2['default'].ownerDocument(this).body;

	    if (els.length) {
	      this._fadeOutEl = document.createElement('div');
	      container.appendChild(this._fadeOutEl);
	      this._fadeOutEl.appendChild(_react2['default'].findDOMNode(this).cloneNode(true));
	      // Firefox needs delay for transition to be triggered
	      setTimeout(this._fadeOut, 20);
	    }
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _styleMaps = __webpack_require__(102);

	var _styleMaps2 = _interopRequireDefault(_styleMaps);

	var Glyphicon = _react2['default'].createClass({
	  displayName: 'Glyphicon',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    glyph: _react2['default'].PropTypes.oneOf(_styleMaps2['default'].GLYPHS).isRequired
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'glyphicon'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    classes['glyphicon-' + this.props.glyph] = true;

	    return _react2['default'].createElement(
	      'span',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Glyphicon;
	module.exports = exports['default'];

/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var Grid = _react2['default'].createClass({
	  displayName: 'Grid',

	  propTypes: {
	    fluid: _react2['default'].PropTypes.bool,
	    componentClass: _react2['default'].PropTypes.node.isRequired
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      componentClass: 'div'
	    };
	  },

	  render: function render() {
	    var ComponentClass = this.props.componentClass;
	    var className = this.props.fluid ? 'container-fluid' : 'container';

	    return _react2['default'].createElement(
	      ComponentClass,
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, className) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Grid;
	module.exports = exports['default'];

/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _InputBase2 = __webpack_require__(118);

	var _InputBase3 = _interopRequireDefault(_InputBase2);

	var _ButtonInput = __webpack_require__(57);

	var _ButtonInput2 = _interopRequireDefault(_ButtonInput);

	var _utilsDeprecationWarning = __webpack_require__(115);

	var _utilsDeprecationWarning2 = _interopRequireDefault(_utilsDeprecationWarning);

	var buttonTypes = ['button', 'reset', 'submit'];

	var Input = (function (_InputBase) {
	  function Input() {
	    _classCallCheck(this, Input);

	    if (_InputBase != null) {
	      _InputBase.apply(this, arguments);
	    }
	  }

	  _inherits(Input, _InputBase);

	  _createClass(Input, [{
	    key: 'render',
	    value: function render() {
	      if (buttonTypes.indexOf(this.props.type) > -1) {
	        (0, _utilsDeprecationWarning2['default'])('Input type=' + this.props.type, 'ButtonInput');
	        return _react2['default'].createElement(_ButtonInput2['default'], this.props);
	      }

	      return _get(Object.getPrototypeOf(Input.prototype), 'render', this).call(this);
	    }
	  }]);

	  return Input;
	})(_InputBase3['default']);

	exports['default'] = Input;
	module.exports = exports['default'];

/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	// https://www.npmjs.org/package/react-interpolate-component
	// TODO: Drop this in favor of es6 string interpolation

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsObjectAssign = __webpack_require__(116);

	var _utilsObjectAssign2 = _interopRequireDefault(_utilsObjectAssign);

	var REGEXP = /\%\((.+?)\)s/;

	var Interpolate = _react2['default'].createClass({
	  displayName: 'Interpolate',

	  propTypes: {
	    format: _react2['default'].PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return { component: 'span' };
	  },

	  render: function render() {
	    var format = _utilsValidComponentChildren2['default'].hasValidComponent(this.props.children) || typeof this.props.children === 'string' ? this.props.children : this.props.format;
	    var parent = this.props.component;
	    var unsafe = this.props.unsafe === true;
	    var props = (0, _utilsObjectAssign2['default'])({}, this.props);

	    delete props.children;
	    delete props.format;
	    delete props.component;
	    delete props.unsafe;

	    if (unsafe) {
	      var content = format.split(REGEXP).reduce(function (memo, match, index) {
	        var html = undefined;

	        if (index % 2 === 0) {
	          html = match;
	        } else {
	          html = props[match];
	          delete props[match];
	        }

	        if (_react2['default'].isValidElement(html)) {
	          throw new Error('cannot interpolate a React component into unsafe text');
	        }

	        memo += html;

	        return memo;
	      }, '');

	      props.dangerouslySetInnerHTML = { __html: content };

	      return _react2['default'].createElement(parent, props);
	    } else {
	      var kids = format.split(REGEXP).reduce(function (memo, match, index) {
	        var child = undefined;

	        if (index % 2 === 0) {
	          if (match.length === 0) {
	            return memo;
	          }

	          child = match;
	        } else {
	          child = props[match];
	          delete props[match];
	        }

	        memo.push(child);

	        return memo;
	      }, []);

	      return _react2['default'].createElement(parent, props, kids);
	    }
	  }
	});

	exports['default'] = Interpolate;
	module.exports = exports['default'];

/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var Jumbotron = _react2['default'].createClass({
	  displayName: 'Jumbotron',

	  render: function render() {
	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'jumbotron') }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Jumbotron;
	module.exports = exports['default'];

/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var Label = _react2['default'].createClass({
	  displayName: 'Label',

	  mixins: [_BootstrapMixin2['default']],

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'label',
	      bsStyle: 'default'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    return _react2['default'].createElement(
	      'span',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Label;
	module.exports = exports['default'];

/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var ListGroup = (function (_React$Component) {
	  function ListGroup() {
	    _classCallCheck(this, ListGroup);

	    if (_React$Component != null) {
	      _React$Component.apply(this, arguments);
	    }
	  }

	  _inherits(ListGroup, _React$Component);

	  _createClass(ListGroup, [{
	    key: 'render',
	    value: function render() {
	      var _this = this;

	      var items = _utilsValidComponentChildren2['default'].map(this.props.children, function (item, index) {
	        return (0, _react.cloneElement)(item, { key: item.key ? item.key : index });
	      });

	      var childrenAnchors = false;

	      if (!this.props.children) {
	        return this.renderDiv(items);
	      } else if (_react2['default'].Children.count(this.props.children) === 1 && !Array.isArray(this.props.children)) {
	        var child = this.props.children;

	        childrenAnchors = this.isAnchor(child.props);
	      } else {

	        childrenAnchors = Array.prototype.some.call(this.props.children, function (child) {
	          return !Array.isArray(child) ? _this.isAnchor(child.props) : Array.prototype.some.call(child, function (subChild) {
	            return _this.isAnchor(subChild.props);
	          });
	        });
	      }

	      if (childrenAnchors) {
	        return this.renderDiv(items);
	      } else {
	        return this.renderUL(items);
	      }
	    }
	  }, {
	    key: 'isAnchor',
	    value: function isAnchor(props) {
	      return props.href || props.onClick;
	    }
	  }, {
	    key: 'renderUL',
	    value: function renderUL(items) {
	      var listItems = _utilsValidComponentChildren2['default'].map(items, function (item, index) {
	        return (0, _react.cloneElement)(item, { listItem: true });
	      });

	      return _react2['default'].createElement(
	        'ul',
	        _extends({}, this.props, {
	          className: (0, _classnames2['default'])(this.props.className, 'list-group') }),
	        listItems
	      );
	    }
	  }, {
	    key: 'renderDiv',
	    value: function renderDiv(items) {
	      return _react2['default'].createElement(
	        'div',
	        _extends({}, this.props, {
	          className: (0, _classnames2['default'])(this.props.className, 'list-group') }),
	        items
	      );
	    }
	  }]);

	  return ListGroup;
	})(_react2['default'].Component);

	ListGroup.propTypes = {
	  className: _react2['default'].PropTypes.string,
	  id: _react2['default'].PropTypes.string
	};

	exports['default'] = ListGroup;
	module.exports = exports['default'];

/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var ListGroupItem = _react2['default'].createClass({
	  displayName: 'ListGroupItem',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    bsStyle: _react2['default'].PropTypes.oneOf(['danger', 'info', 'success', 'warning']),
	    className: _react2['default'].PropTypes.string,
	    active: _react2['default'].PropTypes.any,
	    disabled: _react2['default'].PropTypes.any,
	    header: _react2['default'].PropTypes.node,
	    listItem: _react2['default'].PropTypes.bool,
	    onClick: _react2['default'].PropTypes.func,
	    eventKey: _react2['default'].PropTypes.any,
	    href: _react2['default'].PropTypes.string,
	    target: _react2['default'].PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'list-group-item'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    classes.active = this.props.active;
	    classes.disabled = this.props.disabled;

	    if (this.props.href || this.props.onClick) {
	      return this.renderAnchor(classes);
	    } else if (this.props.listItem) {
	      return this.renderLi(classes);
	    } else {
	      return this.renderSpan(classes);
	    }
	  },

	  renderLi: function renderLi(classes) {
	    return _react2['default'].createElement(
	      'li',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.header ? this.renderStructuredContent() : this.props.children
	    );
	  },

	  renderAnchor: function renderAnchor(classes) {
	    return _react2['default'].createElement(
	      'a',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes)
	      }),
	      this.props.header ? this.renderStructuredContent() : this.props.children
	    );
	  },

	  renderSpan: function renderSpan(classes) {
	    return _react2['default'].createElement(
	      'span',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.header ? this.renderStructuredContent() : this.props.children
	    );
	  },

	  renderStructuredContent: function renderStructuredContent() {
	    var header = undefined;
	    if (_react2['default'].isValidElement(this.props.header)) {
	      header = (0, _react.cloneElement)(this.props.header, {
	        key: 'header',
	        className: (0, _classnames2['default'])(this.props.header.props.className, 'list-group-item-heading')
	      });
	    } else {
	      header = _react2['default'].createElement(
	        'h4',
	        { key: 'header', className: 'list-group-item-heading' },
	        this.props.header
	      );
	    }

	    var content = _react2['default'].createElement(
	      'p',
	      { key: 'content', className: 'list-group-item-text' },
	      this.props.children
	    );

	    return [header, content];
	  }
	});

	exports['default'] = ListGroupItem;
	module.exports = exports['default'];

/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var MenuItem = _react2['default'].createClass({
	  displayName: 'MenuItem',

	  propTypes: {
	    header: _react2['default'].PropTypes.bool,
	    divider: _react2['default'].PropTypes.bool,
	    href: _react2['default'].PropTypes.string,
	    title: _react2['default'].PropTypes.string,
	    target: _react2['default'].PropTypes.string,
	    onSelect: _react2['default'].PropTypes.func,
	    eventKey: _react2['default'].PropTypes.any,
	    active: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      href: '#',
	      active: false
	    };
	  },

	  handleClick: function handleClick(e) {
	    if (this.props.onSelect) {
	      e.preventDefault();
	      this.props.onSelect(this.props.eventKey, this.props.href, this.props.target);
	    }
	  },

	  renderAnchor: function renderAnchor() {
	    return _react2['default'].createElement(
	      'a',
	      { onClick: this.handleClick, href: this.props.href, target: this.props.target, title: this.props.title, tabIndex: '-1' },
	      this.props.children
	    );
	  },

	  render: function render() {
	    var classes = {
	      'dropdown-header': this.props.header,
	      'divider': this.props.divider,
	      'active': this.props.active
	    };

	    var children = null;
	    if (this.props.header) {
	      children = this.props.children;
	    } else if (!this.props.divider) {
	      children = this.renderAnchor();
	    }

	    return _react2['default'].createElement(
	      'li',
	      _extends({}, this.props, { role: 'presentation', title: null, href: null,
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      children
	    );
	  }
	});

	exports['default'] = MenuItem;
	module.exports = exports['default'];

/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _FadeMixin = __webpack_require__(69);

	var _FadeMixin2 = _interopRequireDefault(_FadeMixin);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsEventListener = __webpack_require__(112);

	var _utilsEventListener2 = _interopRequireDefault(_utilsEventListener);

	// TODO:
	// - aria-labelledby
	// - Add `modal-body` div if only one child passed in that doesn't already have it
	// - Tests

	var Modal = _react2['default'].createClass({
	  displayName: 'Modal',

	  mixins: [_BootstrapMixin2['default'], _FadeMixin2['default']],

	  propTypes: {
	    title: _react2['default'].PropTypes.node,
	    backdrop: _react2['default'].PropTypes.oneOf(['static', true, false]),
	    keyboard: _react2['default'].PropTypes.bool,
	    closeButton: _react2['default'].PropTypes.bool,
	    animation: _react2['default'].PropTypes.bool,
	    onRequestHide: _react2['default'].PropTypes.func.isRequired
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'modal',
	      backdrop: true,
	      keyboard: true,
	      animation: true,
	      closeButton: true
	    };
	  },

	  render: function render() {
	    var modalStyle = { display: 'block' };
	    var dialogClasses = this.getBsClassSet();
	    delete dialogClasses.modal;
	    dialogClasses['modal-dialog'] = true;

	    var classes = {
	      modal: true,
	      fade: this.props.animation,
	      'in': !this.props.animation || !document.querySelectorAll
	    };

	    var modal = _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        title: null,
	        tabIndex: '-1',
	        role: 'dialog',
	        style: modalStyle,
	        className: (0, _classnames2['default'])(this.props.className, classes),
	        onClick: this.props.backdrop === true ? this.handleBackdropClick : null,
	        ref: 'modal' }),
	      _react2['default'].createElement(
	        'div',
	        { className: (0, _classnames2['default'])(dialogClasses) },
	        _react2['default'].createElement(
	          'div',
	          { className: 'modal-content' },
	          this.props.title ? this.renderHeader() : null,
	          this.props.children
	        )
	      )
	    );

	    return this.props.backdrop ? this.renderBackdrop(modal) : modal;
	  },

	  renderBackdrop: function renderBackdrop(modal) {
	    var classes = {
	      'modal-backdrop': true,
	      'fade': this.props.animation
	    };

	    classes['in'] = !this.props.animation || !document.querySelectorAll;

	    var onClick = this.props.backdrop === true ? this.handleBackdropClick : null;

	    return _react2['default'].createElement(
	      'div',
	      null,
	      _react2['default'].createElement('div', { className: (0, _classnames2['default'])(classes), ref: 'backdrop', onClick: onClick }),
	      modal
	    );
	  },

	  renderHeader: function renderHeader() {
	    var closeButton = undefined;
	    if (this.props.closeButton) {
	      closeButton = _react2['default'].createElement(
	        'button',
	        { type: 'button', className: 'close', 'aria-hidden': 'true', onClick: this.props.onRequestHide },
	        '×'
	      );
	    }

	    return _react2['default'].createElement(
	      'div',
	      { className: 'modal-header' },
	      closeButton,
	      this.renderTitle()
	    );
	  },

	  renderTitle: function renderTitle() {
	    return _react2['default'].isValidElement(this.props.title) ? this.props.title : _react2['default'].createElement(
	      'h4',
	      { className: 'modal-title' },
	      this.props.title
	    );
	  },

	  iosClickHack: function iosClickHack() {
	    // IOS only allows click events to be delegated to the document on elements
	    // it considers 'clickable' - anchors, buttons, etc. We fake a click handler on the
	    // DOM nodes themselves. Remove if handled by React: https://github.com/facebook/react/issues/1169
	    _react2['default'].findDOMNode(this.refs.modal).onclick = function () {};
	    _react2['default'].findDOMNode(this.refs.backdrop).onclick = function () {};
	  },

	  componentDidMount: function componentDidMount() {
	    this._onDocumentKeyupListener = _utilsEventListener2['default'].listen(_utilsDomUtils2['default'].ownerDocument(this), 'keyup', this.handleDocumentKeyUp);

	    var container = this.props.container && _react2['default'].findDOMNode(this.props.container) || _utilsDomUtils2['default'].ownerDocument(this).body;
	    container.className += container.className.length ? ' modal-open' : 'modal-open';

	    if (this.props.backdrop) {
	      this.iosClickHack();
	    }
	  },

	  componentDidUpdate: function componentDidUpdate(prevProps) {
	    if (this.props.backdrop && this.props.backdrop !== prevProps.backdrop) {
	      this.iosClickHack();
	    }
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    this._onDocumentKeyupListener.remove();
	    var container = this.props.container && _react2['default'].findDOMNode(this.props.container) || _utilsDomUtils2['default'].ownerDocument(this).body;
	    container.className = container.className.replace(/ ?modal-open/, '');
	  },

	  handleBackdropClick: function handleBackdropClick(e) {
	    if (e.target !== e.currentTarget) {
	      return;
	    }

	    this.props.onRequestHide();
	  },

	  handleDocumentKeyUp: function handleDocumentKeyUp(e) {
	    if (this.props.keyboard && e.keyCode === 27) {
	      this.props.onRequestHide();
	    }
	  }
	});

	exports['default'] = Modal;
	module.exports = exports['default'];

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _CollapsibleMixin = __webpack_require__(65);

	var _CollapsibleMixin2 = _interopRequireDefault(_CollapsibleMixin);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsDeprecatedProperty = __webpack_require__(120);

	var _utilsDeprecatedProperty2 = _interopRequireDefault(_utilsDeprecatedProperty);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var Nav = _react2['default'].createClass({
	  displayName: 'Nav',

	  mixins: [_BootstrapMixin2['default'], _CollapsibleMixin2['default']],

	  propTypes: {
	    activeHref: _react2['default'].PropTypes.string,
	    activeKey: _react2['default'].PropTypes.any,
	    bsStyle: _react2['default'].PropTypes.oneOf(['tabs', 'pills']),
	    stacked: _react2['default'].PropTypes.bool,
	    justified: _react2['default'].PropTypes.bool,
	    onSelect: _react2['default'].PropTypes.func,
	    collapsable: _utilsDeprecatedProperty2['default'],
	    collapsible: _react2['default'].PropTypes.bool,
	    expanded: _react2['default'].PropTypes.bool,
	    navbar: _react2['default'].PropTypes.bool,
	    eventKey: _react2['default'].PropTypes.any,
	    pullRight: _react2['default'].PropTypes.bool,
	    right: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'nav'
	    };
	  },

	  getCollapsibleDOMNode: function getCollapsibleDOMNode() {
	    return _react2['default'].findDOMNode(this);
	  },

	  getCollapsibleDimensionValue: function getCollapsibleDimensionValue() {
	    var node = _react2['default'].findDOMNode(this.refs.ul),
	        height = node.offsetHeight,
	        computedStyles = _utilsDomUtils2['default'].getComputedStyles(node);

	    return height + parseInt(computedStyles.marginTop, 10) + parseInt(computedStyles.marginBottom, 10);
	  },

	  render: function render() {
	    var collapsible = this.props.collapsible || this.props.collapsable;
	    var classes = collapsible ? this.getCollapsibleClassSet() : {};

	    classes['navbar-collapse'] = collapsible;

	    if (this.props.navbar && !collapsible) {
	      return this.renderUl();
	    }

	    return _react2['default'].createElement(
	      'nav',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.renderUl()
	    );
	  },

	  renderUl: function renderUl() {
	    var classes = this.getBsClassSet();

	    classes['nav-stacked'] = this.props.stacked;
	    classes['nav-justified'] = this.props.justified;
	    classes['navbar-nav'] = this.props.navbar;
	    classes['pull-right'] = this.props.pullRight;
	    classes['navbar-right'] = this.props.right;

	    return _react2['default'].createElement(
	      'ul',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes), ref: 'ul' }),
	      _utilsValidComponentChildren2['default'].map(this.props.children, this.renderNavItem)
	    );
	  },

	  getChildActiveProp: function getChildActiveProp(child) {
	    if (child.props.active) {
	      return true;
	    }
	    if (this.props.activeKey != null) {
	      if (child.props.eventKey === this.props.activeKey) {
	        return true;
	      }
	    }
	    if (this.props.activeHref != null) {
	      if (child.props.href === this.props.activeHref) {
	        return true;
	      }
	    }

	    return child.props.active;
	  },

	  renderNavItem: function renderNavItem(child, index) {
	    return (0, _react.cloneElement)(child, {
	      active: this.getChildActiveProp(child),
	      activeKey: this.props.activeKey,
	      activeHref: this.props.activeHref,
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, this.props.onSelect),
	      key: child.key ? child.key : index,
	      navItem: true
	    });
	  }
	});

	exports['default'] = Nav;
	module.exports = exports['default'];

/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var Navbar = _react2['default'].createClass({
	  displayName: 'Navbar',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    fixedTop: _react2['default'].PropTypes.bool,
	    fixedBottom: _react2['default'].PropTypes.bool,
	    staticTop: _react2['default'].PropTypes.bool,
	    inverse: _react2['default'].PropTypes.bool,
	    fluid: _react2['default'].PropTypes.bool,
	    role: _react2['default'].PropTypes.string,
	    componentClass: _react2['default'].PropTypes.node.isRequired,
	    brand: _react2['default'].PropTypes.node,
	    toggleButton: _react2['default'].PropTypes.node,
	    toggleNavKey: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.string, _react2['default'].PropTypes.number]),
	    onToggle: _react2['default'].PropTypes.func,
	    navExpanded: _react2['default'].PropTypes.bool,
	    defaultNavExpanded: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'navbar',
	      bsStyle: 'default',
	      role: 'navigation',
	      componentClass: 'nav'
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      navExpanded: this.props.defaultNavExpanded
	    };
	  },

	  shouldComponentUpdate: function shouldComponentUpdate() {
	    // Defer any updates to this component during the `onSelect` handler.
	    return !this._isChanging;
	  },

	  handleToggle: function handleToggle() {
	    if (this.props.onToggle) {
	      this._isChanging = true;
	      this.props.onToggle();
	      this._isChanging = false;
	    }

	    this.setState({
	      navExpanded: !this.state.navExpanded
	    });
	  },

	  isNavExpanded: function isNavExpanded() {
	    return this.props.navExpanded != null ? this.props.navExpanded : this.state.navExpanded;
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();
	    var ComponentClass = this.props.componentClass;

	    classes['navbar-fixed-top'] = this.props.fixedTop;
	    classes['navbar-fixed-bottom'] = this.props.fixedBottom;
	    classes['navbar-static-top'] = this.props.staticTop;
	    classes['navbar-inverse'] = this.props.inverse;

	    return _react2['default'].createElement(
	      ComponentClass,
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      _react2['default'].createElement(
	        'div',
	        { className: this.props.fluid ? 'container-fluid' : 'container' },
	        this.props.brand || this.props.toggleButton || this.props.toggleNavKey != null ? this.renderHeader() : null,
	        _utilsValidComponentChildren2['default'].map(this.props.children, this.renderChild)
	      )
	    );
	  },

	  renderChild: function renderChild(child, index) {
	    return (0, _react.cloneElement)(child, {
	      navbar: true,
	      collapsible: this.props.toggleNavKey != null && this.props.toggleNavKey === child.props.eventKey,
	      expanded: this.props.toggleNavKey != null && this.props.toggleNavKey === child.props.eventKey && this.isNavExpanded(),
	      key: child.key ? child.key : index
	    });
	  },

	  renderHeader: function renderHeader() {
	    var brand = undefined;

	    if (this.props.brand) {
	      if (_react2['default'].isValidElement(this.props.brand)) {
	        brand = (0, _react.cloneElement)(this.props.brand, {
	          className: (0, _classnames2['default'])(this.props.brand.props.className, 'navbar-brand')
	        });
	      } else {
	        brand = _react2['default'].createElement(
	          'span',
	          { className: 'navbar-brand' },
	          this.props.brand
	        );
	      }
	    }

	    return _react2['default'].createElement(
	      'div',
	      { className: 'navbar-header' },
	      brand,
	      this.props.toggleButton || this.props.toggleNavKey != null ? this.renderToggleButton() : null
	    );
	  },

	  renderToggleButton: function renderToggleButton() {
	    var children = undefined;

	    if (_react2['default'].isValidElement(this.props.toggleButton)) {

	      return (0, _react.cloneElement)(this.props.toggleButton, {
	        className: (0, _classnames2['default'])(this.props.toggleButton.props.className, 'navbar-toggle'),
	        onClick: (0, _utilsCreateChainedFunction2['default'])(this.handleToggle, this.props.toggleButton.props.onClick)
	      });
	    }

	    children = this.props.toggleButton != null ? this.props.toggleButton : [_react2['default'].createElement(
	      'span',
	      { className: 'sr-only', key: 0 },
	      'Toggle navigation'
	    ), _react2['default'].createElement('span', { className: 'icon-bar', key: 1 }), _react2['default'].createElement('span', { className: 'icon-bar', key: 2 }), _react2['default'].createElement('span', { className: 'icon-bar', key: 3 })];

	    return _react2['default'].createElement(
	      'button',
	      { className: 'navbar-toggle', type: 'button', onClick: this.handleToggle },
	      children
	    );
	  }
	});

	exports['default'] = Navbar;
	module.exports = exports['default'];

/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var NavItem = _react2['default'].createClass({
	  displayName: 'NavItem',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    onSelect: _react2['default'].PropTypes.func,
	    active: _react2['default'].PropTypes.bool,
	    disabled: _react2['default'].PropTypes.bool,
	    href: _react2['default'].PropTypes.string,
	    title: _react2['default'].PropTypes.node,
	    eventKey: _react2['default'].PropTypes.any,
	    target: _react2['default'].PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      href: '#'
	    };
	  },

	  render: function render() {
	    var _props = this.props;
	    var disabled = _props.disabled;
	    var active = _props.active;
	    var href = _props.href;
	    var title = _props.title;
	    var target = _props.target;
	    var children = _props.children;

	    var props = _objectWithoutProperties(_props, ['disabled', 'active', 'href', 'title', 'target', 'children']);

	    // eslint-disable-line object-shorthand
	    var classes = {
	      active: active,
	      disabled: disabled
	    };
	    var linkProps = {
	      href: href,
	      title: title,
	      target: target,
	      onClick: this.handleClick,
	      ref: 'anchor'
	    };

	    if (href === '#') {
	      linkProps.role = 'button';
	    }

	    return _react2['default'].createElement(
	      'li',
	      _extends({}, props, { className: (0, _classnames2['default'])(props.className, classes) }),
	      _react2['default'].createElement(
	        'a',
	        linkProps,
	        children
	      )
	    );
	  },

	  handleClick: function handleClick(e) {
	    if (this.props.onSelect) {
	      e.preventDefault();

	      if (!this.props.disabled) {
	        this.props.onSelect(this.props.eventKey, this.props.href, this.props.target);
	      }
	    }
	  }
	});

	exports['default'] = NavItem;
	module.exports = exports['default'];

/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _OverlayMixin = __webpack_require__(85);

	var _OverlayMixin2 = _interopRequireDefault(_OverlayMixin);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var _utilsCreateContextWrapper = __webpack_require__(122);

	var _utilsCreateContextWrapper2 = _interopRequireDefault(_utilsCreateContextWrapper);

	var ModalTrigger = _react2['default'].createClass({
	  displayName: 'ModalTrigger',

	  mixins: [_OverlayMixin2['default']],

	  propTypes: {
	    modal: _react2['default'].PropTypes.node.isRequired
	  },

	  getInitialState: function getInitialState() {
	    return {
	      isOverlayShown: false
	    };
	  },

	  show: function show() {
	    this.setState({
	      isOverlayShown: true
	    });
	  },

	  hide: function hide() {
	    this.setState({
	      isOverlayShown: false
	    });
	  },

	  toggle: function toggle() {
	    this.setState({
	      isOverlayShown: !this.state.isOverlayShown
	    });
	  },

	  renderOverlay: function renderOverlay() {
	    if (!this.state.isOverlayShown) {
	      return _react2['default'].createElement('span', null);
	    }

	    return (0, _react.cloneElement)(this.props.modal, {
	      onRequestHide: this.hide
	    });
	  },

	  render: function render() {
	    var child = _react2['default'].Children.only(this.props.children);
	    var props = {};

	    props.onClick = (0, _utilsCreateChainedFunction2['default'])(child.props.onClick, this.toggle);
	    props.onMouseOver = (0, _utilsCreateChainedFunction2['default'])(child.props.onMouseOver, this.props.onMouseOver);
	    props.onMouseOut = (0, _utilsCreateChainedFunction2['default'])(child.props.onMouseOut, this.props.onMouseOut);
	    props.onFocus = (0, _utilsCreateChainedFunction2['default'])(child.props.onFocus, this.props.onFocus);
	    props.onBlur = (0, _utilsCreateChainedFunction2['default'])(child.props.onBlur, this.props.onBlur);

	    return (0, _react.cloneElement)(child, props);
	  }
	});

	/**
	 * Creates a new ModalTrigger class that forwards the relevant context
	 *
	 * This static method should only be called at the module level, instead of in
	 * e.g. a render() method, because it's expensive to create new classes.
	 *
	 * For example, you would want to have:
	 *
	 * > export default ModalTrigger.withContext({
	 * >   myContextKey: React.PropTypes.object
	 * > });
	 *
	 * and import this when needed.
	 */
	ModalTrigger.withContext = (0, _utilsCreateContextWrapper2['default'])(ModalTrigger, 'modal');

	exports['default'] = ModalTrigger;
	module.exports = exports['default'];

/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _OverlayMixin = __webpack_require__(85);

	var _OverlayMixin2 = _interopRequireDefault(_OverlayMixin);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var _utilsObjectAssign = __webpack_require__(116);

	var _utilsObjectAssign2 = _interopRequireDefault(_utilsObjectAssign);

	var _utilsCreateContextWrapper = __webpack_require__(122);

	var _utilsCreateContextWrapper2 = _interopRequireDefault(_utilsCreateContextWrapper);

	/**
	 * Check if value one is inside or equal to the of value
	 *
	 * @param {string} one
	 * @param {string|array} of
	 * @returns {boolean}
	 */
	function isOneOf(one, of) {
	  if (Array.isArray(of)) {
	    return of.indexOf(one) >= 0;
	  }
	  return one === of;
	}

	var OverlayTrigger = _react2['default'].createClass({
	  displayName: 'OverlayTrigger',

	  mixins: [_OverlayMixin2['default']],

	  propTypes: {
	    trigger: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.oneOf(['manual', 'click', 'hover', 'focus']), _react2['default'].PropTypes.arrayOf(_react2['default'].PropTypes.oneOf(['click', 'hover', 'focus']))]),
	    placement: _react2['default'].PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
	    delay: _react2['default'].PropTypes.number,
	    delayShow: _react2['default'].PropTypes.number,
	    delayHide: _react2['default'].PropTypes.number,
	    defaultOverlayShown: _react2['default'].PropTypes.bool,
	    overlay: _react2['default'].PropTypes.node.isRequired,
	    containerPadding: _react2['default'].PropTypes.number
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      placement: 'right',
	      trigger: ['hover', 'focus'],
	      containerPadding: 0
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      isOverlayShown: this.props.defaultOverlayShown == null ? false : this.props.defaultOverlayShown,
	      overlayLeft: null,
	      overlayTop: null,
	      arrowOffsetLeft: null,
	      arrowOffsetTop: null
	    };
	  },

	  show: function show() {
	    this.setState({
	      isOverlayShown: true
	    }, function () {
	      this.updateOverlayPosition();
	    });
	  },

	  hide: function hide() {
	    this.setState({
	      isOverlayShown: false
	    });
	  },

	  toggle: function toggle() {
	    if (this.state.isOverlayShown) {
	      this.hide();
	    } else {
	      this.show();
	    }
	  },

	  renderOverlay: function renderOverlay() {
	    if (!this.state.isOverlayShown) {
	      return _react2['default'].createElement('span', null);
	    }

	    return (0, _react.cloneElement)(this.props.overlay, {
	      onRequestHide: this.hide,
	      placement: this.props.placement,
	      positionLeft: this.state.overlayLeft,
	      positionTop: this.state.overlayTop,
	      arrowOffsetLeft: this.state.arrowOffsetLeft,
	      arrowOffsetTop: this.state.arrowOffsetTop
	    });
	  },

	  render: function render() {
	    var child = _react2['default'].Children.only(this.props.children);
	    if (this.props.trigger === 'manual') {
	      return child;
	    }

	    var props = {};

	    props.onClick = (0, _utilsCreateChainedFunction2['default'])(child.props.onClick, this.props.onClick);
	    if (isOneOf('click', this.props.trigger)) {
	      props.onClick = (0, _utilsCreateChainedFunction2['default'])(this.toggle, props.onClick);
	    }

	    if (isOneOf('hover', this.props.trigger)) {
	      props.onMouseOver = (0, _utilsCreateChainedFunction2['default'])(this.handleDelayedShow, this.props.onMouseOver);
	      props.onMouseOut = (0, _utilsCreateChainedFunction2['default'])(this.handleDelayedHide, this.props.onMouseOut);
	    }

	    if (isOneOf('focus', this.props.trigger)) {
	      props.onFocus = (0, _utilsCreateChainedFunction2['default'])(this.handleDelayedShow, this.props.onFocus);
	      props.onBlur = (0, _utilsCreateChainedFunction2['default'])(this.handleDelayedHide, this.props.onBlur);
	    }

	    return (0, _react.cloneElement)(child, props);
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    clearTimeout(this._hoverDelay);
	  },

	  componentDidMount: function componentDidMount() {
	    if (this.props.defaultOverlayShown) {
	      this.updateOverlayPosition();
	    }
	  },

	  handleDelayedShow: function handleDelayedShow() {
	    if (this._hoverDelay != null) {
	      clearTimeout(this._hoverDelay);
	      this._hoverDelay = null;
	      return;
	    }

	    var delay = this.props.delayShow != null ? this.props.delayShow : this.props.delay;

	    if (!delay) {
	      this.show();
	      return;
	    }

	    this._hoverDelay = setTimeout((function () {
	      this._hoverDelay = null;
	      this.show();
	    }).bind(this), delay);
	  },

	  handleDelayedHide: function handleDelayedHide() {
	    if (this._hoverDelay != null) {
	      clearTimeout(this._hoverDelay);
	      this._hoverDelay = null;
	      return;
	    }

	    var delay = this.props.delayHide != null ? this.props.delayHide : this.props.delay;

	    if (!delay) {
	      this.hide();
	      return;
	    }

	    this._hoverDelay = setTimeout((function () {
	      this._hoverDelay = null;
	      this.hide();
	    }).bind(this), delay);
	  },

	  updateOverlayPosition: function updateOverlayPosition() {
	    if (!this.isMounted()) {
	      return;
	    }

	    this.setState(this.calcOverlayPosition());
	  },

	  calcOverlayPosition: function calcOverlayPosition() {
	    var childOffset = this.getPosition();

	    var overlayNode = this.getOverlayDOMNode();
	    var overlayHeight = overlayNode.offsetHeight;
	    var overlayWidth = overlayNode.offsetWidth;

	    var placement = this.props.placement;
	    var overlayLeft = undefined,
	        overlayTop = undefined,
	        arrowOffsetLeft = undefined,
	        arrowOffsetTop = undefined;

	    if (placement === 'left' || placement === 'right') {
	      overlayTop = childOffset.top + (childOffset.height - overlayHeight) / 2;

	      if (placement === 'left') {
	        overlayLeft = childOffset.left - overlayWidth;
	      } else {
	        overlayLeft = childOffset.left + childOffset.width;
	      }

	      var topDelta = this._getTopDelta(overlayTop, overlayHeight);
	      overlayTop += topDelta;
	      arrowOffsetTop = 50 * (1 - 2 * topDelta / overlayHeight) + '%';
	      arrowOffsetLeft = null;
	    } else if (placement === 'top' || placement === 'bottom') {
	      overlayLeft = childOffset.left + (childOffset.width - overlayWidth) / 2;

	      if (placement === 'top') {
	        overlayTop = childOffset.top - overlayHeight;
	      } else {
	        overlayTop = childOffset.top + childOffset.height;
	      }

	      var leftDelta = this._getLeftDelta(overlayLeft, overlayWidth);
	      overlayLeft += leftDelta;
	      arrowOffsetLeft = 50 * (1 - 2 * leftDelta / overlayWidth) + '%';
	      arrowOffsetTop = null;
	    } else {
	      throw new Error('calcOverlayPosition(): No such placement of "' + this.props.placement + '" found.');
	    }

	    return { overlayLeft: overlayLeft, overlayTop: overlayTop, arrowOffsetLeft: arrowOffsetLeft, arrowOffsetTop: arrowOffsetTop };
	  },

	  _getTopDelta: function _getTopDelta(top, overlayHeight) {
	    var containerDimensions = this._getContainerDimensions();
	    var containerScroll = containerDimensions.scroll;
	    var containerHeight = containerDimensions.height;

	    var padding = this.props.containerPadding;
	    var topEdgeOffset = top - padding - containerScroll;
	    var bottomEdgeOffset = top + padding - containerScroll + overlayHeight;

	    if (topEdgeOffset < 0) {
	      return -topEdgeOffset;
	    } else if (bottomEdgeOffset > containerHeight) {
	      return containerHeight - bottomEdgeOffset;
	    } else {
	      return 0;
	    }
	  },

	  _getLeftDelta: function _getLeftDelta(left, overlayWidth) {
	    var containerDimensions = this._getContainerDimensions();
	    var containerWidth = containerDimensions.width;

	    var padding = this.props.containerPadding;
	    var leftEdgeOffset = left - padding;
	    var rightEdgeOffset = left + padding + overlayWidth;

	    if (leftEdgeOffset < 0) {
	      return -leftEdgeOffset;
	    } else if (rightEdgeOffset > containerWidth) {
	      return containerWidth - rightEdgeOffset;
	    } else {
	      return 0;
	    }
	  },

	  _getContainerDimensions: function _getContainerDimensions() {
	    var containerNode = this.getContainerDOMNode();
	    var width = undefined,
	        height = undefined;
	    if (containerNode.tagName === 'BODY') {
	      width = window.innerWidth;
	      height = window.innerHeight;
	    } else {
	      width = containerNode.offsetWidth;
	      height = containerNode.offsetHeight;
	    }

	    return {
	      width: width, height: height,
	      scroll: containerNode.scrollTop
	    };
	  },

	  getPosition: function getPosition() {
	    var node = _react2['default'].findDOMNode(this);
	    var container = this.getContainerDOMNode();

	    var offset = container.tagName === 'BODY' ? _utilsDomUtils2['default'].getOffset(node) : _utilsDomUtils2['default'].getPosition(node, container);

	    return (0, _utilsObjectAssign2['default'])({}, offset, {
	      height: node.offsetHeight,
	      width: node.offsetWidth
	    });
	  }
	});

	/**
	 * Creates a new OverlayTrigger class that forwards the relevant context
	 *
	 * This static method should only be called at the module level, instead of in
	 * e.g. a render() method, because it's expensive to create new classes.
	 *
	 * For example, you would want to have:
	 *
	 * > export default OverlayTrigger.withContext({
	 * >   myContextKey: React.PropTypes.object
	 * > });
	 *
	 * and import this when needed.
	 */
	OverlayTrigger.withContext = (0, _utilsCreateContextWrapper2['default'])(OverlayTrigger, 'overlay');

	exports['default'] = OverlayTrigger;
	module.exports = exports['default'];

/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _utilsCustomPropTypes = __webpack_require__(113);

	var _utilsCustomPropTypes2 = _interopRequireDefault(_utilsCustomPropTypes);

	var _utilsDomUtils = __webpack_require__(111);

	var _utilsDomUtils2 = _interopRequireDefault(_utilsDomUtils);

	exports['default'] = {
	  propTypes: {
	    container: _utilsCustomPropTypes2['default'].mountable
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    this._unrenderOverlay();
	    if (this._overlayTarget) {
	      this.getContainerDOMNode().removeChild(this._overlayTarget);
	      this._overlayTarget = null;
	    }
	  },

	  componentDidUpdate: function componentDidUpdate() {
	    this._renderOverlay();
	  },

	  componentDidMount: function componentDidMount() {
	    this._renderOverlay();
	  },

	  _mountOverlayTarget: function _mountOverlayTarget() {
	    this._overlayTarget = document.createElement('div');
	    this.getContainerDOMNode().appendChild(this._overlayTarget);
	  },

	  _renderOverlay: function _renderOverlay() {
	    if (!this._overlayTarget) {
	      this._mountOverlayTarget();
	    }

	    var overlay = this.renderOverlay();

	    // Save reference to help testing
	    if (overlay !== null) {
	      this._overlayInstance = _react2['default'].render(overlay, this._overlayTarget);
	    } else {
	      // Unrender if the component is null for transitions to null
	      this._unrenderOverlay();
	    }
	  },

	  _unrenderOverlay: function _unrenderOverlay() {
	    _react2['default'].unmountComponentAtNode(this._overlayTarget);
	    this._overlayInstance = null;
	  },

	  getOverlayDOMNode: function getOverlayDOMNode() {
	    if (!this.isMounted()) {
	      throw new Error('getOverlayDOMNode(): A component must be mounted to have a DOM node.');
	    }

	    if (this._overlayInstance) {
	      return _react2['default'].findDOMNode(this._overlayInstance);
	    }

	    return null;
	  },

	  getContainerDOMNode: function getContainerDOMNode() {
	    return _react2['default'].findDOMNode(this.props.container) || _utilsDomUtils2['default'].ownerDocument(this).body;
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var PageHeader = _react2['default'].createClass({
	  displayName: 'PageHeader',

	  render: function render() {
	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'page-header') }),
	      _react2['default'].createElement(
	        'h1',
	        null,
	        this.props.children
	      )
	    );
	  }
	});

	exports['default'] = PageHeader;
	module.exports = exports['default'];

/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _CollapsibleMixin = __webpack_require__(65);

	var _CollapsibleMixin2 = _interopRequireDefault(_CollapsibleMixin);

	var _utilsDeprecatedProperty = __webpack_require__(120);

	var _utilsDeprecatedProperty2 = _interopRequireDefault(_utilsDeprecatedProperty);

	var Panel = _react2['default'].createClass({
	  displayName: 'Panel',

	  mixins: [_BootstrapMixin2['default'], _CollapsibleMixin2['default']],

	  propTypes: {
	    collapsable: _utilsDeprecatedProperty2['default'],
	    collapsible: _react2['default'].PropTypes.bool,
	    onSelect: _react2['default'].PropTypes.func,
	    header: _react2['default'].PropTypes.node,
	    id: _react2['default'].PropTypes.string,
	    footer: _react2['default'].PropTypes.node,
	    eventKey: _react2['default'].PropTypes.any
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'panel',
	      bsStyle: 'default'
	    };
	  },

	  handleSelect: function handleSelect(e) {
	    e.selected = true;

	    if (this.props.onSelect) {
	      this.props.onSelect(e, this.props.eventKey);
	    } else {
	      e.preventDefault();
	    }

	    if (e.selected) {
	      this.handleToggle();
	    }
	  },

	  handleToggle: function handleToggle() {
	    this.setState({ expanded: !this.state.expanded });
	  },

	  getCollapsibleDimensionValue: function getCollapsibleDimensionValue() {
	    return _react2['default'].findDOMNode(this.refs.panel).scrollHeight;
	  },

	  getCollapsibleDOMNode: function getCollapsibleDOMNode() {
	    if (!this.isMounted() || !this.refs || !this.refs.panel) {
	      return null;
	    }

	    return _react2['default'].findDOMNode(this.refs.panel);
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();
	    var collapsible = this.props.collapsible || this.props.collapsable;

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes),
	        id: collapsible ? null : this.props.id, onSelect: null }),
	      this.renderHeading(),
	      collapsible ? this.renderCollapsableBody() : this.renderBody(),
	      this.renderFooter()
	    );
	  },

	  renderCollapsableBody: function renderCollapsableBody() {
	    var collapseClass = this.prefixClass('collapse');

	    return _react2['default'].createElement(
	      'div',
	      {
	        className: (0, _classnames2['default'])(this.getCollapsibleClassSet(collapseClass)),
	        id: this.props.id,
	        ref: 'panel',
	        'aria-expanded': this.isExpanded() ? 'true' : 'false' },
	      this.renderBody()
	    );
	  },

	  renderBody: function renderBody() {
	    var allChildren = this.props.children;
	    var bodyElements = [];
	    var panelBodyChildren = [];
	    var bodyClass = this.prefixClass('body');

	    function getProps() {
	      return { key: bodyElements.length };
	    }

	    function addPanelChild(child) {
	      bodyElements.push((0, _react.cloneElement)(child, getProps()));
	    }

	    function addPanelBody(children) {
	      bodyElements.push(_react2['default'].createElement(
	        'div',
	        _extends({ className: bodyClass }, getProps()),
	        children
	      ));
	    }

	    function maybeRenderPanelBody() {
	      if (panelBodyChildren.length === 0) {
	        return;
	      }

	      addPanelBody(panelBodyChildren);
	      panelBodyChildren = [];
	    }

	    // Handle edge cases where we should not iterate through children.
	    if (!Array.isArray(allChildren) || allChildren.length === 0) {
	      if (this.shouldRenderFill(allChildren)) {
	        addPanelChild(allChildren);
	      } else {
	        addPanelBody(allChildren);
	      }
	    } else {

	      allChildren.forEach((function (child) {
	        if (this.shouldRenderFill(child)) {
	          maybeRenderPanelBody();

	          // Separately add the filled element.
	          addPanelChild(child);
	        } else {
	          panelBodyChildren.push(child);
	        }
	      }).bind(this));

	      maybeRenderPanelBody();
	    }

	    return bodyElements;
	  },

	  shouldRenderFill: function shouldRenderFill(child) {
	    return _react2['default'].isValidElement(child) && child.props.fill != null;
	  },

	  renderHeading: function renderHeading() {
	    var header = this.props.header;
	    var collapsible = this.props.collapsible || this.props.collapsable;

	    if (!header) {
	      return null;
	    }

	    if (!_react2['default'].isValidElement(header) || Array.isArray(header)) {
	      header = collapsible ? this.renderCollapsableTitle(header) : header;
	    } else {
	      var className = (0, _classnames2['default'])(this.prefixClass('title'), header.props.className);

	      if (collapsible) {
	        header = (0, _react.cloneElement)(header, {
	          className: className,
	          children: this.renderAnchor(header.props.children)
	        });
	      } else {
	        header = (0, _react.cloneElement)(header, { className: className });
	      }
	    }

	    return _react2['default'].createElement(
	      'div',
	      { className: this.prefixClass('heading') },
	      header
	    );
	  },

	  renderAnchor: function renderAnchor(header) {
	    return _react2['default'].createElement(
	      'a',
	      {
	        href: '#' + (this.props.id || ''),
	        className: this.isExpanded() ? null : 'collapsed',
	        'aria-expanded': this.isExpanded() ? 'true' : 'false',
	        onClick: this.handleSelect },
	      header
	    );
	  },

	  renderCollapsableTitle: function renderCollapsableTitle(header) {
	    return _react2['default'].createElement(
	      'h4',
	      { className: this.prefixClass('title') },
	      this.renderAnchor(header)
	    );
	  },

	  renderFooter: function renderFooter() {
	    if (!this.props.footer) {
	      return null;
	    }

	    return _react2['default'].createElement(
	      'div',
	      { className: this.prefixClass('footer') },
	      this.props.footer
	    );
	  }
	});

	exports['default'] = Panel;
	module.exports = exports['default'];

/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	/* eslint react/prop-types: [1, {ignore: ["children", "className", "bsStyle"]}]*/
	/* BootstrapMixin contains `bsStyle` type validation */
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var PanelGroup = _react2['default'].createClass({
	  displayName: 'PanelGroup',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    accordion: _react2['default'].PropTypes.bool,
	    activeKey: _react2['default'].PropTypes.any,
	    defaultActiveKey: _react2['default'].PropTypes.any,
	    onSelect: _react2['default'].PropTypes.func
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'panel-group'
	    };
	  },

	  getInitialState: function getInitialState() {
	    var defaultActiveKey = this.props.defaultActiveKey;

	    return {
	      activeKey: defaultActiveKey
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();
	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes), onSelect: null }),
	      _utilsValidComponentChildren2['default'].map(this.props.children, this.renderPanel)
	    );
	  },

	  renderPanel: function renderPanel(child, index) {
	    var activeKey = this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;

	    var props = {
	      bsStyle: child.props.bsStyle || this.props.bsStyle,
	      key: child.key ? child.key : index,
	      ref: child.ref
	    };

	    if (this.props.accordion) {
	      props.collapsible = true;
	      props.expanded = child.props.eventKey === activeKey;
	      props.onSelect = this.handleSelect;
	    }

	    return (0, _react.cloneElement)(child, props);
	  },

	  shouldComponentUpdate: function shouldComponentUpdate() {
	    // Defer any updates to this component during the `onSelect` handler.
	    return !this._isChanging;
	  },

	  handleSelect: function handleSelect(e, key) {
	    e.preventDefault();

	    if (this.props.onSelect) {
	      this._isChanging = true;
	      this.props.onSelect(key);
	      this._isChanging = false;
	    }

	    if (this.state.activeKey === key) {
	      key = null;
	    }

	    this.setState({
	      activeKey: key
	    });
	  }
	});

	exports['default'] = PanelGroup;
	module.exports = exports['default'];

/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var PageItem = _react2['default'].createClass({
	  displayName: 'PageItem',

	  propTypes: {
	    href: _react2['default'].PropTypes.string,
	    target: _react2['default'].PropTypes.string,
	    title: _react2['default'].PropTypes.string,
	    disabled: _react2['default'].PropTypes.bool,
	    previous: _react2['default'].PropTypes.bool,
	    next: _react2['default'].PropTypes.bool,
	    onSelect: _react2['default'].PropTypes.func,
	    eventKey: _react2['default'].PropTypes.any
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      href: '#'
	    };
	  },

	  render: function render() {
	    var classes = {
	      'disabled': this.props.disabled,
	      'previous': this.props.previous,
	      'next': this.props.next
	    };

	    return _react2['default'].createElement(
	      'li',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, classes) }),
	      _react2['default'].createElement(
	        'a',
	        {
	          href: this.props.href,
	          title: this.props.title,
	          target: this.props.target,
	          onClick: this.handleSelect,
	          ref: 'anchor' },
	        this.props.children
	      )
	    );
	  },

	  handleSelect: function handleSelect(e) {
	    if (this.props.onSelect) {
	      e.preventDefault();

	      if (!this.props.disabled) {
	        this.props.onSelect(this.props.eventKey, this.props.href, this.props.target);
	      }
	    }
	  }
	});

	exports['default'] = PageItem;
	module.exports = exports['default'];

/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var Pager = _react2['default'].createClass({
	  displayName: 'Pager',

	  propTypes: {
	    onSelect: _react2['default'].PropTypes.func
	  },

	  render: function render() {
	    return _react2['default'].createElement(
	      'ul',
	      _extends({}, this.props, {
	        className: (0, _classnames2['default'])(this.props.className, 'pager') }),
	      _utilsValidComponentChildren2['default'].map(this.props.children, this.renderPageItem)
	    );
	  },

	  renderPageItem: function renderPageItem(child, index) {
	    return (0, _react.cloneElement)(child, {
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, this.props.onSelect),
	      key: child.key ? child.key : index
	    });
	  }
	});

	exports['default'] = Pager;
	module.exports = exports['default'];

/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _FadeMixin = __webpack_require__(69);

	var _FadeMixin2 = _interopRequireDefault(_FadeMixin);

	var Popover = _react2['default'].createClass({
	  displayName: 'Popover',

	  mixins: [_BootstrapMixin2['default'], _FadeMixin2['default']],

	  propTypes: {
	    placement: _react2['default'].PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
	    positionLeft: _react2['default'].PropTypes.number,
	    positionTop: _react2['default'].PropTypes.number,
	    arrowOffsetLeft: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string]),
	    arrowOffsetTop: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string]),
	    title: _react2['default'].PropTypes.node,
	    animation: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      placement: 'right',
	      animation: true
	    };
	  },

	  render: function render() {
	    var _classes;

	    var classes = (_classes = {
	      'popover': true }, _defineProperty(_classes, this.props.placement, true), _defineProperty(_classes, 'in', !this.props.animation && (this.props.positionLeft != null || this.props.positionTop != null)), _defineProperty(_classes, 'fade', this.props.animation), _classes);

	    var style = {
	      'left': this.props.positionLeft,
	      'top': this.props.positionTop,
	      'display': 'block'
	    };

	    var arrowStyle = {
	      'left': this.props.arrowOffsetLeft,
	      'top': this.props.arrowOffsetTop
	    };

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes), style: style, title: null }),
	      _react2['default'].createElement('div', { className: 'arrow', style: arrowStyle }),
	      this.props.title ? this.renderTitle() : null,
	      _react2['default'].createElement(
	        'div',
	        { className: 'popover-content' },
	        this.props.children
	      )
	    );
	  },

	  renderTitle: function renderTitle() {
	    return _react2['default'].createElement(
	      'h3',
	      { className: 'popover-title' },
	      this.props.title
	    );
	  }
	});

	exports['default'] = Popover;
	module.exports = exports['default'];

	// in class will be added by the FadeMixin when the animation property is true

/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _Interpolate = __webpack_require__(73);

	var _Interpolate2 = _interopRequireDefault(_Interpolate);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var ProgressBar = _react2['default'].createClass({
	  displayName: 'ProgressBar',

	  propTypes: {
	    min: _react2['default'].PropTypes.number,
	    now: _react2['default'].PropTypes.number,
	    max: _react2['default'].PropTypes.number,
	    label: _react2['default'].PropTypes.node,
	    srOnly: _react2['default'].PropTypes.bool,
	    striped: _react2['default'].PropTypes.bool,
	    active: _react2['default'].PropTypes.bool
	  },

	  mixins: [_BootstrapMixin2['default']],

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'progress-bar',
	      min: 0,
	      max: 100
	    };
	  },

	  getPercentage: function getPercentage(now, min, max) {
	    var roundPrecision = 1000;
	    return Math.round((now - min) / (max - min) * 100 * roundPrecision) / roundPrecision;
	  },

	  render: function render() {
	    var classes = {
	      progress: true
	    };

	    if (this.props.active) {
	      classes['progress-striped'] = true;
	      classes.active = true;
	    } else if (this.props.striped) {
	      classes['progress-striped'] = true;
	    }

	    if (!_utilsValidComponentChildren2['default'].hasValidComponent(this.props.children)) {
	      if (!this.props.isChild) {
	        return _react2['default'].createElement(
	          'div',
	          _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	          this.renderProgressBar()
	        );
	      } else {
	        return this.renderProgressBar();
	      }
	    } else {
	      return _react2['default'].createElement(
	        'div',
	        _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	        _utilsValidComponentChildren2['default'].map(this.props.children, this.renderChildBar)
	      );
	    }
	  },

	  renderChildBar: function renderChildBar(child, index) {
	    return (0, _react.cloneElement)(child, {
	      isChild: true,
	      key: child.key ? child.key : index
	    });
	  },

	  renderProgressBar: function renderProgressBar() {
	    var percentage = this.getPercentage(this.props.now, this.props.min, this.props.max);

	    var label = undefined;

	    if (typeof this.props.label === 'string') {
	      label = this.renderLabel(percentage);
	    } else if (this.props.label) {
	      label = this.props.label;
	    }

	    if (this.props.srOnly) {
	      label = this.renderScreenReaderOnlyLabel(label);
	    }

	    var classes = this.getBsClassSet();

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes), role: 'progressbar',
	        style: { width: percentage + '%' },
	        'aria-valuenow': this.props.now,
	        'aria-valuemin': this.props.min,
	        'aria-valuemax': this.props.max }),
	      label
	    );
	  },

	  renderLabel: function renderLabel(percentage) {
	    var InterpolateClass = this.props.interpolateClass || _Interpolate2['default'];

	    return _react2['default'].createElement(
	      InterpolateClass,
	      {
	        now: this.props.now,
	        min: this.props.min,
	        max: this.props.max,
	        percent: percentage,
	        bsStyle: this.props.bsStyle },
	      this.props.label
	    );
	  },

	  renderScreenReaderOnlyLabel: function renderScreenReaderOnlyLabel(label) {
	    return _react2['default'].createElement(
	      'span',
	      { className: 'sr-only' },
	      label
	    );
	  }
	});

	exports['default'] = ProgressBar;
	module.exports = exports['default'];

/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var Row = _react2['default'].createClass({
	  displayName: 'Row',

	  propTypes: {
	    componentClass: _react2['default'].PropTypes.node.isRequired
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      componentClass: 'div'
	    };
	  },

	  render: function render() {
	    var ComponentClass = this.props.componentClass;

	    return _react2['default'].createElement(
	      ComponentClass,
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'row') }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Row;
	module.exports = exports['default'];

/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	/* eslint react/prop-types: [1, {ignore: ["children", "className", "bsSize"]}]*/
	/* BootstrapMixin contains `bsSize` type validation */
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _DropdownStateMixin = __webpack_require__(68);

	var _DropdownStateMixin2 = _interopRequireDefault(_DropdownStateMixin);

	var _Button = __webpack_require__(55);

	var _Button2 = _interopRequireDefault(_Button);

	var _ButtonGroup = __webpack_require__(56);

	var _ButtonGroup2 = _interopRequireDefault(_ButtonGroup);

	var _DropdownMenu = __webpack_require__(67);

	var _DropdownMenu2 = _interopRequireDefault(_DropdownMenu);

	var SplitButton = _react2['default'].createClass({
	  displayName: 'SplitButton',

	  mixins: [_BootstrapMixin2['default'], _DropdownStateMixin2['default']],

	  propTypes: {
	    pullRight: _react2['default'].PropTypes.bool,
	    title: _react2['default'].PropTypes.node,
	    href: _react2['default'].PropTypes.string,
	    id: _react2['default'].PropTypes.string,
	    target: _react2['default'].PropTypes.string,
	    dropdownTitle: _react2['default'].PropTypes.node,
	    dropup: _react2['default'].PropTypes.bool,
	    onClick: _react2['default'].PropTypes.func,
	    onSelect: _react2['default'].PropTypes.func,
	    disabled: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      dropdownTitle: 'Toggle dropdown'
	    };
	  },

	  render: function render() {
	    var groupClasses = {
	      'open': this.state.open,
	      'dropup': this.props.dropup
	    };

	    var button = _react2['default'].createElement(
	      _Button2['default'],
	      _extends({}, this.props, {
	        ref: 'button',
	        onClick: this.handleButtonClick,
	        title: null,
	        id: null }),
	      this.props.title
	    );

	    var dropdownButton = _react2['default'].createElement(
	      _Button2['default'],
	      _extends({}, this.props, {
	        ref: 'dropdownButton',
	        className: (0, _classnames2['default'])(this.props.className, 'dropdown-toggle'),
	        onClick: this.handleDropdownClick,
	        title: null,
	        href: null,
	        target: null,
	        id: null }),
	      _react2['default'].createElement(
	        'span',
	        { className: 'sr-only' },
	        this.props.dropdownTitle
	      ),
	      _react2['default'].createElement('span', { className: 'caret' }),
	      _react2['default'].createElement(
	        'span',
	        { style: { letterSpacing: '-.3em' } },
	        ' '
	      )
	    );

	    return _react2['default'].createElement(
	      _ButtonGroup2['default'],
	      {
	        bsSize: this.props.bsSize,
	        className: (0, _classnames2['default'])(groupClasses),
	        id: this.props.id },
	      button,
	      dropdownButton,
	      _react2['default'].createElement(
	        _DropdownMenu2['default'],
	        {
	          ref: 'menu',
	          onSelect: this.handleOptionSelect,
	          'aria-labelledby': this.props.id,
	          pullRight: this.props.pullRight },
	        this.props.children
	      )
	    );
	  },

	  handleButtonClick: function handleButtonClick(e) {
	    if (this.state.open) {
	      this.setDropdownState(false);
	    }

	    if (this.props.onClick) {
	      this.props.onClick(e, this.props.href, this.props.target);
	    }
	  },

	  handleDropdownClick: function handleDropdownClick(e) {
	    e.preventDefault();

	    this.setDropdownState(!this.state.open);
	  },

	  handleOptionSelect: function handleOptionSelect(key) {
	    if (this.props.onSelect) {
	      this.props.onSelect(key);
	    }

	    this.setDropdownState(false);
	  }
	});

	exports['default'] = SplitButton;
	module.exports = exports['default'];

/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _utilsCreateChainedFunction = __webpack_require__(121);

	var _utilsCreateChainedFunction2 = _interopRequireDefault(_utilsCreateChainedFunction);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var SubNav = _react2['default'].createClass({
	  displayName: 'SubNav',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    onSelect: _react2['default'].PropTypes.func,
	    active: _react2['default'].PropTypes.bool,
	    activeHref: _react2['default'].PropTypes.string,
	    activeKey: _react2['default'].PropTypes.any,
	    disabled: _react2['default'].PropTypes.bool,
	    eventKey: _react2['default'].PropTypes.any,
	    href: _react2['default'].PropTypes.string,
	    title: _react2['default'].PropTypes.string,
	    text: _react2['default'].PropTypes.node,
	    target: _react2['default'].PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'nav'
	    };
	  },

	  handleClick: function handleClick(e) {
	    if (this.props.onSelect) {
	      e.preventDefault();

	      if (!this.props.disabled) {
	        this.props.onSelect(this.props.eventKey, this.props.href, this.props.target);
	      }
	    }
	  },

	  isActive: function isActive() {
	    return this.isChildActive(this);
	  },

	  isChildActive: function isChildActive(child) {
	    var _this = this;

	    if (child.props.active) {
	      return true;
	    }

	    if (this.props.activeKey != null && this.props.activeKey === child.props.eventKey) {
	      return true;
	    }

	    if (this.props.activeHref != null && this.props.activeHref === child.props.href) {
	      return true;
	    }

	    if (child.props.children) {
	      var _ret = (function () {
	        var isActive = false;

	        _utilsValidComponentChildren2['default'].forEach(child.props.children, function (grandchild) {
	          if (this.isChildActive(grandchild)) {
	            isActive = true;
	          }
	        }, _this);

	        return {
	          v: isActive
	        };
	      })();

	      if (typeof _ret === 'object') return _ret.v;
	    }

	    return false;
	  },

	  getChildActiveProp: function getChildActiveProp(child) {
	    if (child.props.active) {
	      return true;
	    }
	    if (this.props.activeKey != null) {
	      if (child.props.eventKey === this.props.activeKey) {
	        return true;
	      }
	    }
	    if (this.props.activeHref != null) {
	      if (child.props.href === this.props.activeHref) {
	        return true;
	      }
	    }

	    return child.props.active;
	  },

	  render: function render() {
	    var classes = {
	      'active': this.isActive(),
	      'disabled': this.props.disabled
	    };

	    return _react2['default'].createElement(
	      'li',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      _react2['default'].createElement(
	        'a',
	        {
	          href: this.props.href,
	          title: this.props.title,
	          target: this.props.target,
	          onClick: this.handleClick,
	          ref: 'anchor' },
	        this.props.text
	      ),
	      _react2['default'].createElement(
	        'ul',
	        { className: 'nav' },
	        _utilsValidComponentChildren2['default'].map(this.props.children, this.renderNavItem)
	      )
	    );
	  },

	  renderNavItem: function renderNavItem(child, index) {
	    return (0, _react.cloneElement)(child, {
	      active: this.getChildActiveProp(child),
	      onSelect: (0, _utilsCreateChainedFunction2['default'])(child.props.onSelect, this.props.onSelect),
	      key: child.key ? child.key : index
	    });
	  }
	});

	exports['default'] = SubNav;
	module.exports = exports['default'];

/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _utilsValidComponentChildren = __webpack_require__(114);

	var _utilsValidComponentChildren2 = _interopRequireDefault(_utilsValidComponentChildren);

	var _Nav = __webpack_require__(80);

	var _Nav2 = _interopRequireDefault(_Nav);

	var _NavItem = __webpack_require__(82);

	var _NavItem2 = _interopRequireDefault(_NavItem);

	function getDefaultActiveKeyFromChildren(children) {
	  var defaultActiveKey = undefined;

	  _utilsValidComponentChildren2['default'].forEach(children, function (child) {
	    if (defaultActiveKey == null) {
	      defaultActiveKey = child.props.eventKey;
	    }
	  });

	  return defaultActiveKey;
	}

	var TabbedArea = _react2['default'].createClass({
	  displayName: 'TabbedArea',

	  mixins: [_BootstrapMixin2['default']],

	  propTypes: {
	    activeKey: _react2['default'].PropTypes.any,
	    defaultActiveKey: _react2['default'].PropTypes.any,
	    bsStyle: _react2['default'].PropTypes.oneOf(['tabs', 'pills']),
	    animation: _react2['default'].PropTypes.bool,
	    id: _react2['default'].PropTypes.string,
	    onSelect: _react2['default'].PropTypes.func
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsStyle: 'tabs',
	      animation: true
	    };
	  },

	  getInitialState: function getInitialState() {
	    var defaultActiveKey = this.props.defaultActiveKey != null ? this.props.defaultActiveKey : getDefaultActiveKeyFromChildren(this.props.children);

	    return {
	      activeKey: defaultActiveKey,
	      previousActiveKey: null
	    };
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    if (nextProps.activeKey != null && nextProps.activeKey !== this.props.activeKey) {
	      this.setState({
	        previousActiveKey: this.props.activeKey
	      });
	    }
	  },

	  handlePaneAnimateOutEnd: function handlePaneAnimateOutEnd() {
	    this.setState({
	      previousActiveKey: null
	    });
	  },

	  render: function render() {
	    var activeKey = this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;

	    function renderTabIfSet(child) {
	      return child.props.tab != null ? this.renderTab(child) : null;
	    }

	    var nav = _react2['default'].createElement(
	      _Nav2['default'],
	      _extends({}, this.props, { activeKey: activeKey, onSelect: this.handleSelect, ref: 'tabs' }),
	      _utilsValidComponentChildren2['default'].map(this.props.children, renderTabIfSet, this)
	    );

	    return _react2['default'].createElement(
	      'div',
	      null,
	      nav,
	      _react2['default'].createElement(
	        'div',
	        { id: this.props.id, className: 'tab-content', ref: 'panes' },
	        _utilsValidComponentChildren2['default'].map(this.props.children, this.renderPane)
	      )
	    );
	  },

	  getActiveKey: function getActiveKey() {
	    return this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;
	  },

	  renderPane: function renderPane(child, index) {
	    var activeKey = this.getActiveKey();

	    return (0, _react.cloneElement)(child, {
	      active: child.props.eventKey === activeKey && (this.state.previousActiveKey == null || !this.props.animation),
	      key: child.key ? child.key : index,
	      animation: this.props.animation,
	      onAnimateOutEnd: this.state.previousActiveKey != null && child.props.eventKey === this.state.previousActiveKey ? this.handlePaneAnimateOutEnd : null
	    });
	  },

	  renderTab: function renderTab(child) {
	    var _child$props = child.props;
	    var eventKey = _child$props.eventKey;
	    var className = _child$props.className;
	    var tab = _child$props.tab;
	    var disabled = _child$props.disabled;

	    return _react2['default'].createElement(
	      _NavItem2['default'],
	      {
	        ref: 'tab' + eventKey,
	        eventKey: eventKey,
	        className: className,
	        disabled: disabled },
	      tab
	    );
	  },

	  shouldComponentUpdate: function shouldComponentUpdate() {
	    // Defer any updates to this component during the `onSelect` handler.
	    return !this._isChanging;
	  },

	  handleSelect: function handleSelect(key) {
	    if (this.props.onSelect) {
	      this._isChanging = true;
	      this.props.onSelect(key);
	      this._isChanging = false;
	    } else if (key !== this.getActiveKey()) {
	      this.setState({
	        activeKey: key,
	        previousActiveKey: this.getActiveKey()
	      });
	    }
	  }
	});

	exports['default'] = TabbedArea;
	module.exports = exports['default'];

/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var Table = _react2['default'].createClass({
	  displayName: 'Table',

	  propTypes: {
	    striped: _react2['default'].PropTypes.bool,
	    bordered: _react2['default'].PropTypes.bool,
	    condensed: _react2['default'].PropTypes.bool,
	    hover: _react2['default'].PropTypes.bool,
	    responsive: _react2['default'].PropTypes.bool
	  },

	  render: function render() {
	    var classes = {
	      'table': true,
	      'table-striped': this.props.striped,
	      'table-bordered': this.props.bordered,
	      'table-condensed': this.props.condensed,
	      'table-hover': this.props.hover
	    };
	    var table = _react2['default'].createElement(
	      'table',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );

	    return this.props.responsive ? _react2['default'].createElement(
	      'div',
	      { className: 'table-responsive' },
	      table
	    ) : table;
	  }
	});

	exports['default'] = Table;
	module.exports = exports['default'];

/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _utilsTransitionEvents = __webpack_require__(119);

	var _utilsTransitionEvents2 = _interopRequireDefault(_utilsTransitionEvents);

	var TabPane = _react2['default'].createClass({
	  displayName: 'TabPane',

	  propTypes: {
	    active: _react2['default'].PropTypes.bool,
	    animation: _react2['default'].PropTypes.bool,
	    onAnimateOutEnd: _react2['default'].PropTypes.func,
	    disabled: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      animation: true
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      animateIn: false,
	      animateOut: false
	    };
	  },

	  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
	    if (this.props.animation) {
	      if (!this.state.animateIn && nextProps.active && !this.props.active) {
	        this.setState({
	          animateIn: true
	        });
	      } else if (!this.state.animateOut && !nextProps.active && this.props.active) {
	        this.setState({
	          animateOut: true
	        });
	      }
	    }
	  },

	  componentDidUpdate: function componentDidUpdate() {
	    if (this.state.animateIn) {
	      setTimeout(this.startAnimateIn, 0);
	    }
	    if (this.state.animateOut) {
	      _utilsTransitionEvents2['default'].addEndEventListener(_react2['default'].findDOMNode(this), this.stopAnimateOut);
	    }
	  },

	  startAnimateIn: function startAnimateIn() {
	    if (this.isMounted()) {
	      this.setState({
	        animateIn: false
	      });
	    }
	  },

	  stopAnimateOut: function stopAnimateOut() {
	    if (this.isMounted()) {
	      this.setState({
	        animateOut: false
	      });

	      if (this.props.onAnimateOutEnd) {
	        this.props.onAnimateOutEnd();
	      }
	    }
	  },

	  render: function render() {
	    var classes = {
	      'tab-pane': true,
	      'fade': true,
	      'active': this.props.active || this.state.animateOut,
	      'in': this.props.active && !this.state.animateIn
	    };

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = TabPane;
	module.exports = exports['default'];

/***/ },
/* 99 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var Thumbnail = _react2['default'].createClass({
	  displayName: 'Thumbnail',

	  mixins: [_BootstrapMixin2['default']],

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'thumbnail'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    if (this.props.href) {
	      return _react2['default'].createElement(
	        'a',
	        _extends({}, this.props, { href: this.props.href, className: (0, _classnames2['default'])(this.props.className, classes) }),
	        _react2['default'].createElement('img', { src: this.props.src, alt: this.props.alt })
	      );
	    } else {
	      if (this.props.children) {
	        return _react2['default'].createElement(
	          'div',
	          _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	          _react2['default'].createElement('img', { src: this.props.src, alt: this.props.alt }),
	          _react2['default'].createElement(
	            'div',
	            { className: 'caption' },
	            this.props.children
	          )
	        );
	      } else {
	        return _react2['default'].createElement(
	          'div',
	          _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	          _react2['default'].createElement('img', { src: this.props.src, alt: this.props.alt })
	        );
	      }
	    }
	  }
	});

	exports['default'] = Thumbnail;
	module.exports = exports['default'];

/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var _FadeMixin = __webpack_require__(69);

	var _FadeMixin2 = _interopRequireDefault(_FadeMixin);

	var Tooltip = _react2['default'].createClass({
	  displayName: 'Tooltip',

	  mixins: [_BootstrapMixin2['default'], _FadeMixin2['default']],

	  propTypes: {
	    placement: _react2['default'].PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
	    positionLeft: _react2['default'].PropTypes.number,
	    positionTop: _react2['default'].PropTypes.number,
	    arrowOffsetLeft: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string]),
	    arrowOffsetTop: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string]),
	    animation: _react2['default'].PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      placement: 'right',
	      animation: true
	    };
	  },

	  render: function render() {
	    var _classes;

	    var classes = (_classes = {
	      'tooltip': true }, _defineProperty(_classes, this.props.placement, true), _defineProperty(_classes, 'in', !this.props.animation && (this.props.positionLeft != null || this.props.positionTop != null)), _defineProperty(_classes, 'fade', this.props.animation), _classes);

	    var style = {
	      'left': this.props.positionLeft,
	      'top': this.props.positionTop
	    };

	    var arrowStyle = {
	      'left': this.props.arrowOffsetLeft,
	      'top': this.props.arrowOffsetTop
	    };

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes), style: style }),
	      _react2['default'].createElement('div', { className: 'tooltip-arrow', style: arrowStyle }),
	      _react2['default'].createElement(
	        'div',
	        { className: 'tooltip-inner' },
	        this.props.children
	      )
	    );
	  }
	});

	exports['default'] = Tooltip;
	module.exports = exports['default'];

	// in class will be added by the FadeMixin when the animation property is true

/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _BootstrapMixin = __webpack_require__(53);

	var _BootstrapMixin2 = _interopRequireDefault(_BootstrapMixin);

	var Well = _react2['default'].createClass({
	  displayName: 'Well',

	  mixins: [_BootstrapMixin2['default']],

	  getDefaultProps: function getDefaultProps() {
	    return {
	      bsClass: 'well'
	    };
	  },

	  render: function render() {
	    var classes = this.getBsClassSet();

	    return _react2['default'].createElement(
	      'div',
	      _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, classes) }),
	      this.props.children
	    );
	  }
	});

	exports['default'] = Well;
	module.exports = exports['default'];

/***/ },
/* 102 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	var styleMaps = {
	  CLASSES: {
	    'alert': 'alert',
	    'button': 'btn',
	    'button-group': 'btn-group',
	    'button-toolbar': 'btn-toolbar',
	    'column': 'col',
	    'input-group': 'input-group',
	    'form': 'form',
	    'glyphicon': 'glyphicon',
	    'label': 'label',
	    'thumbnail': 'thumbnail',
	    'list-group-item': 'list-group-item',
	    'panel': 'panel',
	    'panel-group': 'panel-group',
	    'progress-bar': 'progress-bar',
	    'nav': 'nav',
	    'navbar': 'navbar',
	    'modal': 'modal',
	    'row': 'row',
	    'well': 'well'
	  },
	  STYLES: {
	    'default': 'default',
	    'primary': 'primary',
	    'success': 'success',
	    'info': 'info',
	    'warning': 'warning',
	    'danger': 'danger',
	    'link': 'link',
	    'inline': 'inline',
	    'tabs': 'tabs',
	    'pills': 'pills'
	  },
	  addStyle: function addStyle(name) {
	    styleMaps.STYLES[name] = name;
	  },
	  SIZES: {
	    'large': 'lg',
	    'medium': 'md',
	    'small': 'sm',
	    'xsmall': 'xs'
	  },
	  GLYPHS: ['asterisk', 'plus', 'euro', 'eur', 'minus', 'cloud', 'envelope', 'pencil', 'glass', 'music', 'search', 'heart', 'star', 'star-empty', 'user', 'film', 'th-large', 'th', 'th-list', 'ok', 'remove', 'zoom-in', 'zoom-out', 'off', 'signal', 'cog', 'trash', 'home', 'file', 'time', 'road', 'download-alt', 'download', 'upload', 'inbox', 'play-circle', 'repeat', 'refresh', 'list-alt', 'lock', 'flag', 'headphones', 'volume-off', 'volume-down', 'volume-up', 'qrcode', 'barcode', 'tag', 'tags', 'book', 'bookmark', 'print', 'camera', 'font', 'bold', 'italic', 'text-height', 'text-width', 'align-left', 'align-center', 'align-right', 'align-justify', 'list', 'indent-left', 'indent-right', 'facetime-video', 'picture', 'map-marker', 'adjust', 'tint', 'edit', 'share', 'check', 'move', 'step-backward', 'fast-backward', 'backward', 'play', 'pause', 'stop', 'forward', 'fast-forward', 'step-forward', 'eject', 'chevron-left', 'chevron-right', 'plus-sign', 'minus-sign', 'remove-sign', 'ok-sign', 'question-sign', 'info-sign', 'screenshot', 'remove-circle', 'ok-circle', 'ban-circle', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'share-alt', 'resize-full', 'resize-small', 'exclamation-sign', 'gift', 'leaf', 'fire', 'eye-open', 'eye-close', 'warning-sign', 'plane', 'calendar', 'random', 'comment', 'magnet', 'chevron-up', 'chevron-down', 'retweet', 'shopping-cart', 'folder-close', 'folder-open', 'resize-vertical', 'resize-horizontal', 'hdd', 'bullhorn', 'bell', 'certificate', 'thumbs-up', 'thumbs-down', 'hand-right', 'hand-left', 'hand-up', 'hand-down', 'circle-arrow-right', 'circle-arrow-left', 'circle-arrow-up', 'circle-arrow-down', 'globe', 'wrench', 'tasks', 'filter', 'briefcase', 'fullscreen', 'dashboard', 'paperclip', 'heart-empty', 'link', 'phone', 'pushpin', 'usd', 'gbp', 'sort', 'sort-by-alphabet', 'sort-by-alphabet-alt', 'sort-by-order', 'sort-by-order-alt', 'sort-by-attributes', 'sort-by-attributes-alt', 'unchecked', 'expand', 'collapse-down', 'collapse-up', 'log-in', 'flash', 'log-out', 'new-window', 'record', 'save', 'open', 'saved', 'import', 'export', 'send', 'floppy-disk', 'floppy-saved', 'floppy-remove', 'floppy-save', 'floppy-open', 'credit-card', 'transfer', 'cutlery', 'header', 'compressed', 'earphone', 'phone-alt', 'tower', 'stats', 'sd-video', 'hd-video', 'subtitles', 'sound-stereo', 'sound-dolby', 'sound-5-1', 'sound-6-1', 'sound-7-1', 'copyright-mark', 'registration-mark', 'cloud-download', 'cloud-upload', 'tree-conifer', 'tree-deciduous', 'cd', 'save-file', 'open-file', 'level-up', 'copy', 'paste', 'alert', 'equalizer', 'king', 'queen', 'pawn', 'bishop', 'knight', 'baby-formula', 'tent', 'blackboard', 'bed', 'apple', 'erase', 'hourglass', 'lamp', 'duplicate', 'piggy-bank', 'scissors', 'bitcoin', 'yen', 'ruble', 'scale', 'ice-lolly', 'ice-lolly-tasted', 'education', 'option-horizontal', 'option-vertical', 'menu-hamburger', 'modal-window', 'oil', 'grain', 'sunglasses', 'text-size', 'text-color', 'text-background', 'object-align-top', 'object-align-bottom', 'object-align-horizontal', 'object-align-left', 'object-align-vertical', 'object-align-right', 'triangle-right', 'triangle-left', 'triangle-bottom', 'triangle-top', 'console', 'superscript', 'subscript', 'menu-left', 'menu-right', 'menu-down', 'menu-up']
	};

	exports['default'] = styleMaps;
	module.exports = exports['default'];

/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (window) {
	    'use strict';

	    /*global define, module, exports, require */

	    var c3 = { version: "0.4.10" };

	    var c3_chart_fn,
	        c3_chart_internal_fn,
	        c3_chart_internal_axis_fn;

	    function API(owner) {
	        this.owner = owner;
	    }

	    function inherit(base, derived) {

	        if (Object.create) {
	            derived.prototype = Object.create(base.prototype);
	        } else {
	            var f = function f() {};
	            f.prototype = base.prototype;
	            derived.prototype = new f();
	        }

	        derived.prototype.constructor = derived;

	        return derived;
	    }

	    function Chart(config) {
	        var $$ = this.internal = new ChartInternal(this);
	        $$.loadConfig(config);
	        $$.init();

	        // bind "this" to nested API
	        (function bindThis(fn, target, argThis) {
	            Object.keys(fn).forEach(function (key) {
	                target[key] = fn[key].bind(argThis);
	                if (Object.keys(fn[key]).length > 0) {
	                    bindThis(fn[key], target[key], argThis);
	                }
	            });
	        })(c3_chart_fn, this, this);
	    }

	    function ChartInternal(api) {
	        var $$ = this;
	        $$.d3 = window.d3 ? window.d3 : true ? __webpack_require__(21) : undefined;
	        $$.api = api;
	        $$.config = $$.getDefaultConfig();
	        $$.data = {};
	        $$.cache = {};
	        $$.axes = {};
	    }

	    c3.generate = function (config) {
	        return new Chart(config);
	    };

	    c3.chart = {
	        fn: Chart.prototype,
	        internal: {
	            fn: ChartInternal.prototype,
	            axis: {
	                fn: Axis.prototype
	            }
	        }
	    };
	    c3_chart_fn = c3.chart.fn;
	    c3_chart_internal_fn = c3.chart.internal.fn;
	    c3_chart_internal_axis_fn = c3.chart.internal.axis.fn;

	    c3_chart_internal_fn.init = function () {
	        var $$ = this, config = $$.config;

	        $$.initParams();

	        if (config.data_url) {
	            $$.convertUrlToData(config.data_url, config.data_mimeType, config.data_keys, $$.initWithData);
	        }
	        else if (config.data_json) {
	            $$.initWithData($$.convertJsonToData(config.data_json, config.data_keys));
	        }
	        else if (config.data_rows) {
	            $$.initWithData($$.convertRowsToData(config.data_rows));
	        }
	        else if (config.data_columns) {
	            $$.initWithData($$.convertColumnsToData(config.data_columns));
	        }
	        else {
	            throw Error('url or json or rows or columns is required.');
	        }
	    };

	    c3_chart_internal_fn.initParams = function () {
	        var $$ = this, d3 = $$.d3, config = $$.config;

	        // MEMO: clipId needs to be unique because it conflicts when multiple charts exist
	        $$.clipId = "c3-" + (+new Date()) + '-clip',
	        $$.clipIdForXAxis = $$.clipId + '-xaxis',
	        $$.clipIdForYAxis = $$.clipId + '-yaxis',
	        $$.clipIdForGrid = $$.clipId + '-grid',
	        $$.clipIdForSubchart = $$.clipId + '-subchart',
	        $$.clipPath = $$.getClipPath($$.clipId),
	        $$.clipPathForXAxis = $$.getClipPath($$.clipIdForXAxis),
	        $$.clipPathForYAxis = $$.getClipPath($$.clipIdForYAxis);
	        $$.clipPathForGrid = $$.getClipPath($$.clipIdForGrid),
	        $$.clipPathForSubchart = $$.getClipPath($$.clipIdForSubchart),

	        $$.dragStart = null;
	        $$.dragging = false;
	        $$.flowing = false;
	        $$.cancelClick = false;
	        $$.mouseover = false;
	        $$.transiting = false;

	        $$.color = $$.generateColor();
	        $$.levelColor = $$.generateLevelColor();

	        $$.dataTimeFormat = config.data_xLocaltime ? d3.time.format : d3.time.format.utc;
	        $$.axisTimeFormat = config.axis_x_localtime ? d3.time.format : d3.time.format.utc;
	        $$.defaultAxisTimeFormat = $$.axisTimeFormat.multi([
	            [".%L", function (d) { return d.getMilliseconds(); }],
	            [":%S", function (d) { return d.getSeconds(); }],
	            ["%I:%M", function (d) { return d.getMinutes(); }],
	            ["%I %p", function (d) { return d.getHours(); }],
	            ["%-m/%-d", function (d) { return d.getDay() && d.getDate() !== 1; }],
	            ["%-m/%-d", function (d) { return d.getDate() !== 1; }],
	            ["%-m/%-d", function (d) { return d.getMonth(); }],
	            ["%Y/%-m/%-d", function () { return true; }]
	        ]);

	        $$.hiddenTargetIds = [];
	        $$.hiddenLegendIds = [];
	        $$.focusedTargetIds = [];
	        $$.defocusedTargetIds = [];

	        $$.xOrient = config.axis_rotated ? "left" : "bottom";
	        $$.yOrient = config.axis_rotated ? (config.axis_y_inner ? "top" : "bottom") : (config.axis_y_inner ? "right" : "left");
	        $$.y2Orient = config.axis_rotated ? (config.axis_y2_inner ? "bottom" : "top") : (config.axis_y2_inner ? "left" : "right");
	        $$.subXOrient = config.axis_rotated ? "left" : "bottom";

	        $$.isLegendRight = config.legend_position === 'right';
	        $$.isLegendInset = config.legend_position === 'inset';
	        $$.isLegendTop = config.legend_inset_anchor === 'top-left' || config.legend_inset_anchor === 'top-right';
	        $$.isLegendLeft = config.legend_inset_anchor === 'top-left' || config.legend_inset_anchor === 'bottom-left';
	        $$.legendStep = 0;
	        $$.legendItemWidth = 0;
	        $$.legendItemHeight = 0;

	        $$.currentMaxTickWidths = {
	            x: 0,
	            y: 0,
	            y2: 0
	        };

	        $$.rotated_padding_left = 30;
	        $$.rotated_padding_right = config.axis_rotated && !config.axis_x_show ? 0 : 30;
	        $$.rotated_padding_top = 5;

	        $$.withoutFadeIn = {};

	        $$.intervalForObserveInserted = undefined;

	        $$.axes.subx = d3.selectAll([]); // needs when excluding subchart.js
	    };

	    c3_chart_internal_fn.initChartElements = function () {
	        if (this.initBar) { this.initBar(); }
	        if (this.initLine) { this.initLine(); }
	        if (this.initArc) { this.initArc(); }
	        if (this.initGauge) { this.initGauge(); }
	        if (this.initText) { this.initText(); }
	    };

	    c3_chart_internal_fn.initWithData = function (data) {
	        var $$ = this, d3 = $$.d3, config = $$.config;
	        var defs, main, binding = true;

	        $$.axis = new Axis($$);

	        if ($$.initPie) { $$.initPie(); }
	        if ($$.initBrush) { $$.initBrush(); }
	        if ($$.initZoom) { $$.initZoom(); }

	        if (!config.bindto) {
	            $$.selectChart = d3.selectAll([]);
	        }
	        else if (typeof config.bindto.node === 'function') {
	            $$.selectChart = config.bindto;
	        }
	        else {
	            $$.selectChart = d3.select(config.bindto);
	        }
	        if ($$.selectChart.empty()) {
	            $$.selectChart = d3.select(document.createElement('div')).style('opacity', 0);
	            $$.observeInserted($$.selectChart);
	            binding = false;
	        }
	        $$.selectChart.html("").classed("c3", true);

	        // Init data as targets
	        $$.data.xs = {};
	        $$.data.targets = $$.convertDataToTargets(data);

	        if (config.data_filter) {
	            $$.data.targets = $$.data.targets.filter(config.data_filter);
	        }

	        // Set targets to hide if needed
	        if (config.data_hide) {
	            $$.addHiddenTargetIds(config.data_hide === true ? $$.mapToIds($$.data.targets) : config.data_hide);
	        }
	        if (config.legend_hide) {
	            $$.addHiddenLegendIds(config.legend_hide === true ? $$.mapToIds($$.data.targets) : config.legend_hide);
	        }

	        // when gauge, hide legend // TODO: fix
	        if ($$.hasType('gauge')) {
	            config.legend_show = false;
	        }

	        // Init sizes and scales
	        $$.updateSizes();
	        $$.updateScales();

	        // Set domains for each scale
	        $$.x.domain(d3.extent($$.getXDomain($$.data.targets)));
	        $$.y.domain($$.getYDomain($$.data.targets, 'y'));
	        $$.y2.domain($$.getYDomain($$.data.targets, 'y2'));
	        $$.subX.domain($$.x.domain());
	        $$.subY.domain($$.y.domain());
	        $$.subY2.domain($$.y2.domain());

	        // Save original x domain for zoom update
	        $$.orgXDomain = $$.x.domain();

	        // Set initialized scales to brush and zoom
	        if ($$.brush) { $$.brush.scale($$.subX); }
	        if (config.zoom_enabled) { $$.zoom.scale($$.x); }

	        /*-- Basic Elements --*/

	        // Define svgs
	        $$.svg = $$.selectChart.append("svg")
	            .style("overflow", "hidden")
	            .on('mouseenter', function () { return config.onmouseover.call($$); })
	            .on('mouseleave', function () { return config.onmouseout.call($$); });

	        // Define defs
	        defs = $$.svg.append("defs");
	        $$.clipChart = $$.appendClip(defs, $$.clipId);
	        $$.clipXAxis = $$.appendClip(defs, $$.clipIdForXAxis);
	        $$.clipYAxis = $$.appendClip(defs, $$.clipIdForYAxis);
	        $$.clipGrid = $$.appendClip(defs, $$.clipIdForGrid);
	        $$.clipSubchart = $$.appendClip(defs, $$.clipIdForSubchart);
	        $$.updateSvgSize();

	        // Define regions
	        main = $$.main = $$.svg.append("g").attr("transform", $$.getTranslate('main'));

	        if ($$.initSubchart) { $$.initSubchart(); }
	        if ($$.initTooltip) { $$.initTooltip(); }
	        if ($$.initLegend) { $$.initLegend(); }

	        /*-- Main Region --*/

	        // text when empty
	        main.append("text")
	            .attr("class", CLASS.text + ' ' + CLASS.empty)
	            .attr("text-anchor", "middle") // horizontal centering of text at x position in all browsers.
	            .attr("dominant-baseline", "middle"); // vertical centering of text at y position in all browsers, except IE.

	        // Regions
	        $$.initRegion();

	        // Grids
	        $$.initGrid();

	        // Define g for chart area
	        main.append('g')
	            .attr("clip-path", $$.clipPath)
	            .attr('class', CLASS.chart);

	        // Grid lines
	        if (config.grid_lines_front) { $$.initGridLines(); }

	        // Cover whole with rects for events
	        $$.initEventRect();

	        // Define g for chart
	        $$.initChartElements();

	        // if zoom privileged, insert rect to forefront
	        // TODO: is this needed?
	        main.insert('rect', config.zoom_privileged ? null : 'g.' + CLASS.regions)
	            .attr('class', CLASS.zoomRect)
	            .attr('width', $$.width)
	            .attr('height', $$.height)
	            .style('opacity', 0)
	            .on("dblclick.zoom", null);

	        // Set default extent if defined
	        if (config.axis_x_extent) { $$.brush.extent($$.getDefaultExtent()); }

	        // Add Axis
	        $$.axis.init();

	        // Set targets
	        $$.updateTargets($$.data.targets);

	        // Draw with targets
	        if (binding) {
	            $$.updateDimension();
	            $$.config.oninit.call($$);
	            $$.redraw({
	                withTransition: false,
	                withTransform: true,
	                withUpdateXDomain: true,
	                withUpdateOrgXDomain: true,
	                withTransitionForAxis: false
	            });
	        }

	        // Bind resize event
	        if (window.onresize == null) {
	            window.onresize = $$.generateResize();
	        }
	        if (window.onresize.add) {
	            window.onresize.add(function () {
	                config.onresize.call($$);
	            });
	            window.onresize.add(function () {
	                $$.api.flush();
	            });
	            window.onresize.add(function () {
	                config.onresized.call($$);
	            });
	        }

	        // export element of the chart
	        $$.api.element = $$.selectChart.node();
	    };

	    c3_chart_internal_fn.smoothLines = function (el, type) {
	        var $$ = this;
	        if (type === 'grid') {
	            el.each(function () {
	                var g = $$.d3.select(this),
	                    x1 = g.attr('x1'),
	                    x2 = g.attr('x2'),
	                    y1 = g.attr('y1'),
	                    y2 = g.attr('y2');
	                g.attr({
	                    'x1': Math.ceil(x1),
	                    'x2': Math.ceil(x2),
	                    'y1': Math.ceil(y1),
	                    'y2': Math.ceil(y2)
	                });
	            });
	        }
	    };


	    c3_chart_internal_fn.updateSizes = function () {
	        var $$ = this, config = $$.config;
	        var legendHeight = $$.legend ? $$.getLegendHeight() : 0,
	            legendWidth = $$.legend ? $$.getLegendWidth() : 0,
	            legendHeightForBottom = $$.isLegendRight || $$.isLegendInset ? 0 : legendHeight,
	            hasArc = $$.hasArcType(),
	            xAxisHeight = config.axis_rotated || hasArc ? 0 : $$.getHorizontalAxisHeight('x'),
	            subchartHeight = config.subchart_show && !hasArc ? (config.subchart_size_height + xAxisHeight) : 0;

	        $$.currentWidth = $$.getCurrentWidth();
	        $$.currentHeight = $$.getCurrentHeight();

	        // for main
	        $$.margin = config.axis_rotated ? {
	            top: $$.getHorizontalAxisHeight('y2') + $$.getCurrentPaddingTop(),
	            right: hasArc ? 0 : $$.getCurrentPaddingRight(),
	            bottom: $$.getHorizontalAxisHeight('y') + legendHeightForBottom + $$.getCurrentPaddingBottom(),
	            left: subchartHeight + (hasArc ? 0 : $$.getCurrentPaddingLeft())
	        } : {
	            top: 4 + $$.getCurrentPaddingTop(), // for top tick text
	            right: hasArc ? 0 : $$.getCurrentPaddingRight(),
	            bottom: xAxisHeight + subchartHeight + legendHeightForBottom + $$.getCurrentPaddingBottom(),
	            left: hasArc ? 0 : $$.getCurrentPaddingLeft()
	        };

	        // for subchart
	        $$.margin2 = config.axis_rotated ? {
	            top: $$.margin.top,
	            right: NaN,
	            bottom: 20 + legendHeightForBottom,
	            left: $$.rotated_padding_left
	        } : {
	            top: $$.currentHeight - subchartHeight - legendHeightForBottom,
	            right: NaN,
	            bottom: xAxisHeight + legendHeightForBottom,
	            left: $$.margin.left
	        };

	        // for legend
	        $$.margin3 = {
	            top: 0,
	            right: NaN,
	            bottom: 0,
	            left: 0
	        };
	        if ($$.updateSizeForLegend) { $$.updateSizeForLegend(legendHeight, legendWidth); }

	        $$.width = $$.currentWidth - $$.margin.left - $$.margin.right;
	        $$.height = $$.currentHeight - $$.margin.top - $$.margin.bottom;
	        if ($$.width < 0) { $$.width = 0; }
	        if ($$.height < 0) { $$.height = 0; }

	        $$.width2 = config.axis_rotated ? $$.margin.left - $$.rotated_padding_left - $$.rotated_padding_right : $$.width;
	        $$.height2 = config.axis_rotated ? $$.height : $$.currentHeight - $$.margin2.top - $$.margin2.bottom;
	        if ($$.width2 < 0) { $$.width2 = 0; }
	        if ($$.height2 < 0) { $$.height2 = 0; }

	        // for arc
	        $$.arcWidth = $$.width - ($$.isLegendRight ? legendWidth + 10 : 0);
	        $$.arcHeight = $$.height - ($$.isLegendRight ? 0 : 10);
	        if ($$.hasType('gauge')) {
	            $$.arcHeight += $$.height - $$.getGaugeLabelHeight();
	        }
	        if ($$.updateRadius) { $$.updateRadius(); }

	        if ($$.isLegendRight && hasArc) {
	            $$.margin3.left = $$.arcWidth / 2 + $$.radiusExpanded * 1.1;
	        }
	    };

	    c3_chart_internal_fn.updateTargets = function (targets) {
	        var $$ = this;

	        /*-- Main --*/

	        //-- Text --//
	        $$.updateTargetsForText(targets);

	        //-- Bar --//
	        $$.updateTargetsForBar(targets);

	        //-- Line --//
	        $$.updateTargetsForLine(targets);

	        //-- Arc --//
	        if ($$.hasArcType() && $$.updateTargetsForArc) { $$.updateTargetsForArc(targets); }

	        /*-- Sub --*/

	        if ($$.updateTargetsForSubchart) { $$.updateTargetsForSubchart(targets); }

	        // Fade-in each chart
	        $$.showTargets();
	    };
	    c3_chart_internal_fn.showTargets = function () {
	        var $$ = this;
	        $$.svg.selectAll('.' + CLASS.target).filter(function (d) { return $$.isTargetToShow(d.id); })
	          .transition().duration($$.config.transition_duration)
	            .style("opacity", 1);
	    };

	    c3_chart_internal_fn.redraw = function (options, transitions) {
	        var $$ = this, main = $$.main, d3 = $$.d3, config = $$.config;
	        var areaIndices = $$.getShapeIndices($$.isAreaType), barIndices = $$.getShapeIndices($$.isBarType), lineIndices = $$.getShapeIndices($$.isLineType);
	        var withY, withSubchart, withTransition, withTransitionForExit, withTransitionForAxis,
	            withTransform, withUpdateXDomain, withUpdateOrgXDomain, withTrimXDomain, withLegend,
	            withEventRect, withDimension, withUpdateXAxis;
	        var hideAxis = $$.hasArcType();
	        var drawArea, drawBar, drawLine, xForText, yForText;
	        var duration, durationForExit, durationForAxis;
	        var waitForDraw, flow;
	        var targetsToShow = $$.filterTargetsToShow($$.data.targets), tickValues, i, intervalForCulling, xDomainForZoom;
	        var xv = $$.xv.bind($$), cx, cy;

	        options = options || {};
	        withY = getOption(options, "withY", true);
	        withSubchart = getOption(options, "withSubchart", true);
	        withTransition = getOption(options, "withTransition", true);
	        withTransform = getOption(options, "withTransform", false);
	        withUpdateXDomain = getOption(options, "withUpdateXDomain", false);
	        withUpdateOrgXDomain = getOption(options, "withUpdateOrgXDomain", false);
	        withTrimXDomain = getOption(options, "withTrimXDomain", true);
	        withUpdateXAxis = getOption(options, "withUpdateXAxis", withUpdateXDomain);
	        withLegend = getOption(options, "withLegend", false);
	        withEventRect = getOption(options, "withEventRect", true);
	        withDimension = getOption(options, "withDimension", true);
	        withTransitionForExit = getOption(options, "withTransitionForExit", withTransition);
	        withTransitionForAxis = getOption(options, "withTransitionForAxis", withTransition);

	        duration = withTransition ? config.transition_duration : 0;
	        durationForExit = withTransitionForExit ? duration : 0;
	        durationForAxis = withTransitionForAxis ? duration : 0;

	        transitions = transitions || $$.axis.generateTransitions(durationForAxis);

	        // update legend and transform each g
	        if (withLegend && config.legend_show) {
	            $$.updateLegend($$.mapToIds($$.data.targets), options, transitions);
	        } else if (withDimension) {
	            // need to update dimension (e.g. axis.y.tick.values) because y tick values should change
	            // no need to update axis in it because they will be updated in redraw()
	            $$.updateDimension(true);
	        }

	        // MEMO: needed for grids calculation
	        if ($$.isCategorized() && targetsToShow.length === 0) {
	            $$.x.domain([0, $$.axes.x.selectAll('.tick').size()]);
	        }

	        if (targetsToShow.length) {
	            $$.updateXDomain(targetsToShow, withUpdateXDomain, withUpdateOrgXDomain, withTrimXDomain);
	            if (!config.axis_x_tick_values) {
	                tickValues = $$.axis.updateXAxisTickValues(targetsToShow);
	            }
	        } else {
	            $$.xAxis.tickValues([]);
	            $$.subXAxis.tickValues([]);
	        }

	        if (config.zoom_rescale && !options.flow) {
	            xDomainForZoom = $$.x.orgDomain();
	        }

	        $$.y.domain($$.getYDomain(targetsToShow, 'y', xDomainForZoom));
	        $$.y2.domain($$.getYDomain(targetsToShow, 'y2', xDomainForZoom));

	        if (!config.axis_y_tick_values && config.axis_y_tick_count) {
	            $$.yAxis.tickValues($$.axis.generateTickValues($$.y.domain(), config.axis_y_tick_count));
	        }
	        if (!config.axis_y2_tick_values && config.axis_y2_tick_count) {
	            $$.y2Axis.tickValues($$.axis.generateTickValues($$.y2.domain(), config.axis_y2_tick_count));
	        }

	        // axes
	        $$.axis.redraw(transitions, hideAxis);

	        // Update axis label
	        $$.axis.updateLabels(withTransition);

	        // show/hide if manual culling needed
	        if ((withUpdateXDomain || withUpdateXAxis) && targetsToShow.length) {
	            if (config.axis_x_tick_culling && tickValues) {
	                for (i = 1; i < tickValues.length; i++) {
	                    if (tickValues.length / i < config.axis_x_tick_culling_max) {
	                        intervalForCulling = i;
	                        break;
	                    }
	                }
	                $$.svg.selectAll('.' + CLASS.axisX + ' .tick text').each(function (e) {
	                    var index = tickValues.indexOf(e);
	                    if (index >= 0) {
	                        d3.select(this).style('display', index % intervalForCulling ? 'none' : 'block');
	                    }
	                });
	            } else {
	                $$.svg.selectAll('.' + CLASS.axisX + ' .tick text').style('display', 'block');
	            }
	        }

	        // setup drawer - MEMO: these must be called after axis updated
	        drawArea = $$.generateDrawArea ? $$.generateDrawArea(areaIndices, false) : undefined;
	        drawBar = $$.generateDrawBar ? $$.generateDrawBar(barIndices) : undefined;
	        drawLine = $$.generateDrawLine ? $$.generateDrawLine(lineIndices, false) : undefined;
	        xForText = $$.generateXYForText(areaIndices, barIndices, lineIndices, true);
	        yForText = $$.generateXYForText(areaIndices, barIndices, lineIndices, false);

	        // Update sub domain
	        if (withY) {
	            $$.subY.domain($$.getYDomain(targetsToShow, 'y'));
	            $$.subY2.domain($$.getYDomain(targetsToShow, 'y2'));
	        }

	        // tooltip
	        $$.tooltip.style("display", "none");

	        // xgrid focus
	        $$.updateXgridFocus();

	        // Data empty label positioning and text.
	        main.select("text." + CLASS.text + '.' + CLASS.empty)
	            .attr("x", $$.width / 2)
	            .attr("y", $$.height / 2)
	            .text(config.data_empty_label_text)
	          .transition()
	            .style('opacity', targetsToShow.length ? 0 : 1);

	        // grid
	        $$.updateGrid(duration);

	        // rect for regions
	        $$.updateRegion(duration);

	        // bars
	        $$.updateBar(durationForExit);

	        // lines, areas and cricles
	        $$.updateLine(durationForExit);
	        $$.updateArea(durationForExit);
	        $$.updateCircle();

	        // text
	        if ($$.hasDataLabel()) {
	            $$.updateText(durationForExit);
	        }

	        // arc
	        if ($$.redrawArc) { $$.redrawArc(duration, durationForExit, withTransform); }

	        // subchart
	        if ($$.redrawSubchart) {
	            $$.redrawSubchart(withSubchart, transitions, duration, durationForExit, areaIndices, barIndices, lineIndices);
	        }

	        // circles for select
	        main.selectAll('.' + CLASS.selectedCircles)
	            .filter($$.isBarType.bind($$))
	            .selectAll('circle')
	            .remove();

	        // event rects will redrawn when flow called
	        if (config.interaction_enabled && !options.flow && withEventRect) {
	            $$.redrawEventRect();
	            if ($$.updateZoom) { $$.updateZoom(); }
	        }

	        // update circleY based on updated parameters
	        $$.updateCircleY();

	        // generate circle x/y functions depending on updated params
	        cx = ($$.config.axis_rotated ? $$.circleY : $$.circleX).bind($$);
	        cy = ($$.config.axis_rotated ? $$.circleX : $$.circleY).bind($$);

	        if (options.flow) {
	            flow = $$.generateFlow({
	                targets: targetsToShow,
	                flow: options.flow,
	                duration: options.flow.duration,
	                drawBar: drawBar,
	                drawLine: drawLine,
	                drawArea: drawArea,
	                cx: cx,
	                cy: cy,
	                xv: xv,
	                xForText: xForText,
	                yForText: yForText
	            });
	        }

	        if ((duration || flow) && $$.isTabVisible()) { // Only use transition if tab visible. See #938.
	            // transition should be derived from one transition
	            d3.transition().duration(duration).each(function () {
	                var transitionsToWait = [];

	                // redraw and gather transitions
	                [
	                    $$.redrawBar(drawBar, true),
	                    $$.redrawLine(drawLine, true),
	                    $$.redrawArea(drawArea, true),
	                    $$.redrawCircle(cx, cy, true),
	                    $$.redrawText(xForText, yForText, options.flow, true),
	                    $$.redrawRegion(true),
	                    $$.redrawGrid(true),
	                ].forEach(function (transitions) {
	                    transitions.forEach(function (transition) {
	                        transitionsToWait.push(transition);
	                    });
	                });

	                // Wait for end of transitions to call flow and onrendered callback
	                waitForDraw = $$.generateWait();
	                transitionsToWait.forEach(function (t) {
	                    waitForDraw.add(t);
	                });
	            })
	            .call(waitForDraw, function () {
	                if (flow) {
	                    flow();
	                }
	                if (config.onrendered) {
	                    config.onrendered.call($$);
	                }
	            });
	        }
	        else {
	            $$.redrawBar(drawBar);
	            $$.redrawLine(drawLine);
	            $$.redrawArea(drawArea);
	            $$.redrawCircle(cx, cy);
	            $$.redrawText(xForText, yForText, options.flow);
	            $$.redrawRegion();
	            $$.redrawGrid();
	            if (config.onrendered) {
	                config.onrendered.call($$);
	            }
	        }

	        // update fadein condition
	        $$.mapToIds($$.data.targets).forEach(function (id) {
	            $$.withoutFadeIn[id] = true;
	        });
	    };

	    c3_chart_internal_fn.updateAndRedraw = function (options) {
	        var $$ = this, config = $$.config, transitions;
	        options = options || {};
	        // same with redraw
	        options.withTransition = getOption(options, "withTransition", true);
	        options.withTransform = getOption(options, "withTransform", false);
	        options.withLegend = getOption(options, "withLegend", false);
	        // NOT same with redraw
	        options.withUpdateXDomain = true;
	        options.withUpdateOrgXDomain = true;
	        options.withTransitionForExit = false;
	        options.withTransitionForTransform = getOption(options, "withTransitionForTransform", options.withTransition);
	        // MEMO: this needs to be called before updateLegend and it means this ALWAYS needs to be called)
	        $$.updateSizes();
	        // MEMO: called in updateLegend in redraw if withLegend
	        if (!(options.withLegend && config.legend_show)) {
	            transitions = $$.axis.generateTransitions(options.withTransitionForAxis ? config.transition_duration : 0);
	            // Update scales
	            $$.updateScales();
	            $$.updateSvgSize();
	            // Update g positions
	            $$.transformAll(options.withTransitionForTransform, transitions);
	        }
	        // Draw with new sizes & scales
	        $$.redraw(options, transitions);
	    };
	    c3_chart_internal_fn.redrawWithoutRescale = function () {
	        this.redraw({
	            withY: false,
	            withSubchart: false,
	            withEventRect: false,
	            withTransitionForAxis: false
	        });
	    };

	    c3_chart_internal_fn.isTimeSeries = function () {
	        return this.config.axis_x_type === 'timeseries';
	    };
	    c3_chart_internal_fn.isCategorized = function () {
	        return this.config.axis_x_type.indexOf('categor') >= 0;
	    };
	    c3_chart_internal_fn.isCustomX = function () {
	        var $$ = this, config = $$.config;
	        return !$$.isTimeSeries() && (config.data_x || notEmpty(config.data_xs));
	    };

	    c3_chart_internal_fn.isTimeSeriesY = function () {
	        return this.config.axis_y_type === 'timeseries';
	    };

	    c3_chart_internal_fn.getTranslate = function (target) {
	        var $$ = this, config = $$.config, x, y;
	        if (target === 'main') {
	            x = asHalfPixel($$.margin.left);
	            y = asHalfPixel($$.margin.top);
	        } else if (target === 'context') {
	            x = asHalfPixel($$.margin2.left);
	            y = asHalfPixel($$.margin2.top);
	        } else if (target === 'legend') {
	            x = $$.margin3.left;
	            y = $$.margin3.top;
	        } else if (target === 'x') {
	            x = 0;
	            y = config.axis_rotated ? 0 : $$.height;
	        } else if (target === 'y') {
	            x = 0;
	            y = config.axis_rotated ? $$.height : 0;
	        } else if (target === 'y2') {
	            x = config.axis_rotated ? 0 : $$.width;
	            y = config.axis_rotated ? 1 : 0;
	        } else if (target === 'subx') {
	            x = 0;
	            y = config.axis_rotated ? 0 : $$.height2;
	        } else if (target === 'arc') {
	            x = $$.arcWidth / 2;
	            y = $$.arcHeight / 2;
	        }
	        return "translate(" + x + "," + y + ")";
	    };
	    c3_chart_internal_fn.initialOpacity = function (d) {
	        return d.value !== null && this.withoutFadeIn[d.id] ? 1 : 0;
	    };
	    c3_chart_internal_fn.initialOpacityForCircle = function (d) {
	        return d.value !== null && this.withoutFadeIn[d.id] ? this.opacityForCircle(d) : 0;
	    };
	    c3_chart_internal_fn.opacityForCircle = function (d) {
	        var opacity = this.config.point_show ? 1 : 0;
	        return isValue(d.value) ? (this.isScatterType(d) ? 0.5 : opacity) : 0;
	    };
	    c3_chart_internal_fn.opacityForText = function () {
	        return this.hasDataLabel() ? 1 : 0;
	    };
	    c3_chart_internal_fn.xx = function (d) {
	        return d ? this.x(d.x) : null;
	    };
	    c3_chart_internal_fn.xv = function (d) {
	        var $$ = this, value = d.value;
	        if ($$.isTimeSeries()) {
	            value = $$.parseDate(d.value);
	        }
	        else if ($$.isCategorized() && typeof d.value === 'string') {
	            value = $$.config.axis_x_categories.indexOf(d.value);
	        }
	        return Math.ceil($$.x(value));
	    };
	    c3_chart_internal_fn.yv = function (d) {
	        var $$ = this,
	            yScale = d.axis && d.axis === 'y2' ? $$.y2 : $$.y;
	        return Math.ceil(yScale(d.value));
	    };
	    c3_chart_internal_fn.subxx = function (d) {
	        return d ? this.subX(d.x) : null;
	    };

	    c3_chart_internal_fn.transformMain = function (withTransition, transitions) {
	        var $$ = this,
	            xAxis, yAxis, y2Axis;
	        if (transitions && transitions.axisX) {
	            xAxis = transitions.axisX;
	        } else {
	            xAxis  = $$.main.select('.' + CLASS.axisX);
	            if (withTransition) { xAxis = xAxis.transition(); }
	        }
	        if (transitions && transitions.axisY) {
	            yAxis = transitions.axisY;
	        } else {
	            yAxis = $$.main.select('.' + CLASS.axisY);
	            if (withTransition) { yAxis = yAxis.transition(); }
	        }
	        if (transitions && transitions.axisY2) {
	            y2Axis = transitions.axisY2;
	        } else {
	            y2Axis = $$.main.select('.' + CLASS.axisY2);
	            if (withTransition) { y2Axis = y2Axis.transition(); }
	        }
	        (withTransition ? $$.main.transition() : $$.main).attr("transform", $$.getTranslate('main'));
	        xAxis.attr("transform", $$.getTranslate('x'));
	        yAxis.attr("transform", $$.getTranslate('y'));
	        y2Axis.attr("transform", $$.getTranslate('y2'));
	        $$.main.select('.' + CLASS.chartArcs).attr("transform", $$.getTranslate('arc'));
	    };
	    c3_chart_internal_fn.transformAll = function (withTransition, transitions) {
	        var $$ = this;
	        $$.transformMain(withTransition, transitions);
	        if ($$.config.subchart_show) { $$.transformContext(withTransition, transitions); }
	        if ($$.legend) { $$.transformLegend(withTransition); }
	    };

	    c3_chart_internal_fn.updateSvgSize = function () {
	        var $$ = this,
	            brush = $$.svg.select(".c3-brush .background");
	        $$.svg.attr('width', $$.currentWidth).attr('height', $$.currentHeight);
	        $$.svg.selectAll(['#' + $$.clipId, '#' + $$.clipIdForGrid]).select('rect')
	            .attr('width', $$.width)
	            .attr('height', $$.height);
	        $$.svg.select('#' + $$.clipIdForXAxis).select('rect')
	            .attr('x', $$.getXAxisClipX.bind($$))
	            .attr('y', $$.getXAxisClipY.bind($$))
	            .attr('width', $$.getXAxisClipWidth.bind($$))
	            .attr('height', $$.getXAxisClipHeight.bind($$));
	        $$.svg.select('#' + $$.clipIdForYAxis).select('rect')
	            .attr('x', $$.getYAxisClipX.bind($$))
	            .attr('y', $$.getYAxisClipY.bind($$))
	            .attr('width', $$.getYAxisClipWidth.bind($$))
	            .attr('height', $$.getYAxisClipHeight.bind($$));
	        $$.svg.select('#' + $$.clipIdForSubchart).select('rect')
	            .attr('width', $$.width)
	            .attr('height', brush.size() ? brush.attr('height') : 0);
	        $$.svg.select('.' + CLASS.zoomRect)
	            .attr('width', $$.width)
	            .attr('height', $$.height);
	        // MEMO: parent div's height will be bigger than svg when <!DOCTYPE html>
	        $$.selectChart.style('max-height', $$.currentHeight + "px");
	    };


	    c3_chart_internal_fn.updateDimension = function (withoutAxis) {
	        var $$ = this;
	        if (!withoutAxis) {
	            if ($$.config.axis_rotated) {
	                $$.axes.x.call($$.xAxis);
	                $$.axes.subx.call($$.subXAxis);
	            } else {
	                $$.axes.y.call($$.yAxis);
	                $$.axes.y2.call($$.y2Axis);
	            }
	        }
	        $$.updateSizes();
	        $$.updateScales();
	        $$.updateSvgSize();
	        $$.transformAll(false);
	    };

	    c3_chart_internal_fn.observeInserted = function (selection) {
	        var $$ = this, observer;
	        if (typeof MutationObserver === 'undefined') {
	            window.console.error("MutationObserver not defined.");
	            return;
	        }
	        observer= new MutationObserver(function (mutations) {
	            mutations.forEach(function (mutation) {
	                if (mutation.type === 'childList' && mutation.previousSibling) {
	                    observer.disconnect();
	                    // need to wait for completion of load because size calculation requires the actual sizes determined after that completion
	                    $$.intervalForObserveInserted = window.setInterval(function () {
	                        // parentNode will NOT be null when completed
	                        if (selection.node().parentNode) {
	                            window.clearInterval($$.intervalForObserveInserted);
	                            $$.updateDimension();
	                            $$.config.oninit.call($$);
	                            $$.redraw({
	                                withTransform: true,
	                                withUpdateXDomain: true,
	                                withUpdateOrgXDomain: true,
	                                withTransition: false,
	                                withTransitionForTransform: false,
	                                withLegend: true
	                            });
	                            selection.transition().style('opacity', 1);
	                        }
	                    }, 10);
	                }
	            });
	        });
	        observer.observe(selection.node(), {attributes: true, childList: true, characterData: true});
	    };


	    c3_chart_internal_fn.generateResize = function () {
	        var resizeFunctions = [];
	        function callResizeFunctions() {
	            resizeFunctions.forEach(function (f) {
	                f();
	            });
	        }
	        callResizeFunctions.add = function (f) {
	            resizeFunctions.push(f);
	        };
	        return callResizeFunctions;
	    };

	    c3_chart_internal_fn.endall = function (transition, callback) {
	        var n = 0;
	        transition
	            .each(function () { ++n; })
	            .each("end", function () {
	                if (!--n) { callback.apply(this, arguments); }
	            });
	    };
	    c3_chart_internal_fn.generateWait = function () {
	        var transitionsToWait = [],
	            f = function (transition, callback) {
	                var timer = setInterval(function () {
	                    var done = 0;
	                    transitionsToWait.forEach(function (t) {
	                        if (t.empty()) {
	                            done += 1;
	                            return;
	                        }
	                        try {
	                            t.transition();
	                        } catch (e) {
	                            done += 1;
	                        }
	                    });
	                    if (done === transitionsToWait.length) {
	                        clearInterval(timer);
	                        if (callback) { callback(); }
	                    }
	                }, 10);
	            };
	        f.add = function (transition) {
	            transitionsToWait.push(transition);
	        };
	        return f;
	    };

	    c3_chart_internal_fn.parseDate = function (date) {
	        var $$ = this, parsedDate;
	        if (date instanceof Date) {
	            parsedDate = date;
	        } else if (typeof date === 'string') {
	            parsedDate = $$.dataTimeFormat($$.config.data_xFormat).parse(date);
	        } else if (typeof date === 'number' || !isNaN(date)) {
	            parsedDate = new Date(+date);
	        }
	        if (!parsedDate || isNaN(+parsedDate)) {
	            window.console.error("Failed to parse x '" + date + "' to Date object");
	        }
	        return parsedDate;
	    };

	    c3_chart_internal_fn.isTabVisible = function () {
	        var hidden;
	        if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
	            hidden = "hidden";
	        } else if (typeof document.mozHidden !== "undefined") {
	            hidden = "mozHidden";
	        } else if (typeof document.msHidden !== "undefined") {
	            hidden = "msHidden";
	        } else if (typeof document.webkitHidden !== "undefined") {
	            hidden = "webkitHidden";
	        }

	        return document[hidden] ? false : true;
	    };

	    c3_chart_internal_fn.getDefaultConfig = function () {
	        var config = {
	            bindto: '#chart',
	            size_width: undefined,
	            size_height: undefined,
	            padding_left: undefined,
	            padding_right: undefined,
	            padding_top: undefined,
	            padding_bottom: undefined,
	            zoom_enabled: false,
	            zoom_extent: undefined,
	            zoom_privileged: false,
	            zoom_rescale: false,
	            zoom_onzoom: function () {},
	            zoom_onzoomstart: function () {},
	            zoom_onzoomend: function () {},
	            interaction_enabled: true,
	            onmouseover: function () {},
	            onmouseout: function () {},
	            onresize: function () {},
	            onresized: function () {},
	            oninit: function () {},
	            onrendered: function () {},
	            transition_duration: 350,
	            data_x: undefined,
	            data_xs: {},
	            data_xFormat: '%Y-%m-%d',
	            data_xLocaltime: true,
	            data_xSort: true,
	            data_idConverter: function (id) { return id; },
	            data_names: {},
	            data_classes: {},
	            data_groups: [],
	            data_axes: {},
	            data_type: undefined,
	            data_types: {},
	            data_labels: {},
	            data_order: 'desc',
	            data_regions: {},
	            data_color: undefined,
	            data_colors: {},
	            data_hide: false,
	            data_filter: undefined,
	            data_selection_enabled: false,
	            data_selection_grouped: false,
	            data_selection_isselectable: function () { return true; },
	            data_selection_multiple: true,
	            data_selection_draggable: false,
	            data_onclick: function () {},
	            data_onmouseover: function () {},
	            data_onmouseout: function () {},
	            data_onselected: function () {},
	            data_onunselected: function () {},
	            data_url: undefined,
	            data_json: undefined,
	            data_rows: undefined,
	            data_columns: undefined,
	            data_mimeType: undefined,
	            data_keys: undefined,
	            // configuration for no plot-able data supplied.
	            data_empty_label_text: "",
	            // subchart
	            subchart_show: false,
	            subchart_size_height: 60,
	            subchart_onbrush: function () {},
	            // color
	            color_pattern: [],
	            color_threshold: {},
	            // legend
	            legend_show: true,
	            legend_hide: false,
	            legend_position: 'bottom',
	            legend_inset_anchor: 'top-left',
	            legend_inset_x: 10,
	            legend_inset_y: 0,
	            legend_inset_step: undefined,
	            legend_item_onclick: undefined,
	            legend_item_onmouseover: undefined,
	            legend_item_onmouseout: undefined,
	            legend_equally: false,
	            // axis
	            axis_rotated: false,
	            axis_x_show: true,
	            axis_x_type: 'indexed',
	            axis_x_localtime: true,
	            axis_x_categories: [],
	            axis_x_tick_centered: false,
	            axis_x_tick_format: undefined,
	            axis_x_tick_culling: {},
	            axis_x_tick_culling_max: 10,
	            axis_x_tick_count: undefined,
	            axis_x_tick_fit: true,
	            axis_x_tick_values: null,
	            axis_x_tick_rotate: 0,
	            axis_x_tick_outer: true,
	            axis_x_tick_multiline: true,
	            axis_x_tick_width: null,
	            axis_x_max: undefined,
	            axis_x_min: undefined,
	            axis_x_padding: {},
	            axis_x_height: undefined,
	            axis_x_extent: undefined,
	            axis_x_label: {},
	            axis_y_show: true,
	            axis_y_type: undefined,
	            axis_y_max: undefined,
	            axis_y_min: undefined,
	            axis_y_inverted: false,
	            axis_y_center: undefined,
	            axis_y_inner: undefined,
	            axis_y_label: {},
	            axis_y_tick_format: undefined,
	            axis_y_tick_outer: true,
	            axis_y_tick_values: null,
	            axis_y_tick_count: undefined,
	            axis_y_tick_time_value: undefined,
	            axis_y_tick_time_interval: undefined,
	            axis_y_padding: {},
	            axis_y_default: undefined,
	            axis_y2_show: false,
	            axis_y2_max: undefined,
	            axis_y2_min: undefined,
	            axis_y2_inverted: false,
	            axis_y2_center: undefined,
	            axis_y2_inner: undefined,
	            axis_y2_label: {},
	            axis_y2_tick_format: undefined,
	            axis_y2_tick_outer: true,
	            axis_y2_tick_values: null,
	            axis_y2_tick_count: undefined,
	            axis_y2_padding: {},
	            axis_y2_default: undefined,
	            // grid
	            grid_x_show: false,
	            grid_x_type: 'tick',
	            grid_x_lines: [],
	            grid_y_show: false,
	            // not used
	            // grid_y_type: 'tick',
	            grid_y_lines: [],
	            grid_y_ticks: 10,
	            grid_focus_show: true,
	            grid_lines_front: true,
	            // point - point of each data
	            point_show: true,
	            point_r: 2.5,
	            point_focus_expand_enabled: true,
	            point_focus_expand_r: undefined,
	            point_select_r: undefined,
	            // line
	            line_connectNull: false,
	            line_step_type: 'step',
	            // bar
	            bar_width: undefined,
	            bar_width_ratio: 0.6,
	            bar_width_max: undefined,
	            bar_zerobased: true,
	            // area
	            area_zerobased: true,
	            // pie
	            pie_label_show: true,
	            pie_label_format: undefined,
	            pie_label_threshold: 0.05,
	            pie_expand: true,
	            // gauge
	            gauge_label_show: true,
	            gauge_label_format: undefined,
	            gauge_expand: true,
	            gauge_min: 0,
	            gauge_max: 100,
	            gauge_units: undefined,
	            gauge_width: undefined,
	            // donut
	            donut_label_show: true,
	            donut_label_format: undefined,
	            donut_label_threshold: 0.05,
	            donut_width: undefined,
	            donut_expand: true,
	            donut_title: "",
	            // region - region to change style
	            regions: [],
	            // tooltip - show when mouseover on each data
	            tooltip_show: true,
	            tooltip_grouped: true,
	            tooltip_format_title: undefined,
	            tooltip_format_name: undefined,
	            tooltip_format_value: undefined,
	            tooltip_position: undefined,
	            tooltip_contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
	                return this.getTooltipContent ? this.getTooltipContent(d, defaultTitleFormat, defaultValueFormat, color) : '';
	            },
	            tooltip_init_show: false,
	            tooltip_init_x: 0,
	            tooltip_init_position: {top: '0px', left: '50px'}
	        };

	        Object.keys(this.additionalConfig).forEach(function (key) {
	            config[key] = this.additionalConfig[key];
	        }, this);

	        return config;
	    };
	    c3_chart_internal_fn.additionalConfig = {};

	    c3_chart_internal_fn.loadConfig = function (config) {
	        var this_config = this.config, target, keys, read;
	        function find() {
	            var key = keys.shift();
	    //        console.log("key =>", key, ", target =>", target);
	            if (key && target && typeof target === 'object' && key in target) {
	                target = target[key];
	                return find();
	            }
	            else if (!key) {
	                return target;
	            }
	            else {
	                return undefined;
	            }
	        }
	        Object.keys(this_config).forEach(function (key) {
	            target = config;
	            keys = key.split('_');
	            read = find();
	    //        console.log("CONFIG : ", key, read);
	            if (isDefined(read)) {
	                this_config[key] = read;
	            }
	        });
	    };

	    c3_chart_internal_fn.getScale = function (min, max, forTimeseries) {
	        return (forTimeseries ? this.d3.time.scale() : this.d3.scale.linear()).range([min, max]);
	    };
	    c3_chart_internal_fn.getX = function (min, max, domain, offset) {
	        var $$ = this,
	            scale = $$.getScale(min, max, $$.isTimeSeries()),
	            _scale = domain ? scale.domain(domain) : scale, key;
	        // Define customized scale if categorized axis
	        if ($$.isCategorized()) {
	            offset = offset || function () { return 0; };
	            scale = function (d, raw) {
	                var v = _scale(d) + offset(d);
	                return raw ? v : Math.ceil(v);
	            };
	        } else {
	            scale = function (d, raw) {
	                var v = _scale(d);
	                return raw ? v : Math.ceil(v);
	            };
	        }
	        // define functions
	        for (key in _scale) {
	            scale[key] = _scale[key];
	        }
	        scale.orgDomain = function () {
	            return _scale.domain();
	        };
	        // define custom domain() for categorized axis
	        if ($$.isCategorized()) {
	            scale.domain = function (domain) {
	                if (!arguments.length) {
	                    domain = this.orgDomain();
	                    return [domain[0], domain[1] + 1];
	                }
	                _scale.domain(domain);
	                return scale;
	            };
	        }
	        return scale;
	    };
	    c3_chart_internal_fn.getY = function (min, max, domain) {
	        var scale = this.getScale(min, max, this.isTimeSeriesY());
	        if (domain) { scale.domain(domain); }
	        return scale;
	    };
	    c3_chart_internal_fn.getYScale = function (id) {
	        return this.axis.getId(id) === 'y2' ? this.y2 : this.y;
	    };
	    c3_chart_internal_fn.getSubYScale = function (id) {
	        return this.axis.getId(id) === 'y2' ? this.subY2 : this.subY;
	    };
	    c3_chart_internal_fn.updateScales = function () {
	        var $$ = this, config = $$.config,
	            forInit = !$$.x;
	        // update edges
	        $$.xMin = config.axis_rotated ? 1 : 0;
	        $$.xMax = config.axis_rotated ? $$.height : $$.width;
	        $$.yMin = config.axis_rotated ? 0 : $$.height;
	        $$.yMax = config.axis_rotated ? $$.width : 1;
	        $$.subXMin = $$.xMin;
	        $$.subXMax = $$.xMax;
	        $$.subYMin = config.axis_rotated ? 0 : $$.height2;
	        $$.subYMax = config.axis_rotated ? $$.width2 : 1;
	        // update scales
	        $$.x = $$.getX($$.xMin, $$.xMax, forInit ? undefined : $$.x.orgDomain(), function () { return $$.xAxis.tickOffset(); });
	        $$.y = $$.getY($$.yMin, $$.yMax, forInit ? config.axis_y_default : $$.y.domain());
	        $$.y2 = $$.getY($$.yMin, $$.yMax, forInit ? config.axis_y2_default : $$.y2.domain());
	        $$.subX = $$.getX($$.xMin, $$.xMax, $$.orgXDomain, function (d) { return d % 1 ? 0 : $$.subXAxis.tickOffset(); });
	        $$.subY = $$.getY($$.subYMin, $$.subYMax, forInit ? config.axis_y_default : $$.subY.domain());
	        $$.subY2 = $$.getY($$.subYMin, $$.subYMax, forInit ? config.axis_y2_default : $$.subY2.domain());
	        // update axes
	        $$.xAxisTickFormat = $$.axis.getXAxisTickFormat();
	        $$.xAxisTickValues = $$.axis.getXAxisTickValues();
	        $$.yAxisTickValues = $$.axis.getYAxisTickValues();
	        $$.y2AxisTickValues = $$.axis.getY2AxisTickValues();

	        $$.xAxis = $$.axis.getXAxis($$.x, $$.xOrient, $$.xAxisTickFormat, $$.xAxisTickValues, config.axis_x_tick_outer);
	        $$.subXAxis = $$.axis.getXAxis($$.subX, $$.subXOrient, $$.xAxisTickFormat, $$.xAxisTickValues, config.axis_x_tick_outer);
	        $$.yAxis = $$.axis.getYAxis($$.y, $$.yOrient, config.axis_y_tick_format, $$.yAxisTickValues, config.axis_y_tick_outer);
	        $$.y2Axis = $$.axis.getYAxis($$.y2, $$.y2Orient, config.axis_y2_tick_format, $$.y2AxisTickValues, config.axis_y2_tick_outer);

	        // Set initialized scales to brush and zoom
	        if (!forInit) {
	            if ($$.brush) { $$.brush.scale($$.subX); }
	            if (config.zoom_enabled) { $$.zoom.scale($$.x); }
	        }
	        // update for arc
	        if ($$.updateArc) { $$.updateArc(); }
	    };

	    c3_chart_internal_fn.getYDomainMin = function (targets) {
	        var $$ = this, config = $$.config,
	            ids = $$.mapToIds(targets), ys = $$.getValuesAsIdKeyed(targets),
	            j, k, baseId, idsInGroup, id, hasNegativeValue;
	        if (config.data_groups.length > 0) {
	            hasNegativeValue = $$.hasNegativeValueInTargets(targets);
	            for (j = 0; j < config.data_groups.length; j++) {
	                // Determine baseId
	                idsInGroup = config.data_groups[j].filter(function (id) { return ids.indexOf(id) >= 0; });
	                if (idsInGroup.length === 0) { continue; }
	                baseId = idsInGroup[0];
	                // Consider negative values
	                if (hasNegativeValue && ys[baseId]) {
	                    ys[baseId].forEach(function (v, i) {
	                        ys[baseId][i] = v < 0 ? v : 0;
	                    });
	                }
	                // Compute min
	                for (k = 1; k < idsInGroup.length; k++) {
	                    id = idsInGroup[k];
	                    if (! ys[id]) { continue; }
	                    ys[id].forEach(function (v, i) {
	                        if ($$.axis.getId(id) === $$.axis.getId(baseId) && ys[baseId] && !(hasNegativeValue && +v > 0)) {
	                            ys[baseId][i] += +v;
	                        }
	                    });
	                }
	            }
	        }
	        return $$.d3.min(Object.keys(ys).map(function (key) { return $$.d3.min(ys[key]); }));
	    };
	    c3_chart_internal_fn.getYDomainMax = function (targets) {
	        var $$ = this, config = $$.config,
	            ids = $$.mapToIds(targets), ys = $$.getValuesAsIdKeyed(targets),
	            j, k, baseId, idsInGroup, id, hasPositiveValue;
	        if (config.data_groups.length > 0) {
	            hasPositiveValue = $$.hasPositiveValueInTargets(targets);
	            for (j = 0; j < config.data_groups.length; j++) {
	                // Determine baseId
	                idsInGroup = config.data_groups[j].filter(function (id) { return ids.indexOf(id) >= 0; });
	                if (idsInGroup.length === 0) { continue; }
	                baseId = idsInGroup[0];
	                // Consider positive values
	                if (hasPositiveValue && ys[baseId]) {
	                    ys[baseId].forEach(function (v, i) {
	                        ys[baseId][i] = v > 0 ? v : 0;
	                    });
	                }
	                // Compute max
	                for (k = 1; k < idsInGroup.length; k++) {
	                    id = idsInGroup[k];
	                    if (! ys[id]) { continue; }
	                    ys[id].forEach(function (v, i) {
	                        if ($$.axis.getId(id) === $$.axis.getId(baseId) && ys[baseId] && !(hasPositiveValue && +v < 0)) {
	                            ys[baseId][i] += +v;
	                        }
	                    });
	                }
	            }
	        }
	        return $$.d3.max(Object.keys(ys).map(function (key) { return $$.d3.max(ys[key]); }));
	    };
	    c3_chart_internal_fn.getYDomain = function (targets, axisId, xDomain) {
	        var $$ = this, config = $$.config,
	            targetsByAxisId = targets.filter(function (t) { return $$.axis.getId(t.id) === axisId; }),
	            yTargets = xDomain ? $$.filterByXDomain(targetsByAxisId, xDomain) : targetsByAxisId,
	            yMin = axisId === 'y2' ? config.axis_y2_min : config.axis_y_min,
	            yMax = axisId === 'y2' ? config.axis_y2_max : config.axis_y_max,
	            yDomainMin = $$.getYDomainMin(yTargets),
	            yDomainMax = $$.getYDomainMax(yTargets),
	            domain, domainLength, padding, padding_top, padding_bottom,
	            center = axisId === 'y2' ? config.axis_y2_center : config.axis_y_center,
	            yDomainAbs, lengths, diff, ratio, isAllPositive, isAllNegative,
	            isZeroBased = ($$.hasType('bar', yTargets) && config.bar_zerobased) || ($$.hasType('area', yTargets) && config.area_zerobased),
	            isInverted = axisId === 'y2' ? config.axis_y2_inverted : config.axis_y_inverted,
	            showHorizontalDataLabel = $$.hasDataLabel() && config.axis_rotated,
	            showVerticalDataLabel = $$.hasDataLabel() && !config.axis_rotated;

	        // MEMO: avoid inverting domain unexpectedly
	        yDomainMin = isValue(yMin) ? yMin : isValue(yMax) ? (yDomainMin < yMax ? yDomainMin : yMax - 10) : yDomainMin;
	        yDomainMax = isValue(yMax) ? yMax : isValue(yMin) ? (yMin < yDomainMax ? yDomainMax : yMin + 10) : yDomainMax;

	        if (yTargets.length === 0) { // use current domain if target of axisId is none
	            return axisId === 'y2' ? $$.y2.domain() : $$.y.domain();
	        }
	        if (isNaN(yDomainMin)) { // set minimum to zero when not number
	            yDomainMin = 0;
	        }
	        if (isNaN(yDomainMax)) { // set maximum to have same value as yDomainMin
	            yDomainMax = yDomainMin;
	        }
	        if (yDomainMin === yDomainMax) {
	            yDomainMin < 0 ? yDomainMax = 0 : yDomainMin = 0;
	        }
	        isAllPositive = yDomainMin >= 0 && yDomainMax >= 0;
	        isAllNegative = yDomainMin <= 0 && yDomainMax <= 0;

	        // Cancel zerobased if axis_*_min / axis_*_max specified
	        if ((isValue(yMin) && isAllPositive) || (isValue(yMax) && isAllNegative)) {
	            isZeroBased = false;
	        }

	        // Bar/Area chart should be 0-based if all positive|negative
	        if (isZeroBased) {
	            if (isAllPositive) { yDomainMin = 0; }
	            if (isAllNegative) { yDomainMax = 0; }
	        }

	        domainLength = Math.abs(yDomainMax - yDomainMin);
	        padding = padding_top = padding_bottom = domainLength * 0.1;

	        if (typeof center !== 'undefined') {
	            yDomainAbs = Math.max(Math.abs(yDomainMin), Math.abs(yDomainMax));
	            yDomainMax = center + yDomainAbs;
	            yDomainMin = center - yDomainAbs;
	        }
	        // add padding for data label
	        if (showHorizontalDataLabel) {
	            lengths = $$.getDataLabelLength(yDomainMin, yDomainMax, 'width');
	            diff = diffDomain($$.y.range());
	            ratio = [lengths[0] / diff, lengths[1] / diff];
	            padding_top += domainLength * (ratio[1] / (1 - ratio[0] - ratio[1]));
	            padding_bottom += domainLength * (ratio[0] / (1 - ratio[0] - ratio[1]));
	        } else if (showVerticalDataLabel) {
	            lengths = $$.getDataLabelLength(yDomainMin, yDomainMax, 'height');
	            padding_top += $$.axis.convertPixelsToAxisPadding(lengths[1], domainLength);
	            padding_bottom += $$.axis.convertPixelsToAxisPadding(lengths[0], domainLength);
	        }
	        if (axisId === 'y' && notEmpty(config.axis_y_padding)) {
	            padding_top = $$.axis.getPadding(config.axis_y_padding, 'top', padding_top, domainLength);
	            padding_bottom = $$.axis.getPadding(config.axis_y_padding, 'bottom', padding_bottom, domainLength);
	        }
	        if (axisId === 'y2' && notEmpty(config.axis_y2_padding)) {
	            padding_top = $$.axis.getPadding(config.axis_y2_padding, 'top', padding_top, domainLength);
	            padding_bottom = $$.axis.getPadding(config.axis_y2_padding, 'bottom', padding_bottom, domainLength);
	        }
	        // Bar/Area chart should be 0-based if all positive|negative
	        if (isZeroBased) {
	            if (isAllPositive) { padding_bottom = yDomainMin; }
	            if (isAllNegative) { padding_top = -yDomainMax; }
	        }
	        domain = [yDomainMin - padding_bottom, yDomainMax + padding_top];
	        return isInverted ? domain.reverse() : domain;
	    };
	    c3_chart_internal_fn.getXDomainMin = function (targets) {
	        var $$ = this, config = $$.config;
	        return isDefined(config.axis_x_min) ?
	            ($$.isTimeSeries() ? this.parseDate(config.axis_x_min) : config.axis_x_min) :
	        $$.d3.min(targets, function (t) { return $$.d3.min(t.values, function (v) { return v.x; }); });
	    };
	    c3_chart_internal_fn.getXDomainMax = function (targets) {
	        var $$ = this, config = $$.config;
	        return isDefined(config.axis_x_max) ?
	            ($$.isTimeSeries() ? this.parseDate(config.axis_x_max) : config.axis_x_max) :
	        $$.d3.max(targets, function (t) { return $$.d3.max(t.values, function (v) { return v.x; }); });
	    };
	    c3_chart_internal_fn.getXDomainPadding = function (domain) {
	        var $$ = this, config = $$.config,
	            diff = domain[1] - domain[0],
	            maxDataCount, padding, paddingLeft, paddingRight;
	        if ($$.isCategorized()) {
	            padding = 0;
	        } else if ($$.hasType('bar')) {
	            maxDataCount = $$.getMaxDataCount();
	            padding = maxDataCount > 1 ? (diff / (maxDataCount - 1)) / 2 : 0.5;
	        } else {
	            padding = diff * 0.01;
	        }
	        if (typeof config.axis_x_padding === 'object' && notEmpty(config.axis_x_padding)) {
	            paddingLeft = isValue(config.axis_x_padding.left) ? config.axis_x_padding.left : padding;
	            paddingRight = isValue(config.axis_x_padding.right) ? config.axis_x_padding.right : padding;
	        } else if (typeof config.axis_x_padding === 'number') {
	            paddingLeft = paddingRight = config.axis_x_padding;
	        } else {
	            paddingLeft = paddingRight = padding;
	        }
	        return {left: paddingLeft, right: paddingRight};
	    };
	    c3_chart_internal_fn.getXDomain = function (targets) {
	        var $$ = this,
	            xDomain = [$$.getXDomainMin(targets), $$.getXDomainMax(targets)],
	            firstX = xDomain[0], lastX = xDomain[1],
	            padding = $$.getXDomainPadding(xDomain),
	            min = 0, max = 0;
	        // show center of x domain if min and max are the same
	        if ((firstX - lastX) === 0 && !$$.isCategorized()) {
	            if ($$.isTimeSeries()) {
	                firstX = new Date(firstX.getTime() * 0.5);
	                lastX = new Date(lastX.getTime() * 1.5);
	            } else {
	                firstX = firstX === 0 ? 1 : (firstX * 0.5);
	                lastX = lastX === 0 ? -1 : (lastX * 1.5);
	            }
	        }
	        if (firstX || firstX === 0) {
	            min = $$.isTimeSeries() ? new Date(firstX.getTime() - padding.left) : firstX - padding.left;
	        }
	        if (lastX || lastX === 0) {
	            max = $$.isTimeSeries() ? new Date(lastX.getTime() + padding.right) : lastX + padding.right;
	        }
	        return [min, max];
	    };
	    c3_chart_internal_fn.updateXDomain = function (targets, withUpdateXDomain, withUpdateOrgXDomain, withTrim, domain) {
	        var $$ = this, config = $$.config;

	        if (withUpdateOrgXDomain) {
	            $$.x.domain(domain ? domain : $$.d3.extent($$.getXDomain(targets)));
	            $$.orgXDomain = $$.x.domain();
	            if (config.zoom_enabled) { $$.zoom.scale($$.x).updateScaleExtent(); }
	            $$.subX.domain($$.x.domain());
	            if ($$.brush) { $$.brush.scale($$.subX); }
	        }
	        if (withUpdateXDomain) {
	            $$.x.domain(domain ? domain : (!$$.brush || $$.brush.empty()) ? $$.orgXDomain : $$.brush.extent());
	            if (config.zoom_enabled) { $$.zoom.scale($$.x).updateScaleExtent(); }
	        }

	        // Trim domain when too big by zoom mousemove event
	        if (withTrim) { $$.x.domain($$.trimXDomain($$.x.orgDomain())); }

	        return $$.x.domain();
	    };
	    c3_chart_internal_fn.trimXDomain = function (domain) {
	        var $$ = this;
	        if (domain[0] <= $$.orgXDomain[0]) {
	            domain[1] = +domain[1] + ($$.orgXDomain[0] - domain[0]);
	            domain[0] = $$.orgXDomain[0];
	        }
	        if ($$.orgXDomain[1] <= domain[1]) {
	            domain[0] = +domain[0] - (domain[1] - $$.orgXDomain[1]);
	            domain[1] = $$.orgXDomain[1];
	        }
	        return domain;
	    };

	    c3_chart_internal_fn.isX = function (key) {
	        var $$ = this, config = $$.config;
	        return (config.data_x && key === config.data_x) || (notEmpty(config.data_xs) && hasValue(config.data_xs, key));
	    };
	    c3_chart_internal_fn.isNotX = function (key) {
	        return !this.isX(key);
	    };
	    c3_chart_internal_fn.getXKey = function (id) {
	        var $$ = this, config = $$.config;
	        return config.data_x ? config.data_x : notEmpty(config.data_xs) ? config.data_xs[id] : null;
	    };
	    c3_chart_internal_fn.getXValuesOfXKey = function (key, targets) {
	        var $$ = this,
	            xValues, ids = targets && notEmpty(targets) ? $$.mapToIds(targets) : [];
	        ids.forEach(function (id) {
	            if ($$.getXKey(id) === key) {
	                xValues = $$.data.xs[id];
	            }
	        });
	        return xValues;
	    };
	    c3_chart_internal_fn.getIndexByX = function (x) {
	        var $$ = this,
	            data = $$.filterByX($$.data.targets, x);
	        return data.length ? data[0].index : null;
	    };
	    c3_chart_internal_fn.getXValue = function (id, i) {
	        var $$ = this;
	        return id in $$.data.xs && $$.data.xs[id] && isValue($$.data.xs[id][i]) ? $$.data.xs[id][i] : i;
	    };
	    c3_chart_internal_fn.getOtherTargetXs = function () {
	        var $$ = this,
	            idsForX = Object.keys($$.data.xs);
	        return idsForX.length ? $$.data.xs[idsForX[0]] : null;
	    };
	    c3_chart_internal_fn.getOtherTargetX = function (index) {
	        var xs = this.getOtherTargetXs();
	        return xs && index < xs.length ? xs[index] : null;
	    };
	    c3_chart_internal_fn.addXs = function (xs) {
	        var $$ = this;
	        Object.keys(xs).forEach(function (id) {
	            $$.config.data_xs[id] = xs[id];
	        });
	    };
	    c3_chart_internal_fn.hasMultipleX = function (xs) {
	        return this.d3.set(Object.keys(xs).map(function (id) { return xs[id]; })).size() > 1;
	    };
	    c3_chart_internal_fn.isMultipleX = function () {
	        return notEmpty(this.config.data_xs) || !this.config.data_xSort || this.hasType('scatter');
	    };
	    c3_chart_internal_fn.addName = function (data) {
	        var $$ = this, name;
	        if (data) {
	            name = $$.config.data_names[data.id];
	            data.name = name ? name : data.id;
	        }
	        return data;
	    };
	    c3_chart_internal_fn.getValueOnIndex = function (values, index) {
	        var valueOnIndex = values.filter(function (v) { return v.index === index; });
	        return valueOnIndex.length ? valueOnIndex[0] : null;
	    };
	    c3_chart_internal_fn.updateTargetX = function (targets, x) {
	        var $$ = this;
	        targets.forEach(function (t) {
	            t.values.forEach(function (v, i) {
	                v.x = $$.generateTargetX(x[i], t.id, i);
	            });
	            $$.data.xs[t.id] = x;
	        });
	    };
	    c3_chart_internal_fn.updateTargetXs = function (targets, xs) {
	        var $$ = this;
	        targets.forEach(function (t) {
	            if (xs[t.id]) {
	                $$.updateTargetX([t], xs[t.id]);
	            }
	        });
	    };
	    c3_chart_internal_fn.generateTargetX = function (rawX, id, index) {
	        var $$ = this, x;
	        if ($$.isTimeSeries()) {
	            x = rawX ? $$.parseDate(rawX) : $$.parseDate($$.getXValue(id, index));
	        }
	        else if ($$.isCustomX() && !$$.isCategorized()) {
	            x = isValue(rawX) ? +rawX : $$.getXValue(id, index);
	        }
	        else {
	            x = index;
	        }
	        return x;
	    };
	    c3_chart_internal_fn.cloneTarget = function (target) {
	        return {
	            id : target.id,
	            id_org : target.id_org,
	            values : target.values.map(function (d) {
	                return {x: d.x, value: d.value, id: d.id};
	            })
	        };
	    };
	    c3_chart_internal_fn.updateXs = function () {
	        var $$ = this;
	        if ($$.data.targets.length) {
	            $$.xs = [];
	            $$.data.targets[0].values.forEach(function (v) {
	                $$.xs[v.index] = v.x;
	            });
	        }
	    };
	    c3_chart_internal_fn.getPrevX = function (i) {
	        var x = this.xs[i - 1];
	        return typeof x !== 'undefined' ? x : null;
	    };
	    c3_chart_internal_fn.getNextX = function (i) {
	        var x = this.xs[i + 1];
	        return typeof x !== 'undefined' ? x : null;
	    };
	    c3_chart_internal_fn.getMaxDataCount = function () {
	        var $$ = this;
	        return $$.d3.max($$.data.targets, function (t) { return t.values.length; });
	    };
	    c3_chart_internal_fn.getMaxDataCountTarget = function (targets) {
	        var length = targets.length, max = 0, maxTarget;
	        if (length > 1) {
	            targets.forEach(function (t) {
	                if (t.values.length > max) {
	                    maxTarget = t;
	                    max = t.values.length;
	                }
	            });
	        } else {
	            maxTarget = length ? targets[0] : null;
	        }
	        return maxTarget;
	    };
	    c3_chart_internal_fn.getEdgeX = function (targets) {
	        var $$ = this;
	        return !targets.length ? [0, 0] : [
	            $$.d3.min(targets, function (t) { return t.values[0].x; }),
	            $$.d3.max(targets, function (t) { return t.values[t.values.length - 1].x; })
	        ];
	    };
	    c3_chart_internal_fn.mapToIds = function (targets) {
	        return targets.map(function (d) { return d.id; });
	    };
	    c3_chart_internal_fn.mapToTargetIds = function (ids) {
	        var $$ = this;
	        return ids ? (isString(ids) ? [ids] : ids) : $$.mapToIds($$.data.targets);
	    };
	    c3_chart_internal_fn.hasTarget = function (targets, id) {
	        var ids = this.mapToIds(targets), i;
	        for (i = 0; i < ids.length; i++) {
	            if (ids[i] === id) {
	                return true;
	            }
	        }
	        return false;
	    };
	    c3_chart_internal_fn.isTargetToShow = function (targetId) {
	        return this.hiddenTargetIds.indexOf(targetId) < 0;
	    };
	    c3_chart_internal_fn.isLegendToShow = function (targetId) {
	        return this.hiddenLegendIds.indexOf(targetId) < 0;
	    };
	    c3_chart_internal_fn.filterTargetsToShow = function (targets) {
	        var $$ = this;
	        return targets.filter(function (t) { return $$.isTargetToShow(t.id); });
	    };
	    c3_chart_internal_fn.mapTargetsToUniqueXs = function (targets) {
	        var $$ = this;
	        var xs = $$.d3.set($$.d3.merge(targets.map(function (t) { return t.values.map(function (v) { return +v.x; }); }))).values();
	        return $$.isTimeSeries() ? xs.map(function (x) { return new Date(+x); }) : xs.map(function (x) { return +x; });
	    };
	    c3_chart_internal_fn.addHiddenTargetIds = function (targetIds) {
	        this.hiddenTargetIds = this.hiddenTargetIds.concat(targetIds);
	    };
	    c3_chart_internal_fn.removeHiddenTargetIds = function (targetIds) {
	        this.hiddenTargetIds = this.hiddenTargetIds.filter(function (id) { return targetIds.indexOf(id) < 0; });
	    };
	    c3_chart_internal_fn.addHiddenLegendIds = function (targetIds) {
	        this.hiddenLegendIds = this.hiddenLegendIds.concat(targetIds);
	    };
	    c3_chart_internal_fn.removeHiddenLegendIds = function (targetIds) {
	        this.hiddenLegendIds = this.hiddenLegendIds.filter(function (id) { return targetIds.indexOf(id) < 0; });
	    };
	    c3_chart_internal_fn.getValuesAsIdKeyed = function (targets) {
	        var ys = {};
	        targets.forEach(function (t) {
	            ys[t.id] = [];
	            t.values.forEach(function (v) {
	                ys[t.id].push(v.value);
	            });
	        });
	        return ys;
	    };
	    c3_chart_internal_fn.checkValueInTargets = function (targets, checker) {
	        var ids = Object.keys(targets), i, j, values;
	        for (i = 0; i < ids.length; i++) {
	            values = targets[ids[i]].values;
	            for (j = 0; j < values.length; j++) {
	                if (checker(values[j].value)) {
	                    return true;
	                }
	            }
	        }
	        return false;
	    };
	    c3_chart_internal_fn.hasNegativeValueInTargets = function (targets) {
	        return this.checkValueInTargets(targets, function (v) { return v < 0; });
	    };
	    c3_chart_internal_fn.hasPositiveValueInTargets = function (targets) {
	        return this.checkValueInTargets(targets, function (v) { return v > 0; });
	    };
	    c3_chart_internal_fn.isOrderDesc = function () {
	        var config = this.config;
	        return typeof(config.data_order) === 'string' && config.data_order.toLowerCase() === 'desc';
	    };
	    c3_chart_internal_fn.isOrderAsc = function () {
	        var config = this.config;
	        return typeof(config.data_order) === 'string' && config.data_order.toLowerCase() === 'asc';
	    };
	    c3_chart_internal_fn.orderTargets = function (targets) {
	        var $$ = this, config = $$.config, orderAsc = $$.isOrderAsc(), orderDesc = $$.isOrderDesc();
	        if (orderAsc || orderDesc) {
	            targets.sort(function (t1, t2) {
	                var reducer = function (p, c) { return p + Math.abs(c.value); };
	                var t1Sum = t1.values.reduce(reducer, 0),
	                    t2Sum = t2.values.reduce(reducer, 0);
	                return orderAsc ? t2Sum - t1Sum : t1Sum - t2Sum;
	            });
	        } else if (isFunction(config.data_order)) {
	            targets.sort(config.data_order);
	        } // TODO: accept name array for order
	        return targets;
	    };
	    c3_chart_internal_fn.filterByX = function (targets, x) {
	        return this.d3.merge(targets.map(function (t) { return t.values; })).filter(function (v) { return v.x - x === 0; });
	    };
	    c3_chart_internal_fn.filterRemoveNull = function (data) {
	        return data.filter(function (d) { return isValue(d.value); });
	    };
	    c3_chart_internal_fn.filterByXDomain = function (targets, xDomain) {
	        return targets.map(function (t) {
	            return {
	                id: t.id,
	                id_org: t.id_org,
	                values: t.values.filter(function (v) {
	                    return xDomain[0] <= v.x && v.x <= xDomain[1];
	                })
	            };
	        });
	    };
	    c3_chart_internal_fn.hasDataLabel = function () {
	        var config = this.config;
	        if (typeof config.data_labels === 'boolean' && config.data_labels) {
	            return true;
	        } else if (typeof config.data_labels === 'object' && notEmpty(config.data_labels)) {
	            return true;
	        }
	        return false;
	    };
	    c3_chart_internal_fn.getDataLabelLength = function (min, max, key) {
	        var $$ = this,
	            lengths = [0, 0], paddingCoef = 1.3;
	        $$.selectChart.select('svg').selectAll('.dummy')
	            .data([min, max])
	            .enter().append('text')
	            .text(function (d) { return $$.dataLabelFormat(d.id)(d); })
	            .each(function (d, i) {
	                lengths[i] = this.getBoundingClientRect()[key] * paddingCoef;
	            })
	            .remove();
	        return lengths;
	    };
	    c3_chart_internal_fn.isNoneArc = function (d) {
	        return this.hasTarget(this.data.targets, d.id);
	    },
	    c3_chart_internal_fn.isArc = function (d) {
	        return 'data' in d && this.hasTarget(this.data.targets, d.data.id);
	    };
	    c3_chart_internal_fn.findSameXOfValues = function (values, index) {
	        var i, targetX = values[index].x, sames = [];
	        for (i = index - 1; i >= 0; i--) {
	            if (targetX !== values[i].x) { break; }
	            sames.push(values[i]);
	        }
	        for (i = index; i < values.length; i++) {
	            if (targetX !== values[i].x) { break; }
	            sames.push(values[i]);
	        }
	        return sames;
	    };

	    c3_chart_internal_fn.findClosestFromTargets = function (targets, pos) {
	        var $$ = this, candidates;

	        // map to array of closest points of each target
	        candidates = targets.map(function (target) {
	            return $$.findClosest(target.values, pos);
	        });

	        // decide closest point and return
	        return $$.findClosest(candidates, pos);
	    };
	    c3_chart_internal_fn.findClosest = function (values, pos) {
	        var $$ = this, minDist = 100, closest;

	        // find mouseovering bar
	        values.filter(function (v) { return v && $$.isBarType(v.id); }).forEach(function (v) {
	            var shape = $$.main.select('.' + CLASS.bars + $$.getTargetSelectorSuffix(v.id) + ' .' + CLASS.bar + '-' + v.index).node();
	            if (!closest && $$.isWithinBar(shape)) {
	                closest = v;
	            }
	        });

	        // find closest point from non-bar
	        values.filter(function (v) { return v && !$$.isBarType(v.id); }).forEach(function (v) {
	            var d = $$.dist(v, pos);
	            if (d < minDist) {
	                minDist = d;
	                closest = v;
	            }
	        });

	        return closest;
	    };
	    c3_chart_internal_fn.dist = function (data, pos) {
	        var $$ = this, config = $$.config,
	            xIndex = config.axis_rotated ? 1 : 0,
	            yIndex = config.axis_rotated ? 0 : 1,
	            y = $$.circleY(data, data.index),
	            x = $$.x(data.x);
	        return Math.pow(x - pos[xIndex], 2) + Math.pow(y - pos[yIndex], 2);
	    };
	    c3_chart_internal_fn.convertValuesToStep = function (values) {
	        var converted = [].concat(values), i;

	        if (!this.isCategorized()) {
	            return values;
	        }

	        for (i = values.length + 1; 0 < i; i--) {
	            converted[i] = converted[i - 1];
	        }

	        converted[0] = {
	            x: converted[0].x - 1,
	            value: converted[0].value,
	            id: converted[0].id
	        };
	        converted[values.length + 1] = {
	            x: converted[values.length].x + 1,
	            value: converted[values.length].value,
	            id: converted[values.length].id
	        };

	        return converted;
	    };
	    c3_chart_internal_fn.updateDataAttributes = function (name, attrs) {
	        var $$ = this, config = $$.config, current = config['data_' + name];
	        if (typeof attrs === 'undefined') { return current; }
	        Object.keys(attrs).forEach(function (id) {
	            current[id] = attrs[id];
	        });
	        $$.redraw({withLegend: true});
	        return current;
	    };

	    c3_chart_internal_fn.convertUrlToData = function (url, mimeType, keys, done) {
	        var $$ = this, type = mimeType ? mimeType : 'csv';
	        $$.d3.xhr(url, function (error, data) {
	            var d;
	            if (!data) {
	                throw new Error(error.responseURL + ' ' + error.status + ' (' + error.statusText + ')');
	            }
	            if (type === 'json') {
	                d = $$.convertJsonToData(JSON.parse(data.response), keys);
	            } else if (type === 'tsv') {
	                d = $$.convertTsvToData(data.response);
	            } else {
	                d = $$.convertCsvToData(data.response);
	            }
	            done.call($$, d);
	        });
	    };
	    c3_chart_internal_fn.convertXsvToData = function (xsv, parser) {
	        var rows = parser.parseRows(xsv), d;
	        if (rows.length === 1) {
	            d = [{}];
	            rows[0].forEach(function (id) {
	                d[0][id] = null;
	            });
	        } else {
	            d = parser.parse(xsv);
	        }
	        return d;
	    };
	    c3_chart_internal_fn.convertCsvToData = function (csv) {
	        return this.convertXsvToData(csv, this.d3.csv);
	    };
	    c3_chart_internal_fn.convertTsvToData = function (tsv) {
	        return this.convertXsvToData(tsv, this.d3.tsv);
	    };
	    c3_chart_internal_fn.convertJsonToData = function (json, keys) {
	        var $$ = this,
	            new_rows = [], targetKeys, data;
	        if (keys) { // when keys specified, json would be an array that includes objects
	            if (keys.x) {
	                targetKeys = keys.value.concat(keys.x);
	                $$.config.data_x = keys.x;
	            } else {
	                targetKeys = keys.value;
	            }
	            new_rows.push(targetKeys);
	            json.forEach(function (o) {
	                var new_row = [];
	                targetKeys.forEach(function (key) {
	                    // convert undefined to null because undefined data will be removed in convertDataToTargets()
	                    var v = isUndefined(o[key]) ? null : o[key];
	                    new_row.push(v);
	                });
	                new_rows.push(new_row);
	            });
	            data = $$.convertRowsToData(new_rows);
	        } else {
	            Object.keys(json).forEach(function (key) {
	                new_rows.push([key].concat(json[key]));
	            });
	            data = $$.convertColumnsToData(new_rows);
	        }
	        return data;
	    };
	    c3_chart_internal_fn.convertRowsToData = function (rows) {
	        var keys = rows[0], new_row = {}, new_rows = [], i, j;
	        for (i = 1; i < rows.length; i++) {
	            new_row = {};
	            for (j = 0; j < rows[i].length; j++) {
	                if (isUndefined(rows[i][j])) {
	                    throw new Error("Source data is missing a component at (" + i + "," + j + ")!");
	                }
	                new_row[keys[j]] = rows[i][j];
	            }
	            new_rows.push(new_row);
	        }
	        return new_rows;
	    };
	    c3_chart_internal_fn.convertColumnsToData = function (columns) {
	        var new_rows = [], i, j, key;
	        for (i = 0; i < columns.length; i++) {
	            key = columns[i][0];
	            for (j = 1; j < columns[i].length; j++) {
	                if (isUndefined(new_rows[j - 1])) {
	                    new_rows[j - 1] = {};
	                }
	                if (isUndefined(columns[i][j])) {
	                    throw new Error("Source data is missing a component at (" + i + "," + j + ")!");
	                }
	                new_rows[j - 1][key] = columns[i][j];
	            }
	        }
	        return new_rows;
	    };
	    c3_chart_internal_fn.convertDataToTargets = function (data, appendXs) {
	        var $$ = this, config = $$.config,
	            ids = $$.d3.keys(data[0]).filter($$.isNotX, $$),
	            xs = $$.d3.keys(data[0]).filter($$.isX, $$),
	            targets;

	        // save x for update data by load when custom x and c3.x API
	        ids.forEach(function (id) {
	            var xKey = $$.getXKey(id);

	            if ($$.isCustomX() || $$.isTimeSeries()) {
	                // if included in input data
	                if (xs.indexOf(xKey) >= 0) {
	                    $$.data.xs[id] = (appendXs && $$.data.xs[id] ? $$.data.xs[id] : []).concat(
	                        data.map(function (d) { return d[xKey]; })
	                            .filter(isValue)
	                            .map(function (rawX, i) { return $$.generateTargetX(rawX, id, i); })
	                    );
	                }
	                // if not included in input data, find from preloaded data of other id's x
	                else if (config.data_x) {
	                    $$.data.xs[id] = $$.getOtherTargetXs();
	                }
	                // if not included in input data, find from preloaded data
	                else if (notEmpty(config.data_xs)) {
	                    $$.data.xs[id] = $$.getXValuesOfXKey(xKey, $$.data.targets);
	                }
	                // MEMO: if no x included, use same x of current will be used
	            } else {
	                $$.data.xs[id] = data.map(function (d, i) { return i; });
	            }
	        });


	        // check x is defined
	        ids.forEach(function (id) {
	            if (!$$.data.xs[id]) {
	                throw new Error('x is not defined for id = "' + id + '".');
	            }
	        });

	        // convert to target
	        targets = ids.map(function (id, index) {
	            var convertedId = config.data_idConverter(id);
	            return {
	                id: convertedId,
	                id_org: id,
	                values: data.map(function (d, i) {
	                    var xKey = $$.getXKey(id), rawX = d[xKey], x = $$.generateTargetX(rawX, id, i);
	                    // use x as categories if custom x and categorized
	                    if ($$.isCustomX() && $$.isCategorized() && index === 0 && rawX) {
	                        if (i === 0) { config.axis_x_categories = []; }
	                        config.axis_x_categories.push(rawX);
	                    }
	                    // mark as x = undefined if value is undefined and filter to remove after mapped
	                    if (isUndefined(d[id]) || $$.data.xs[id].length <= i) {
	                        x = undefined;
	                    }
	                    return {x: x, value: d[id] !== null && !isNaN(d[id]) ? +d[id] : null, id: convertedId};
	                }).filter(function (v) { return isDefined(v.x); })
	            };
	        });

	        // finish targets
	        targets.forEach(function (t) {
	            var i;
	            // sort values by its x
	            if (config.data_xSort) {
	                t.values = t.values.sort(function (v1, v2) {
	                    var x1 = v1.x || v1.x === 0 ? v1.x : Infinity,
	                        x2 = v2.x || v2.x === 0 ? v2.x : Infinity;
	                    return x1 - x2;
	                });
	            }
	            // indexing each value
	            i = 0;
	            t.values.forEach(function (v) {
	                v.index = i++;
	            });
	            // this needs to be sorted because its index and value.index is identical
	            $$.data.xs[t.id].sort(function (v1, v2) {
	                return v1 - v2;
	            });
	        });

	        // set target types
	        if (config.data_type) {
	            $$.setTargetType($$.mapToIds(targets).filter(function (id) { return ! (id in config.data_types); }), config.data_type);
	        }

	        // cache as original id keyed
	        targets.forEach(function (d) {
	            $$.addCache(d.id_org, d);
	        });

	        return targets;
	    };

	    c3_chart_internal_fn.load = function (targets, args) {
	        var $$ = this;
	        if (targets) {
	            // filter loading targets if needed
	            if (args.filter) {
	                targets = targets.filter(args.filter);
	            }
	            // set type if args.types || args.type specified
	            if (args.type || args.types) {
	                targets.forEach(function (t) {
	                    var type = args.types && args.types[t.id] ? args.types[t.id] : args.type;
	                    $$.setTargetType(t.id, type);
	                });
	            }
	            // Update/Add data
	            $$.data.targets.forEach(function (d) {
	                for (var i = 0; i < targets.length; i++) {
	                    if (d.id === targets[i].id) {
	                        d.values = targets[i].values;
	                        targets.splice(i, 1);
	                        break;
	                    }
	                }
	            });
	            $$.data.targets = $$.data.targets.concat(targets); // add remained
	        }

	        // Set targets
	        $$.updateTargets($$.data.targets);

	        // Redraw with new targets
	        $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true, withLegend: true});

	        if (args.done) { args.done(); }
	    };
	    c3_chart_internal_fn.loadFromArgs = function (args) {
	        var $$ = this;
	        if (args.data) {
	            $$.load($$.convertDataToTargets(args.data), args);
	        }
	        else if (args.url) {
	            $$.convertUrlToData(args.url, args.mimeType, args.keys, function (data) {
	                $$.load($$.convertDataToTargets(data), args);
	            });
	        }
	        else if (args.json) {
	            $$.load($$.convertDataToTargets($$.convertJsonToData(args.json, args.keys)), args);
	        }
	        else if (args.rows) {
	            $$.load($$.convertDataToTargets($$.convertRowsToData(args.rows)), args);
	        }
	        else if (args.columns) {
	            $$.load($$.convertDataToTargets($$.convertColumnsToData(args.columns)), args);
	        }
	        else {
	            $$.load(null, args);
	        }
	    };
	    c3_chart_internal_fn.unload = function (targetIds, done) {
	        var $$ = this;
	        if (!done) {
	            done = function () {};
	        }
	        // filter existing target
	        targetIds = targetIds.filter(function (id) { return $$.hasTarget($$.data.targets, id); });
	        // If no target, call done and return
	        if (!targetIds || targetIds.length === 0) {
	            done();
	            return;
	        }
	        $$.svg.selectAll(targetIds.map(function (id) { return $$.selectorTarget(id); }))
	            .transition()
	            .style('opacity', 0)
	            .remove()
	            .call($$.endall, done);
	        targetIds.forEach(function (id) {
	            // Reset fadein for future load
	            $$.withoutFadeIn[id] = false;
	            // Remove target's elements
	            if ($$.legend) {
	                $$.legend.selectAll('.' + CLASS.legendItem + $$.getTargetSelectorSuffix(id)).remove();
	            }
	            // Remove target
	            $$.data.targets = $$.data.targets.filter(function (t) {
	                return t.id !== id;
	            });
	        });
	    };

	    c3_chart_internal_fn.categoryName = function (i) {
	        var config = this.config;
	        return i < config.axis_x_categories.length ? config.axis_x_categories[i] : i;
	    };

	    c3_chart_internal_fn.initEventRect = function () {
	        var $$ = this;
	        $$.main.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.eventRects)
	            .style('fill-opacity', 0);
	    };
	    c3_chart_internal_fn.redrawEventRect = function () {
	        var $$ = this, config = $$.config,
	            eventRectUpdate, maxDataCountTarget,
	            isMultipleX = $$.isMultipleX();

	        // rects for mouseover
	        var eventRects = $$.main.select('.' + CLASS.eventRects)
	                .style('cursor', config.zoom_enabled ? config.axis_rotated ? 'ns-resize' : 'ew-resize' : null)
	                .classed(CLASS.eventRectsMultiple, isMultipleX)
	                .classed(CLASS.eventRectsSingle, !isMultipleX);

	        // clear old rects
	        eventRects.selectAll('.' + CLASS.eventRect).remove();

	        // open as public variable
	        $$.eventRect = eventRects.selectAll('.' + CLASS.eventRect);

	        if (isMultipleX) {
	            eventRectUpdate = $$.eventRect.data([0]);
	            // enter : only one rect will be added
	            $$.generateEventRectsForMultipleXs(eventRectUpdate.enter());
	            // update
	            $$.updateEventRect(eventRectUpdate);
	            // exit : not needed because always only one rect exists
	        }
	        else {
	            // Set data and update $$.eventRect
	            maxDataCountTarget = $$.getMaxDataCountTarget($$.data.targets);
	            eventRects.datum(maxDataCountTarget ? maxDataCountTarget.values : []);
	            $$.eventRect = eventRects.selectAll('.' + CLASS.eventRect);
	            eventRectUpdate = $$.eventRect.data(function (d) { return d; });
	            // enter
	            $$.generateEventRectsForSingleX(eventRectUpdate.enter());
	            // update
	            $$.updateEventRect(eventRectUpdate);
	            // exit
	            eventRectUpdate.exit().remove();
	        }
	    };
	    c3_chart_internal_fn.updateEventRect = function (eventRectUpdate) {
	        var $$ = this, config = $$.config,
	            x, y, w, h, rectW, rectX;

	        // set update selection if null
	        eventRectUpdate = eventRectUpdate || $$.eventRect.data(function (d) { return d; });

	        if ($$.isMultipleX()) {
	            // TODO: rotated not supported yet
	            x = 0;
	            y = 0;
	            w = $$.width;
	            h = $$.height;
	        }
	        else {
	            if (($$.isCustomX() || $$.isTimeSeries()) && !$$.isCategorized()) {

	                // update index for x that is used by prevX and nextX
	                $$.updateXs();

	                rectW = function (d) {
	                    var prevX = $$.getPrevX(d.index), nextX = $$.getNextX(d.index);

	                    // if there this is a single data point make the eventRect full width (or height)
	                    if (prevX === null && nextX === null) {
	                        return config.axis_rotated ? $$.height : $$.width;
	                    }

	                    if (prevX === null) { prevX = $$.x.domain()[0]; }
	                    if (nextX === null) { nextX = $$.x.domain()[1]; }

	                    return Math.max(0, ($$.x(nextX) - $$.x(prevX)) / 2);
	                };
	                rectX = function (d) {
	                    var prevX = $$.getPrevX(d.index), nextX = $$.getNextX(d.index),
	                        thisX = $$.data.xs[d.id][d.index];

	                    // if there this is a single data point position the eventRect at 0
	                    if (prevX === null && nextX === null) {
	                        return 0;
	                    }

	                    if (prevX === null) { prevX = $$.x.domain()[0]; }

	                    return ($$.x(thisX) + $$.x(prevX)) / 2;
	                };
	            } else {
	                rectW = $$.getEventRectWidth();
	                rectX = function (d) {
	                    return $$.x(d.x) - (rectW / 2);
	                };
	            }
	            x = config.axis_rotated ? 0 : rectX;
	            y = config.axis_rotated ? rectX : 0;
	            w = config.axis_rotated ? $$.width : rectW;
	            h = config.axis_rotated ? rectW : $$.height;
	        }

	        eventRectUpdate
	            .attr('class', $$.classEvent.bind($$))
	            .attr("x", x)
	            .attr("y", y)
	            .attr("width", w)
	            .attr("height", h);
	    };
	    c3_chart_internal_fn.generateEventRectsForSingleX = function (eventRectEnter) {
	        var $$ = this, d3 = $$.d3, config = $$.config;
	        eventRectEnter.append("rect")
	            .attr("class", $$.classEvent.bind($$))
	            .style("cursor", config.data_selection_enabled && config.data_selection_grouped ? "pointer" : null)
	            .on('mouseover', function (d) {
	                var index = d.index;

	                if ($$.dragging || $$.flowing) { return; } // do nothing while dragging/flowing
	                if ($$.hasArcType()) { return; }

	                // Expand shapes for selection
	                if (config.point_focus_expand_enabled) { $$.expandCircles(index, null, true); }
	                $$.expandBars(index, null, true);

	                // Call event handler
	                $$.main.selectAll('.' + CLASS.shape + '-' + index).each(function (d) {
	                    config.data_onmouseover.call($$.api, d);
	                });
	            })
	            .on('mouseout', function (d) {
	                var index = d.index;
	                if (!$$.config) { return; } // chart is destroyed
	                if ($$.hasArcType()) { return; }
	                $$.hideXGridFocus();
	                $$.hideTooltip();
	                // Undo expanded shapes
	                $$.unexpandCircles();
	                $$.unexpandBars();
	                // Call event handler
	                $$.main.selectAll('.' + CLASS.shape + '-' + index).each(function (d) {
	                    config.data_onmouseout.call($$.api, d);
	                });
	            })
	            .on('mousemove', function (d) {
	                var selectedData, index = d.index,
	                    eventRect = $$.svg.select('.' + CLASS.eventRect + '-' + index);

	                if ($$.dragging || $$.flowing) { return; } // do nothing while dragging/flowing
	                if ($$.hasArcType()) { return; }

	                if ($$.isStepType(d) && $$.config.line_step_type === 'step-after' && d3.mouse(this)[0] < $$.x($$.getXValue(d.id, index))) {
	                    index -= 1;
	                }

	                // Show tooltip
	                selectedData = $$.filterTargetsToShow($$.data.targets).map(function (t) {
	                    return $$.addName($$.getValueOnIndex(t.values, index));
	                });

	                if (config.tooltip_grouped) {
	                    $$.showTooltip(selectedData, this);
	                    $$.showXGridFocus(selectedData);
	                }

	                if (config.tooltip_grouped && (!config.data_selection_enabled || config.data_selection_grouped)) {
	                    return;
	                }

	                $$.main.selectAll('.' + CLASS.shape + '-' + index)
	                    .each(function () {
	                        d3.select(this).classed(CLASS.EXPANDED, true);
	                        if (config.data_selection_enabled) {
	                            eventRect.style('cursor', config.data_selection_grouped ? 'pointer' : null);
	                        }
	                        if (!config.tooltip_grouped) {
	                            $$.hideXGridFocus();
	                            $$.hideTooltip();
	                            if (!config.data_selection_grouped) {
	                                $$.unexpandCircles(index);
	                                $$.unexpandBars(index);
	                            }
	                        }
	                    })
	                    .filter(function (d) {
	                        return $$.isWithinShape(this, d);
	                    })
	                    .each(function (d) {
	                        if (config.data_selection_enabled && (config.data_selection_grouped || config.data_selection_isselectable(d))) {
	                            eventRect.style('cursor', 'pointer');
	                        }
	                        if (!config.tooltip_grouped) {
	                            $$.showTooltip([d], this);
	                            $$.showXGridFocus([d]);
	                            if (config.point_focus_expand_enabled) { $$.expandCircles(index, d.id, true); }
	                            $$.expandBars(index, d.id, true);
	                        }
	                    });
	            })
	            .on('click', function (d) {
	                var index = d.index;
	                if ($$.hasArcType() || !$$.toggleShape) { return; }
	                if ($$.cancelClick) {
	                    $$.cancelClick = false;
	                    return;
	                }
	                if ($$.isStepType(d) && config.line_step_type === 'step-after' && d3.mouse(this)[0] < $$.x($$.getXValue(d.id, index))) {
	                    index -= 1;
	                }
	                $$.main.selectAll('.' + CLASS.shape + '-' + index).each(function (d) {
	                    if (config.data_selection_grouped || $$.isWithinShape(this, d)) {
	                        $$.toggleShape(this, d, index);
	                        $$.config.data_onclick.call($$.api, d, this);
	                    }
	                });
	            })
	            .call(
	                config.data_selection_draggable && $$.drag ? (
	                    d3.behavior.drag().origin(Object)
	                        .on('drag', function () { $$.drag(d3.mouse(this)); })
	                        .on('dragstart', function () { $$.dragstart(d3.mouse(this)); })
	                        .on('dragend', function () { $$.dragend(); })
	                ) : function () {}
	            );
	    };

	    c3_chart_internal_fn.generateEventRectsForMultipleXs = function (eventRectEnter) {
	        var $$ = this, d3 = $$.d3, config = $$.config;

	        function mouseout() {
	            $$.svg.select('.' + CLASS.eventRect).style('cursor', null);
	            $$.hideXGridFocus();
	            $$.hideTooltip();
	            $$.unexpandCircles();
	            $$.unexpandBars();
	        }

	        eventRectEnter.append('rect')
	            .attr('x', 0)
	            .attr('y', 0)
	            .attr('width', $$.width)
	            .attr('height', $$.height)
	            .attr('class', CLASS.eventRect)
	            .on('mouseout', function () {
	                if (!$$.config) { return; } // chart is destroyed
	                if ($$.hasArcType()) { return; }
	                mouseout();
	            })
	            .on('mousemove', function () {
	                var targetsToShow = $$.filterTargetsToShow($$.data.targets);
	                var mouse, closest, sameXData, selectedData;

	                if ($$.dragging) { return; } // do nothing when dragging
	                if ($$.hasArcType(targetsToShow)) { return; }

	                mouse = d3.mouse(this);
	                closest = $$.findClosestFromTargets(targetsToShow, mouse);

	                if ($$.mouseover && (!closest || closest.id !== $$.mouseover.id)) {
	                    config.data_onmouseout.call($$.api, $$.mouseover);
	                    $$.mouseover = undefined;
	                }

	                if (! closest) {
	                    mouseout();
	                    return;
	                }

	                if ($$.isScatterType(closest) || !config.tooltip_grouped) {
	                    sameXData = [closest];
	                } else {
	                    sameXData = $$.filterByX(targetsToShow, closest.x);
	                }

	                // show tooltip when cursor is close to some point
	                selectedData = sameXData.map(function (d) {
	                    return $$.addName(d);
	                });
	                $$.showTooltip(selectedData, this);

	                // expand points
	                if (config.point_focus_expand_enabled) {
	                    $$.expandCircles(closest.index, closest.id, true);
	                }
	                $$.expandBars(closest.index, closest.id, true);

	                // Show xgrid focus line
	                $$.showXGridFocus(selectedData);

	                // Show cursor as pointer if point is close to mouse position
	                if ($$.isBarType(closest.id) || $$.dist(closest, mouse) < 100) {
	                    $$.svg.select('.' + CLASS.eventRect).style('cursor', 'pointer');
	                    if (!$$.mouseover) {
	                        config.data_onmouseover.call($$.api, closest);
	                        $$.mouseover = closest;
	                    }
	                }
	            })
	            .on('click', function () {
	                var targetsToShow = $$.filterTargetsToShow($$.data.targets);
	                var mouse, closest;

	                if ($$.hasArcType(targetsToShow)) { return; }

	                mouse = d3.mouse(this);
	                closest = $$.findClosestFromTargets(targetsToShow, mouse);

	                if (! closest) { return; }

	                // select if selection enabled
	                if ($$.isBarType(closest.id) || $$.dist(closest, mouse) < 100) {
	                    $$.main.selectAll('.' + CLASS.shapes + $$.getTargetSelectorSuffix(closest.id)).selectAll('.' + CLASS.shape + '-' + closest.index).each(function () {
	                        if (config.data_selection_grouped || $$.isWithinShape(this, closest)) {
	                            $$.toggleShape(this, closest, closest.index);
	                            $$.config.data_onclick.call($$.api, closest, this);
	                        }
	                    });
	                }
	            })
	            .call(
	                config.data_selection_draggable && $$.drag ? (
	                    d3.behavior.drag().origin(Object)
	                        .on('drag', function () { $$.drag(d3.mouse(this)); })
	                        .on('dragstart', function () { $$.dragstart(d3.mouse(this)); })
	                        .on('dragend', function () { $$.dragend(); })
	                ) : function () {}
	            );
	    };
	    c3_chart_internal_fn.dispatchEvent = function (type, index, mouse) {
	        var $$ = this,
	            selector = '.' + CLASS.eventRect + (!$$.isMultipleX() ? '-' + index : ''),
	            eventRect = $$.main.select(selector).node(),
	            box = eventRect.getBoundingClientRect(),
	            x = box.left + (mouse ? mouse[0] : 0),
	            y = box.top + (mouse ? mouse[1] : 0),
	            event = document.createEvent("MouseEvents");

	        event.initMouseEvent(type, true, true, window, 0, x, y, x, y,
	                             false, false, false, false, 0, null);
	        eventRect.dispatchEvent(event);
	    };

	    c3_chart_internal_fn.getCurrentWidth = function () {
	        var $$ = this, config = $$.config;
	        return config.size_width ? config.size_width : $$.getParentWidth();
	    };
	    c3_chart_internal_fn.getCurrentHeight = function () {
	        var $$ = this, config = $$.config,
	            h = config.size_height ? config.size_height : $$.getParentHeight();
	        return h > 0 ? h : 320 / ($$.hasType('gauge') ? 2 : 1);
	    };
	    c3_chart_internal_fn.getCurrentPaddingTop = function () {
	        var config = this.config;
	        return isValue(config.padding_top) ? config.padding_top : 0;
	    };
	    c3_chart_internal_fn.getCurrentPaddingBottom = function () {
	        var config = this.config;
	        return isValue(config.padding_bottom) ? config.padding_bottom : 0;
	    };
	    c3_chart_internal_fn.getCurrentPaddingLeft = function (withoutRecompute) {
	        var $$ = this, config = $$.config;
	        if (isValue(config.padding_left)) {
	            return config.padding_left;
	        } else if (config.axis_rotated) {
	            return !config.axis_x_show ? 1 : Math.max(ceil10($$.getAxisWidthByAxisId('x', withoutRecompute)), 40);
	        } else if (!config.axis_y_show || config.axis_y_inner) { // && !config.axis_rotated
	            return $$.axis.getYAxisLabelPosition().isOuter ? 30 : 1;
	        } else {
	            return ceil10($$.getAxisWidthByAxisId('y', withoutRecompute));
	        }
	    };
	    c3_chart_internal_fn.getCurrentPaddingRight = function () {
	        var $$ = this, config = $$.config,
	            defaultPadding = 10, legendWidthOnRight = $$.isLegendRight ? $$.getLegendWidth() + 20 : 0;
	        if (isValue(config.padding_right)) {
	            return config.padding_right + 1; // 1 is needed not to hide tick line
	        } else if (config.axis_rotated) {
	            return defaultPadding + legendWidthOnRight;
	        } else if (!config.axis_y2_show || config.axis_y2_inner) { // && !config.axis_rotated
	            return 2 + legendWidthOnRight + ($$.axis.getY2AxisLabelPosition().isOuter ? 20 : 0);
	        } else {
	            return ceil10($$.getAxisWidthByAxisId('y2')) + legendWidthOnRight;
	        }
	    };

	    c3_chart_internal_fn.getParentRectValue = function (key) {
	        var parent = this.selectChart.node(), v;
	        while (parent && parent.tagName !== 'BODY') {
	            try {
	                v = parent.getBoundingClientRect()[key];
	            } catch(e) {
	                if (key === 'width') {
	                    // In IE in certain cases getBoundingClientRect
	                    // will cause an "unspecified error"
	                    v = parent.offsetWidth;
	                }
	            }
	            if (v) {
	                break;
	            }
	            parent = parent.parentNode;
	        }
	        return v;
	    };
	    c3_chart_internal_fn.getParentWidth = function () {
	        return this.getParentRectValue('width');
	    };
	    c3_chart_internal_fn.getParentHeight = function () {
	        var h = this.selectChart.style('height');
	        return h.indexOf('px') > 0 ? +h.replace('px', '') : 0;
	    };


	    c3_chart_internal_fn.getSvgLeft = function (withoutRecompute) {
	        var $$ = this, config = $$.config,
	            hasLeftAxisRect = config.axis_rotated || (!config.axis_rotated && !config.axis_y_inner),
	            leftAxisClass = config.axis_rotated ? CLASS.axisX : CLASS.axisY,
	            leftAxis = $$.main.select('.' + leftAxisClass).node(),
	            svgRect = leftAxis && hasLeftAxisRect ? leftAxis.getBoundingClientRect() : {right: 0},
	            chartRect = $$.selectChart.node().getBoundingClientRect(),
	            hasArc = $$.hasArcType(),
	            svgLeft = svgRect.right - chartRect.left - (hasArc ? 0 : $$.getCurrentPaddingLeft(withoutRecompute));
	        return svgLeft > 0 ? svgLeft : 0;
	    };


	    c3_chart_internal_fn.getAxisWidthByAxisId = function (id, withoutRecompute) {
	        var $$ = this, position = $$.axis.getLabelPositionById(id);
	        return $$.axis.getMaxTickWidth(id, withoutRecompute) + (position.isInner ? 20 : 40);
	    };
	    c3_chart_internal_fn.getHorizontalAxisHeight = function (axisId) {
	        var $$ = this, config = $$.config, h = 30;
	        if (axisId === 'x' && !config.axis_x_show) { return 8; }
	        if (axisId === 'x' && config.axis_x_height) { return config.axis_x_height; }
	        if (axisId === 'y' && !config.axis_y_show) { return config.legend_show && !$$.isLegendRight && !$$.isLegendInset ? 10 : 1; }
	        if (axisId === 'y2' && !config.axis_y2_show) { return $$.rotated_padding_top; }
	        // Calculate x axis height when tick rotated
	        if (axisId === 'x' && !config.axis_rotated && config.axis_x_tick_rotate) {
	            h = 30 + $$.axis.getMaxTickWidth(axisId) * Math.cos(Math.PI * (90 - config.axis_x_tick_rotate) / 180);
	        }
	        return h + ($$.axis.getLabelPositionById(axisId).isInner ? 0 : 10) + (axisId === 'y2' ? -10 : 0);
	    };

	    c3_chart_internal_fn.getEventRectWidth = function () {
	        return Math.max(0, this.xAxis.tickInterval());
	    };

	    c3_chart_internal_fn.getShapeIndices = function (typeFilter) {
	        var $$ = this, config = $$.config,
	            indices = {}, i = 0, j, k;
	        $$.filterTargetsToShow($$.data.targets.filter(typeFilter, $$)).forEach(function (d) {
	            for (j = 0; j < config.data_groups.length; j++) {
	                if (config.data_groups[j].indexOf(d.id) < 0) { continue; }
	                for (k = 0; k < config.data_groups[j].length; k++) {
	                    if (config.data_groups[j][k] in indices) {
	                        indices[d.id] = indices[config.data_groups[j][k]];
	                        break;
	                    }
	                }
	            }
	            if (isUndefined(indices[d.id])) { indices[d.id] = i++; }
	        });
	        indices.__max__ = i - 1;
	        return indices;
	    };
	    c3_chart_internal_fn.getShapeX = function (offset, targetsNum, indices, isSub) {
	        var $$ = this, scale = isSub ? $$.subX : $$.x;
	        return function (d) {
	            var index = d.id in indices ? indices[d.id] : 0;
	            return d.x || d.x === 0 ? scale(d.x) - offset * (targetsNum / 2 - index) : 0;
	        };
	    };
	    c3_chart_internal_fn.getShapeY = function (isSub) {
	        var $$ = this;
	        return function (d) {
	            var scale = isSub ? $$.getSubYScale(d.id) : $$.getYScale(d.id);
	            return scale(d.value);
	        };
	    };
	    c3_chart_internal_fn.getShapeOffset = function (typeFilter, indices, isSub) {
	        var $$ = this,
	            targets = $$.orderTargets($$.filterTargetsToShow($$.data.targets.filter(typeFilter, $$))),
	            targetIds = targets.map(function (t) { return t.id; });
	        return function (d, i) {
	            var scale = isSub ? $$.getSubYScale(d.id) : $$.getYScale(d.id),
	                y0 = scale(0), offset = y0;
	            targets.forEach(function (t) {
	                var values = $$.isStepType(d) ? $$.convertValuesToStep(t.values) : t.values;
	                if (t.id === d.id || indices[t.id] !== indices[d.id]) { return; }
	                if (targetIds.indexOf(t.id) < targetIds.indexOf(d.id)) {
	                    if (values[i].value * d.value >= 0) {
	                        offset += scale(values[i].value) - y0;
	                    }
	                }
	            });
	            return offset;
	        };
	    };
	    c3_chart_internal_fn.isWithinShape = function (that, d) {
	        var $$ = this,
	            shape = $$.d3.select(that), isWithin;
	        if (!$$.isTargetToShow(d.id)) {
	            isWithin = false;
	        }
	        else if (that.nodeName === 'circle') {
	            isWithin = $$.isStepType(d) ? $$.isWithinStep(that, $$.getYScale(d.id)(d.value)) : $$.isWithinCircle(that, $$.pointSelectR(d) * 1.5);
	        }
	        else if (that.nodeName === 'path') {
	            isWithin = shape.classed(CLASS.bar) ? $$.isWithinBar(that) : true;
	        }
	        return isWithin;
	    };


	    c3_chart_internal_fn.getInterpolate = function (d) {
	        var $$ = this;
	        return $$.isSplineType(d) ? "cardinal" : $$.isStepType(d) ? $$.config.line_step_type : "linear";
	    };

	    c3_chart_internal_fn.initLine = function () {
	        var $$ = this;
	        $$.main.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartLines);
	    };
	    c3_chart_internal_fn.updateTargetsForLine = function (targets) {
	        var $$ = this, config = $$.config,
	            mainLineUpdate, mainLineEnter,
	            classChartLine = $$.classChartLine.bind($$),
	            classLines = $$.classLines.bind($$),
	            classAreas = $$.classAreas.bind($$),
	            classCircles = $$.classCircles.bind($$),
	            classFocus = $$.classFocus.bind($$);
	        mainLineUpdate = $$.main.select('.' + CLASS.chartLines).selectAll('.' + CLASS.chartLine)
	            .data(targets)
	            .attr('class', function (d) { return classChartLine(d) + classFocus(d); });
	        mainLineEnter = mainLineUpdate.enter().append('g')
	            .attr('class', classChartLine)
	            .style('opacity', 0)
	            .style("pointer-events", "none");
	        // Lines for each data
	        mainLineEnter.append('g')
	            .attr("class", classLines);
	        // Areas
	        mainLineEnter.append('g')
	            .attr('class', classAreas);
	        // Circles for each data point on lines
	        mainLineEnter.append('g')
	            .attr("class", function (d) { return $$.generateClass(CLASS.selectedCircles, d.id); });
	        mainLineEnter.append('g')
	            .attr("class", classCircles)
	            .style("cursor", function (d) { return config.data_selection_isselectable(d) ? "pointer" : null; });
	        // Update date for selected circles
	        targets.forEach(function (t) {
	            $$.main.selectAll('.' + CLASS.selectedCircles + $$.getTargetSelectorSuffix(t.id)).selectAll('.' + CLASS.selectedCircle).each(function (d) {
	                d.value = t.values[d.index].value;
	            });
	        });
	        // MEMO: can not keep same color...
	        //mainLineUpdate.exit().remove();
	    };
	    c3_chart_internal_fn.updateLine = function (durationForExit) {
	        var $$ = this;
	        $$.mainLine = $$.main.selectAll('.' + CLASS.lines).selectAll('.' + CLASS.line)
	            .data($$.lineData.bind($$));
	        $$.mainLine.enter().append('path')
	            .attr('class', $$.classLine.bind($$))
	            .style("stroke", $$.color);
	        $$.mainLine
	            .style("opacity", $$.initialOpacity.bind($$))
	            .style('shape-rendering', function (d) { return $$.isStepType(d) ? 'crispEdges' : ''; })
	            .attr('transform', null);
	        $$.mainLine.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawLine = function (drawLine, withTransition) {
	        return [
	            (withTransition ? this.mainLine.transition() : this.mainLine)
	                .attr("d", drawLine)
	                .style("stroke", this.color)
	                .style("opacity", 1)
	        ];
	    };
	    c3_chart_internal_fn.generateDrawLine = function (lineIndices, isSub) {
	        var $$ = this, config = $$.config,
	            line = $$.d3.svg.line(),
	            getPoints = $$.generateGetLinePoints(lineIndices, isSub),
	            yScaleGetter = isSub ? $$.getSubYScale : $$.getYScale,
	            xValue = function (d) { return (isSub ? $$.subxx : $$.xx).call($$, d); },
	            yValue = function (d, i) {
	                return config.data_groups.length > 0 ? getPoints(d, i)[0][1] : yScaleGetter.call($$, d.id)(d.value);
	            };

	        line = config.axis_rotated ? line.x(yValue).y(xValue) : line.x(xValue).y(yValue);
	        if (!config.line_connectNull) { line = line.defined(function (d) { return d.value != null; }); }
	        return function (d) {
	            var values = config.line_connectNull ? $$.filterRemoveNull(d.values) : d.values,
	                x = isSub ? $$.x : $$.subX, y = yScaleGetter.call($$, d.id), x0 = 0, y0 = 0, path;
	            if ($$.isLineType(d)) {
	                if (config.data_regions[d.id]) {
	                    path = $$.lineWithRegions(values, x, y, config.data_regions[d.id]);
	                } else {
	                    if ($$.isStepType(d)) { values = $$.convertValuesToStep(values); }
	                    path = line.interpolate($$.getInterpolate(d))(values);
	                }
	            } else {
	                if (values[0]) {
	                    x0 = x(values[0].x);
	                    y0 = y(values[0].value);
	                }
	                path = config.axis_rotated ? "M " + y0 + " " + x0 : "M " + x0 + " " + y0;
	            }
	            return path ? path : "M 0 0";
	        };
	    };
	    c3_chart_internal_fn.generateGetLinePoints = function (lineIndices, isSub) { // partial duplication of generateGetBarPoints
	        var $$ = this, config = $$.config,
	            lineTargetsNum = lineIndices.__max__ + 1,
	            x = $$.getShapeX(0, lineTargetsNum, lineIndices, !!isSub),
	            y = $$.getShapeY(!!isSub),
	            lineOffset = $$.getShapeOffset($$.isLineType, lineIndices, !!isSub),
	            yScale = isSub ? $$.getSubYScale : $$.getYScale;
	        return function (d, i) {
	            var y0 = yScale.call($$, d.id)(0),
	                offset = lineOffset(d, i) || y0, // offset is for stacked area chart
	                posX = x(d), posY = y(d);
	            // fix posY not to overflow opposite quadrant
	            if (config.axis_rotated) {
	                if ((0 < d.value && posY < y0) || (d.value < 0 && y0 < posY)) { posY = y0; }
	            }
	            // 1 point that marks the line position
	            return [
	                [posX, posY - (y0 - offset)],
	                [posX, posY - (y0 - offset)], // needed for compatibility
	                [posX, posY - (y0 - offset)], // needed for compatibility
	                [posX, posY - (y0 - offset)]  // needed for compatibility
	            ];
	        };
	    };


	    c3_chart_internal_fn.lineWithRegions = function (d, x, y, _regions) {
	        var $$ = this, config = $$.config,
	            prev = -1, i, j,
	            s = "M", sWithRegion,
	            xp, yp, dx, dy, dd, diff, diffx2,
	            xOffset = $$.isCategorized() ? 0.5 : 0,
	            xValue, yValue,
	            regions = [];

	        function isWithinRegions(x, regions) {
	            var i;
	            for (i = 0; i < regions.length; i++) {
	                if (regions[i].start < x && x <= regions[i].end) { return true; }
	            }
	            return false;
	        }

	        // Check start/end of regions
	        if (isDefined(_regions)) {
	            for (i = 0; i < _regions.length; i++) {
	                regions[i] = {};
	                if (isUndefined(_regions[i].start)) {
	                    regions[i].start = d[0].x;
	                } else {
	                    regions[i].start = $$.isTimeSeries() ? $$.parseDate(_regions[i].start) : _regions[i].start;
	                }
	                if (isUndefined(_regions[i].end)) {
	                    regions[i].end = d[d.length - 1].x;
	                } else {
	                    regions[i].end = $$.isTimeSeries() ? $$.parseDate(_regions[i].end) : _regions[i].end;
	                }
	            }
	        }

	        // Set scales
	        xValue = config.axis_rotated ? function (d) { return y(d.value); } : function (d) { return x(d.x); };
	        yValue = config.axis_rotated ? function (d) { return x(d.x); } : function (d) { return y(d.value); };

	        // Define svg generator function for region
	        function generateM(points) {
	            return 'M' + points[0][0] + ' ' + points[0][1] + ' ' + points[1][0] + ' ' + points[1][1];
	        }
	        if ($$.isTimeSeries()) {
	            sWithRegion = function (d0, d1, j, diff) {
	                var x0 = d0.x.getTime(), x_diff = d1.x - d0.x,
	                    xv0 = new Date(x0 + x_diff * j),
	                    xv1 = new Date(x0 + x_diff * (j + diff)),
	                    points;
	                if (config.axis_rotated) {
	                    points = [[y(yp(j)), x(xv0)], [y(yp(j + diff)), x(xv1)]];
	                } else {
	                    points = [[x(xv0), y(yp(j))], [x(xv1), y(yp(j + diff))]];
	                }
	                return generateM(points);
	            };
	        } else {
	            sWithRegion = function (d0, d1, j, diff) {
	                var points;
	                if (config.axis_rotated) {
	                    points = [[y(yp(j), true), x(xp(j))], [y(yp(j + diff), true), x(xp(j + diff))]];
	                } else {
	                    points = [[x(xp(j), true), y(yp(j))], [x(xp(j + diff), true), y(yp(j + diff))]];
	                }
	                return generateM(points);
	            };
	        }

	        // Generate
	        for (i = 0; i < d.length; i++) {

	            // Draw as normal
	            if (isUndefined(regions) || ! isWithinRegions(d[i].x, regions)) {
	                s += " " + xValue(d[i]) + " " + yValue(d[i]);
	            }
	            // Draw with region // TODO: Fix for horizotal charts
	            else {
	                xp = $$.getScale(d[i - 1].x + xOffset, d[i].x + xOffset, $$.isTimeSeries());
	                yp = $$.getScale(d[i - 1].value, d[i].value);

	                dx = x(d[i].x) - x(d[i - 1].x);
	                dy = y(d[i].value) - y(d[i - 1].value);
	                dd = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
	                diff = 2 / dd;
	                diffx2 = diff * 2;

	                for (j = diff; j <= 1; j += diffx2) {
	                    s += sWithRegion(d[i - 1], d[i], j, diff);
	                }
	            }
	            prev = d[i].x;
	        }

	        return s;
	    };


	    c3_chart_internal_fn.updateArea = function (durationForExit) {
	        var $$ = this, d3 = $$.d3;
	        $$.mainArea = $$.main.selectAll('.' + CLASS.areas).selectAll('.' + CLASS.area)
	            .data($$.lineData.bind($$));
	        $$.mainArea.enter().append('path')
	            .attr("class", $$.classArea.bind($$))
	            .style("fill", $$.color)
	            .style("opacity", function () { $$.orgAreaOpacity = +d3.select(this).style('opacity'); return 0; });
	        $$.mainArea
	            .style("opacity", $$.orgAreaOpacity);
	        $$.mainArea.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawArea = function (drawArea, withTransition) {
	        return [
	            (withTransition ? this.mainArea.transition() : this.mainArea)
	                .attr("d", drawArea)
	                .style("fill", this.color)
	                .style("opacity", this.orgAreaOpacity)
	        ];
	    };
	    c3_chart_internal_fn.generateDrawArea = function (areaIndices, isSub) {
	        var $$ = this, config = $$.config, area = $$.d3.svg.area(),
	            getPoints = $$.generateGetAreaPoints(areaIndices, isSub),
	            yScaleGetter = isSub ? $$.getSubYScale : $$.getYScale,
	            xValue = function (d) { return (isSub ? $$.subxx : $$.xx).call($$, d); },
	            value0 = function (d, i) {
	                return config.data_groups.length > 0 ? getPoints(d, i)[0][1] : yScaleGetter.call($$, d.id)($$.getAreaBaseValue(d.id));
	            },
	            value1 = function (d, i) {
	                return config.data_groups.length > 0 ? getPoints(d, i)[1][1] : yScaleGetter.call($$, d.id)(d.value);
	            };

	        area = config.axis_rotated ? area.x0(value0).x1(value1).y(xValue) : area.x(xValue).y0(value0).y1(value1);
	        if (!config.line_connectNull) {
	            area = area.defined(function (d) { return d.value !== null; });
	        }

	        return function (d) {
	            var values = config.line_connectNull ? $$.filterRemoveNull(d.values) : d.values,
	                x0 = 0, y0 = 0, path;
	            if ($$.isAreaType(d)) {
	                if ($$.isStepType(d)) { values = $$.convertValuesToStep(values); }
	                path = area.interpolate($$.getInterpolate(d))(values);
	            } else {
	                if (values[0]) {
	                    x0 = $$.x(values[0].x);
	                    y0 = $$.getYScale(d.id)(values[0].value);
	                }
	                path = config.axis_rotated ? "M " + y0 + " " + x0 : "M " + x0 + " " + y0;
	            }
	            return path ? path : "M 0 0";
	        };
	    };
	    c3_chart_internal_fn.getAreaBaseValue = function () {
	        return 0;
	    };
	    c3_chart_internal_fn.generateGetAreaPoints = function (areaIndices, isSub) { // partial duplication of generateGetBarPoints
	        var $$ = this, config = $$.config,
	            areaTargetsNum = areaIndices.__max__ + 1,
	            x = $$.getShapeX(0, areaTargetsNum, areaIndices, !!isSub),
	            y = $$.getShapeY(!!isSub),
	            areaOffset = $$.getShapeOffset($$.isAreaType, areaIndices, !!isSub),
	            yScale = isSub ? $$.getSubYScale : $$.getYScale;
	        return function (d, i) {
	            var y0 = yScale.call($$, d.id)(0),
	                offset = areaOffset(d, i) || y0, // offset is for stacked area chart
	                posX = x(d), posY = y(d);
	            // fix posY not to overflow opposite quadrant
	            if (config.axis_rotated) {
	                if ((0 < d.value && posY < y0) || (d.value < 0 && y0 < posY)) { posY = y0; }
	            }
	            // 1 point that marks the area position
	            return [
	                [posX, offset],
	                [posX, posY - (y0 - offset)],
	                [posX, posY - (y0 - offset)], // needed for compatibility
	                [posX, offset] // needed for compatibility
	            ];
	        };
	    };


	    c3_chart_internal_fn.updateCircle = function () {
	        var $$ = this;
	        $$.mainCircle = $$.main.selectAll('.' + CLASS.circles).selectAll('.' + CLASS.circle)
	            .data($$.lineOrScatterData.bind($$));
	        $$.mainCircle.enter().append("circle")
	            .attr("class", $$.classCircle.bind($$))
	            .attr("r", $$.pointR.bind($$))
	            .style("fill", $$.color);
	        $$.mainCircle
	            .style("opacity", $$.initialOpacityForCircle.bind($$));
	        $$.mainCircle.exit().remove();
	    };
	    c3_chart_internal_fn.redrawCircle = function (cx, cy, withTransition) {
	        var selectedCircles = this.main.selectAll('.' + CLASS.selectedCircle);
	        return [
	            (withTransition ? this.mainCircle.transition() : this.mainCircle)
	                .style('opacity', this.opacityForCircle.bind(this))
	                .style("fill", this.color)
	                .attr("cx", cx)
	                .attr("cy", cy),
	            (withTransition ? selectedCircles.transition() : selectedCircles)
	                .attr("cx", cx)
	                .attr("cy", cy)
	        ];
	    };
	    c3_chart_internal_fn.circleX = function (d) {
	        return d.x || d.x === 0 ? this.x(d.x) : null;
	    };
	    c3_chart_internal_fn.updateCircleY = function () {
	        var $$ = this, lineIndices, getPoints;
	        if ($$.config.data_groups.length > 0) {
	            lineIndices = $$.getShapeIndices($$.isLineType),
	            getPoints = $$.generateGetLinePoints(lineIndices);
	            $$.circleY = function (d, i) {
	                return getPoints(d, i)[0][1];
	            };
	        } else {
	            $$.circleY = function (d) {
	                return $$.getYScale(d.id)(d.value);
	            };
	        }
	    };
	    c3_chart_internal_fn.getCircles = function (i, id) {
	        var $$ = this;
	        return (id ? $$.main.selectAll('.' + CLASS.circles + $$.getTargetSelectorSuffix(id)) : $$.main).selectAll('.' + CLASS.circle + (isValue(i) ? '-' + i : ''));
	    };
	    c3_chart_internal_fn.expandCircles = function (i, id, reset) {
	        var $$ = this,
	            r = $$.pointExpandedR.bind($$);
	        if (reset) { $$.unexpandCircles(); }
	        $$.getCircles(i, id)
	            .classed(CLASS.EXPANDED, true)
	            .attr('r', r);
	    };
	    c3_chart_internal_fn.unexpandCircles = function (i) {
	        var $$ = this,
	            r = $$.pointR.bind($$);
	        $$.getCircles(i)
	            .filter(function () { return $$.d3.select(this).classed(CLASS.EXPANDED); })
	            .classed(CLASS.EXPANDED, false)
	            .attr('r', r);
	    };
	    c3_chart_internal_fn.pointR = function (d) {
	        var $$ = this, config = $$.config;
	        return $$.isStepType(d) ? 0 : (isFunction(config.point_r) ? config.point_r(d) : config.point_r);
	    };
	    c3_chart_internal_fn.pointExpandedR = function (d) {
	        var $$ = this, config = $$.config;
	        return config.point_focus_expand_enabled ? (config.point_focus_expand_r ? config.point_focus_expand_r : $$.pointR(d) * 1.75) : $$.pointR(d);
	    };
	    c3_chart_internal_fn.pointSelectR = function (d) {
	        var $$ = this, config = $$.config;
	        return config.point_select_r ? config.point_select_r : $$.pointR(d) * 4;
	    };
	    c3_chart_internal_fn.isWithinCircle = function (that, r) {
	        var d3 = this.d3,
	            mouse = d3.mouse(that), d3_this = d3.select(that),
	            cx = +d3_this.attr("cx"), cy = +d3_this.attr("cy");
	        return Math.sqrt(Math.pow(cx - mouse[0], 2) + Math.pow(cy - mouse[1], 2)) < r;
	    };
	    c3_chart_internal_fn.isWithinStep = function (that, y) {
	        return Math.abs(y - this.d3.mouse(that)[1]) < 30;
	    };

	    c3_chart_internal_fn.initBar = function () {
	        var $$ = this;
	        $$.main.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartBars);
	    };
	    c3_chart_internal_fn.updateTargetsForBar = function (targets) {
	        var $$ = this, config = $$.config,
	            mainBarUpdate, mainBarEnter,
	            classChartBar = $$.classChartBar.bind($$),
	            classBars = $$.classBars.bind($$),
	            classFocus = $$.classFocus.bind($$);
	        mainBarUpdate = $$.main.select('.' + CLASS.chartBars).selectAll('.' + CLASS.chartBar)
	            .data(targets)
	            .attr('class', function (d) { return classChartBar(d) + classFocus(d); });
	        mainBarEnter = mainBarUpdate.enter().append('g')
	            .attr('class', classChartBar)
	            .style('opacity', 0)
	            .style("pointer-events", "none");
	        // Bars for each data
	        mainBarEnter.append('g')
	            .attr("class", classBars)
	            .style("cursor", function (d) { return config.data_selection_isselectable(d) ? "pointer" : null; });

	    };
	    c3_chart_internal_fn.updateBar = function (durationForExit) {
	        var $$ = this,
	            barData = $$.barData.bind($$),
	            classBar = $$.classBar.bind($$),
	            initialOpacity = $$.initialOpacity.bind($$),
	            color = function (d) { return $$.color(d.id); };
	        $$.mainBar = $$.main.selectAll('.' + CLASS.bars).selectAll('.' + CLASS.bar)
	            .data(barData);
	        $$.mainBar.enter().append('path')
	            .attr("class", classBar)
	            .style("stroke", color)
	            .style("fill", color);
	        $$.mainBar
	            .style("opacity", initialOpacity);
	        $$.mainBar.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawBar = function (drawBar, withTransition) {
	        return [
	            (withTransition ? this.mainBar.transition() : this.mainBar)
	                .attr('d', drawBar)
	                .style("fill", this.color)
	                .style("opacity", 1)
	        ];
	    };
	    c3_chart_internal_fn.getBarW = function (axis, barTargetsNum) {
	        var $$ = this, config = $$.config,
	            w = typeof config.bar_width === 'number' ? config.bar_width : barTargetsNum ? (axis.tickInterval() * config.bar_width_ratio) / barTargetsNum : 0;
	        return config.bar_width_max && w > config.bar_width_max ? config.bar_width_max : w;
	    };
	    c3_chart_internal_fn.getBars = function (i, id) {
	        var $$ = this;
	        return (id ? $$.main.selectAll('.' + CLASS.bars + $$.getTargetSelectorSuffix(id)) : $$.main).selectAll('.' + CLASS.bar + (isValue(i) ? '-' + i : ''));
	    };
	    c3_chart_internal_fn.expandBars = function (i, id, reset) {
	        var $$ = this;
	        if (reset) { $$.unexpandBars(); }
	        $$.getBars(i, id).classed(CLASS.EXPANDED, true);
	    };
	    c3_chart_internal_fn.unexpandBars = function (i) {
	        var $$ = this;
	        $$.getBars(i).classed(CLASS.EXPANDED, false);
	    };
	    c3_chart_internal_fn.generateDrawBar = function (barIndices, isSub) {
	        var $$ = this, config = $$.config,
	            getPoints = $$.generateGetBarPoints(barIndices, isSub);
	        return function (d, i) {
	            // 4 points that make a bar
	            var points = getPoints(d, i);

	            // switch points if axis is rotated, not applicable for sub chart
	            var indexX = config.axis_rotated ? 1 : 0;
	            var indexY = config.axis_rotated ? 0 : 1;

	            var path = 'M ' + points[0][indexX] + ',' + points[0][indexY] + ' ' +
	                    'L' + points[1][indexX] + ',' + points[1][indexY] + ' ' +
	                    'L' + points[2][indexX] + ',' + points[2][indexY] + ' ' +
	                    'L' + points[3][indexX] + ',' + points[3][indexY] + ' ' +
	                    'z';

	            return path;
	        };
	    };
	    c3_chart_internal_fn.generateGetBarPoints = function (barIndices, isSub) {
	        var $$ = this,
	            axis = isSub ? $$.subXAxis : $$.xAxis,
	            barTargetsNum = barIndices.__max__ + 1,
	            barW = $$.getBarW(axis, barTargetsNum),
	            barX = $$.getShapeX(barW, barTargetsNum, barIndices, !!isSub),
	            barY = $$.getShapeY(!!isSub),
	            barOffset = $$.getShapeOffset($$.isBarType, barIndices, !!isSub),
	            yScale = isSub ? $$.getSubYScale : $$.getYScale;
	        return function (d, i) {
	            var y0 = yScale.call($$, d.id)(0),
	                offset = barOffset(d, i) || y0, // offset is for stacked bar chart
	                posX = barX(d), posY = barY(d);
	            // fix posY not to overflow opposite quadrant
	            if ($$.config.axis_rotated) {
	                if ((0 < d.value && posY < y0) || (d.value < 0 && y0 < posY)) { posY = y0; }
	            }
	            // 4 points that make a bar
	            return [
	                [posX, offset],
	                [posX, posY - (y0 - offset)],
	                [posX + barW, posY - (y0 - offset)],
	                [posX + barW, offset]
	            ];
	        };
	    };
	    c3_chart_internal_fn.isWithinBar = function (that) {
	        var mouse = this.d3.mouse(that), box = that.getBoundingClientRect(),
	            seg0 = that.pathSegList.getItem(0), seg1 = that.pathSegList.getItem(1),
	            x = Math.min(seg0.x, seg1.x), y = Math.min(seg0.y, seg1.y),
	            w = box.width, h = box.height, offset = 2,
	            sx = x - offset, ex = x + w + offset, sy = y + h + offset, ey = y - offset;
	        return sx < mouse[0] && mouse[0] < ex && ey < mouse[1] && mouse[1] < sy;
	    };

	    c3_chart_internal_fn.initText = function () {
	        var $$ = this;
	        $$.main.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartTexts);
	        $$.mainText = $$.d3.selectAll([]);
	    };
	    c3_chart_internal_fn.updateTargetsForText = function (targets) {
	        var $$ = this, mainTextUpdate, mainTextEnter,
	            classChartText = $$.classChartText.bind($$),
	            classTexts = $$.classTexts.bind($$),
	            classFocus = $$.classFocus.bind($$);
	        mainTextUpdate = $$.main.select('.' + CLASS.chartTexts).selectAll('.' + CLASS.chartText)
	            .data(targets)
	            .attr('class', function (d) { return classChartText(d) + classFocus(d); });
	        mainTextEnter = mainTextUpdate.enter().append('g')
	            .attr('class', classChartText)
	            .style('opacity', 0)
	            .style("pointer-events", "none");
	        mainTextEnter.append('g')
	            .attr('class', classTexts);
	    };
	    c3_chart_internal_fn.updateText = function (durationForExit) {
	        var $$ = this, config = $$.config,
	            barOrLineData = $$.barOrLineData.bind($$),
	            classText = $$.classText.bind($$);
	        $$.mainText = $$.main.selectAll('.' + CLASS.texts).selectAll('.' + CLASS.text)
	            .data(barOrLineData);
	        $$.mainText.enter().append('text')
	            .attr("class", classText)
	            .attr('text-anchor', function (d) { return config.axis_rotated ? (d.value < 0 ? 'end' : 'start') : 'middle'; })
	            .style("stroke", 'none')
	            .style("fill", function (d) { return $$.color(d); })
	            .style("fill-opacity", 0);
	        $$.mainText
	            .text(function (d, i, j) { return $$.dataLabelFormat(d.id)(d.value, d.id, i, j); });
	        $$.mainText.exit()
	            .transition().duration(durationForExit)
	            .style('fill-opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawText = function (xForText, yForText, forFlow, withTransition) {
	        return [
	            (withTransition ? this.mainText.transition() : this.mainText)
	                .attr('x', xForText)
	                .attr('y', yForText)
	                .style("fill", this.color)
	                .style("fill-opacity", forFlow ? 0 : this.opacityForText.bind(this))
	        ];
	    };
	    c3_chart_internal_fn.getTextRect = function (text, cls) {
	        var dummy = this.d3.select('body').append('div').classed('c3', true),
	            svg = dummy.append("svg").style('visibility', 'hidden').style('position', 'fixed').style('top', 0).style('left', 0),
	            rect;
	        svg.selectAll('.dummy')
	            .data([text])
	          .enter().append('text')
	            .classed(cls ? cls : "", true)
	            .text(text)
	          .each(function () { rect = this.getBoundingClientRect(); });
	        dummy.remove();
	        return rect;
	    };
	    c3_chart_internal_fn.generateXYForText = function (areaIndices, barIndices, lineIndices, forX) {
	        var $$ = this,
	            getAreaPoints = $$.generateGetAreaPoints(areaIndices, false),
	            getBarPoints = $$.generateGetBarPoints(barIndices, false),
	            getLinePoints = $$.generateGetLinePoints(lineIndices, false),
	            getter = forX ? $$.getXForText : $$.getYForText;
	        return function (d, i) {
	            var getPoints = $$.isAreaType(d) ? getAreaPoints : $$.isBarType(d) ? getBarPoints : getLinePoints;
	            return getter.call($$, getPoints(d, i), d, this);
	        };
	    };
	    c3_chart_internal_fn.getXForText = function (points, d, textElement) {
	        var $$ = this,
	            box = textElement.getBoundingClientRect(), xPos, padding;
	        if ($$.config.axis_rotated) {
	            padding = $$.isBarType(d) ? 4 : 6;
	            xPos = points[2][1] + padding * (d.value < 0 ? -1 : 1);
	        } else {
	            xPos = $$.hasType('bar') ? (points[2][0] + points[0][0]) / 2 : points[0][0];
	        }
	        // show labels regardless of the domain if value is null
	        if (d.value === null) {
	            if (xPos > $$.width) {
	                xPos = $$.width - box.width;
	            } else if (xPos < 0) {
	                xPos = 4;
	            }
	        }
	        return xPos;
	    };
	    c3_chart_internal_fn.getYForText = function (points, d, textElement) {
	        var $$ = this,
	            box = textElement.getBoundingClientRect(),
	            yPos;
	        if ($$.config.axis_rotated) {
	            yPos = (points[0][0] + points[2][0] + box.height * 0.6) / 2;
	        } else {
	            yPos = points[2][1];
	            if (d.value < 0) {
	                yPos += box.height;
	                if ($$.isBarType(d) && $$.isSafari()) {
	                    yPos -= 3;
	                }
	                else if (!$$.isBarType(d) && $$.isChrome()) {
	                    yPos += 3;
	                }
	            } else {
	                yPos += $$.isBarType(d) ? -3 : -6;
	            }
	        }
	        // show labels regardless of the domain if value is null
	        if (d.value === null && !$$.config.axis_rotated) {
	            if (yPos < box.height) {
	                yPos = box.height;
	            } else if (yPos > this.height) {
	                yPos = this.height - 4;
	            }
	        }
	        return yPos;
	    };

	    c3_chart_internal_fn.setTargetType = function (targetIds, type) {
	        var $$ = this, config = $$.config;
	        $$.mapToTargetIds(targetIds).forEach(function (id) {
	            $$.withoutFadeIn[id] = (type === config.data_types[id]);
	            config.data_types[id] = type;
	        });
	        if (!targetIds) {
	            config.data_type = type;
	        }
	    };
	    c3_chart_internal_fn.hasType = function (type, targets) {
	        var $$ = this, types = $$.config.data_types, has = false;
	        targets = targets || $$.data.targets;
	        if (targets && targets.length) {
	            targets.forEach(function (target) {
	                var t = types[target.id];
	                if ((t && t.indexOf(type) >= 0) || (!t && type === 'line')) {
	                    has = true;
	                }
	            });
	        } else if (Object.keys(types).length) {
	            Object.keys(types).forEach(function (id) {
	                if (types[id] === type) { has = true; }
	            });
	        } else {
	            has = $$.config.data_type === type;
	        }
	        return has;
	    };
	    c3_chart_internal_fn.hasArcType = function (targets) {
	        return this.hasType('pie', targets) || this.hasType('donut', targets) || this.hasType('gauge', targets);
	    };
	    c3_chart_internal_fn.isLineType = function (d) {
	        var config = this.config, id = isString(d) ? d : d.id;
	        return !config.data_types[id] || ['line', 'spline', 'area', 'area-spline', 'step', 'area-step'].indexOf(config.data_types[id]) >= 0;
	    };
	    c3_chart_internal_fn.isStepType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return ['step', 'area-step'].indexOf(this.config.data_types[id]) >= 0;
	    };
	    c3_chart_internal_fn.isSplineType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return ['spline', 'area-spline'].indexOf(this.config.data_types[id]) >= 0;
	    };
	    c3_chart_internal_fn.isAreaType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return ['area', 'area-spline', 'area-step'].indexOf(this.config.data_types[id]) >= 0;
	    };
	    c3_chart_internal_fn.isBarType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return this.config.data_types[id] === 'bar';
	    };
	    c3_chart_internal_fn.isScatterType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return this.config.data_types[id] === 'scatter';
	    };
	    c3_chart_internal_fn.isPieType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return this.config.data_types[id] === 'pie';
	    };
	    c3_chart_internal_fn.isGaugeType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return this.config.data_types[id] === 'gauge';
	    };
	    c3_chart_internal_fn.isDonutType = function (d) {
	        var id = isString(d) ? d : d.id;
	        return this.config.data_types[id] === 'donut';
	    };
	    c3_chart_internal_fn.isArcType = function (d) {
	        return this.isPieType(d) || this.isDonutType(d) || this.isGaugeType(d);
	    };
	    c3_chart_internal_fn.lineData = function (d) {
	        return this.isLineType(d) ? [d] : [];
	    };
	    c3_chart_internal_fn.arcData = function (d) {
	        return this.isArcType(d.data) ? [d] : [];
	    };
	    /* not used
	     function scatterData(d) {
	     return isScatterType(d) ? d.values : [];
	     }
	     */
	    c3_chart_internal_fn.barData = function (d) {
	        return this.isBarType(d) ? d.values : [];
	    };
	    c3_chart_internal_fn.lineOrScatterData = function (d) {
	        return this.isLineType(d) || this.isScatterType(d) ? d.values : [];
	    };
	    c3_chart_internal_fn.barOrLineData = function (d) {
	        return this.isBarType(d) || this.isLineType(d) ? d.values : [];
	    };

	    c3_chart_internal_fn.initGrid = function () {
	        var $$ = this, config = $$.config, d3 = $$.d3;
	        $$.grid = $$.main.append('g')
	            .attr("clip-path", $$.clipPathForGrid)
	            .attr('class', CLASS.grid);
	        if (config.grid_x_show) {
	            $$.grid.append("g").attr("class", CLASS.xgrids);
	        }
	        if (config.grid_y_show) {
	            $$.grid.append('g').attr('class', CLASS.ygrids);
	        }
	        if (config.grid_focus_show) {
	            $$.grid.append('g')
	                .attr("class", CLASS.xgridFocus)
	                .append('line')
	                .attr('class', CLASS.xgridFocus);
	        }
	        $$.xgrid = d3.selectAll([]);
	        if (!config.grid_lines_front) { $$.initGridLines(); }
	    };
	    c3_chart_internal_fn.initGridLines = function () {
	        var $$ = this, d3 = $$.d3;
	        $$.gridLines = $$.main.append('g')
	            .attr("clip-path", $$.clipPathForGrid)
	            .attr('class', CLASS.grid + ' ' + CLASS.gridLines);
	        $$.gridLines.append('g').attr("class", CLASS.xgridLines);
	        $$.gridLines.append('g').attr('class', CLASS.ygridLines);
	        $$.xgridLines = d3.selectAll([]);
	    };
	    c3_chart_internal_fn.updateXGrid = function (withoutUpdate) {
	        var $$ = this, config = $$.config, d3 = $$.d3,
	            xgridData = $$.generateGridData(config.grid_x_type, $$.x),
	            tickOffset = $$.isCategorized() ? $$.xAxis.tickOffset() : 0;

	        $$.xgridAttr = config.axis_rotated ? {
	            'x1': 0,
	            'x2': $$.width,
	            'y1': function (d) { return $$.x(d) - tickOffset; },
	            'y2': function (d) { return $$.x(d) - tickOffset; }
	        } : {
	            'x1': function (d) { return $$.x(d) + tickOffset; },
	            'x2': function (d) { return $$.x(d) + tickOffset; },
	            'y1': 0,
	            'y2': $$.height
	        };

	        $$.xgrid = $$.main.select('.' + CLASS.xgrids).selectAll('.' + CLASS.xgrid)
	            .data(xgridData);
	        $$.xgrid.enter().append('line').attr("class", CLASS.xgrid);
	        if (!withoutUpdate) {
	            $$.xgrid.attr($$.xgridAttr)
	                .style("opacity", function () { return +d3.select(this).attr(config.axis_rotated ? 'y1' : 'x1') === (config.axis_rotated ? $$.height : 0) ? 0 : 1; });
	        }
	        $$.xgrid.exit().remove();
	    };

	    c3_chart_internal_fn.updateYGrid = function () {
	        var $$ = this, config = $$.config,
	            gridValues = $$.yAxis.tickValues() || $$.y.ticks(config.grid_y_ticks);
	        $$.ygrid = $$.main.select('.' + CLASS.ygrids).selectAll('.' + CLASS.ygrid)
	            .data(gridValues);
	        $$.ygrid.enter().append('line')
	            .attr('class', CLASS.ygrid);
	        $$.ygrid.attr("x1", config.axis_rotated ? $$.y : 0)
	            .attr("x2", config.axis_rotated ? $$.y : $$.width)
	            .attr("y1", config.axis_rotated ? 0 : $$.y)
	            .attr("y2", config.axis_rotated ? $$.height : $$.y);
	        $$.ygrid.exit().remove();
	        $$.smoothLines($$.ygrid, 'grid');
	    };

	    c3_chart_internal_fn.gridTextAnchor = function (d) {
	        return d.position ? d.position : "end";
	    };
	    c3_chart_internal_fn.gridTextDx = function (d) {
	        return d.position === 'start' ? 4 : d.position === 'middle' ? 0 : -4;
	    };
	    c3_chart_internal_fn.xGridTextX = function (d) {
	        return d.position === 'start' ? -this.height : d.position === 'middle' ? -this.height / 2 : 0;
	    };
	    c3_chart_internal_fn.yGridTextX = function (d) {
	        return d.position === 'start' ? 0 : d.position === 'middle' ? this.width / 2 : this.width;
	    };
	    c3_chart_internal_fn.updateGrid = function (duration) {
	        var $$ = this, main = $$.main, config = $$.config,
	            xgridLine, ygridLine, yv;

	        // hide if arc type
	        $$.grid.style('visibility', $$.hasArcType() ? 'hidden' : 'visible');

	        main.select('line.' + CLASS.xgridFocus).style("visibility", "hidden");
	        if (config.grid_x_show) {
	            $$.updateXGrid();
	        }
	        $$.xgridLines = main.select('.' + CLASS.xgridLines).selectAll('.' + CLASS.xgridLine)
	            .data(config.grid_x_lines);
	        // enter
	        xgridLine = $$.xgridLines.enter().append('g')
	            .attr("class", function (d) { return CLASS.xgridLine + (d['class'] ? ' ' + d['class'] : ''); });
	        xgridLine.append('line')
	            .style("opacity", 0);
	        xgridLine.append('text')
	            .attr("text-anchor", $$.gridTextAnchor)
	            .attr("transform", config.axis_rotated ? "" : "rotate(-90)")
	            .attr('dx', $$.gridTextDx)
	            .attr('dy', -5)
	            .style("opacity", 0);
	        // udpate
	        // done in d3.transition() of the end of this function
	        // exit
	        $$.xgridLines.exit().transition().duration(duration)
	            .style("opacity", 0)
	            .remove();

	        // Y-Grid
	        if (config.grid_y_show) {
	            $$.updateYGrid();
	        }
	        $$.ygridLines = main.select('.' + CLASS.ygridLines).selectAll('.' + CLASS.ygridLine)
	            .data(config.grid_y_lines);
	        // enter
	        ygridLine = $$.ygridLines.enter().append('g')
	            .attr("class", function (d) { return CLASS.ygridLine + (d['class'] ? ' ' + d['class'] : ''); });
	        ygridLine.append('line')
	            .style("opacity", 0);
	        ygridLine.append('text')
	            .attr("text-anchor", $$.gridTextAnchor)
	            .attr("transform", config.axis_rotated ? "rotate(-90)" : "")
	            .attr('dx', $$.gridTextDx)
	            .attr('dy', -5)
	            .style("opacity", 0);
	        // update
	        yv = $$.yv.bind($$);
	        $$.ygridLines.select('line')
	          .transition().duration(duration)
	            .attr("x1", config.axis_rotated ? yv : 0)
	            .attr("x2", config.axis_rotated ? yv : $$.width)
	            .attr("y1", config.axis_rotated ? 0 : yv)
	            .attr("y2", config.axis_rotated ? $$.height : yv)
	            .style("opacity", 1);
	        $$.ygridLines.select('text')
	          .transition().duration(duration)
	            .attr("x", config.axis_rotated ? $$.xGridTextX.bind($$) : $$.yGridTextX.bind($$))
	            .attr("y", yv)
	            .text(function (d) { return d.text; })
	            .style("opacity", 1);
	        // exit
	        $$.ygridLines.exit().transition().duration(duration)
	            .style("opacity", 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawGrid = function (withTransition) {
	        var $$ = this, config = $$.config, xv = $$.xv.bind($$),
	            lines = $$.xgridLines.select('line'),
	            texts = $$.xgridLines.select('text');
	        return [
	            (withTransition ? lines.transition() : lines)
	                .attr("x1", config.axis_rotated ? 0 : xv)
	                .attr("x2", config.axis_rotated ? $$.width : xv)
	                .attr("y1", config.axis_rotated ? xv : 0)
	                .attr("y2", config.axis_rotated ? xv : $$.height)
	                .style("opacity", 1),
	            (withTransition ? texts.transition() : texts)
	                .attr("x", config.axis_rotated ? $$.yGridTextX.bind($$) : $$.xGridTextX.bind($$))
	                .attr("y", xv)
	                .text(function (d) { return d.text; })
	                .style("opacity", 1)
	        ];
	    };
	    c3_chart_internal_fn.showXGridFocus = function (selectedData) {
	        var $$ = this, config = $$.config,
	            dataToShow = selectedData.filter(function (d) { return d && isValue(d.value); }),
	            focusEl = $$.main.selectAll('line.' + CLASS.xgridFocus),
	            xx = $$.xx.bind($$);
	        if (! config.tooltip_show) { return; }
	        // Hide when scatter plot exists
	        if ($$.hasType('scatter') || $$.hasArcType()) { return; }
	        focusEl
	            .style("visibility", "visible")
	            .data([dataToShow[0]])
	            .attr(config.axis_rotated ? 'y1' : 'x1', xx)
	            .attr(config.axis_rotated ? 'y2' : 'x2', xx);
	        $$.smoothLines(focusEl, 'grid');
	    };
	    c3_chart_internal_fn.hideXGridFocus = function () {
	        this.main.select('line.' + CLASS.xgridFocus).style("visibility", "hidden");
	    };
	    c3_chart_internal_fn.updateXgridFocus = function () {
	        var $$ = this, config = $$.config;
	        $$.main.select('line.' + CLASS.xgridFocus)
	            .attr("x1", config.axis_rotated ? 0 : -10)
	            .attr("x2", config.axis_rotated ? $$.width : -10)
	            .attr("y1", config.axis_rotated ? -10 : 0)
	            .attr("y2", config.axis_rotated ? -10 : $$.height);
	    };
	    c3_chart_internal_fn.generateGridData = function (type, scale) {
	        var $$ = this,
	            gridData = [], xDomain, firstYear, lastYear, i,
	            tickNum = $$.main.select("." + CLASS.axisX).selectAll('.tick').size();
	        if (type === 'year') {
	            xDomain = $$.getXDomain();
	            firstYear = xDomain[0].getFullYear();
	            lastYear = xDomain[1].getFullYear();
	            for (i = firstYear; i <= lastYear; i++) {
	                gridData.push(new Date(i + '-01-01 00:00:00'));
	            }
	        } else {
	            gridData = scale.ticks(10);
	            if (gridData.length > tickNum) { // use only int
	                gridData = gridData.filter(function (d) { return ("" + d).indexOf('.') < 0; });
	            }
	        }
	        return gridData;
	    };
	    c3_chart_internal_fn.getGridFilterToRemove = function (params) {
	        return params ? function (line) {
	            var found = false;
	            [].concat(params).forEach(function (param) {
	                if ((('value' in param && line.value === param.value) || ('class' in param && line['class'] === param['class']))) {
	                    found = true;
	                }
	            });
	            return found;
	        } : function () { return true; };
	    };
	    c3_chart_internal_fn.removeGridLines = function (params, forX) {
	        var $$ = this, config = $$.config,
	            toRemove = $$.getGridFilterToRemove(params),
	            toShow = function (line) { return !toRemove(line); },
	            classLines = forX ? CLASS.xgridLines : CLASS.ygridLines,
	            classLine = forX ? CLASS.xgridLine : CLASS.ygridLine;
	        $$.main.select('.' + classLines).selectAll('.' + classLine).filter(toRemove)
	            .transition().duration(config.transition_duration)
	            .style('opacity', 0).remove();
	        if (forX) {
	            config.grid_x_lines = config.grid_x_lines.filter(toShow);
	        } else {
	            config.grid_y_lines = config.grid_y_lines.filter(toShow);
	        }
	    };

	    c3_chart_internal_fn.initTooltip = function () {
	        var $$ = this, config = $$.config, i;
	        $$.tooltip = $$.selectChart
	            .style("position", "relative")
	          .append("div")
	            .attr('class', CLASS.tooltipContainer)
	            .style("position", "absolute")
	            .style("pointer-events", "none")
	            .style("display", "none");
	        // Show tooltip if needed
	        if (config.tooltip_init_show) {
	            if ($$.isTimeSeries() && isString(config.tooltip_init_x)) {
	                config.tooltip_init_x = $$.parseDate(config.tooltip_init_x);
	                for (i = 0; i < $$.data.targets[0].values.length; i++) {
	                    if (($$.data.targets[0].values[i].x - config.tooltip_init_x) === 0) { break; }
	                }
	                config.tooltip_init_x = i;
	            }
	            $$.tooltip.html(config.tooltip_contents.call($$, $$.data.targets.map(function (d) {
	                return $$.addName(d.values[config.tooltip_init_x]);
	            }), $$.axis.getXAxisTickFormat(), $$.getYFormat($$.hasArcType()), $$.color));
	            $$.tooltip.style("top", config.tooltip_init_position.top)
	                .style("left", config.tooltip_init_position.left)
	                .style("display", "block");
	        }
	    };
	    c3_chart_internal_fn.getTooltipContent = function (d, defaultTitleFormat, defaultValueFormat, color) {
	        var $$ = this, config = $$.config,
	            titleFormat = config.tooltip_format_title || defaultTitleFormat,
	            nameFormat = config.tooltip_format_name || function (name) { return name; },
	            valueFormat = config.tooltip_format_value || defaultValueFormat,
	            text, i, title, value, name, bgcolor;
	        for (i = 0; i < d.length; i++) {
	            if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

	            if (! text) {
	                title = titleFormat ? titleFormat(d[i].x) : d[i].x;
	                text = "<table class='" + CLASS.tooltip + "'>" + (title || title === 0 ? "<tr><th colspan='2'>" + title + "</th></tr>" : "");
	            }

	            value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
	            if (value !== undefined) {
	                name = nameFormat(d[i].name, d[i].ratio, d[i].id, d[i].index);
	                bgcolor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

	                text += "<tr class='" + CLASS.tooltipName + "-" + d[i].id + "'>";
	                text += "<td class='name'><span style='background-color:" + bgcolor + "'></span>" + name + "</td>";
	                text += "<td class='value'>" + value + "</td>";
	                text += "</tr>";
	            }
	        }
	        return text + "</table>";
	    };
	    c3_chart_internal_fn.tooltipPosition = function (dataToShow, tWidth, tHeight, element) {
	        var $$ = this, config = $$.config, d3 = $$.d3;
	        var svgLeft, tooltipLeft, tooltipRight, tooltipTop, chartRight;
	        var forArc = $$.hasArcType(),
	            mouse = d3.mouse(element);
	      // Determin tooltip position
	        if (forArc) {
	            tooltipLeft = (($$.width - ($$.isLegendRight ? $$.getLegendWidth() : 0)) / 2) + mouse[0];
	            tooltipTop = ($$.height / 2) + mouse[1] + 20;
	        } else {
	            svgLeft = $$.getSvgLeft(true);
	            if (config.axis_rotated) {
	                tooltipLeft = svgLeft + mouse[0] + 100;
	                tooltipRight = tooltipLeft + tWidth;
	                chartRight = $$.currentWidth - $$.getCurrentPaddingRight();
	                tooltipTop = $$.x(dataToShow[0].x) + 20;
	            } else {
	                tooltipLeft = svgLeft + $$.getCurrentPaddingLeft(true) + $$.x(dataToShow[0].x) + 20;
	                tooltipRight = tooltipLeft + tWidth;
	                chartRight = svgLeft + $$.currentWidth - $$.getCurrentPaddingRight();
	                tooltipTop = mouse[1] + 15;
	            }

	            if (tooltipRight > chartRight) {
	                // 20 is needed for Firefox to keep tooletip width
	                tooltipLeft -= tooltipRight - chartRight + 20;
	            }
	            if (tooltipTop + tHeight > $$.currentHeight) {
	                tooltipTop -= tHeight + 30;
	            }
	        }
	        if (tooltipTop < 0) {
	            tooltipTop = 0;
	        }
	        return {top: tooltipTop, left: tooltipLeft};
	    };
	    c3_chart_internal_fn.showTooltip = function (selectedData, element) {
	        var $$ = this, config = $$.config;
	        var tWidth, tHeight, position;
	        var forArc = $$.hasArcType(),
	            dataToShow = selectedData.filter(function (d) { return d && isValue(d.value); }),
	            positionFunction = config.tooltip_position || c3_chart_internal_fn.tooltipPosition;
	        if (dataToShow.length === 0 || !config.tooltip_show) {
	            return;
	        }
	        $$.tooltip.html(config.tooltip_contents.call($$, selectedData, $$.axis.getXAxisTickFormat(), $$.getYFormat(forArc), $$.color)).style("display", "block");

	        // Get tooltip dimensions
	        tWidth = $$.tooltip.property('offsetWidth');
	        tHeight = $$.tooltip.property('offsetHeight');

	        position = positionFunction.call(this, dataToShow, tWidth, tHeight, element);
	        // Set tooltip
	        $$.tooltip
	            .style("top", position.top + "px")
	            .style("left", position.left + 'px');
	    };
	    c3_chart_internal_fn.hideTooltip = function () {
	        this.tooltip.style("display", "none");
	    };

	    c3_chart_internal_fn.initLegend = function () {
	        var $$ = this;
	        $$.legendItemTextBox = {};
	        $$.legendHasRendered = false;
	        $$.legend = $$.svg.append("g").attr("transform", $$.getTranslate('legend'));
	        if (!$$.config.legend_show) {
	            $$.legend.style('visibility', 'hidden');
	            $$.hiddenLegendIds = $$.mapToIds($$.data.targets);
	            return;
	        }
	        // MEMO: call here to update legend box and tranlate for all
	        // MEMO: translate will be upated by this, so transform not needed in updateLegend()
	        $$.updateLegendWithDefaults();
	    };
	    c3_chart_internal_fn.updateLegendWithDefaults = function () {
	        var $$ = this;
	        $$.updateLegend($$.mapToIds($$.data.targets), {withTransform: false, withTransitionForTransform: false, withTransition: false});
	    };
	    c3_chart_internal_fn.updateSizeForLegend = function (legendHeight, legendWidth) {
	        var $$ = this, config = $$.config, insetLegendPosition = {
	            top: $$.isLegendTop ? $$.getCurrentPaddingTop() + config.legend_inset_y + 5.5 : $$.currentHeight - legendHeight - $$.getCurrentPaddingBottom() - config.legend_inset_y,
	            left: $$.isLegendLeft ? $$.getCurrentPaddingLeft() + config.legend_inset_x + 0.5 : $$.currentWidth - legendWidth - $$.getCurrentPaddingRight() - config.legend_inset_x + 0.5
	        };

	        $$.margin3 = {
	            top: $$.isLegendRight ? 0 : $$.isLegendInset ? insetLegendPosition.top : $$.currentHeight - legendHeight,
	            right: NaN,
	            bottom: 0,
	            left: $$.isLegendRight ? $$.currentWidth - legendWidth : $$.isLegendInset ? insetLegendPosition.left : 0
	        };
	    };
	    c3_chart_internal_fn.transformLegend = function (withTransition) {
	        var $$ = this;
	        (withTransition ? $$.legend.transition() : $$.legend).attr("transform", $$.getTranslate('legend'));
	    };
	    c3_chart_internal_fn.updateLegendStep = function (step) {
	        this.legendStep = step;
	    };
	    c3_chart_internal_fn.updateLegendItemWidth = function (w) {
	        this.legendItemWidth = w;
	    };
	    c3_chart_internal_fn.updateLegendItemHeight = function (h) {
	        this.legendItemHeight = h;
	    };
	    c3_chart_internal_fn.getLegendWidth = function () {
	        var $$ = this;
	        return $$.config.legend_show ? $$.isLegendRight || $$.isLegendInset ? $$.legendItemWidth * ($$.legendStep + 1) : $$.currentWidth : 0;
	    };
	    c3_chart_internal_fn.getLegendHeight = function () {
	        var $$ = this, h = 0;
	        if ($$.config.legend_show) {
	            if ($$.isLegendRight) {
	                h = $$.currentHeight;
	            } else {
	                h = Math.max(20, $$.legendItemHeight) * ($$.legendStep + 1);
	            }
	        }
	        return h;
	    };
	    c3_chart_internal_fn.opacityForLegend = function (legendItem) {
	        return legendItem.classed(CLASS.legendItemHidden) ? null : 1;
	    };
	    c3_chart_internal_fn.opacityForUnfocusedLegend = function (legendItem) {
	        return legendItem.classed(CLASS.legendItemHidden) ? null : 0.3;
	    };
	    c3_chart_internal_fn.toggleFocusLegend = function (targetIds, focus) {
	        var $$ = this;
	        targetIds = $$.mapToTargetIds(targetIds);
	        $$.legend.selectAll('.' + CLASS.legendItem)
	            .filter(function (id) { return targetIds.indexOf(id) >= 0; })
	            .classed(CLASS.legendItemFocused, focus)
	          .transition().duration(100)
	            .style('opacity', function () {
	                var opacity = focus ? $$.opacityForLegend : $$.opacityForUnfocusedLegend;
	                return opacity.call($$, $$.d3.select(this));
	            });
	    };
	    c3_chart_internal_fn.revertLegend = function () {
	        var $$ = this, d3 = $$.d3;
	        $$.legend.selectAll('.' + CLASS.legendItem)
	            .classed(CLASS.legendItemFocused, false)
	            .transition().duration(100)
	            .style('opacity', function () { return $$.opacityForLegend(d3.select(this)); });
	    };
	    c3_chart_internal_fn.showLegend = function (targetIds) {
	        var $$ = this, config = $$.config;
	        if (!config.legend_show) {
	            config.legend_show = true;
	            $$.legend.style('visibility', 'visible');
	            if (!$$.legendHasRendered) {
	                $$.updateLegendWithDefaults();
	            }
	        }
	        $$.removeHiddenLegendIds(targetIds);
	        $$.legend.selectAll($$.selectorLegends(targetIds))
	            .style('visibility', 'visible')
	            .transition()
	            .style('opacity', function () { return $$.opacityForLegend($$.d3.select(this)); });
	    };
	    c3_chart_internal_fn.hideLegend = function (targetIds) {
	        var $$ = this, config = $$.config;
	        if (config.legend_show && isEmpty(targetIds)) {
	            config.legend_show = false;
	            $$.legend.style('visibility', 'hidden');
	        }
	        $$.addHiddenLegendIds(targetIds);
	        $$.legend.selectAll($$.selectorLegends(targetIds))
	            .style('opacity', 0)
	            .style('visibility', 'hidden');
	    };
	    c3_chart_internal_fn.clearLegendItemTextBoxCache = function () {
	        this.legendItemTextBox = {};
	    };
	    c3_chart_internal_fn.updateLegend = function (targetIds, options, transitions) {
	        var $$ = this, config = $$.config;
	        var xForLegend, xForLegendText, xForLegendRect, yForLegend, yForLegendText, yForLegendRect;
	        var paddingTop = 4, paddingRight = 10, maxWidth = 0, maxHeight = 0, posMin = 10, tileWidth = 15;
	        var l, totalLength = 0, offsets = {}, widths = {}, heights = {}, margins = [0], steps = {}, step = 0;
	        var withTransition, withTransitionForTransform;
	        var texts, rects, tiles, background;

	        options = options || {};
	        withTransition = getOption(options, "withTransition", true);
	        withTransitionForTransform = getOption(options, "withTransitionForTransform", true);

	        function getTextBox(textElement, id) {
	            if (!$$.legendItemTextBox[id]) {
	                $$.legendItemTextBox[id] = $$.getTextRect(textElement.textContent, CLASS.legendItem);
	            }
	            return $$.legendItemTextBox[id];
	        }

	        function updatePositions(textElement, id, index) {
	            var reset = index === 0, isLast = index === targetIds.length - 1,
	                box = getTextBox(textElement, id),
	                itemWidth = box.width + tileWidth + (isLast && !($$.isLegendRight || $$.isLegendInset) ? 0 : paddingRight),
	                itemHeight = box.height + paddingTop,
	                itemLength = $$.isLegendRight || $$.isLegendInset ? itemHeight : itemWidth,
	                areaLength = $$.isLegendRight || $$.isLegendInset ? $$.getLegendHeight() : $$.getLegendWidth(),
	                margin, maxLength;

	            // MEMO: care about condifion of step, totalLength
	            function updateValues(id, withoutStep) {
	                if (!withoutStep) {
	                    margin = (areaLength - totalLength - itemLength) / 2;
	                    if (margin < posMin) {
	                        margin = (areaLength - itemLength) / 2;
	                        totalLength = 0;
	                        step++;
	                    }
	                }
	                steps[id] = step;
	                margins[step] = $$.isLegendInset ? 10 : margin;
	                offsets[id] = totalLength;
	                totalLength += itemLength;
	            }

	            if (reset) {
	                totalLength = 0;
	                step = 0;
	                maxWidth = 0;
	                maxHeight = 0;
	            }

	            if (config.legend_show && !$$.isLegendToShow(id)) {
	                widths[id] = heights[id] = steps[id] = offsets[id] = 0;
	                return;
	            }

	            widths[id] = itemWidth;
	            heights[id] = itemHeight;

	            if (!maxWidth || itemWidth >= maxWidth) { maxWidth = itemWidth; }
	            if (!maxHeight || itemHeight >= maxHeight) { maxHeight = itemHeight; }
	            maxLength = $$.isLegendRight || $$.isLegendInset ? maxHeight : maxWidth;

	            if (config.legend_equally) {
	                Object.keys(widths).forEach(function (id) { widths[id] = maxWidth; });
	                Object.keys(heights).forEach(function (id) { heights[id] = maxHeight; });
	                margin = (areaLength - maxLength * targetIds.length) / 2;
	                if (margin < posMin) {
	                    totalLength = 0;
	                    step = 0;
	                    targetIds.forEach(function (id) { updateValues(id); });
	                }
	                else {
	                    updateValues(id, true);
	                }
	            } else {
	                updateValues(id);
	            }
	        }

	        if ($$.isLegendInset) {
	            step = config.legend_inset_step ? config.legend_inset_step : targetIds.length;
	            $$.updateLegendStep(step);
	        }

	        if ($$.isLegendRight) {
	            xForLegend = function (id) { return maxWidth * steps[id]; };
	            yForLegend = function (id) { return margins[steps[id]] + offsets[id]; };
	        } else if ($$.isLegendInset) {
	            xForLegend = function (id) { return maxWidth * steps[id] + 10; };
	            yForLegend = function (id) { return margins[steps[id]] + offsets[id]; };
	        } else {
	            xForLegend = function (id) { return margins[steps[id]] + offsets[id]; };
	            yForLegend = function (id) { return maxHeight * steps[id]; };
	        }
	        xForLegendText = function (id, i) { return xForLegend(id, i) + 14; };
	        yForLegendText = function (id, i) { return yForLegend(id, i) + 9; };
	        xForLegendRect = function (id, i) { return xForLegend(id, i); };
	        yForLegendRect = function (id, i) { return yForLegend(id, i) - 5; };

	        // Define g for legend area
	        l = $$.legend.selectAll('.' + CLASS.legendItem)
	            .data(targetIds)
	            .enter().append('g')
	            .attr('class', function (id) { return $$.generateClass(CLASS.legendItem, id); })
	            .style('visibility', function (id) { return $$.isLegendToShow(id) ? 'visible' : 'hidden'; })
	            .style('cursor', 'pointer')
	            .on('click', function (id) {
	                if (config.legend_item_onclick) {
	                    config.legend_item_onclick.call($$, id);
	                } else {
	                    if ($$.d3.event.altKey) {
	                        $$.api.hide();
	                        $$.api.show(id);
	                    } else {
	                        $$.api.toggle(id);
	                        $$.isTargetToShow(id) ? $$.api.focus(id) : $$.api.revert();
	                    }
	                }
	            })
	            .on('mouseover', function (id) {
	                $$.d3.select(this).classed(CLASS.legendItemFocused, true);
	                if (!$$.transiting && $$.isTargetToShow(id)) {
	                    $$.api.focus(id);
	                }
	                if (config.legend_item_onmouseover) {
	                    config.legend_item_onmouseover.call($$, id);
	                }
	            })
	            .on('mouseout', function (id) {
	                $$.d3.select(this).classed(CLASS.legendItemFocused, false);
	                $$.api.revert();
	                if (config.legend_item_onmouseout) {
	                    config.legend_item_onmouseout.call($$, id);
	                }
	            });
	        l.append('text')
	            .text(function (id) { return isDefined(config.data_names[id]) ? config.data_names[id] : id; })
	            .each(function (id, i) { updatePositions(this, id, i); })
	            .style("pointer-events", "none")
	            .attr('x', $$.isLegendRight || $$.isLegendInset ? xForLegendText : -200)
	            .attr('y', $$.isLegendRight || $$.isLegendInset ? -200 : yForLegendText);
	        l.append('rect')
	            .attr("class", CLASS.legendItemEvent)
	            .style('fill-opacity', 0)
	            .attr('x', $$.isLegendRight || $$.isLegendInset ? xForLegendRect : -200)
	            .attr('y', $$.isLegendRight || $$.isLegendInset ? -200 : yForLegendRect);
	        l.append('rect')
	            .attr("class", CLASS.legendItemTile)
	            .style("pointer-events", "none")
	            .style('fill', $$.color)
	            .attr('x', $$.isLegendRight || $$.isLegendInset ? xForLegendText : -200)
	            .attr('y', $$.isLegendRight || $$.isLegendInset ? -200 : yForLegend)
	            .attr('width', 10)
	            .attr('height', 10);

	        // Set background for inset legend
	        background = $$.legend.select('.' + CLASS.legendBackground + ' rect');
	        if ($$.isLegendInset && maxWidth > 0 && background.size() === 0) {
	            background = $$.legend.insert('g', '.' + CLASS.legendItem)
	                .attr("class", CLASS.legendBackground)
	                .append('rect');
	        }

	        texts = $$.legend.selectAll('text')
	            .data(targetIds)
	            .text(function (id) { return isDefined(config.data_names[id]) ? config.data_names[id] : id; }) // MEMO: needed for update
	            .each(function (id, i) { updatePositions(this, id, i); });
	        (withTransition ? texts.transition() : texts)
	            .attr('x', xForLegendText)
	            .attr('y', yForLegendText);

	        rects = $$.legend.selectAll('rect.' + CLASS.legendItemEvent)
	            .data(targetIds);
	        (withTransition ? rects.transition() : rects)
	            .attr('width', function (id) { return widths[id]; })
	            .attr('height', function (id) { return heights[id]; })
	            .attr('x', xForLegendRect)
	            .attr('y', yForLegendRect);

	        tiles = $$.legend.selectAll('rect.' + CLASS.legendItemTile)
	            .data(targetIds);
	        (withTransition ? tiles.transition() : tiles)
	            .style('fill', $$.color)
	            .attr('x', xForLegend)
	            .attr('y', yForLegend);

	        if (background) {
	            (withTransition ? background.transition() : background)
	                .attr('height', $$.getLegendHeight() - 12)
	                .attr('width', maxWidth * (step + 1) + 10);
	        }

	        // toggle legend state
	        $$.legend.selectAll('.' + CLASS.legendItem)
	            .classed(CLASS.legendItemHidden, function (id) { return !$$.isTargetToShow(id); });

	        // Update all to reflect change of legend
	        $$.updateLegendItemWidth(maxWidth);
	        $$.updateLegendItemHeight(maxHeight);
	        $$.updateLegendStep(step);
	        // Update size and scale
	        $$.updateSizes();
	        $$.updateScales();
	        $$.updateSvgSize();
	        // Update g positions
	        $$.transformAll(withTransitionForTransform, transitions);
	        $$.legendHasRendered = true;
	    };

	    function Axis(owner) {
	        API.call(this, owner);
	    }

	    inherit(API, Axis);

	    Axis.prototype.init = function init() {

	        var $$ = this.owner, config = $$.config, main = $$.main;
	        $$.axes.x = main.append("g")
	            .attr("class", CLASS.axis + ' ' + CLASS.axisX)
	            .attr("clip-path", $$.clipPathForXAxis)
	            .attr("transform", $$.getTranslate('x'))
	            .style("visibility", config.axis_x_show ? 'visible' : 'hidden');
	        $$.axes.x.append("text")
	            .attr("class", CLASS.axisXLabel)
	            .attr("transform", config.axis_rotated ? "rotate(-90)" : "")
	            .style("text-anchor", this.textAnchorForXAxisLabel.bind(this));
	        $$.axes.y = main.append("g")
	            .attr("class", CLASS.axis + ' ' + CLASS.axisY)
	            .attr("clip-path", config.axis_y_inner ? "" : $$.clipPathForYAxis)
	            .attr("transform", $$.getTranslate('y'))
	            .style("visibility", config.axis_y_show ? 'visible' : 'hidden');
	        $$.axes.y.append("text")
	            .attr("class", CLASS.axisYLabel)
	            .attr("transform", config.axis_rotated ? "" : "rotate(-90)")
	            .style("text-anchor", this.textAnchorForYAxisLabel.bind(this));

	        $$.axes.y2 = main.append("g")
	            .attr("class", CLASS.axis + ' ' + CLASS.axisY2)
	            // clip-path?
	            .attr("transform", $$.getTranslate('y2'))
	            .style("visibility", config.axis_y2_show ? 'visible' : 'hidden');
	        $$.axes.y2.append("text")
	            .attr("class", CLASS.axisY2Label)
	            .attr("transform", config.axis_rotated ? "" : "rotate(-90)")
	            .style("text-anchor", this.textAnchorForY2AxisLabel.bind(this));
	    };
	    Axis.prototype.getXAxis = function getXAxis(scale, orient, tickFormat, tickValues, withOuterTick, withoutTransition, withoutRotateTickText) {
	        var $$ = this.owner, config = $$.config,
	            axisParams = {
	                isCategory: $$.isCategorized(),
	                withOuterTick: withOuterTick,
	                tickMultiline: config.axis_x_tick_multiline,
	                tickWidth: config.axis_x_tick_width,
	                tickTextRotate: withoutRotateTickText ? 0 : config.axis_x_tick_rotate,
	                withoutTransition: withoutTransition,
	            },
	            axis = c3_axis($$.d3, axisParams).scale(scale).orient(orient);

	        if ($$.isTimeSeries() && tickValues) {
	            tickValues = tickValues.map(function (v) { return $$.parseDate(v); });
	        }

	        // Set tick
	        axis.tickFormat(tickFormat).tickValues(tickValues);
	        if ($$.isCategorized()) {
	            axis.tickCentered(config.axis_x_tick_centered);
	            if (isEmpty(config.axis_x_tick_culling)) {
	                config.axis_x_tick_culling = false;
	            }
	        }

	        return axis;
	    };
	    Axis.prototype.updateXAxisTickValues = function updateXAxisTickValues(targets, axis) {
	        var $$ = this.owner, config = $$.config, tickValues;
	        if (config.axis_x_tick_fit || config.axis_x_tick_count) {
	            tickValues = this.generateTickValues($$.mapTargetsToUniqueXs(targets), config.axis_x_tick_count, $$.isTimeSeries());
	        }
	        if (axis) {
	            axis.tickValues(tickValues);
	        } else {
	            $$.xAxis.tickValues(tickValues);
	            $$.subXAxis.tickValues(tickValues);
	        }
	        return tickValues;
	    };
	    Axis.prototype.getYAxis = function getYAxis(scale, orient, tickFormat, tickValues, withOuterTick, withoutTransition) {
	        var axisParams = {
	            withOuterTick: withOuterTick,
	            withoutTransition: withoutTransition,
	        },
	            $$ = this.owner,
	            d3 = $$.d3,
	            config = $$.config,
	            axis = c3_axis(d3, axisParams).scale(scale).orient(orient).tickFormat(tickFormat);
	        if ($$.isTimeSeriesY()) {
	            axis.ticks(d3.time[config.axis_y_tick_time_value], config.axis_y_tick_time_interval);
	        } else {
	            axis.tickValues(tickValues);
	        }
	        return axis;
	    };
	    Axis.prototype.getId = function getId(id) {
	        var config = this.owner.config;
	        return id in config.data_axes ? config.data_axes[id] : 'y';
	    };
	    Axis.prototype.getXAxisTickFormat = function getXAxisTickFormat() {
	        var $$ = this.owner, config = $$.config,
	            format = $$.isTimeSeries() ? $$.defaultAxisTimeFormat : $$.isCategorized() ? $$.categoryName : function (v) { return v < 0 ? v.toFixed(0) : v; };
	        if (config.axis_x_tick_format) {
	            if (isFunction(config.axis_x_tick_format)) {
	                format = config.axis_x_tick_format;
	            } else if ($$.isTimeSeries()) {
	                format = function (date) {
	                    return date ? $$.axisTimeFormat(config.axis_x_tick_format)(date) : "";
	                };
	            }
	        }
	        return isFunction(format) ? function (v) { return format.call($$, v); } : format;
	    };
	    Axis.prototype.getTickValues = function getTickValues(tickValues, axis) {
	        return tickValues ? tickValues : axis ? axis.tickValues() : undefined;
	    };
	    Axis.prototype.getXAxisTickValues = function getXAxisTickValues() {
	        return this.getTickValues(this.owner.config.axis_x_tick_values, this.owner.xAxis);
	    };
	    Axis.prototype.getYAxisTickValues = function getYAxisTickValues() {
	        return this.getTickValues(this.owner.config.axis_y_tick_values, this.owner.yAxis);
	    };
	    Axis.prototype.getY2AxisTickValues = function getY2AxisTickValues() {
	        return this.getTickValues(this.owner.config.axis_y2_tick_values, this.owner.y2Axis);
	    };
	    Axis.prototype.getLabelOptionByAxisId = function getLabelOptionByAxisId(axisId) {
	        var $$ = this.owner, config = $$.config, option;
	        if (axisId === 'y') {
	            option = config.axis_y_label;
	        } else if (axisId === 'y2') {
	            option = config.axis_y2_label;
	        } else if (axisId === 'x') {
	            option = config.axis_x_label;
	        }
	        return option;
	    };
	    Axis.prototype.getLabelText = function getLabelText(axisId) {
	        var option = this.getLabelOptionByAxisId(axisId);
	        return isString(option) ? option : option ? option.text : null;
	    };
	    Axis.prototype.setLabelText = function setLabelText(axisId, text) {
	        var $$ = this.owner, config = $$.config,
	            option = this.getLabelOptionByAxisId(axisId);
	        if (isString(option)) {
	            if (axisId === 'y') {
	                config.axis_y_label = text;
	            } else if (axisId === 'y2') {
	                config.axis_y2_label = text;
	            } else if (axisId === 'x') {
	                config.axis_x_label = text;
	            }
	        } else if (option) {
	            option.text = text;
	        }
	    };
	    Axis.prototype.getLabelPosition = function getLabelPosition(axisId, defaultPosition) {
	        var option = this.getLabelOptionByAxisId(axisId),
	            position = (option && typeof option === 'object' && option.position) ? option.position : defaultPosition;
	        return {
	            isInner: position.indexOf('inner') >= 0,
	            isOuter: position.indexOf('outer') >= 0,
	            isLeft: position.indexOf('left') >= 0,
	            isCenter: position.indexOf('center') >= 0,
	            isRight: position.indexOf('right') >= 0,
	            isTop: position.indexOf('top') >= 0,
	            isMiddle: position.indexOf('middle') >= 0,
	            isBottom: position.indexOf('bottom') >= 0
	        };
	    };
	    Axis.prototype.getXAxisLabelPosition = function getXAxisLabelPosition() {
	        return this.getLabelPosition('x', this.owner.config.axis_rotated ? 'inner-top' : 'inner-right');
	    };
	    Axis.prototype.getYAxisLabelPosition = function getYAxisLabelPosition() {
	        return this.getLabelPosition('y', this.owner.config.axis_rotated ? 'inner-right' : 'inner-top');
	    };
	    Axis.prototype.getY2AxisLabelPosition = function getY2AxisLabelPosition() {
	        return this.getLabelPosition('y2', this.owner.config.axis_rotated ? 'inner-right' : 'inner-top');
	    };
	    Axis.prototype.getLabelPositionById = function getLabelPositionById(id) {
	        return id === 'y2' ? this.getY2AxisLabelPosition() : id === 'y' ? this.getYAxisLabelPosition() : this.getXAxisLabelPosition();
	    };
	    Axis.prototype.textForXAxisLabel = function textForXAxisLabel() {
	        return this.getLabelText('x');
	    };
	    Axis.prototype.textForYAxisLabel = function textForYAxisLabel() {
	        return this.getLabelText('y');
	    };
	    Axis.prototype.textForY2AxisLabel = function textForY2AxisLabel() {
	        return this.getLabelText('y2');
	    };
	    Axis.prototype.xForAxisLabel = function xForAxisLabel(forHorizontal, position) {
	        var $$ = this.owner;
	        if (forHorizontal) {
	            return position.isLeft ? 0 : position.isCenter ? $$.width / 2 : $$.width;
	        } else {
	            return position.isBottom ? -$$.height : position.isMiddle ? -$$.height / 2 : 0;
	        }
	    };
	    Axis.prototype.dxForAxisLabel = function dxForAxisLabel(forHorizontal, position) {
	        if (forHorizontal) {
	            return position.isLeft ? "0.5em" : position.isRight ? "-0.5em" : "0";
	        } else {
	            return position.isTop ? "-0.5em" : position.isBottom ? "0.5em" : "0";
	        }
	    };
	    Axis.prototype.textAnchorForAxisLabel = function textAnchorForAxisLabel(forHorizontal, position) {
	        if (forHorizontal) {
	            return position.isLeft ? 'start' : position.isCenter ? 'middle' : 'end';
	        } else {
	            return position.isBottom ? 'start' : position.isMiddle ? 'middle' : 'end';
	        }
	    };
	    Axis.prototype.xForXAxisLabel = function xForXAxisLabel() {
	        return this.xForAxisLabel(!this.owner.config.axis_rotated, this.getXAxisLabelPosition());
	    };
	    Axis.prototype.xForYAxisLabel = function xForYAxisLabel() {
	        return this.xForAxisLabel(this.owner.config.axis_rotated, this.getYAxisLabelPosition());
	    };
	    Axis.prototype.xForY2AxisLabel = function xForY2AxisLabel() {
	        return this.xForAxisLabel(this.owner.config.axis_rotated, this.getY2AxisLabelPosition());
	    };
	    Axis.prototype.dxForXAxisLabel = function dxForXAxisLabel() {
	        return this.dxForAxisLabel(!this.owner.config.axis_rotated, this.getXAxisLabelPosition());
	    };
	    Axis.prototype.dxForYAxisLabel = function dxForYAxisLabel() {
	        return this.dxForAxisLabel(this.owner.config.axis_rotated, this.getYAxisLabelPosition());
	    };
	    Axis.prototype.dxForY2AxisLabel = function dxForY2AxisLabel() {
	        return this.dxForAxisLabel(this.owner.config.axis_rotated, this.getY2AxisLabelPosition());
	    };
	    Axis.prototype.dyForXAxisLabel = function dyForXAxisLabel() {
	        var $$ = this.owner, config = $$.config,
	            position = this.getXAxisLabelPosition();
	        if (config.axis_rotated) {
	            return position.isInner ? "1.2em" : -25 - this.getMaxTickWidth('x');
	        } else {
	            return position.isInner ? "-0.5em" : config.axis_x_height ? config.axis_x_height - 10 : "3em";
	        }
	    };
	    Axis.prototype.dyForYAxisLabel = function dyForYAxisLabel() {
	        var $$ = this.owner,
	            position = this.getYAxisLabelPosition();
	        if ($$.config.axis_rotated) {
	            return position.isInner ? "-0.5em" : "3em";
	        } else {
	            return position.isInner ? "1.2em" : -10 - ($$.config.axis_y_inner ? 0 : (this.getMaxTickWidth('y') + 10));
	        }
	    };
	    Axis.prototype.dyForY2AxisLabel = function dyForY2AxisLabel() {
	        var $$ = this.owner,
	            position = this.getY2AxisLabelPosition();
	        if ($$.config.axis_rotated) {
	            return position.isInner ? "1.2em" : "-2.2em";
	        } else {
	            return position.isInner ? "-0.5em" : 15 + ($$.config.axis_y2_inner ? 0 : (this.getMaxTickWidth('y2') + 15));
	        }
	    };
	    Axis.prototype.textAnchorForXAxisLabel = function textAnchorForXAxisLabel() {
	        var $$ = this.owner;
	        return this.textAnchorForAxisLabel(!$$.config.axis_rotated, this.getXAxisLabelPosition());
	    };
	    Axis.prototype.textAnchorForYAxisLabel = function textAnchorForYAxisLabel() {
	        var $$ = this.owner;
	        return this.textAnchorForAxisLabel($$.config.axis_rotated, this.getYAxisLabelPosition());
	    };
	    Axis.prototype.textAnchorForY2AxisLabel = function textAnchorForY2AxisLabel() {
	        var $$ = this.owner;
	        return this.textAnchorForAxisLabel($$.config.axis_rotated, this.getY2AxisLabelPosition());
	    };
	    Axis.prototype.getMaxTickWidth = function getMaxTickWidth(id, withoutRecompute) {
	        var $$ = this.owner, config = $$.config,
	            maxWidth = 0, targetsToShow, scale, axis, dummy, svg;
	        if (withoutRecompute && $$.currentMaxTickWidths[id]) {
	            return $$.currentMaxTickWidths[id];
	        }
	        if ($$.svg) {
	            targetsToShow = $$.filterTargetsToShow($$.data.targets);
	            if (id === 'y') {
	                scale = $$.y.copy().domain($$.getYDomain(targetsToShow, 'y'));
	                axis = this.getYAxis(scale, $$.yOrient, config.axis_y_tick_format, $$.yAxisTickValues, false, true);
	            } else if (id === 'y2') {
	                scale = $$.y2.copy().domain($$.getYDomain(targetsToShow, 'y2'));
	                axis = this.getYAxis(scale, $$.y2Orient, config.axis_y2_tick_format, $$.y2AxisTickValues, false, true);
	            } else {
	                scale = $$.x.copy().domain($$.getXDomain(targetsToShow));
	                axis = this.getXAxis(scale, $$.xOrient, $$.xAxisTickFormat, $$.xAxisTickValues, false, true, true);
	                this.updateXAxisTickValues(targetsToShow, axis);
	            }
	            dummy = $$.d3.select('body').append('div').classed('c3', true);
	            svg = dummy.append("svg").style('visibility', 'hidden').style('position', 'fixed').style('top', 0).style('left', 0),
	            svg.append('g').call(axis).each(function () {
	                $$.d3.select(this).selectAll('text').each(function () {
	                    var box = this.getBoundingClientRect();
	                    if (maxWidth < box.width) { maxWidth = box.width; }
	                });
	                dummy.remove();
	            });
	        }
	        $$.currentMaxTickWidths[id] = maxWidth <= 0 ? $$.currentMaxTickWidths[id] : maxWidth;
	        return $$.currentMaxTickWidths[id];
	    };

	    Axis.prototype.updateLabels = function updateLabels(withTransition) {
	        var $$ = this.owner;
	        var axisXLabel = $$.main.select('.' + CLASS.axisX + ' .' + CLASS.axisXLabel),
	            axisYLabel = $$.main.select('.' + CLASS.axisY + ' .' + CLASS.axisYLabel),
	            axisY2Label = $$.main.select('.' + CLASS.axisY2 + ' .' + CLASS.axisY2Label);
	        (withTransition ? axisXLabel.transition() : axisXLabel)
	            .attr("x", this.xForXAxisLabel.bind(this))
	            .attr("dx", this.dxForXAxisLabel.bind(this))
	            .attr("dy", this.dyForXAxisLabel.bind(this))
	            .text(this.textForXAxisLabel.bind(this));
	        (withTransition ? axisYLabel.transition() : axisYLabel)
	            .attr("x", this.xForYAxisLabel.bind(this))
	            .attr("dx", this.dxForYAxisLabel.bind(this))
	            .attr("dy", this.dyForYAxisLabel.bind(this))
	            .text(this.textForYAxisLabel.bind(this));
	        (withTransition ? axisY2Label.transition() : axisY2Label)
	            .attr("x", this.xForY2AxisLabel.bind(this))
	            .attr("dx", this.dxForY2AxisLabel.bind(this))
	            .attr("dy", this.dyForY2AxisLabel.bind(this))
	            .text(this.textForY2AxisLabel.bind(this));
	    };
	    Axis.prototype.getPadding = function getPadding(padding, key, defaultValue, domainLength) {
	        if (!isValue(padding[key])) {
	            return defaultValue;
	        }
	        if (padding.unit === 'ratio') {
	            return padding[key] * domainLength;
	        }
	        // assume padding is pixels if unit is not specified
	        return this.convertPixelsToAxisPadding(padding[key], domainLength);
	    };
	    Axis.prototype.convertPixelsToAxisPadding = function convertPixelsToAxisPadding(pixels, domainLength) {
	        var $$ = this.owner,
	            length = $$.config.axis_rotated ? $$.width : $$.height;
	        return domainLength * (pixels / length);
	    };
	    Axis.prototype.generateTickValues = function generateTickValues(values, tickCount, forTimeSeries) {
	        var tickValues = values, targetCount, start, end, count, interval, i, tickValue;
	        if (tickCount) {
	            targetCount = isFunction(tickCount) ? tickCount() : tickCount;
	            // compute ticks according to tickCount
	            if (targetCount === 1) {
	                tickValues = [values[0]];
	            } else if (targetCount === 2) {
	                tickValues = [values[0], values[values.length - 1]];
	            } else if (targetCount > 2) {
	                count = targetCount - 2;
	                start = values[0];
	                end = values[values.length - 1];
	                interval = (end - start) / (count + 1);
	                // re-construct unique values
	                tickValues = [start];
	                for (i = 0; i < count; i++) {
	                    tickValue = +start + interval * (i + 1);
	                    tickValues.push(forTimeSeries ? new Date(tickValue) : tickValue);
	                }
	                tickValues.push(end);
	            }
	        }
	        if (!forTimeSeries) { tickValues = tickValues.sort(function (a, b) { return a - b; }); }
	        return tickValues;
	    };
	    Axis.prototype.generateTransitions = function generateTransitions(duration) {
	        var $$ = this.owner, axes = $$.axes;
	        return {
	            axisX: duration ? axes.x.transition().duration(duration) : axes.x,
	            axisY: duration ? axes.y.transition().duration(duration) : axes.y,
	            axisY2: duration ? axes.y2.transition().duration(duration) : axes.y2,
	            axisSubX: duration ? axes.subx.transition().duration(duration) : axes.subx
	        };
	    };
	    Axis.prototype.redraw = function redraw(transitions, isHidden) {
	        var $$ = this.owner;
	        $$.axes.x.style("opacity", isHidden ? 0 : 1);
	        $$.axes.y.style("opacity", isHidden ? 0 : 1);
	        $$.axes.y2.style("opacity", isHidden ? 0 : 1);
	        $$.axes.subx.style("opacity", isHidden ? 0 : 1);
	        transitions.axisX.call($$.xAxis);
	        transitions.axisY.call($$.yAxis);
	        transitions.axisY2.call($$.y2Axis);
	        transitions.axisSubX.call($$.subXAxis);
	    };

	    c3_chart_internal_fn.getClipPath = function (id) {
	        var isIE9 = window.navigator.appVersion.toLowerCase().indexOf("msie 9.") >= 0;
	        return "url(" + (isIE9 ? "" : document.URL.split('#')[0]) + "#" + id + ")";
	    };
	    c3_chart_internal_fn.appendClip = function (parent, id) {
	        return parent.append("clipPath").attr("id", id).append("rect");
	    };
	    c3_chart_internal_fn.getAxisClipX = function (forHorizontal) {
	        // axis line width + padding for left
	        var left = Math.max(30, this.margin.left);
	        return forHorizontal ? -(1 + left) : -(left - 1);
	    };
	    c3_chart_internal_fn.getAxisClipY = function (forHorizontal) {
	        return forHorizontal ? -20 : -this.margin.top;
	    };
	    c3_chart_internal_fn.getXAxisClipX = function () {
	        var $$ = this;
	        return $$.getAxisClipX(!$$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getXAxisClipY = function () {
	        var $$ = this;
	        return $$.getAxisClipY(!$$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getYAxisClipX = function () {
	        var $$ = this;
	        return $$.config.axis_y_inner ? -1 : $$.getAxisClipX($$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getYAxisClipY = function () {
	        var $$ = this;
	        return $$.getAxisClipY($$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getAxisClipWidth = function (forHorizontal) {
	        var $$ = this,
	            left = Math.max(30, $$.margin.left),
	            right = Math.max(30, $$.margin.right);
	        // width + axis line width + padding for left/right
	        return forHorizontal ? $$.width + 2 + left + right : $$.margin.left + 20;
	    };
	    c3_chart_internal_fn.getAxisClipHeight = function (forHorizontal) {
	        // less than 20 is not enough to show the axis label 'outer' without legend
	        return (forHorizontal ? this.margin.bottom : (this.margin.top + this.height)) + 20;
	    };
	    c3_chart_internal_fn.getXAxisClipWidth = function () {
	        var $$ = this;
	        return $$.getAxisClipWidth(!$$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getXAxisClipHeight = function () {
	        var $$ = this;
	        return $$.getAxisClipHeight(!$$.config.axis_rotated);
	    };
	    c3_chart_internal_fn.getYAxisClipWidth = function () {
	        var $$ = this;
	        return $$.getAxisClipWidth($$.config.axis_rotated) + ($$.config.axis_y_inner ? 20 : 0);
	    };
	    c3_chart_internal_fn.getYAxisClipHeight = function () {
	        var $$ = this;
	        return $$.getAxisClipHeight($$.config.axis_rotated);
	    };

	    c3_chart_internal_fn.initPie = function () {
	        var $$ = this, d3 = $$.d3, config = $$.config;
	        $$.pie = d3.layout.pie().value(function (d) {
	            return d.values.reduce(function (a, b) { return a + b.value; }, 0);
	        });
	        if (!config.data_order) {
	            $$.pie.sort(null);
	        }
	    };

	    c3_chart_internal_fn.updateRadius = function () {
	        var $$ = this, config = $$.config,
	            w = config.gauge_width || config.donut_width;
	        $$.radiusExpanded = Math.min($$.arcWidth, $$.arcHeight) / 2;
	        $$.radius = $$.radiusExpanded * 0.95;
	        $$.innerRadiusRatio = w ? ($$.radius - w) / $$.radius : 0.6;
	        $$.innerRadius = $$.hasType('donut') || $$.hasType('gauge') ? $$.radius * $$.innerRadiusRatio : 0;
	    };

	    c3_chart_internal_fn.updateArc = function () {
	        var $$ = this;
	        $$.svgArc = $$.getSvgArc();
	        $$.svgArcExpanded = $$.getSvgArcExpanded();
	        $$.svgArcExpandedSub = $$.getSvgArcExpanded(0.98);
	    };

	    c3_chart_internal_fn.updateAngle = function (d) {
	        var $$ = this, config = $$.config,
	            found = false, index = 0,
	            gMin = config.gauge_min, gMax = config.gauge_max, gTic, gValue;
	        $$.pie($$.filterTargetsToShow($$.data.targets)).forEach(function (t) {
	            if (! found && t.data.id === d.data.id) {
	                found = true;
	                d = t;
	                d.index = index;
	            }
	            index++;
	        });
	        if (isNaN(d.startAngle)) {
	            d.startAngle = 0;
	        }
	        if (isNaN(d.endAngle)) {
	            d.endAngle = d.startAngle;
	        }
	        if ($$.isGaugeType(d.data)) {
	            gTic = (Math.PI) / (gMax - gMin);
	            gValue = d.value < gMin ? 0 : d.value < gMax ? d.value - gMin : (gMax - gMin);
	            d.startAngle = -1 * (Math.PI / 2);
	            d.endAngle = d.startAngle + gTic * gValue;
	        }
	        return found ? d : null;
	    };

	    c3_chart_internal_fn.getSvgArc = function () {
	        var $$ = this,
	            arc = $$.d3.svg.arc().outerRadius($$.radius).innerRadius($$.innerRadius),
	            newArc = function (d, withoutUpdate) {
	                var updated;
	                if (withoutUpdate) { return arc(d); } // for interpolate
	                updated = $$.updateAngle(d);
	                return updated ? arc(updated) : "M 0 0";
	            };
	        // TODO: extends all function
	        newArc.centroid = arc.centroid;
	        return newArc;
	    };

	    c3_chart_internal_fn.getSvgArcExpanded = function (rate) {
	        var $$ = this,
	            arc = $$.d3.svg.arc().outerRadius($$.radiusExpanded * (rate ? rate : 1)).innerRadius($$.innerRadius);
	        return function (d) {
	            var updated = $$.updateAngle(d);
	            return updated ? arc(updated) : "M 0 0";
	        };
	    };

	    c3_chart_internal_fn.getArc = function (d, withoutUpdate, force) {
	        return force || this.isArcType(d.data) ? this.svgArc(d, withoutUpdate) : "M 0 0";
	    };


	    c3_chart_internal_fn.transformForArcLabel = function (d) {
	        var $$ = this,
	            updated = $$.updateAngle(d), c, x, y, h, ratio, translate = "";
	        if (updated && !$$.hasType('gauge')) {
	            c = this.svgArc.centroid(updated);
	            x = isNaN(c[0]) ? 0 : c[0];
	            y = isNaN(c[1]) ? 0 : c[1];
	            h = Math.sqrt(x * x + y * y);
	            // TODO: ratio should be an option?
	            ratio = $$.radius && h ? (36 / $$.radius > 0.375 ? 1.175 - 36 / $$.radius : 0.8) * $$.radius / h : 0;
	            translate = "translate(" + (x * ratio) +  ',' + (y * ratio) +  ")";
	        }
	        return translate;
	    };

	    c3_chart_internal_fn.getArcRatio = function (d) {
	        var $$ = this,
	            whole = $$.hasType('gauge') ? Math.PI : (Math.PI * 2);
	        return d ? (d.endAngle - d.startAngle) / whole : null;
	    };

	    c3_chart_internal_fn.convertToArcData = function (d) {
	        return this.addName({
	            id: d.data.id,
	            value: d.value,
	            ratio: this.getArcRatio(d),
	            index: d.index
	        });
	    };

	    c3_chart_internal_fn.textForArcLabel = function (d) {
	        var $$ = this,
	            updated, value, ratio, id, format;
	        if (! $$.shouldShowArcLabel()) { return ""; }
	        updated = $$.updateAngle(d);
	        value = updated ? updated.value : null;
	        ratio = $$.getArcRatio(updated);
	        id = d.data.id;
	        if (! $$.hasType('gauge') && ! $$.meetsArcLabelThreshold(ratio)) { return ""; }
	        format = $$.getArcLabelFormat();
	        return format ? format(value, ratio, id) : $$.defaultArcValueFormat(value, ratio);
	    };

	    c3_chart_internal_fn.expandArc = function (targetIds) {
	        var $$ = this, interval;

	        // MEMO: avoid to cancel transition
	        if ($$.transiting) {
	            interval = window.setInterval(function () {
	                if (!$$.transiting) {
	                    window.clearInterval(interval);
	                    if ($$.legend.selectAll('.c3-legend-item-focused').size() > 0) {
	                        $$.expandArc(targetIds);
	                    }
	                }
	            }, 10);
	            return;
	        }

	        targetIds = $$.mapToTargetIds(targetIds);

	        $$.svg.selectAll($$.selectorTargets(targetIds, '.' + CLASS.chartArc)).each(function (d) {
	            if (! $$.shouldExpand(d.data.id)) { return; }
	            $$.d3.select(this).selectAll('path')
	                .transition().duration(50)
	                .attr("d", $$.svgArcExpanded)
	                .transition().duration(100)
	                .attr("d", $$.svgArcExpandedSub)
	                .each(function (d) {
	                    if ($$.isDonutType(d.data)) {
	                        // callback here
	                    }
	                });
	        });
	    };

	    c3_chart_internal_fn.unexpandArc = function (targetIds) {
	        var $$ = this;

	        if ($$.transiting) { return; }

	        targetIds = $$.mapToTargetIds(targetIds);

	        $$.svg.selectAll($$.selectorTargets(targetIds, '.' + CLASS.chartArc)).selectAll('path')
	            .transition().duration(50)
	            .attr("d", $$.svgArc);
	        $$.svg.selectAll('.' + CLASS.arc)
	            .style("opacity", 1);
	    };

	    c3_chart_internal_fn.shouldExpand = function (id) {
	        var $$ = this, config = $$.config;
	        return ($$.isDonutType(id) && config.donut_expand) || ($$.isGaugeType(id) && config.gauge_expand) || ($$.isPieType(id) && config.pie_expand);
	    };

	    c3_chart_internal_fn.shouldShowArcLabel = function () {
	        var $$ = this, config = $$.config, shouldShow = true;
	        if ($$.hasType('donut')) {
	            shouldShow = config.donut_label_show;
	        } else if ($$.hasType('pie')) {
	            shouldShow = config.pie_label_show;
	        }
	        // when gauge, always true
	        return shouldShow;
	    };

	    c3_chart_internal_fn.meetsArcLabelThreshold = function (ratio) {
	        var $$ = this, config = $$.config,
	            threshold = $$.hasType('donut') ? config.donut_label_threshold : config.pie_label_threshold;
	        return ratio >= threshold;
	    };

	    c3_chart_internal_fn.getArcLabelFormat = function () {
	        var $$ = this, config = $$.config,
	            format = config.pie_label_format;
	        if ($$.hasType('gauge')) {
	            format = config.gauge_label_format;
	        } else if ($$.hasType('donut')) {
	            format = config.donut_label_format;
	        }
	        return format;
	    };

	    c3_chart_internal_fn.getArcTitle = function () {
	        var $$ = this;
	        return $$.hasType('donut') ? $$.config.donut_title : "";
	    };

	    c3_chart_internal_fn.updateTargetsForArc = function (targets) {
	        var $$ = this, main = $$.main,
	            mainPieUpdate, mainPieEnter,
	            classChartArc = $$.classChartArc.bind($$),
	            classArcs = $$.classArcs.bind($$),
	            classFocus = $$.classFocus.bind($$);
	        mainPieUpdate = main.select('.' + CLASS.chartArcs).selectAll('.' + CLASS.chartArc)
	            .data($$.pie(targets))
	            .attr("class", function (d) { return classChartArc(d) + classFocus(d.data); });
	        mainPieEnter = mainPieUpdate.enter().append("g")
	            .attr("class", classChartArc);
	        mainPieEnter.append('g')
	            .attr('class', classArcs);
	        mainPieEnter.append("text")
	            .attr("dy", $$.hasType('gauge') ? "-.1em" : ".35em")
	            .style("opacity", 0)
	            .style("text-anchor", "middle")
	            .style("pointer-events", "none");
	        // MEMO: can not keep same color..., but not bad to update color in redraw
	        //mainPieUpdate.exit().remove();
	    };

	    c3_chart_internal_fn.initArc = function () {
	        var $$ = this;
	        $$.arcs = $$.main.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartArcs)
	            .attr("transform", $$.getTranslate('arc'));
	        $$.arcs.append('text')
	            .attr('class', CLASS.chartArcsTitle)
	            .style("text-anchor", "middle")
	            .text($$.getArcTitle());
	    };

	    c3_chart_internal_fn.redrawArc = function (duration, durationForExit, withTransform) {
	        var $$ = this, d3 = $$.d3, config = $$.config, main = $$.main,
	            mainArc;
	        mainArc = main.selectAll('.' + CLASS.arcs).selectAll('.' + CLASS.arc)
	            .data($$.arcData.bind($$));
	        mainArc.enter().append('path')
	            .attr("class", $$.classArc.bind($$))
	            .style("fill", function (d) { return $$.color(d.data); })
	            .style("cursor", function (d) { return config.interaction_enabled && config.data_selection_isselectable(d) ? "pointer" : null; })
	            .style("opacity", 0)
	            .each(function (d) {
	                if ($$.isGaugeType(d.data)) {
	                    d.startAngle = d.endAngle = -1 * (Math.PI / 2);
	                }
	                this._current = d;
	            });
	        mainArc
	            .attr("transform", function (d) { return !$$.isGaugeType(d.data) && withTransform ? "scale(0)" : ""; })
	            .style("opacity", function (d) { return d === this._current ? 0 : 1; })
	            .on('mouseover', config.interaction_enabled ? function (d) {
	                var updated, arcData;
	                if ($$.transiting) { // skip while transiting
	                    return;
	                }
	                updated = $$.updateAngle(d);
	                arcData = $$.convertToArcData(updated);
	                // transitions
	                $$.expandArc(updated.data.id);
	                $$.api.focus(updated.data.id);
	                $$.toggleFocusLegend(updated.data.id, true);
	                $$.config.data_onmouseover(arcData, this);
	            } : null)
	            .on('mousemove', config.interaction_enabled ? function (d) {
	                var updated = $$.updateAngle(d),
	                    arcData = $$.convertToArcData(updated),
	                    selectedData = [arcData];
	                $$.showTooltip(selectedData, this);
	            } : null)
	            .on('mouseout', config.interaction_enabled ? function (d) {
	                var updated, arcData;
	                if ($$.transiting) { // skip while transiting
	                    return;
	                }
	                updated = $$.updateAngle(d);
	                arcData = $$.convertToArcData(updated);
	                // transitions
	                $$.unexpandArc(updated.data.id);
	                $$.api.revert();
	                $$.revertLegend();
	                $$.hideTooltip();
	                $$.config.data_onmouseout(arcData, this);
	            } : null)
	            .on('click', config.interaction_enabled ? function (d, i) {
	                var updated = $$.updateAngle(d),
	                    arcData = $$.convertToArcData(updated);
	                if ($$.toggleShape) { $$.toggleShape(this, arcData, i); }
	                $$.config.data_onclick.call($$.api, arcData, this);
	            } : null)
	            .each(function () { $$.transiting = true; })
	            .transition().duration(duration)
	            .attrTween("d", function (d) {
	                var updated = $$.updateAngle(d), interpolate;
	                if (! updated) {
	                    return function () { return "M 0 0"; };
	                }
	                //                if (this._current === d) {
	                //                    this._current = {
	                //                        startAngle: Math.PI*2,
	                //                        endAngle: Math.PI*2,
	                //                    };
	                //                }
	                if (isNaN(this._current.startAngle)) {
	                    this._current.startAngle = 0;
	                }
	                if (isNaN(this._current.endAngle)) {
	                    this._current.endAngle = this._current.startAngle;
	                }
	                interpolate = d3.interpolate(this._current, updated);
	                this._current = interpolate(0);
	                return function (t) {
	                    var interpolated = interpolate(t);
	                    interpolated.data = d.data; // data.id will be updated by interporator
	                    return $$.getArc(interpolated, true);
	                };
	            })
	            .attr("transform", withTransform ? "scale(1)" : "")
	            .style("fill", function (d) {
	                return $$.levelColor ? $$.levelColor(d.data.values[0].value) : $$.color(d.data.id);
	            }) // Where gauge reading color would receive customization.
	            .style("opacity", 1)
	            .call($$.endall, function () {
	                $$.transiting = false;
	            });
	        mainArc.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	        main.selectAll('.' + CLASS.chartArc).select('text')
	            .style("opacity", 0)
	            .attr('class', function (d) { return $$.isGaugeType(d.data) ? CLASS.gaugeValue : ''; })
	            .text($$.textForArcLabel.bind($$))
	            .attr("transform", $$.transformForArcLabel.bind($$))
	            .style('font-size', function (d) { return $$.isGaugeType(d.data) ? Math.round($$.radius / 5) + 'px' : ''; })
	          .transition().duration(duration)
	            .style("opacity", function (d) { return $$.isTargetToShow(d.data.id) && $$.isArcType(d.data) ? 1 : 0; });
	        main.select('.' + CLASS.chartArcsTitle)
	            .style("opacity", $$.hasType('donut') || $$.hasType('gauge') ? 1 : 0);

	        if ($$.hasType('gauge')) {
	            $$.arcs.select('.' + CLASS.chartArcsBackground)
	                .attr("d", function () {
	                    var d = {
	                        data: [{value: config.gauge_max}],
	                        startAngle: -1 * (Math.PI / 2),
	                        endAngle: Math.PI / 2
	                    };
	                    return $$.getArc(d, true, true);
	                });
	            $$.arcs.select('.' + CLASS.chartArcsGaugeUnit)
	                .attr("dy", ".75em")
	                .text(config.gauge_label_show ? config.gauge_units : '');
	            $$.arcs.select('.' + CLASS.chartArcsGaugeMin)
	                .attr("dx", -1 * ($$.innerRadius + (($$.radius - $$.innerRadius) / 2)) + "px")
	                .attr("dy", "1.2em")
	                .text(config.gauge_label_show ? config.gauge_min : '');
	            $$.arcs.select('.' + CLASS.chartArcsGaugeMax)
	                .attr("dx", $$.innerRadius + (($$.radius - $$.innerRadius) / 2) + "px")
	                .attr("dy", "1.2em")
	                .text(config.gauge_label_show ? config.gauge_max : '');
	        }
	    };
	    c3_chart_internal_fn.initGauge = function () {
	        var arcs = this.arcs;
	        if (this.hasType('gauge')) {
	            arcs.append('path')
	                .attr("class", CLASS.chartArcsBackground);
	            arcs.append("text")
	                .attr("class", CLASS.chartArcsGaugeUnit)
	                .style("text-anchor", "middle")
	                .style("pointer-events", "none");
	            arcs.append("text")
	                .attr("class", CLASS.chartArcsGaugeMin)
	                .style("text-anchor", "middle")
	                .style("pointer-events", "none");
	            arcs.append("text")
	                .attr("class", CLASS.chartArcsGaugeMax)
	                .style("text-anchor", "middle")
	                .style("pointer-events", "none");
	        }
	    };
	    c3_chart_internal_fn.getGaugeLabelHeight = function () {
	        return this.config.gauge_label_show ? 20 : 0;
	    };

	    c3_chart_internal_fn.initRegion = function () {
	        var $$ = this;
	        $$.region = $$.main.append('g')
	            .attr("clip-path", $$.clipPath)
	            .attr("class", CLASS.regions);
	    };
	    c3_chart_internal_fn.updateRegion = function (duration) {
	        var $$ = this, config = $$.config;

	        // hide if arc type
	        $$.region.style('visibility', $$.hasArcType() ? 'hidden' : 'visible');

	        $$.mainRegion = $$.main.select('.' + CLASS.regions).selectAll('.' + CLASS.region)
	            .data(config.regions);
	        $$.mainRegion.enter().append('g')
	            .attr('class', $$.classRegion.bind($$))
	          .append('rect')
	            .style("fill-opacity", 0);
	        $$.mainRegion.exit().transition().duration(duration)
	            .style("opacity", 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawRegion = function (withTransition) {
	        var $$ = this,
	            regions = $$.mainRegion.selectAll('rect'),
	            x = $$.regionX.bind($$),
	            y = $$.regionY.bind($$),
	            w = $$.regionWidth.bind($$),
	            h = $$.regionHeight.bind($$);
	        return [
	            (withTransition ? regions.transition() : regions)
	                .attr("x", x)
	                .attr("y", y)
	                .attr("width", w)
	                .attr("height", h)
	                .style("fill-opacity", function (d) { return isValue(d.opacity) ? d.opacity : 0.1; })
	        ];
	    };
	    c3_chart_internal_fn.regionX = function (d) {
	        var $$ = this, config = $$.config,
	            xPos, yScale = d.axis === 'y' ? $$.y : $$.y2;
	        if (d.axis === 'y' || d.axis === 'y2') {
	            xPos = config.axis_rotated ? ('start' in d ? yScale(d.start) : 0) : 0;
	        } else {
	            xPos = config.axis_rotated ? 0 : ('start' in d ? $$.x($$.isTimeSeries() ? $$.parseDate(d.start) : d.start) : 0);
	        }
	        return xPos;
	    };
	    c3_chart_internal_fn.regionY = function (d) {
	        var $$ = this, config = $$.config,
	            yPos, yScale = d.axis === 'y' ? $$.y : $$.y2;
	        if (d.axis === 'y' || d.axis === 'y2') {
	            yPos = config.axis_rotated ? 0 : ('end' in d ? yScale(d.end) : 0);
	        } else {
	            yPos = config.axis_rotated ? ('start' in d ? $$.x($$.isTimeSeries() ? $$.parseDate(d.start) : d.start) : 0) : 0;
	        }
	        return yPos;
	    };
	    c3_chart_internal_fn.regionWidth = function (d) {
	        var $$ = this, config = $$.config,
	            start = $$.regionX(d), end, yScale = d.axis === 'y' ? $$.y : $$.y2;
	        if (d.axis === 'y' || d.axis === 'y2') {
	            end = config.axis_rotated ? ('end' in d ? yScale(d.end) : $$.width) : $$.width;
	        } else {
	            end = config.axis_rotated ? $$.width : ('end' in d ? $$.x($$.isTimeSeries() ? $$.parseDate(d.end) : d.end) : $$.width);
	        }
	        return end < start ? 0 : end - start;
	    };
	    c3_chart_internal_fn.regionHeight = function (d) {
	        var $$ = this, config = $$.config,
	            start = this.regionY(d), end, yScale = d.axis === 'y' ? $$.y : $$.y2;
	        if (d.axis === 'y' || d.axis === 'y2') {
	            end = config.axis_rotated ? $$.height : ('start' in d ? yScale(d.start) : $$.height);
	        } else {
	            end = config.axis_rotated ? ('end' in d ? $$.x($$.isTimeSeries() ? $$.parseDate(d.end) : d.end) : $$.height) : $$.height;
	        }
	        return end < start ? 0 : end - start;
	    };
	    c3_chart_internal_fn.isRegionOnX = function (d) {
	        return !d.axis || d.axis === 'x';
	    };

	    c3_chart_internal_fn.drag = function (mouse) {
	        var $$ = this, config = $$.config, main = $$.main, d3 = $$.d3;
	        var sx, sy, mx, my, minX, maxX, minY, maxY;

	        if ($$.hasArcType()) { return; }
	        if (! config.data_selection_enabled) { return; } // do nothing if not selectable
	        if (config.zoom_enabled && ! $$.zoom.altDomain) { return; } // skip if zoomable because of conflict drag dehavior
	        if (!config.data_selection_multiple) { return; } // skip when single selection because drag is used for multiple selection

	        sx = $$.dragStart[0];
	        sy = $$.dragStart[1];
	        mx = mouse[0];
	        my = mouse[1];
	        minX = Math.min(sx, mx);
	        maxX = Math.max(sx, mx);
	        minY = (config.data_selection_grouped) ? $$.margin.top : Math.min(sy, my);
	        maxY = (config.data_selection_grouped) ? $$.height : Math.max(sy, my);

	        main.select('.' + CLASS.dragarea)
	            .attr('x', minX)
	            .attr('y', minY)
	            .attr('width', maxX - minX)
	            .attr('height', maxY - minY);
	        // TODO: binary search when multiple xs
	        main.selectAll('.' + CLASS.shapes).selectAll('.' + CLASS.shape)
	            .filter(function (d) { return config.data_selection_isselectable(d); })
	            .each(function (d, i) {
	                var shape = d3.select(this),
	                    isSelected = shape.classed(CLASS.SELECTED),
	                    isIncluded = shape.classed(CLASS.INCLUDED),
	                    _x, _y, _w, _h, toggle, isWithin = false, box;
	                if (shape.classed(CLASS.circle)) {
	                    _x = shape.attr("cx") * 1;
	                    _y = shape.attr("cy") * 1;
	                    toggle = $$.togglePoint;
	                    isWithin = minX < _x && _x < maxX && minY < _y && _y < maxY;
	                }
	                else if (shape.classed(CLASS.bar)) {
	                    box = getPathBox(this);
	                    _x = box.x;
	                    _y = box.y;
	                    _w = box.width;
	                    _h = box.height;
	                    toggle = $$.togglePath;
	                    isWithin = !(maxX < _x || _x + _w < minX) && !(maxY < _y || _y + _h < minY);
	                } else {
	                    // line/area selection not supported yet
	                    return;
	                }
	                if (isWithin ^ isIncluded) {
	                    shape.classed(CLASS.INCLUDED, !isIncluded);
	                    // TODO: included/unincluded callback here
	                    shape.classed(CLASS.SELECTED, !isSelected);
	                    toggle.call($$, !isSelected, shape, d, i);
	                }
	            });
	    };

	    c3_chart_internal_fn.dragstart = function (mouse) {
	        var $$ = this, config = $$.config;
	        if ($$.hasArcType()) { return; }
	        if (! config.data_selection_enabled) { return; } // do nothing if not selectable
	        $$.dragStart = mouse;
	        $$.main.select('.' + CLASS.chart).append('rect')
	            .attr('class', CLASS.dragarea)
	            .style('opacity', 0.1);
	        $$.dragging = true;
	    };

	    c3_chart_internal_fn.dragend = function () {
	        var $$ = this, config = $$.config;
	        if ($$.hasArcType()) { return; }
	        if (! config.data_selection_enabled) { return; } // do nothing if not selectable
	        $$.main.select('.' + CLASS.dragarea)
	            .transition().duration(100)
	            .style('opacity', 0)
	            .remove();
	        $$.main.selectAll('.' + CLASS.shape)
	            .classed(CLASS.INCLUDED, false);
	        $$.dragging = false;
	    };

	    c3_chart_internal_fn.selectPoint = function (target, d, i) {
	        var $$ = this, config = $$.config,
	            cx = (config.axis_rotated ? $$.circleY : $$.circleX).bind($$),
	            cy = (config.axis_rotated ? $$.circleX : $$.circleY).bind($$),
	            r = $$.pointSelectR.bind($$);
	        config.data_onselected.call($$.api, d, target.node());
	        // add selected-circle on low layer g
	        $$.main.select('.' + CLASS.selectedCircles + $$.getTargetSelectorSuffix(d.id)).selectAll('.' + CLASS.selectedCircle + '-' + i)
	            .data([d])
	            .enter().append('circle')
	            .attr("class", function () { return $$.generateClass(CLASS.selectedCircle, i); })
	            .attr("cx", cx)
	            .attr("cy", cy)
	            .attr("stroke", function () { return $$.color(d); })
	            .attr("r", function (d) { return $$.pointSelectR(d) * 1.4; })
	            .transition().duration(100)
	            .attr("r", r);
	    };
	    c3_chart_internal_fn.unselectPoint = function (target, d, i) {
	        var $$ = this;
	        $$.config.data_onunselected(d, target.node());
	        // remove selected-circle from low layer g
	        $$.main.select('.' + CLASS.selectedCircles + $$.getTargetSelectorSuffix(d.id)).selectAll('.' + CLASS.selectedCircle + '-' + i)
	            .transition().duration(100).attr('r', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.togglePoint = function (selected, target, d, i) {
	        selected ? this.selectPoint(target, d, i) : this.unselectPoint(target, d, i);
	    };
	    c3_chart_internal_fn.selectPath = function (target, d) {
	        var $$ = this;
	        $$.config.data_onselected.call($$, d, target.node());
	        target.transition().duration(100)
	            .style("fill", function () { return $$.d3.rgb($$.color(d)).brighter(0.75); });
	    };
	    c3_chart_internal_fn.unselectPath = function (target, d) {
	        var $$ = this;
	        $$.config.data_onunselected.call($$, d, target.node());
	        target.transition().duration(100)
	            .style("fill", function () { return $$.color(d); });
	    };
	    c3_chart_internal_fn.togglePath = function (selected, target, d, i) {
	        selected ? this.selectPath(target, d, i) : this.unselectPath(target, d, i);
	    };
	    c3_chart_internal_fn.getToggle = function (that, d) {
	        var $$ = this, toggle;
	        if (that.nodeName === 'circle') {
	            if ($$.isStepType(d)) {
	                // circle is hidden in step chart, so treat as within the click area
	                toggle = function () {}; // TODO: how to select step chart?
	            } else {
	                toggle = $$.togglePoint;
	            }
	        }
	        else if (that.nodeName === 'path') {
	            toggle = $$.togglePath;
	        }
	        return toggle;
	    };
	    c3_chart_internal_fn.toggleShape = function (that, d, i) {
	        var $$ = this, d3 = $$.d3, config = $$.config,
	            shape = d3.select(that), isSelected = shape.classed(CLASS.SELECTED),
	            toggle = $$.getToggle(that, d).bind($$);

	        if (config.data_selection_enabled && config.data_selection_isselectable(d)) {
	            if (!config.data_selection_multiple) {
	                $$.main.selectAll('.' + CLASS.shapes + (config.data_selection_grouped ? $$.getTargetSelectorSuffix(d.id) : "")).selectAll('.' + CLASS.shape).each(function (d, i) {
	                    var shape = d3.select(this);
	                    if (shape.classed(CLASS.SELECTED)) { toggle(false, shape.classed(CLASS.SELECTED, false), d, i); }
	                });
	            }
	            shape.classed(CLASS.SELECTED, !isSelected);
	            toggle(!isSelected, shape, d, i);
	        }
	    };

	    c3_chart_internal_fn.initBrush = function () {
	        var $$ = this, d3 = $$.d3;
	        $$.brush = d3.svg.brush().on("brush", function () { $$.redrawForBrush(); });
	        $$.brush.update = function () {
	            if ($$.context) { $$.context.select('.' + CLASS.brush).call(this); }
	            return this;
	        };
	        $$.brush.scale = function (scale) {
	            return $$.config.axis_rotated ? this.y(scale) : this.x(scale);
	        };
	    };
	    c3_chart_internal_fn.initSubchart = function () {
	        var $$ = this, config = $$.config,
	            context = $$.context = $$.svg.append("g").attr("transform", $$.getTranslate('context'));

	        context.style('visibility', config.subchart_show ? 'visible' : 'hidden');

	        // Define g for chart area
	        context.append('g')
	            .attr("clip-path", $$.clipPathForSubchart)
	            .attr('class', CLASS.chart);

	        // Define g for bar chart area
	        context.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartBars);

	        // Define g for line chart area
	        context.select('.' + CLASS.chart).append("g")
	            .attr("class", CLASS.chartLines);

	        // Add extent rect for Brush
	        context.append("g")
	            .attr("clip-path", $$.clipPath)
	            .attr("class", CLASS.brush)
	            .call($$.brush);

	        // ATTENTION: This must be called AFTER chart added
	        // Add Axis
	        $$.axes.subx = context.append("g")
	            .attr("class", CLASS.axisX)
	            .attr("transform", $$.getTranslate('subx'))
	            .attr("clip-path", config.axis_rotated ? "" : $$.clipPathForXAxis);
	    };
	    c3_chart_internal_fn.updateTargetsForSubchart = function (targets) {
	        var $$ = this, context = $$.context, config = $$.config,
	            contextLineEnter, contextLineUpdate, contextBarEnter, contextBarUpdate,
	            classChartBar = $$.classChartBar.bind($$),
	            classBars = $$.classBars.bind($$),
	            classChartLine = $$.classChartLine.bind($$),
	            classLines = $$.classLines.bind($$),
	            classAreas = $$.classAreas.bind($$);

	        if (config.subchart_show) {
	            //-- Bar --//
	            contextBarUpdate = context.select('.' + CLASS.chartBars).selectAll('.' + CLASS.chartBar)
	                .data(targets)
	                .attr('class', classChartBar);
	            contextBarEnter = contextBarUpdate.enter().append('g')
	                .style('opacity', 0)
	                .attr('class', classChartBar);
	            // Bars for each data
	            contextBarEnter.append('g')
	                .attr("class", classBars);

	            //-- Line --//
	            contextLineUpdate = context.select('.' + CLASS.chartLines).selectAll('.' + CLASS.chartLine)
	                .data(targets)
	                .attr('class', classChartLine);
	            contextLineEnter = contextLineUpdate.enter().append('g')
	                .style('opacity', 0)
	                .attr('class', classChartLine);
	            // Lines for each data
	            contextLineEnter.append("g")
	                .attr("class", classLines);
	            // Area
	            contextLineEnter.append("g")
	                .attr("class", classAreas);

	            //-- Brush --//
	            context.selectAll('.' + CLASS.brush + ' rect')
	                .attr(config.axis_rotated ? "width" : "height", config.axis_rotated ? $$.width2 : $$.height2);
	        }
	    };
	    c3_chart_internal_fn.updateBarForSubchart = function (durationForExit) {
	        var $$ = this;
	        $$.contextBar = $$.context.selectAll('.' + CLASS.bars).selectAll('.' + CLASS.bar)
	            .data($$.barData.bind($$));
	        $$.contextBar.enter().append('path')
	            .attr("class", $$.classBar.bind($$))
	            .style("stroke", 'none')
	            .style("fill", $$.color);
	        $$.contextBar
	            .style("opacity", $$.initialOpacity.bind($$));
	        $$.contextBar.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawBarForSubchart = function (drawBarOnSub, withTransition, duration) {
	        (withTransition ? this.contextBar.transition().duration(duration) : this.contextBar)
	            .attr('d', drawBarOnSub)
	            .style('opacity', 1);
	    };
	    c3_chart_internal_fn.updateLineForSubchart = function (durationForExit) {
	        var $$ = this;
	        $$.contextLine = $$.context.selectAll('.' + CLASS.lines).selectAll('.' + CLASS.line)
	            .data($$.lineData.bind($$));
	        $$.contextLine.enter().append('path')
	            .attr('class', $$.classLine.bind($$))
	            .style('stroke', $$.color);
	        $$.contextLine
	            .style("opacity", $$.initialOpacity.bind($$));
	        $$.contextLine.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawLineForSubchart = function (drawLineOnSub, withTransition, duration) {
	        (withTransition ? this.contextLine.transition().duration(duration) : this.contextLine)
	            .attr("d", drawLineOnSub)
	            .style('opacity', 1);
	    };
	    c3_chart_internal_fn.updateAreaForSubchart = function (durationForExit) {
	        var $$ = this, d3 = $$.d3;
	        $$.contextArea = $$.context.selectAll('.' + CLASS.areas).selectAll('.' + CLASS.area)
	            .data($$.lineData.bind($$));
	        $$.contextArea.enter().append('path')
	            .attr("class", $$.classArea.bind($$))
	            .style("fill", $$.color)
	            .style("opacity", function () { $$.orgAreaOpacity = +d3.select(this).style('opacity'); return 0; });
	        $$.contextArea
	            .style("opacity", 0);
	        $$.contextArea.exit().transition().duration(durationForExit)
	            .style('opacity', 0)
	            .remove();
	    };
	    c3_chart_internal_fn.redrawAreaForSubchart = function (drawAreaOnSub, withTransition, duration) {
	        (withTransition ? this.contextArea.transition().duration(duration) : this.contextArea)
	            .attr("d", drawAreaOnSub)
	            .style("fill", this.color)
	            .style("opacity", this.orgAreaOpacity);
	    };
	    c3_chart_internal_fn.redrawSubchart = function (withSubchart, transitions, duration, durationForExit, areaIndices, barIndices, lineIndices) {
	        var $$ = this, d3 = $$.d3, config = $$.config,
	            drawAreaOnSub, drawBarOnSub, drawLineOnSub;

	        $$.context.style('visibility', config.subchart_show ? 'visible' : 'hidden');

	        // subchart
	        if (config.subchart_show) {
	            // reflect main chart to extent on subchart if zoomed
	            if (d3.event && d3.event.type === 'zoom') {
	                $$.brush.extent($$.x.orgDomain()).update();
	            }
	            // update subchart elements if needed
	            if (withSubchart) {

	                // extent rect
	                if (!$$.brush.empty()) {
	                    $$.brush.extent($$.x.orgDomain()).update();
	                }
	                // setup drawer - MEMO: this must be called after axis updated
	                drawAreaOnSub = $$.generateDrawArea(areaIndices, true);
	                drawBarOnSub = $$.generateDrawBar(barIndices, true);
	                drawLineOnSub = $$.generateDrawLine(lineIndices, true);

	                $$.updateBarForSubchart(duration);
	                $$.updateLineForSubchart(duration);
	                $$.updateAreaForSubchart(duration);

	                $$.redrawBarForSubchart(drawBarOnSub, duration, duration);
	                $$.redrawLineForSubchart(drawLineOnSub, duration, duration);
	                $$.redrawAreaForSubchart(drawAreaOnSub, duration, duration);
	            }
	        }
	    };
	    c3_chart_internal_fn.redrawForBrush = function () {
	        var $$ = this, x = $$.x;
	        $$.redraw({
	            withTransition: false,
	            withY: $$.config.zoom_rescale,
	            withSubchart: false,
	            withUpdateXDomain: true,
	            withDimension: false
	        });
	        $$.config.subchart_onbrush.call($$.api, x.orgDomain());
	    };
	    c3_chart_internal_fn.transformContext = function (withTransition, transitions) {
	        var $$ = this, subXAxis;
	        if (transitions && transitions.axisSubX) {
	            subXAxis = transitions.axisSubX;
	        } else {
	            subXAxis = $$.context.select('.' + CLASS.axisX);
	            if (withTransition) { subXAxis = subXAxis.transition(); }
	        }
	        $$.context.attr("transform", $$.getTranslate('context'));
	        subXAxis.attr("transform", $$.getTranslate('subx'));
	    };
	    c3_chart_internal_fn.getDefaultExtent = function () {
	        var $$ = this, config = $$.config,
	            extent = isFunction(config.axis_x_extent) ? config.axis_x_extent($$.getXDomain($$.data.targets)) : config.axis_x_extent;
	        if ($$.isTimeSeries()) {
	            extent = [$$.parseDate(extent[0]), $$.parseDate(extent[1])];
	        }
	        return extent;
	    };

	    c3_chart_internal_fn.initZoom = function () {
	        var $$ = this, d3 = $$.d3, config = $$.config, startEvent;

	        $$.zoom = d3.behavior.zoom()
	            .on("zoomstart", function () {
	                startEvent = d3.event.sourceEvent;
	                $$.zoom.altDomain = d3.event.sourceEvent.altKey ? $$.x.orgDomain() : null;
	                config.zoom_onzoomstart.call($$.api, d3.event.sourceEvent);
	            })
	            .on("zoom", function () {
	                $$.redrawForZoom.call($$);
	            })
	            .on('zoomend', function () {
	                var event = d3.event.sourceEvent;
	                // if click, do nothing. otherwise, click interaction will be canceled.
	                if (event && startEvent.clientX === event.clientX && startEvent.clientY === event.clientY) {
	                    return;
	                }
	                $$.redrawEventRect();
	                $$.updateZoom();
	                config.zoom_onzoomend.call($$.api, $$.x.orgDomain());
	            });
	        $$.zoom.scale = function (scale) {
	            return config.axis_rotated ? this.y(scale) : this.x(scale);
	        };
	        $$.zoom.orgScaleExtent = function () {
	            var extent = config.zoom_extent ? config.zoom_extent : [1, 10];
	            return [extent[0], Math.max($$.getMaxDataCount() / extent[1], extent[1])];
	        };
	        $$.zoom.updateScaleExtent = function () {
	            var ratio = diffDomain($$.x.orgDomain()) / diffDomain($$.orgXDomain),
	                extent = this.orgScaleExtent();
	            this.scaleExtent([extent[0] * ratio, extent[1] * ratio]);
	            return this;
	        };
	    };
	    c3_chart_internal_fn.updateZoom = function () {
	        var $$ = this, z = $$.config.zoom_enabled ? $$.zoom : function () {};
	        $$.main.select('.' + CLASS.zoomRect).call(z).on("dblclick.zoom", null);
	        $$.main.selectAll('.' + CLASS.eventRect).call(z).on("dblclick.zoom", null);
	    };
	    c3_chart_internal_fn.redrawForZoom = function () {
	        var $$ = this, d3 = $$.d3, config = $$.config, zoom = $$.zoom, x = $$.x;
	        if (!config.zoom_enabled) {
	            return;
	        }
	        if ($$.filterTargetsToShow($$.data.targets).length === 0) {
	            return;
	        }
	        if (d3.event.sourceEvent.type === 'mousemove' && zoom.altDomain) {
	            x.domain(zoom.altDomain);
	            zoom.scale(x).updateScaleExtent();
	            return;
	        }
	        if ($$.isCategorized() && x.orgDomain()[0] === $$.orgXDomain[0]) {
	            x.domain([$$.orgXDomain[0] - 1e-10, x.orgDomain()[1]]);
	        }
	        $$.redraw({
	            withTransition: false,
	            withY: config.zoom_rescale,
	            withSubchart: false,
	            withEventRect: false,
	            withDimension: false
	        });
	        if (d3.event.sourceEvent.type === 'mousemove') {
	            $$.cancelClick = true;
	        }
	        config.zoom_onzoom.call($$.api, x.orgDomain());
	    };

	    c3_chart_internal_fn.generateColor = function () {
	        var $$ = this, config = $$.config, d3 = $$.d3,
	            colors = config.data_colors,
	            pattern = notEmpty(config.color_pattern) ? config.color_pattern : d3.scale.category10().range(),
	            callback = config.data_color,
	            ids = [];

	        return function (d) {
	            var id = d.id || (d.data && d.data.id) || d, color;

	            // if callback function is provided
	            if (colors[id] instanceof Function) {
	                color = colors[id](d);
	            }
	            // if specified, choose that color
	            else if (colors[id]) {
	                color = colors[id];
	            }
	            // if not specified, choose from pattern
	            else {
	                if (ids.indexOf(id) < 0) { ids.push(id); }
	                color = pattern[ids.indexOf(id) % pattern.length];
	                colors[id] = color;
	            }
	            return callback instanceof Function ? callback(color, d) : color;
	        };
	    };
	    c3_chart_internal_fn.generateLevelColor = function () {
	        var $$ = this, config = $$.config,
	            colors = config.color_pattern,
	            threshold = config.color_threshold,
	            asValue = threshold.unit === 'value',
	            values = threshold.values && threshold.values.length ? threshold.values : [],
	            max = threshold.max || 100;
	        return notEmpty(config.color_threshold) ? function (value) {
	            var i, v, color = colors[colors.length - 1];
	            for (i = 0; i < values.length; i++) {
	                v = asValue ? value : (value * 100 / max);
	                if (v < values[i]) {
	                    color = colors[i];
	                    break;
	                }
	            }
	            return color;
	        } : null;
	    };

	    c3_chart_internal_fn.getYFormat = function (forArc) {
	        var $$ = this,
	            formatForY = forArc && !$$.hasType('gauge') ? $$.defaultArcValueFormat : $$.yFormat,
	            formatForY2 = forArc && !$$.hasType('gauge') ? $$.defaultArcValueFormat : $$.y2Format;
	        return function (v, ratio, id) {
	            var format = $$.axis.getId(id) === 'y2' ? formatForY2 : formatForY;
	            return format.call($$, v, ratio);
	        };
	    };
	    c3_chart_internal_fn.yFormat = function (v) {
	        var $$ = this, config = $$.config,
	            format = config.axis_y_tick_format ? config.axis_y_tick_format : $$.defaultValueFormat;
	        return format(v);
	    };
	    c3_chart_internal_fn.y2Format = function (v) {
	        var $$ = this, config = $$.config,
	            format = config.axis_y2_tick_format ? config.axis_y2_tick_format : $$.defaultValueFormat;
	        return format(v);
	    };
	    c3_chart_internal_fn.defaultValueFormat = function (v) {
	        return isValue(v) ? +v : "";
	    };
	    c3_chart_internal_fn.defaultArcValueFormat = function (v, ratio) {
	        return (ratio * 100).toFixed(1) + '%';
	    };
	    c3_chart_internal_fn.dataLabelFormat = function (targetId) {
	        var $$ = this, data_labels = $$.config.data_labels,
	            format, defaultFormat = function (v) { return isValue(v) ? +v : ""; };
	        // find format according to axis id
	        if (typeof data_labels.format === 'function') {
	            format = data_labels.format;
	        } else if (typeof data_labels.format === 'object') {
	            if (data_labels.format[targetId]) {
	                format = data_labels.format[targetId] === true ? defaultFormat : data_labels.format[targetId];
	            } else {
	                format = function () { return ''; };
	            }
	        } else {
	            format = defaultFormat;
	        }
	        return format;
	    };

	    c3_chart_internal_fn.hasCaches = function (ids) {
	        for (var i = 0; i < ids.length; i++) {
	            if (! (ids[i] in this.cache)) { return false; }
	        }
	        return true;
	    };
	    c3_chart_internal_fn.addCache = function (id, target) {
	        this.cache[id] = this.cloneTarget(target);
	    };
	    c3_chart_internal_fn.getCaches = function (ids) {
	        var targets = [], i;
	        for (i = 0; i < ids.length; i++) {
	            if (ids[i] in this.cache) { targets.push(this.cloneTarget(this.cache[ids[i]])); }
	        }
	        return targets;
	    };

	    var CLASS = c3_chart_internal_fn.CLASS = {
	        target: 'c3-target',
	        chart: 'c3-chart',
	        chartLine: 'c3-chart-line',
	        chartLines: 'c3-chart-lines',
	        chartBar: 'c3-chart-bar',
	        chartBars: 'c3-chart-bars',
	        chartText: 'c3-chart-text',
	        chartTexts: 'c3-chart-texts',
	        chartArc: 'c3-chart-arc',
	        chartArcs: 'c3-chart-arcs',
	        chartArcsTitle: 'c3-chart-arcs-title',
	        chartArcsBackground: 'c3-chart-arcs-background',
	        chartArcsGaugeUnit: 'c3-chart-arcs-gauge-unit',
	        chartArcsGaugeMax: 'c3-chart-arcs-gauge-max',
	        chartArcsGaugeMin: 'c3-chart-arcs-gauge-min',
	        selectedCircle: 'c3-selected-circle',
	        selectedCircles: 'c3-selected-circles',
	        eventRect: 'c3-event-rect',
	        eventRects: 'c3-event-rects',
	        eventRectsSingle: 'c3-event-rects-single',
	        eventRectsMultiple: 'c3-event-rects-multiple',
	        zoomRect: 'c3-zoom-rect',
	        brush: 'c3-brush',
	        focused: 'c3-focused',
	        defocused: 'c3-defocused',
	        region: 'c3-region',
	        regions: 'c3-regions',
	        tooltipContainer: 'c3-tooltip-container',
	        tooltip: 'c3-tooltip',
	        tooltipName: 'c3-tooltip-name',
	        shape: 'c3-shape',
	        shapes: 'c3-shapes',
	        line: 'c3-line',
	        lines: 'c3-lines',
	        bar: 'c3-bar',
	        bars: 'c3-bars',
	        circle: 'c3-circle',
	        circles: 'c3-circles',
	        arc: 'c3-arc',
	        arcs: 'c3-arcs',
	        area: 'c3-area',
	        areas: 'c3-areas',
	        empty: 'c3-empty',
	        text: 'c3-text',
	        texts: 'c3-texts',
	        gaugeValue: 'c3-gauge-value',
	        grid: 'c3-grid',
	        gridLines: 'c3-grid-lines',
	        xgrid: 'c3-xgrid',
	        xgrids: 'c3-xgrids',
	        xgridLine: 'c3-xgrid-line',
	        xgridLines: 'c3-xgrid-lines',
	        xgridFocus: 'c3-xgrid-focus',
	        ygrid: 'c3-ygrid',
	        ygrids: 'c3-ygrids',
	        ygridLine: 'c3-ygrid-line',
	        ygridLines: 'c3-ygrid-lines',
	        axis: 'c3-axis',
	        axisX: 'c3-axis-x',
	        axisXLabel: 'c3-axis-x-label',
	        axisY: 'c3-axis-y',
	        axisYLabel: 'c3-axis-y-label',
	        axisY2: 'c3-axis-y2',
	        axisY2Label: 'c3-axis-y2-label',
	        legendBackground: 'c3-legend-background',
	        legendItem: 'c3-legend-item',
	        legendItemEvent: 'c3-legend-item-event',
	        legendItemTile: 'c3-legend-item-tile',
	        legendItemHidden: 'c3-legend-item-hidden',
	        legendItemFocused: 'c3-legend-item-focused',
	        dragarea: 'c3-dragarea',
	        EXPANDED: '_expanded_',
	        SELECTED: '_selected_',
	        INCLUDED: '_included_'
	    };
	    c3_chart_internal_fn.generateClass = function (prefix, targetId) {
	        return " " + prefix + " " + prefix + this.getTargetSelectorSuffix(targetId);
	    };
	    c3_chart_internal_fn.classText = function (d) {
	        return this.generateClass(CLASS.text, d.index);
	    };
	    c3_chart_internal_fn.classTexts = function (d) {
	        return this.generateClass(CLASS.texts, d.id);
	    };
	    c3_chart_internal_fn.classShape = function (d) {
	        return this.generateClass(CLASS.shape, d.index);
	    };
	    c3_chart_internal_fn.classShapes = function (d) {
	        return this.generateClass(CLASS.shapes, d.id);
	    };
	    c3_chart_internal_fn.classLine = function (d) {
	        return this.classShape(d) + this.generateClass(CLASS.line, d.id);
	    };
	    c3_chart_internal_fn.classLines = function (d) {
	        return this.classShapes(d) + this.generateClass(CLASS.lines, d.id);
	    };
	    c3_chart_internal_fn.classCircle = function (d) {
	        return this.classShape(d) + this.generateClass(CLASS.circle, d.index);
	    };
	    c3_chart_internal_fn.classCircles = function (d) {
	        return this.classShapes(d) + this.generateClass(CLASS.circles, d.id);
	    };
	    c3_chart_internal_fn.classBar = function (d) {
	        return this.classShape(d) + this.generateClass(CLASS.bar, d.index);
	    };
	    c3_chart_internal_fn.classBars = function (d) {
	        return this.classShapes(d) + this.generateClass(CLASS.bars, d.id);
	    };
	    c3_chart_internal_fn.classArc = function (d) {
	        return this.classShape(d.data) + this.generateClass(CLASS.arc, d.data.id);
	    };
	    c3_chart_internal_fn.classArcs = function (d) {
	        return this.classShapes(d.data) + this.generateClass(CLASS.arcs, d.data.id);
	    };
	    c3_chart_internal_fn.classArea = function (d) {
	        return this.classShape(d) + this.generateClass(CLASS.area, d.id);
	    };
	    c3_chart_internal_fn.classAreas = function (d) {
	        return this.classShapes(d) + this.generateClass(CLASS.areas, d.id);
	    };
	    c3_chart_internal_fn.classRegion = function (d, i) {
	        return this.generateClass(CLASS.region, i) + ' ' + ('class' in d ? d['class'] : '');
	    };
	    c3_chart_internal_fn.classEvent = function (d) {
	        return this.generateClass(CLASS.eventRect, d.index);
	    };
	    c3_chart_internal_fn.classTarget = function (id) {
	        var $$ = this;
	        var additionalClassSuffix = $$.config.data_classes[id], additionalClass = '';
	        if (additionalClassSuffix) {
	            additionalClass = ' ' + CLASS.target + '-' + additionalClassSuffix;
	        }
	        return $$.generateClass(CLASS.target, id) + additionalClass;
	    };
	    c3_chart_internal_fn.classFocus = function (d) {
	        return this.classFocused(d) + this.classDefocused(d);
	    };
	    c3_chart_internal_fn.classFocused = function (d) {
	        return ' ' + (this.focusedTargetIds.indexOf(d.id) >= 0 ? CLASS.focused : '');
	    };
	    c3_chart_internal_fn.classDefocused = function (d) {
	        return ' ' + (this.defocusedTargetIds.indexOf(d.id) >= 0 ? CLASS.defocused : '');
	    };
	    c3_chart_internal_fn.classChartText = function (d) {
	        return CLASS.chartText + this.classTarget(d.id);
	    };
	    c3_chart_internal_fn.classChartLine = function (d) {
	        return CLASS.chartLine + this.classTarget(d.id);
	    };
	    c3_chart_internal_fn.classChartBar = function (d) {
	        return CLASS.chartBar + this.classTarget(d.id);
	    };
	    c3_chart_internal_fn.classChartArc = function (d) {
	        return CLASS.chartArc + this.classTarget(d.data.id);
	    };
	    c3_chart_internal_fn.getTargetSelectorSuffix = function (targetId) {
	        return targetId || targetId === 0 ? ('-' + targetId).replace(/[\s?!@#$%^&*()_=+,.<>'":;\[\]\/|~`{}\\]/g, '-') : '';
	    };
	    c3_chart_internal_fn.selectorTarget = function (id, prefix) {
	        return (prefix || '') + '.' + CLASS.target + this.getTargetSelectorSuffix(id);
	    };
	    c3_chart_internal_fn.selectorTargets = function (ids, prefix) {
	        var $$ = this;
	        ids = ids || [];
	        return ids.length ? ids.map(function (id) { return $$.selectorTarget(id, prefix); }) : null;
	    };
	    c3_chart_internal_fn.selectorLegend = function (id) {
	        return '.' + CLASS.legendItem + this.getTargetSelectorSuffix(id);
	    };
	    c3_chart_internal_fn.selectorLegends = function (ids) {
	        var $$ = this;
	        return ids && ids.length ? ids.map(function (id) { return $$.selectorLegend(id); }) : null;
	    };

	    var isValue = c3_chart_internal_fn.isValue = function (v) {
	        return v || v === 0;
	    },
	        isFunction = c3_chart_internal_fn.isFunction = function (o) {
	            return typeof o === 'function';
	        },
	        isString = c3_chart_internal_fn.isString = function (o) {
	            return typeof o === 'string';
	        },
	        isUndefined = c3_chart_internal_fn.isUndefined = function (v) {
	            return typeof v === 'undefined';
	        },
	        isDefined = c3_chart_internal_fn.isDefined = function (v) {
	            return typeof v !== 'undefined';
	        },
	        ceil10 = c3_chart_internal_fn.ceil10 = function (v) {
	            return Math.ceil(v / 10) * 10;
	        },
	        asHalfPixel = c3_chart_internal_fn.asHalfPixel = function (n) {
	            return Math.ceil(n) + 0.5;
	        },
	        diffDomain = c3_chart_internal_fn.diffDomain = function (d) {
	            return d[1] - d[0];
	        },
	        isEmpty = c3_chart_internal_fn.isEmpty = function (o) {
	            return !o || (isString(o) && o.length === 0) || (typeof o === 'object' && Object.keys(o).length === 0);
	        },
	        notEmpty = c3_chart_internal_fn.notEmpty = function (o) {
	            return Object.keys(o).length > 0;
	        },
	        getOption = c3_chart_internal_fn.getOption = function (options, key, defaultValue) {
	            return isDefined(options[key]) ? options[key] : defaultValue;
	        },
	        hasValue = c3_chart_internal_fn.hasValue = function (dict, value) {
	            var found = false;
	            Object.keys(dict).forEach(function (key) {
	                if (dict[key] === value) { found = true; }
	            });
	            return found;
	        },
	        getPathBox = c3_chart_internal_fn.getPathBox = function (path) {
	            var box = path.getBoundingClientRect(),
	                items = [path.pathSegList.getItem(0), path.pathSegList.getItem(1)],
	                minX = items[0].x, minY = Math.min(items[0].y, items[1].y);
	            return {x: minX, y: minY, width: box.width, height: box.height};
	        };

	    c3_chart_fn.focus = function (targetIds) {
	        var $$ = this.internal, candidates;

	        targetIds = $$.mapToTargetIds(targetIds);
	        candidates = $$.svg.selectAll($$.selectorTargets(targetIds.filter($$.isTargetToShow, $$))),

	        this.revert();
	        this.defocus();
	        candidates.classed(CLASS.focused, true).classed(CLASS.defocused, false);
	        if ($$.hasArcType()) {
	            $$.expandArc(targetIds);
	        }
	        $$.toggleFocusLegend(targetIds, true);

	        $$.focusedTargetIds = targetIds;
	        $$.defocusedTargetIds = $$.defocusedTargetIds.filter(function (id) {
	            return targetIds.indexOf(id) < 0;
	        });
	    };

	    c3_chart_fn.defocus = function (targetIds) {
	        var $$ = this.internal, candidates;

	        targetIds = $$.mapToTargetIds(targetIds);
	        candidates = $$.svg.selectAll($$.selectorTargets(targetIds.filter($$.isTargetToShow, $$))),

	        candidates.classed(CLASS.focused, false).classed(CLASS.defocused, true);
	        if ($$.hasArcType()) {
	            $$.unexpandArc(targetIds);
	        }
	        $$.toggleFocusLegend(targetIds, false);

	        $$.focusedTargetIds = $$.focusedTargetIds.filter(function (id) {
	            return targetIds.indexOf(id) < 0;
	        });
	        $$.defocusedTargetIds = targetIds;
	    };

	    c3_chart_fn.revert = function (targetIds) {
	        var $$ = this.internal, candidates;

	        targetIds = $$.mapToTargetIds(targetIds);
	        candidates = $$.svg.selectAll($$.selectorTargets(targetIds)); // should be for all targets

	        candidates.classed(CLASS.focused, false).classed(CLASS.defocused, false);
	        if ($$.hasArcType()) {
	            $$.unexpandArc(targetIds);
	        }
	        if ($$.config.legend_show) {
	            $$.showLegend(targetIds.filter($$.isLegendToShow.bind($$)));
	            $$.legend.selectAll($$.selectorLegends(targetIds))
	                .filter(function () {
	                    return $$.d3.select(this).classed(CLASS.legendItemFocused);
	                })
	                .classed(CLASS.legendItemFocused, false);
	        }

	        $$.focusedTargetIds = [];
	        $$.defocusedTargetIds = [];
	    };

	    c3_chart_fn.show = function (targetIds, options) {
	        var $$ = this.internal, targets;

	        targetIds = $$.mapToTargetIds(targetIds);
	        options = options || {};

	        $$.removeHiddenTargetIds(targetIds);
	        targets = $$.svg.selectAll($$.selectorTargets(targetIds));

	        targets.transition()
	            .style('opacity', 1, 'important')
	            .call($$.endall, function () {
	                targets.style('opacity', null).style('opacity', 1);
	            });

	        if (options.withLegend) {
	            $$.showLegend(targetIds);
	        }

	        $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true, withLegend: true});
	    };

	    c3_chart_fn.hide = function (targetIds, options) {
	        var $$ = this.internal, targets;

	        targetIds = $$.mapToTargetIds(targetIds);
	        options = options || {};

	        $$.addHiddenTargetIds(targetIds);
	        targets = $$.svg.selectAll($$.selectorTargets(targetIds));

	        targets.transition()
	            .style('opacity', 0, 'important')
	            .call($$.endall, function () {
	                targets.style('opacity', null).style('opacity', 0);
	            });

	        if (options.withLegend) {
	            $$.hideLegend(targetIds);
	        }

	        $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true, withLegend: true});
	    };

	    c3_chart_fn.toggle = function (targetIds, options) {
	        var that = this, $$ = this.internal;
	        $$.mapToTargetIds(targetIds).forEach(function (targetId) {
	            $$.isTargetToShow(targetId) ? that.hide(targetId, options) : that.show(targetId, options);
	        });
	    };

	    c3_chart_fn.zoom = function (domain) {
	        var $$ = this.internal;
	        if (domain) {
	            if ($$.isTimeSeries()) {
	                domain = domain.map(function (x) { return $$.parseDate(x); });
	            }
	            $$.brush.extent(domain);
	            $$.redraw({withUpdateXDomain: true, withY: $$.config.zoom_rescale});
	            $$.config.zoom_onzoom.call(this, $$.x.orgDomain());
	        }
	        return $$.brush.extent();
	    };
	    c3_chart_fn.zoom.enable = function (enabled) {
	        var $$ = this.internal;
	        $$.config.zoom_enabled = enabled;
	        $$.updateAndRedraw();
	    };
	    c3_chart_fn.unzoom = function () {
	        var $$ = this.internal;
	        $$.brush.clear().update();
	        $$.redraw({withUpdateXDomain: true});
	    };

	    c3_chart_fn.load = function (args) {
	        var $$ = this.internal, config = $$.config;
	        // update xs if specified
	        if (args.xs) {
	            $$.addXs(args.xs);
	        }
	        // update classes if exists
	        if ('classes' in args) {
	            Object.keys(args.classes).forEach(function (id) {
	                config.data_classes[id] = args.classes[id];
	            });
	        }
	        // update categories if exists
	        if ('categories' in args && $$.isCategorized()) {
	            config.axis_x_categories = args.categories;
	        }
	        // update axes if exists
	        if ('axes' in args) {
	            Object.keys(args.axes).forEach(function (id) {
	                config.data_axes[id] = args.axes[id];
	            });
	        }
	        // update colors if exists
	        if ('colors' in args) {
	            Object.keys(args.colors).forEach(function (id) {
	                config.data_colors[id] = args.colors[id];
	            });
	        }
	        // use cache if exists
	        if ('cacheIds' in args && $$.hasCaches(args.cacheIds)) {
	            $$.load($$.getCaches(args.cacheIds), args.done);
	            return;
	        }
	        // unload if needed
	        if ('unload' in args) {
	            // TODO: do not unload if target will load (included in url/rows/columns)
	            $$.unload($$.mapToTargetIds((typeof args.unload === 'boolean' && args.unload) ? null : args.unload), function () {
	                $$.loadFromArgs(args);
	            });
	        } else {
	            $$.loadFromArgs(args);
	        }
	    };

	    c3_chart_fn.unload = function (args) {
	        var $$ = this.internal;
	        args = args || {};
	        if (args instanceof Array) {
	            args = {ids: args};
	        } else if (typeof args === 'string') {
	            args = {ids: [args]};
	        }
	        $$.unload($$.mapToTargetIds(args.ids), function () {
	            $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true, withLegend: true});
	            if (args.done) { args.done(); }
	        });
	    };

	    c3_chart_fn.flow = function (args) {
	        var $$ = this.internal,
	            targets, data, notfoundIds = [], orgDataCount = $$.getMaxDataCount(),
	            dataCount, domain, baseTarget, baseValue, length = 0, tail = 0, diff, to;

	        if (args.json) {
	            data = $$.convertJsonToData(args.json, args.keys);
	        }
	        else if (args.rows) {
	            data = $$.convertRowsToData(args.rows);
	        }
	        else if (args.columns) {
	            data = $$.convertColumnsToData(args.columns);
	        }
	        else {
	            return;
	        }
	        targets = $$.convertDataToTargets(data, true);

	        // Update/Add data
	        $$.data.targets.forEach(function (t) {
	            var found = false, i, j;
	            for (i = 0; i < targets.length; i++) {
	                if (t.id === targets[i].id) {
	                    found = true;

	                    if (t.values[t.values.length - 1]) {
	                        tail = t.values[t.values.length - 1].index + 1;
	                    }
	                    length = targets[i].values.length;

	                    for (j = 0; j < length; j++) {
	                        targets[i].values[j].index = tail + j;
	                        if (!$$.isTimeSeries()) {
	                            targets[i].values[j].x = tail + j;
	                        }
	                    }
	                    t.values = t.values.concat(targets[i].values);

	                    targets.splice(i, 1);
	                    break;
	                }
	            }
	            if (!found) { notfoundIds.push(t.id); }
	        });

	        // Append null for not found targets
	        $$.data.targets.forEach(function (t) {
	            var i, j;
	            for (i = 0; i < notfoundIds.length; i++) {
	                if (t.id === notfoundIds[i]) {
	                    tail = t.values[t.values.length - 1].index + 1;
	                    for (j = 0; j < length; j++) {
	                        t.values.push({
	                            id: t.id,
	                            index: tail + j,
	                            x: $$.isTimeSeries() ? $$.getOtherTargetX(tail + j) : tail + j,
	                            value: null
	                        });
	                    }
	                }
	            }
	        });

	        // Generate null values for new target
	        if ($$.data.targets.length) {
	            targets.forEach(function (t) {
	                var i, missing = [];
	                for (i = $$.data.targets[0].values[0].index; i < tail; i++) {
	                    missing.push({
	                        id: t.id,
	                        index: i,
	                        x: $$.isTimeSeries() ? $$.getOtherTargetX(i) : i,
	                        value: null
	                    });
	                }
	                t.values.forEach(function (v) {
	                    v.index += tail;
	                    if (!$$.isTimeSeries()) {
	                        v.x += tail;
	                    }
	                });
	                t.values = missing.concat(t.values);
	            });
	        }
	        $$.data.targets = $$.data.targets.concat(targets); // add remained

	        // check data count because behavior needs to change when it's only one
	        dataCount = $$.getMaxDataCount();
	        baseTarget = $$.data.targets[0];
	        baseValue = baseTarget.values[0];

	        // Update length to flow if needed
	        if (isDefined(args.to)) {
	            length = 0;
	            to = $$.isTimeSeries() ? $$.parseDate(args.to) : args.to;
	            baseTarget.values.forEach(function (v) {
	                if (v.x < to) { length++; }
	            });
	        } else if (isDefined(args.length)) {
	            length = args.length;
	        }

	        // If only one data, update the domain to flow from left edge of the chart
	        if (!orgDataCount) {
	            if ($$.isTimeSeries()) {
	                if (baseTarget.values.length > 1) {
	                    diff = baseTarget.values[baseTarget.values.length - 1].x - baseValue.x;
	                } else {
	                    diff = baseValue.x - $$.getXDomain($$.data.targets)[0];
	                }
	            } else {
	                diff = 1;
	            }
	            domain = [baseValue.x - diff, baseValue.x];
	            $$.updateXDomain(null, true, true, false, domain);
	        } else if (orgDataCount === 1) {
	            if ($$.isTimeSeries()) {
	                diff = (baseTarget.values[baseTarget.values.length - 1].x - baseValue.x) / 2;
	                domain = [new Date(+baseValue.x - diff), new Date(+baseValue.x + diff)];
	                $$.updateXDomain(null, true, true, false, domain);
	            }
	        }

	        // Set targets
	        $$.updateTargets($$.data.targets);

	        // Redraw with new targets
	        $$.redraw({
	            flow: {
	                index: baseValue.index,
	                length: length,
	                duration: isValue(args.duration) ? args.duration : $$.config.transition_duration,
	                done: args.done,
	                orgDataCount: orgDataCount,
	            },
	            withLegend: true,
	            withTransition: orgDataCount > 1,
	            withTrimXDomain: false,
	            withUpdateXAxis: true,
	        });
	    };

	    c3_chart_internal_fn.generateFlow = function (args) {
	        var $$ = this, config = $$.config, d3 = $$.d3;

	        return function () {
	            var targets = args.targets,
	                flow = args.flow,
	                drawBar = args.drawBar,
	                drawLine = args.drawLine,
	                drawArea = args.drawArea,
	                cx = args.cx,
	                cy = args.cy,
	                xv = args.xv,
	                xForText = args.xForText,
	                yForText = args.yForText,
	                duration = args.duration;

	            var translateX, scaleX = 1, transform,
	                flowIndex = flow.index,
	                flowLength = flow.length,
	                flowStart = $$.getValueOnIndex($$.data.targets[0].values, flowIndex),
	                flowEnd = $$.getValueOnIndex($$.data.targets[0].values, flowIndex + flowLength),
	                orgDomain = $$.x.domain(), domain,
	                durationForFlow = flow.duration || duration,
	                done = flow.done || function () {},
	                wait = $$.generateWait();

	            var xgrid = $$.xgrid || d3.selectAll([]),
	                xgridLines = $$.xgridLines || d3.selectAll([]),
	                mainRegion = $$.mainRegion || d3.selectAll([]),
	                mainText = $$.mainText || d3.selectAll([]),
	                mainBar = $$.mainBar || d3.selectAll([]),
	                mainLine = $$.mainLine || d3.selectAll([]),
	                mainArea = $$.mainArea || d3.selectAll([]),
	                mainCircle = $$.mainCircle || d3.selectAll([]);

	            // set flag
	            $$.flowing = true;

	            // remove head data after rendered
	            $$.data.targets.forEach(function (d) {
	                d.values.splice(0, flowLength);
	            });

	            // update x domain to generate axis elements for flow
	            domain = $$.updateXDomain(targets, true, true);
	            // update elements related to x scale
	            if ($$.updateXGrid) { $$.updateXGrid(true); }

	            // generate transform to flow
	            if (!flow.orgDataCount) { // if empty
	                if ($$.data.targets[0].values.length !== 1) {
	                    translateX = $$.x(orgDomain[0]) - $$.x(domain[0]);
	                } else {
	                    if ($$.isTimeSeries()) {
	                        flowStart = $$.getValueOnIndex($$.data.targets[0].values, 0);
	                        flowEnd = $$.getValueOnIndex($$.data.targets[0].values, $$.data.targets[0].values.length - 1);
	                        translateX = $$.x(flowStart.x) - $$.x(flowEnd.x);
	                    } else {
	                        translateX = diffDomain(domain) / 2;
	                    }
	                }
	            } else if (flow.orgDataCount === 1 || flowStart.x === flowEnd.x) {
	                translateX = $$.x(orgDomain[0]) - $$.x(domain[0]);
	            } else {
	                if ($$.isTimeSeries()) {
	                    translateX = ($$.x(orgDomain[0]) - $$.x(domain[0]));
	                } else {
	                    translateX = ($$.x(flowStart.x) - $$.x(flowEnd.x));
	                }
	            }
	            scaleX = (diffDomain(orgDomain) / diffDomain(domain));
	            transform = 'translate(' + translateX + ',0) scale(' + scaleX + ',1)';

	            // hide tooltip
	            $$.hideXGridFocus();
	            $$.hideTooltip();

	            d3.transition().ease('linear').duration(durationForFlow).each(function () {
	                wait.add($$.axes.x.transition().call($$.xAxis));
	                wait.add(mainBar.transition().attr('transform', transform));
	                wait.add(mainLine.transition().attr('transform', transform));
	                wait.add(mainArea.transition().attr('transform', transform));
	                wait.add(mainCircle.transition().attr('transform', transform));
	                wait.add(mainText.transition().attr('transform', transform));
	                wait.add(mainRegion.filter($$.isRegionOnX).transition().attr('transform', transform));
	                wait.add(xgrid.transition().attr('transform', transform));
	                wait.add(xgridLines.transition().attr('transform', transform));
	            })
	            .call(wait, function () {
	                var i, shapes = [], texts = [], eventRects = [];

	                // remove flowed elements
	                if (flowLength) {
	                    for (i = 0; i < flowLength; i++) {
	                        shapes.push('.' + CLASS.shape + '-' + (flowIndex + i));
	                        texts.push('.' + CLASS.text + '-' + (flowIndex + i));
	                        eventRects.push('.' + CLASS.eventRect + '-' + (flowIndex + i));
	                    }
	                    $$.svg.selectAll('.' + CLASS.shapes).selectAll(shapes).remove();
	                    $$.svg.selectAll('.' + CLASS.texts).selectAll(texts).remove();
	                    $$.svg.selectAll('.' + CLASS.eventRects).selectAll(eventRects).remove();
	                    $$.svg.select('.' + CLASS.xgrid).remove();
	                }

	                // draw again for removing flowed elements and reverting attr
	                xgrid
	                    .attr('transform', null)
	                    .attr($$.xgridAttr);
	                xgridLines
	                    .attr('transform', null);
	                xgridLines.select('line')
	                    .attr("x1", config.axis_rotated ? 0 : xv)
	                    .attr("x2", config.axis_rotated ? $$.width : xv);
	                xgridLines.select('text')
	                    .attr("x", config.axis_rotated ? $$.width : 0)
	                    .attr("y", xv);
	                mainBar
	                    .attr('transform', null)
	                    .attr("d", drawBar);
	                mainLine
	                    .attr('transform', null)
	                    .attr("d", drawLine);
	                mainArea
	                    .attr('transform', null)
	                    .attr("d", drawArea);
	                mainCircle
	                    .attr('transform', null)
	                    .attr("cx", cx)
	                    .attr("cy", cy);
	                mainText
	                    .attr('transform', null)
	                    .attr('x', xForText)
	                    .attr('y', yForText)
	                    .style('fill-opacity', $$.opacityForText.bind($$));
	                mainRegion
	                    .attr('transform', null);
	                mainRegion.select('rect').filter($$.isRegionOnX)
	                    .attr("x", $$.regionX.bind($$))
	                    .attr("width", $$.regionWidth.bind($$));

	                if (config.interaction_enabled) {
	                    $$.redrawEventRect();
	                }

	                // callback for end of flow
	                done();

	                $$.flowing = false;
	            });
	        };
	    };

	    c3_chart_fn.selected = function (targetId) {
	        var $$ = this.internal, d3 = $$.d3;
	        return d3.merge(
	            $$.main.selectAll('.' + CLASS.shapes + $$.getTargetSelectorSuffix(targetId)).selectAll('.' + CLASS.shape)
	                .filter(function () { return d3.select(this).classed(CLASS.SELECTED); })
	                .map(function (d) { return d.map(function (d) { var data = d.__data__; return data.data ? data.data : data; }); })
	        );
	    };
	    c3_chart_fn.select = function (ids, indices, resetOther) {
	        var $$ = this.internal, d3 = $$.d3, config = $$.config;
	        if (! config.data_selection_enabled) { return; }
	        $$.main.selectAll('.' + CLASS.shapes).selectAll('.' + CLASS.shape).each(function (d, i) {
	            var shape = d3.select(this), id = d.data ? d.data.id : d.id,
	                toggle = $$.getToggle(this, d).bind($$),
	                isTargetId = config.data_selection_grouped || !ids || ids.indexOf(id) >= 0,
	                isTargetIndex = !indices || indices.indexOf(i) >= 0,
	                isSelected = shape.classed(CLASS.SELECTED);
	            // line/area selection not supported yet
	            if (shape.classed(CLASS.line) || shape.classed(CLASS.area)) {
	                return;
	            }
	            if (isTargetId && isTargetIndex) {
	                if (config.data_selection_isselectable(d) && !isSelected) {
	                    toggle(true, shape.classed(CLASS.SELECTED, true), d, i);
	                }
	            } else if (isDefined(resetOther) && resetOther) {
	                if (isSelected) {
	                    toggle(false, shape.classed(CLASS.SELECTED, false), d, i);
	                }
	            }
	        });
	    };
	    c3_chart_fn.unselect = function (ids, indices) {
	        var $$ = this.internal, d3 = $$.d3, config = $$.config;
	        if (! config.data_selection_enabled) { return; }
	        $$.main.selectAll('.' + CLASS.shapes).selectAll('.' + CLASS.shape).each(function (d, i) {
	            var shape = d3.select(this), id = d.data ? d.data.id : d.id,
	                toggle = $$.getToggle(this, d).bind($$),
	                isTargetId = config.data_selection_grouped || !ids || ids.indexOf(id) >= 0,
	                isTargetIndex = !indices || indices.indexOf(i) >= 0,
	                isSelected = shape.classed(CLASS.SELECTED);
	            // line/area selection not supported yet
	            if (shape.classed(CLASS.line) || shape.classed(CLASS.area)) {
	                return;
	            }
	            if (isTargetId && isTargetIndex) {
	                if (config.data_selection_isselectable(d)) {
	                    if (isSelected) {
	                        toggle(false, shape.classed(CLASS.SELECTED, false), d, i);
	                    }
	                }
	            }
	        });
	    };

	    c3_chart_fn.transform = function (type, targetIds) {
	        var $$ = this.internal,
	            options = ['pie', 'donut'].indexOf(type) >= 0 ? {withTransform: true} : null;
	        $$.transformTo(targetIds, type, options);
	    };

	    c3_chart_internal_fn.transformTo = function (targetIds, type, optionsForRedraw) {
	        var $$ = this,
	            withTransitionForAxis = !$$.hasArcType(),
	            options = optionsForRedraw || {withTransitionForAxis: withTransitionForAxis};
	        options.withTransitionForTransform = false;
	        $$.transiting = false;
	        $$.setTargetType(targetIds, type);
	        $$.updateTargets($$.data.targets); // this is needed when transforming to arc
	        $$.updateAndRedraw(options);
	    };

	    c3_chart_fn.groups = function (groups) {
	        var $$ = this.internal, config = $$.config;
	        if (isUndefined(groups)) { return config.data_groups; }
	        config.data_groups = groups;
	        $$.redraw();
	        return config.data_groups;
	    };

	    c3_chart_fn.xgrids = function (grids) {
	        var $$ = this.internal, config = $$.config;
	        if (! grids) { return config.grid_x_lines; }
	        config.grid_x_lines = grids;
	        $$.redrawWithoutRescale();
	        return config.grid_x_lines;
	    };
	    c3_chart_fn.xgrids.add = function (grids) {
	        var $$ = this.internal;
	        return this.xgrids($$.config.grid_x_lines.concat(grids ? grids : []));
	    };
	    c3_chart_fn.xgrids.remove = function (params) { // TODO: multiple
	        var $$ = this.internal;
	        $$.removeGridLines(params, true);
	    };

	    c3_chart_fn.ygrids = function (grids) {
	        var $$ = this.internal, config = $$.config;
	        if (! grids) { return config.grid_y_lines; }
	        config.grid_y_lines = grids;
	        $$.redrawWithoutRescale();
	        return config.grid_y_lines;
	    };
	    c3_chart_fn.ygrids.add = function (grids) {
	        var $$ = this.internal;
	        return this.ygrids($$.config.grid_y_lines.concat(grids ? grids : []));
	    };
	    c3_chart_fn.ygrids.remove = function (params) { // TODO: multiple
	        var $$ = this.internal;
	        $$.removeGridLines(params, false);
	    };

	    c3_chart_fn.regions = function (regions) {
	        var $$ = this.internal, config = $$.config;
	        if (!regions) { return config.regions; }
	        config.regions = regions;
	        $$.redrawWithoutRescale();
	        return config.regions;
	    };
	    c3_chart_fn.regions.add = function (regions) {
	        var $$ = this.internal, config = $$.config;
	        if (!regions) { return config.regions; }
	        config.regions = config.regions.concat(regions);
	        $$.redrawWithoutRescale();
	        return config.regions;
	    };
	    c3_chart_fn.regions.remove = function (options) {
	        var $$ = this.internal, config = $$.config,
	            duration, classes, regions;

	        options = options || {};
	        duration = $$.getOption(options, "duration", config.transition_duration);
	        classes = $$.getOption(options, "classes", [CLASS.region]);

	        regions = $$.main.select('.' + CLASS.regions).selectAll(classes.map(function (c) { return '.' + c; }));
	        (duration ? regions.transition().duration(duration) : regions)
	            .style('opacity', 0)
	            .remove();

	        config.regions = config.regions.filter(function (region) {
	            var found = false;
	            if (!region['class']) {
	                return true;
	            }
	            region['class'].split(' ').forEach(function (c) {
	                if (classes.indexOf(c) >= 0) { found = true; }
	            });
	            return !found;
	        });

	        return config.regions;
	    };

	    c3_chart_fn.data = function (targetIds) {
	        var targets = this.internal.data.targets;
	        return typeof targetIds === 'undefined' ? targets : targets.filter(function (t) {
	            return [].concat(targetIds).indexOf(t.id) >= 0;
	        });
	    };
	    c3_chart_fn.data.shown = function (targetIds) {
	        return this.internal.filterTargetsToShow(this.data(targetIds));
	    };
	    c3_chart_fn.data.values = function (targetId) {
	        var targets, values = null;
	        if (targetId) {
	            targets = this.data(targetId);
	            values = targets[0] ? targets[0].values.map(function (d) { return d.value; }) : null;
	        }
	        return values;
	    };
	    c3_chart_fn.data.names = function (names) {
	        this.internal.clearLegendItemTextBoxCache();
	        return this.internal.updateDataAttributes('names', names);
	    };
	    c3_chart_fn.data.colors = function (colors) {
	        return this.internal.updateDataAttributes('colors', colors);
	    };
	    c3_chart_fn.data.axes = function (axes) {
	        return this.internal.updateDataAttributes('axes', axes);
	    };

	    c3_chart_fn.category = function (i, category) {
	        var $$ = this.internal, config = $$.config;
	        if (arguments.length > 1) {
	            config.axis_x_categories[i] = category;
	            $$.redraw();
	        }
	        return config.axis_x_categories[i];
	    };
	    c3_chart_fn.categories = function (categories) {
	        var $$ = this.internal, config = $$.config;
	        if (!arguments.length) { return config.axis_x_categories; }
	        config.axis_x_categories = categories;
	        $$.redraw();
	        return config.axis_x_categories;
	    };

	    // TODO: fix
	    c3_chart_fn.color = function (id) {
	        var $$ = this.internal;
	        return $$.color(id); // more patterns
	    };

	    c3_chart_fn.x = function (x) {
	        var $$ = this.internal;
	        if (arguments.length) {
	            $$.updateTargetX($$.data.targets, x);
	            $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true});
	        }
	        return $$.data.xs;
	    };
	    c3_chart_fn.xs = function (xs) {
	        var $$ = this.internal;
	        if (arguments.length) {
	            $$.updateTargetXs($$.data.targets, xs);
	            $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true});
	        }
	        return $$.data.xs;
	    };

	    c3_chart_fn.axis = function () {};
	    c3_chart_fn.axis.labels = function (labels) {
	        var $$ = this.internal;
	        if (arguments.length) {
	            Object.keys(labels).forEach(function (axisId) {
	                $$.axis.setLabelText(axisId, labels[axisId]);
	            });
	            $$.axis.updateLabels();
	        }
	        // TODO: return some values?
	    };
	    c3_chart_fn.axis.max = function (max) {
	        var $$ = this.internal, config = $$.config;
	        if (arguments.length) {
	            if (typeof max === 'object') {
	                if (isValue(max.x)) { config.axis_x_max = max.x; }
	                if (isValue(max.y)) { config.axis_y_max = max.y; }
	                if (isValue(max.y2)) { config.axis_y2_max = max.y2; }
	            } else {
	                config.axis_y_max = config.axis_y2_max = max;
	            }
	            $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true});
	        } else {
	            return {
	                x: config.axis_x_max,
	                y: config.axis_y_max,
	                y2: config.axis_y2_max
	            };
	        }
	    };
	    c3_chart_fn.axis.min = function (min) {
	        var $$ = this.internal, config = $$.config;
	        if (arguments.length) {
	            if (typeof min === 'object') {
	                if (isValue(min.x)) { config.axis_x_min = min.x; }
	                if (isValue(min.y)) { config.axis_y_min = min.y; }
	                if (isValue(min.y2)) { config.axis_y2_min = min.y2; }
	            } else {
	                config.axis_y_min = config.axis_y2_min = min;
	            }
	            $$.redraw({withUpdateOrgXDomain: true, withUpdateXDomain: true});
	        } else {
	            return {
	                x: config.axis_x_min,
	                y: config.axis_y_min,
	                y2: config.axis_y2_min
	            };
	        }
	    };
	    c3_chart_fn.axis.range = function (range) {
	        if (arguments.length) {
	            if (isDefined(range.max)) { this.axis.max(range.max); }
	            if (isDefined(range.min)) { this.axis.min(range.min); }
	        } else {
	            return {
	                max: this.axis.max(),
	                min: this.axis.min()
	            };
	        }
	    };

	    c3_chart_fn.legend = function () {};
	    c3_chart_fn.legend.show = function (targetIds) {
	        var $$ = this.internal;
	        $$.showLegend($$.mapToTargetIds(targetIds));
	        $$.updateAndRedraw({withLegend: true});
	    };
	    c3_chart_fn.legend.hide = function (targetIds) {
	        var $$ = this.internal;
	        $$.hideLegend($$.mapToTargetIds(targetIds));
	        $$.updateAndRedraw({withLegend: true});
	    };

	    c3_chart_fn.resize = function (size) {
	        var $$ = this.internal, config = $$.config;
	        config.size_width = size ? size.width : null;
	        config.size_height = size ? size.height : null;
	        this.flush();
	    };

	    c3_chart_fn.flush = function () {
	        var $$ = this.internal;
	        $$.updateAndRedraw({withLegend: true, withTransition: false, withTransitionForTransform: false});
	    };

	    c3_chart_fn.destroy = function () {
	        var $$ = this.internal;

	        window.clearInterval($$.intervalForObserveInserted);
	        window.onresize = null;

	        $$.selectChart.classed('c3', false).html("");

	        // MEMO: this is needed because the reference of some elements will not be released, then memory leak will happen.
	        Object.keys($$).forEach(function (key) {
	            $$[key] = null;
	        });

	        return null;
	    };

	    c3_chart_fn.tooltip = function () {};
	    c3_chart_fn.tooltip.show = function (args) {
	        var $$ = this.internal, index, mouse;

	        // determine mouse position on the chart
	        if (args.mouse) {
	            mouse = args.mouse;
	        }

	        // determine focus data
	        if (args.data) {
	            if ($$.isMultipleX()) {
	                // if multiple xs, target point will be determined by mouse
	                mouse = [$$.x(args.data.x), $$.getYScale(args.data.id)(args.data.value)];
	                index = null;
	            } else {
	                // TODO: when tooltip_grouped = false
	                index = isValue(args.data.index) ? args.data.index : $$.getIndexByX(args.data.x);
	            }
	        }
	        else if (typeof args.x !== 'undefined') {
	            index = $$.getIndexByX(args.x);
	        }
	        else if (typeof args.index !== 'undefined') {
	            index = args.index;
	        }

	        // emulate mouse events to show
	        $$.dispatchEvent('mouseover', index, mouse);
	        $$.dispatchEvent('mousemove', index, mouse);
	    };
	    c3_chart_fn.tooltip.hide = function () {
	        // TODO: get target data by checking the state of focus
	        this.internal.dispatchEvent('mouseout', 0);
	    };

	    // Features:
	    // 1. category axis
	    // 2. ceil values of translate/x/y to int for half pixel antialiasing
	    // 3. multiline tick text
	    var tickTextCharSize;
	    function c3_axis(d3, params) {
	        var scale = d3.scale.linear(), orient = "bottom", innerTickSize = 6, outerTickSize, tickPadding = 3, tickValues = null, tickFormat, tickArguments;

	        var tickOffset = 0, tickCulling = true, tickCentered;

	        params = params || {};
	        outerTickSize = params.withOuterTick ? 6 : 0;

	        function axisX(selection, x) {
	            selection.attr("transform", function (d) {
	                return "translate(" + Math.ceil(x(d) + tickOffset) + ", 0)";
	            });
	        }
	        function axisY(selection, y) {
	            selection.attr("transform", function (d) {
	                return "translate(0," + Math.ceil(y(d)) + ")";
	            });
	        }
	        function scaleExtent(domain) {
	            var start = domain[0], stop = domain[domain.length - 1];
	            return start < stop ? [ start, stop ] : [ stop, start ];
	        }
	        function generateTicks(scale) {
	            var i, domain, ticks = [];
	            if (scale.ticks) {
	                return scale.ticks.apply(scale, tickArguments);
	            }
	            domain = scale.domain();
	            for (i = Math.ceil(domain[0]); i < domain[1]; i++) {
	                ticks.push(i);
	            }
	            if (ticks.length > 0 && ticks[0] > 0) {
	                ticks.unshift(ticks[0] - (ticks[1] - ticks[0]));
	            }
	            return ticks;
	        }
	        function copyScale() {
	            var newScale = scale.copy(), domain;
	            if (params.isCategory) {
	                domain = scale.domain();
	                newScale.domain([domain[0], domain[1] - 1]);
	            }
	            return newScale;
	        }
	        function textFormatted(v) {
	            var formatted = tickFormat ? tickFormat(v) : v;
	            return typeof formatted !== 'undefined' ? formatted : '';
	        }
	        function getSizeFor1Char(tick) {
	            if (tickTextCharSize) {
	                return tickTextCharSize;
	            }
	            var size = {
	                h: 11.5,
	                w: 5.5
	            };
	            tick.select('text').text(textFormatted).each(function (d) {
	                var box = this.getBoundingClientRect(),
	                    text = textFormatted(d),
	                    h = box.height,
	                    w = text ? (box.width / text.length) : undefined;
	                if (h && w) {
	                    size.h = h;
	                    size.w = w;
	                }
	            }).text('');
	            tickTextCharSize = size;
	            return size;
	        }
	        function transitionise(selection) {
	            return params.withoutTransition ? selection : d3.transition(selection);
	        }
	        function axis(g) {
	            g.each(function () {
	                var g = axis.g = d3.select(this);

	                var scale0 = this.__chart__ || scale, scale1 = this.__chart__ = copyScale();

	                var ticks = tickValues ? tickValues : generateTicks(scale1),
	                    tick = g.selectAll(".tick").data(ticks, scale1),
	                    tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", 1e-6),
	                    // MEMO: No exit transition. The reason is this transition affects max tick width calculation because old tick will be included in the ticks.
	                    tickExit = tick.exit().remove(),
	                    tickUpdate = transitionise(tick).style("opacity", 1),
	                    tickTransform, tickX, tickY;

	                var range = scale.rangeExtent ? scale.rangeExtent() : scaleExtent(scale.range()),
	                    path = g.selectAll(".domain").data([ 0 ]),
	                    pathUpdate = (path.enter().append("path").attr("class", "domain"), transitionise(path));
	                tickEnter.append("line");
	                tickEnter.append("text");

	                var lineEnter = tickEnter.select("line"),
	                    lineUpdate = tickUpdate.select("line"),
	                    textEnter = tickEnter.select("text"),
	                    textUpdate = tickUpdate.select("text");

	                if (params.isCategory) {
	                    tickOffset = Math.ceil((scale1(1) - scale1(0)) / 2);
	                    tickX = tickCentered ? 0 : tickOffset;
	                    tickY = tickCentered ? tickOffset : 0;
	                } else {
	                    tickOffset = tickX = 0;
	                }

	                var text, tspan, sizeFor1Char = getSizeFor1Char(g.select('.tick')), counts = [];
	                var tickLength = Math.max(innerTickSize, 0) + tickPadding,
	                    isVertical = orient === 'left' || orient === 'right';

	                // this should be called only when category axis
	                function splitTickText(d, maxWidth) {
	                    var tickText = textFormatted(d),
	                        subtext, spaceIndex, textWidth, splitted = [];

	                    if (Object.prototype.toString.call(tickText) === "[object Array]") {
	                        return tickText;
	                    }

	                    if (!maxWidth || maxWidth <= 0) {
	                        maxWidth = isVertical ? 95 : params.isCategory ? (Math.ceil(scale1(ticks[1]) - scale1(ticks[0])) - 12) : 110;
	                    }

	                    function split(splitted, text) {
	                        spaceIndex = undefined;
	                        for (var i = 1; i < text.length; i++) {
	                            if (text.charAt(i) === ' ') {
	                                spaceIndex = i;
	                            }
	                            subtext = text.substr(0, i + 1);
	                            textWidth = sizeFor1Char.w * subtext.length;
	                            // if text width gets over tick width, split by space index or crrent index
	                            if (maxWidth < textWidth) {
	                                return split(
	                                    splitted.concat(text.substr(0, spaceIndex ? spaceIndex : i)),
	                                    text.slice(spaceIndex ? spaceIndex + 1 : i)
	                                );
	                            }
	                        }
	                        return splitted.concat(text);
	                    }

	                    return split(splitted, tickText + "");
	                }

	                function tspanDy(d, i) {
	                    var dy = sizeFor1Char.h;
	                    if (i === 0) {
	                        if (orient === 'left' || orient === 'right') {
	                            dy = -((counts[d.index] - 1) * (sizeFor1Char.h / 2) - 3);
	                        } else {
	                            dy = ".71em";
	                        }
	                    }
	                    return dy;
	                }

	                function tickSize(d) {
	                    var tickPosition = scale(d) + (tickCentered ? 0 : tickOffset);
	                    return range[0] < tickPosition && tickPosition < range[1] ? innerTickSize : 0;
	                }

	                text = tick.select("text");
	                tspan = text.selectAll('tspan')
	                    .data(function (d, i) {
	                        var splitted = params.tickMultiline ? splitTickText(d, params.tickWidth) : [].concat(textFormatted(d));
	                        counts[i] = splitted.length;
	                        return splitted.map(function (s) {
	                            return { index: i, splitted: s };
	                        });
	                    });
	                tspan.enter().append('tspan');
	                tspan.exit().remove();
	                tspan.text(function (d) { return d.splitted; });

	                var rotate = params.tickTextRotate;

	                function textAnchorForText(rotate) {
	                    if (!rotate) {
	                        return 'middle';
	                    }
	                    return rotate > 0 ? "start" : "end";
	                }
	                function textTransform(rotate) {
	                    if (!rotate) {
	                        return '';
	                    }
	                    return "rotate(" + rotate + ")";
	                }
	                function dxForText(rotate) {
	                    if (!rotate) {
	                        return 0;
	                    }
	                    return 8 * Math.sin(Math.PI * (rotate / 180));
	                }
	                function yForText(rotate) {
	                    if (!rotate) {
	                        return tickLength;
	                    }
	                    return 11.5 - 2.5 * (rotate / 15) * (rotate > 0 ? 1 : -1);
	                }

	                switch (orient) {
	                case "bottom":
	                    {
	                        tickTransform = axisX;
	                        lineEnter.attr("y2", innerTickSize);
	                        textEnter.attr("y", tickLength);
	                        lineUpdate.attr("x1", tickX).attr("x2", tickX).attr("y2", tickSize);
	                        textUpdate.attr("x", 0).attr("y", yForText(rotate))
	                            .style("text-anchor", textAnchorForText(rotate))
	                            .attr("transform", textTransform(rotate));
	                        tspan.attr('x', 0).attr("dy", tspanDy).attr('dx', dxForText(rotate));
	                        pathUpdate.attr("d", "M" + range[0] + "," + outerTickSize + "V0H" + range[1] + "V" + outerTickSize);
	                        break;
	                    }
	                case "top":
	                    {
	                        // TODO: rotated tick text
	                        tickTransform = axisX;
	                        lineEnter.attr("y2", -innerTickSize);
	                        textEnter.attr("y", -tickLength);
	                        lineUpdate.attr("x2", 0).attr("y2", -innerTickSize);
	                        textUpdate.attr("x", 0).attr("y", -tickLength);
	                        text.style("text-anchor", "middle");
	                        tspan.attr('x', 0).attr("dy", "0em");
	                        pathUpdate.attr("d", "M" + range[0] + "," + -outerTickSize + "V0H" + range[1] + "V" + -outerTickSize);
	                        break;
	                    }
	                case "left":
	                    {
	                        tickTransform = axisY;
	                        lineEnter.attr("x2", -innerTickSize);
	                        textEnter.attr("x", -tickLength);
	                        lineUpdate.attr("x2", -innerTickSize).attr("y1", tickY).attr("y2", tickY);
	                        textUpdate.attr("x", -tickLength).attr("y", tickOffset);
	                        text.style("text-anchor", "end");
	                        tspan.attr('x', -tickLength).attr("dy", tspanDy);
	                        pathUpdate.attr("d", "M" + -outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + -outerTickSize);
	                        break;
	                    }
	                case "right":
	                    {
	                        tickTransform = axisY;
	                        lineEnter.attr("x2", innerTickSize);
	                        textEnter.attr("x", tickLength);
	                        lineUpdate.attr("x2", innerTickSize).attr("y2", 0);
	                        textUpdate.attr("x", tickLength).attr("y", 0);
	                        text.style("text-anchor", "start");
	                        tspan.attr('x', tickLength).attr("dy", tspanDy);
	                        pathUpdate.attr("d", "M" + outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + outerTickSize);
	                        break;
	                    }
	                }
	                if (scale1.rangeBand) {
	                    var x = scale1, dx = x.rangeBand() / 2;
	                    scale0 = scale1 = function (d) {
	                        return x(d) + dx;
	                    };
	                } else if (scale0.rangeBand) {
	                    scale0 = scale1;
	                } else {
	                    tickExit.call(tickTransform, scale1);
	                }
	                tickEnter.call(tickTransform, scale0);
	                tickUpdate.call(tickTransform, scale1);
	            });
	        }
	        axis.scale = function (x) {
	            if (!arguments.length) { return scale; }
	            scale = x;
	            return axis;
	        };
	        axis.orient = function (x) {
	            if (!arguments.length) { return orient; }
	            orient = x in {top: 1, right: 1, bottom: 1, left: 1} ? x + "" : "bottom";
	            return axis;
	        };
	        axis.tickFormat = function (format) {
	            if (!arguments.length) { return tickFormat; }
	            tickFormat = format;
	            return axis;
	        };
	        axis.tickCentered = function (isCentered) {
	            if (!arguments.length) { return tickCentered; }
	            tickCentered = isCentered;
	            return axis;
	        };
	        axis.tickOffset = function () {
	            return tickOffset;
	        };
	        axis.tickInterval = function () {
	            var interval, length;
	            if (params.isCategory) {
	                interval = tickOffset * 2;
	            }
	            else {
	                length = axis.g.select('path.domain').node().getTotalLength() - outerTickSize * 2;
	                interval = length / axis.g.selectAll('line').size();
	            }
	            return interval === Infinity ? 0 : interval;
	        };
	        axis.ticks = function () {
	            if (!arguments.length) { return tickArguments; }
	            tickArguments = arguments;
	            return axis;
	        };
	        axis.tickCulling = function (culling) {
	            if (!arguments.length) { return tickCulling; }
	            tickCulling = culling;
	            return axis;
	        };
	        axis.tickValues = function (x) {
	            if (typeof x === 'function') {
	                tickValues = function () {
	                    return x(scale.domain());
	                };
	            }
	            else {
	                if (!arguments.length) { return tickValues; }
	                tickValues = x;
	            }
	            return axis;
	        };
	        return axis;
	    }

	    c3_chart_internal_fn.isSafari = function () {
	        var ua = window.navigator.userAgent;
	        return ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0;
	    };
	    c3_chart_internal_fn.isChrome = function () {
	        var ua = window.navigator.userAgent;
	        return ua.indexOf('Chrome') >= 0;
	    };

	    // PhantomJS doesn't have support for Function.prototype.bind, which has caused confusion. Use
	    // this polyfill to avoid the confusion.
	    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Polyfill

	    if (!Function.prototype.bind) {
	      Function.prototype.bind = function(oThis) {
	        if (typeof this !== 'function') {
	          // closest thing possible to the ECMAScript 5
	          // internal IsCallable function
	          throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
	        }

	        var aArgs   = Array.prototype.slice.call(arguments, 1),
	            fToBind = this,
	            fNOP    = function() {},
	            fBound  = function() {
	              return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
	            };

	        fNOP.prototype = this.prototype;
	        fBound.prototype = new fNOP();

	        return fBound;
	      };
	    }

	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(21)], __WEBPACK_AMD_DEFINE_FACTORY__ = (c3), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if ('undefined' !== typeof exports && 'undefined' !== typeof module) {
	        module.exports = c3;
	    } else {
	        window.c3 = c3;
	    }

	})(window);


/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var React = __webpack_require__(1);
	var cloneWithProps = __webpack_require__(133);
	var utils = __webpack_require__(106);
	var Draggable = __webpack_require__(129);
	var Resizable = __webpack_require__(130).Resizable;
	var PureDeepRenderMixin = __webpack_require__(107);

	/**
	 * An individual item within a ReactGridLayout.
	 */
	var GridItem = React.createClass({
	  displayName: 'GridItem',

	  mixins: [PureDeepRenderMixin],

	  propTypes: {
	    // General grid attributes
	    cols: React.PropTypes.number.isRequired,
	    containerWidth: React.PropTypes.number.isRequired,
	    rowHeight: React.PropTypes.number.isRequired,
	    margin: React.PropTypes.array.isRequired,

	    // These are all in grid units
	    x: React.PropTypes.number.isRequired,
	    y: React.PropTypes.number.isRequired,
	    w: React.PropTypes.number.isRequired,
	    h: React.PropTypes.number.isRequired,

	    // All optional
	    minW: function minW(props, propName, componentName) {
	      React.PropTypes.number.apply(this, arguments);
	      if (props.minW > props.w || props.minW > props.maxW) constraintError('minW', props);
	    },
	    maxW: function maxW(props, propName, componentName) {
	      React.PropTypes.number.apply(this, arguments);
	      if (props.maxW < props.w || props.maxW < props.minW) constraintError('maxW', props);
	    },
	    minH: function minH(props, propName, componentName) {
	      React.PropTypes.number.apply(this, arguments);
	      if (props.minH > props.h || props.minH > props.maxH) constraintError('minH', props);
	    },
	    maxH: function maxH(props, propName, componentName) {
	      React.PropTypes.number.apply(this, arguments);
	      if (props.maxH < props.h || props.maxH < props.minH) constraintError('maxH', props);
	    },

	    // ID is nice to have for callbacks
	    i: React.PropTypes.string.isRequired,

	    // If true, item will be repositioned when x/y/w/h change
	    moveOnStartChange: React.PropTypes.bool,

	    // Functions
	    onDragStop: React.PropTypes.func,
	    onDragStart: React.PropTypes.func,
	    onDrag: React.PropTypes.func,
	    onResizeStop: React.PropTypes.func,
	    onResizeStart: React.PropTypes.func,
	    onResize: React.PropTypes.func,

	    // Flags
	    isDraggable: React.PropTypes.bool,
	    isResizable: React.PropTypes.bool,
	    // Use CSS transforms instead of top/left
	    useCSSTransforms: React.PropTypes.bool,
	    isPlaceholder: React.PropTypes.bool,

	    // Others
	    className: React.PropTypes.string,
	    // Selector for draggable handle
	    handle: React.PropTypes.string,
	    // Selector for draggable cancel (see react-draggable)
	    cancel: React.PropTypes.string
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      isDraggable: true,
	      isResizable: true,
	      useCSSTransforms: true,
	      className: '',
	      cancel: '',
	      minH: 1,
	      minW: 1,
	      maxH: Infinity,
	      maxW: Infinity
	    };
	  },

	  getInitialState: function getInitialState() {
	    return {
	      resizing: false,
	      className: ''
	    };
	  },

	  /**
	   * Return position on the page given an x, y, w, h.
	   * left, top, width, height are all in pixels.
	   * @param  {Number}  x             X coordinate in grid units.
	   * @param  {Number}  y             Y coordinate in grid units.
	   * @param  {Number}  w             W coordinate in grid units.
	   * @param  {Number}  h             H coordinate in grid units.
	   * @return {Object}                Object containing coords.
	   */
	  calcPosition: function calcPosition(x, y, w, h) {
	    var p = this.props;
	    var width = p.containerWidth - p.margin[0];
	    var out = {
	      left: width * (x / p.cols) + p.margin[0],
	      top: p.rowHeight * y + p.margin[1],
	      width: width * (w / p.cols) - p.margin[0],
	      height: h * p.rowHeight - p.margin[1]
	    };
	    return out;
	  },

	  /**
	   * Translate x and y coordinates from pixels to grid units.
	   * @param  {Number} options.left  Left offset in pixels.
	   * @param  {Number} options.top   Top offset in pixels.
	   * @return {Object}               x and y in grid units.
	   */
	  calcXY: function calcXY(_ref) {
	    var left = _ref.left;
	    var top = _ref.top;

	    left = left - this.props.margin[0];
	    top = top - this.props.margin[1];
	    // This is intentional; because so much of the logic on moving boxes up/down relies
	    // on an exact y position, we only round the x, not the y.
	    var x = Math.round(left / this.props.containerWidth * this.props.cols);
	    var y = Math.floor(top / this.props.rowHeight);
	    x = Math.max(Math.min(x, this.props.cols), 0);
	    y = Math.max(y, 0);
	    return { x: x, y: y };
	  },

	  /**
	   * Given a height and width in pixel values, calculate grid units.
	   * @param  {Number} options.height Height in pixels.
	   * @param  {Number} options.width  Width in pixels.
	   * @return {Object}                w, h as grid units.
	   */
	  calcWH: function calcWH(_ref) {
	    var height = _ref.height;
	    var width = _ref.width;

	    width = width + this.props.margin[0];
	    height = height + this.props.margin[1];
	    var w = Math.round(width / this.props.containerWidth * this.props.cols);
	    var h = Math.round(height / this.props.rowHeight);
	    w = Math.max(Math.min(w, this.props.cols - this.props.x), 0);
	    h = Math.max(h, 0);
	    return { w: w, h: h };
	  },

	  /**
	   * Mix a Draggable instance into a child.
	   * @param  {Element} child    Child element.
	   * @param  {Object} position  Position object (pixel values)
	   * @return {Element}          Child wrapped in Draggable.
	   */
	  mixinDraggable: function mixinDraggable(child, position) {
	    return React.createElement(
	      Draggable,
	      {
	        start: { x: position.left, y: position.top },
	        moveOnStartChange: this.props.moveOnStartChange,
	        onStop: this.onDragHandler('onDragStop'),
	        onStart: this.onDragHandler('onDragStart'),
	        onDrag: this.onDragHandler('onDrag'),
	        handle: this.props.handle,
	        cancel: '.react-resizable-handle ' + this.props.cancel,
	        useCSSTransforms: this.props.useCSSTransforms
	      },
	      child
	    );
	  },

	  /**
	   * Mix a Resizable instance into a child.
	   * @param  {Element} child    Child element.
	   * @param  {Object} position  Position object (pixel values)
	   * @return {Element}          Child wrapped in Resizable.
	   */
	  mixinResizable: function mixinResizable(child, position) {
	    var p = this.props;
	    // This is the max possible width - doesn't go to infinity because of the width of the window
	    var maxWidth = this.calcPosition(0, 0, p.cols - p.x, 0).width;

	    // Calculate min/max constraints using our min & maxes
	    var mins = this.calcPosition(0, 0, p.minW, p.minH);
	    var maxes = this.calcPosition(0, 0, p.maxW, p.maxH);
	    var minConstraints = [mins.width, mins.height];
	    var maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];
	    return React.createElement(
	      Resizable,
	      {
	        width: position.width,
	        height: position.height,
	        minConstraints: minConstraints,
	        maxConstraints: maxConstraints,
	        onResizeStop: this.onResizeHandler('onResizeStop'),
	        onResizeStart: this.onResizeHandler('onResizeStart'),
	        onResize: this.onResizeHandler('onResize')
	      },
	      child
	    );
	  },

	  /**
	   * Wrapper around drag events to provide more useful data.
	   * All drag events call the function with the given handler name,
	   * with the signature (index, x, y).
	   *
	   * @param  {String} handlerName Handler name to wrap.
	   * @return {Function}           Handler function.
	   */
	  onDragHandler: function onDragHandler(handlerName) {
	    var me = this;
	    return function (e, _ref) {
	      var element = _ref.element;
	      var position = _ref.position;

	      if (!me.props[handlerName]) return;
	      // Get new XY

	      var _me$calcXY = me.calcXY(position);

	      var x = _me$calcXY.x;
	      var y = _me$calcXY.y;

	      // Cap x at numCols
	      x = Math.min(x, me.props.cols - me.props.w);

	      me.props[handlerName](me.props.i, x, y, { e: e, element: element, position: position });
	    };
	  },

	  /**
	   * Wrapper around drag events to provide more useful data.
	   * All drag events call the function with the given handler name,
	   * with the signature (index, x, y).
	   *
	   * @param  {String} handlerName Handler name to wrap.
	   * @return {Function}           Handler function.
	   */
	  onResizeHandler: function onResizeHandler(handlerName) {
	    var me = this;
	    return function (e, _ref) {
	      var element = _ref.element;
	      var size = _ref.size;

	      if (!me.props[handlerName]) return;

	      // Get new XY

	      var _me$calcWH = me.calcWH(size);

	      var w = _me$calcWH.w;
	      var h = _me$calcWH.h;

	      // Cap w at numCols
	      w = Math.min(w, me.props.cols - me.props.x);
	      // Ensure w is at least 1
	      w = Math.max(w, 1);

	      // Min/max capping
	      w = Math.max(Math.min(w, me.props.maxW), me.props.minW);
	      h = Math.max(Math.min(h, me.props.maxH), me.props.minH);

	      me.setState({ resizing: handlerName === 'onResizeStop' ? null : size });

	      me.props[handlerName](me.props.i, w, h, { e: e, element: element, size: size });
	    };
	  },

	  render: function render() {
	    var p = this.props,
	        pos = this.calcPosition(p.x, p.y, p.w, p.h);
	    if (this.state.resizing) {
	      pos.width = this.state.resizing.width;
	      pos.height = this.state.resizing.height;
	    }

	    var child = cloneWithProps(React.Children.only(this.props.children), {
	      // Munge a classname. Use passed in classnames and resizing.
	      // React with merge the classNames.
	      className: ['react-grid-item', this.props.className, this.state.resizing ? 'resizing' : '', this.props.useCSSTransforms ? 'cssTransforms' : ''].join(' '),
	      // We can set the width and height on the child, but unfortunately we can't set the position.
	      style: {
	        width: pos.width + 'px',
	        height: pos.height + 'px',
	        left: pos.left + 'px',
	        top: pos.top + 'px',
	        position: 'absolute'
	      }
	    });

	    // This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
	    // well when server rendering, and the only way to do that properly is to use percentage width/left because
	    // we don't know exactly what the browser viewport is.
	    //
	    // Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
	    // left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.

	    // This is used for server rendering.
	    if (this.props.usePercentages) {
	      pos.left = utils.perc(pos.left / p.containerWidth);
	      child.props.style.left = pos.left;
	      child.props.style.width = utils.perc(pos.width / p.containerWidth);
	    }

	    // CSS Transforms support
	    if (this.props.useCSSTransforms) {
	      utils.setTransform(child.props.style, [pos.left, pos.top]);
	      delete child.props.style.left;
	      delete child.props.style.top;
	    }

	    // Resizable support. This is usually on but the user can toggle it off.
	    if (this.props.isResizable) {
	      child = this.mixinResizable(child, pos);
	    }

	    // Draggable support. This is always on, except for with placeholders.
	    if (this.props.isDraggable) {
	      child = this.mixinDraggable(child, pos);
	    }

	    return child;
	  }
	});

	function constraintError(name, props) {
	  delete props.children;
	  throw new Error(name + ' overrides contraints on gridItem ' + props.i + '. Full props: ' + JSON.stringify(props));
	}

	module.exports = GridItem;

/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var assign = __webpack_require__(131);

	var utils = module.exports = {

	  /**
	   * Return the bottom coordinate of the layout.
	   *
	   * @param  {Array} layout Layout array.
	   * @return {Number}       Bottom coordinate.
	   */
	  bottom: function bottom(layout) {
	    var max = 0,
	        bottomY;
	    for (var i = 0, len = layout.length; i < len; i++) {
	      bottomY = layout[i].y + layout[i].h;
	      if (bottomY > max) max = bottomY;
	    }
	    return max;
	  },

	  /**
	   * Clones a shallow object.
	   * @param  {Object} obj Object to clone.
	   * @return {Object}   Cloned object.
	   */
	  clone: function clone(obj) {
	    return assign({}, obj);
	  },

	  /**
	   * Given two layouts, check if they collide.
	   *
	   * @param  {Object} l1 Layout object.
	   * @param  {Object} l2 Layout object.
	   * @return {Boolean}   True if colliding.
	   */
	  collides: function collides(l1, l2) {
	    if (l1 === l2) {
	      return false;
	    } // same element
	    if (l1.x + l1.w <= l2.x) {
	      return false;
	    } // l1 is left of l2
	    if (l1.x >= l2.x + l2.w) {
	      return false;
	    } // l1 is right of l2
	    if (l1.y + l1.h <= l2.y) {
	      return false;
	    } // l1 is above l2
	    if (l1.y >= l2.y + l2.h) {
	      return false;
	    } // l1 is below l2
	    return true; // boxes overlap
	  },

	  /**
	   * Given a layout, compact it. This involves going down each y coordinate and removing gaps
	   * between items.
	   *
	   * @param  {Array} layout Layout.
	   * @return {Array}       Compacted Layout.
	   */
	  compact: function compact(layout) {
	    // Statics go in the compareWith array right away so items flow around them.
	    var compareWith = utils.getStatics(layout),
	        out = [];
	    // We go through the items by row and column.
	    var sorted = utils.sortLayoutItemsByRowCol(layout);

	    for (var i = 0, len = sorted.length; i < len; i++) {
	      var l = sorted[i];

	      // Don't move static elements
	      if (!l['static']) {
	        l = utils.compactItem(compareWith, l);

	        // Add to comparison array. We only collide with items before this one.
	        // Statics are already in this array.
	        compareWith.push(l);
	      }

	      // Add to output array to make sure they still come out in the right order.
	      out[layout.indexOf(l)] = l;

	      // Clear moved flag, if it exists.
	      delete l.moved;
	    }

	    return out;
	  },

	  compactItem: function compactItem(compareWith, l) {
	    // Move the element up as far as it can go without colliding.
	    while (l.y > 0 && !utils.getFirstCollision(compareWith, l)) {
	      l.y--;
	    }

	    // Move it down, and keep moving it down if it's colliding.
	    var collides;
	    while (collides = utils.getFirstCollision(compareWith, l)) {
	      l.y = collides.y + collides.h;
	    }
	    return l;
	  },

	  /**
	   * Given a layout, make sure all elements fit within its bounds.
	   *
	   * @param  {Array} layout Layout array.
	   * @param  {Number} bounds Number of columns.
	   * @return {[type]}        [description]
	   */
	  correctBounds: function correctBounds(layout, bounds) {
	    var collidesWith = utils.getStatics(layout);
	    for (var i = 0, len = layout.length; i < len; i++) {
	      var l = layout[i];
	      // Overflows right
	      if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
	      // Overflows left
	      if (l.x < 0) {
	        l.x = 0;
	        l.w = bounds.cols;
	      }
	      if (!l['static']) collidesWith.push(l);else {
	        // If this is static and collides with other statics, we must move it down.
	        // We have to do something nicer than just letting them overlap.
	        while (utils.getFirstCollision(collidesWith, l)) {
	          l.y++;
	        }
	      }
	    }
	    return layout;
	  },

	  /**
	   * Get a layout item by ID. Used so we can override later on if necessary.
	   *
	   * @param  {Array}  layout Layout array.
	   * @param  {Number} id     ID
	   * @return {LayoutItem}    Item at ID.
	   */
	  getLayoutItem: function getLayoutItem(layout, id) {
	    id = '' + id;
	    for (var i = 0, len = layout.length; i < len; i++) {
	      if ('' + layout[i].i === id) {
	        return layout[i];
	      }
	    }
	  },

	  /**
	   * Returns the first item this layout collides with.
	   * It doesn't appear to matter which order we approach this from, although
	   * perhaps that is the wrong thing to do.
	   *
	   * @param  {Object} layoutItem Layout item.
	   * @return {Object|undefined}  A colliding layout item, or undefined.
	   */
	  getFirstCollision: function getFirstCollision(layout, layoutItem) {
	    for (var i = 0, len = layout.length; i < len; i++) {
	      if (utils.collides(layout[i], layoutItem)) {
	        return layout[i];
	      }
	    }
	  },

	  getAllCollisions: function getAllCollisions(layout, layoutItem) {
	    var out = [];
	    for (var i = 0, len = layout.length; i < len; i++) {
	      if (utils.collides(layout[i], layoutItem)) out.push(layout[i]);
	    }
	    return out;
	  },

	  /**
	   * Get all static elements.
	   * @param  {Array} layout Array of layout objects.
	   * @return {Array}        Array of static layout items..
	   */
	  getStatics: function getStatics(layout) {
	    var out = [];
	    for (var i = 0, len = layout.length; i < len; i++) {
	      if (layout[i]['static']) out.push(layout[i]);
	    }
	    return out;
	  },

	  /**
	   * Move an element. Responsible for doing cascading movements of other elements.
	   *
	   * @param  {Array}      layout Full layout to modify.
	   * @param  {LayoutItem} l      element to move.
	   * @param  {Number}     [x]    X position in grid units.
	   * @param  {Number}     [y]    Y position in grid units.
	   * @param  {Boolean}    [isUserAction] If true, designates that the item we're moving is
	   *                                     being dragged/resized by th euser.
	   */
	  moveElement: function moveElement(layout, l, x, y, isUserAction) {
	    if (l['static']) {
	      return layout;
	    } // Short-circuit if nothing to do.
	    if (l.y === y && l.x === x) {
	      return layout;
	    }var movingUp = l.y > y;
	    // This is quite a bit faster than extending the object
	    if (x !== undefined) l.x = x;
	    if (y !== undefined) l.y = y;
	    l.moved = true;

	    // If this collides with anything, move it.
	    // When doing this comparison, we have to sort the items we compare with
	    // to ensure, in the case of multiple collisions, that we're getting the
	    // nearest collision.
	    var sorted = utils.sortLayoutItemsByRowCol(layout);
	    if (movingUp) sorted = sorted.reverse();
	    var collisions = utils.getAllCollisions(sorted, l);

	    // Move each item that collides away from this element.
	    for (var i = 0, len = collisions.length; i < len; i++) {
	      var collision = collisions[i];
	      // console.log('resolving collision between', l.i, 'at', l.y, 'and', collision.i, 'at', collision.y);

	      // Short circuit so we can't infinite loop
	      if (collision.moved) continue;

	      // This makes it feel a bit more precise by waiting to swap for just a bit when moving up.
	      if (l.y > collision.y && l.y - collision.y > collision.h / 4) continue;

	      // Don't move static items - we have to move *this* element away
	      if (collision['static']) {
	        layout = utils.moveElementAwayFromCollision(layout, collision, l, isUserAction);
	      } else {
	        layout = utils.moveElementAwayFromCollision(layout, l, collision, isUserAction);
	      }
	    }

	    return layout;
	  },

	  /**
	   * This is where the magic needs to happen - given a collision, move an element away from the collision.
	   * We attempt to move it up if there's room, otherwise it goes below.
	   *
	   * @param  {Array} layout            Full layout to modify.
	   * @param  {LayoutItem} collidesWith Layout item we're colliding with.
	   * @param  {LayoutItem} itemToMove   Layout item we're moving.
	   * @param  {Boolean} [isUserAction]  If true, designates that the item we're moving is being dragged/resized
	   *                                   by the user.
	   */
	  moveElementAwayFromCollision: function moveElementAwayFromCollision(layout, collidesWith, itemToMove, isUserAction) {

	    // If there is enough space above the collision to put this element, move it there.
	    // We only do this on the main collision as this can get funky in cascades and cause
	    // unwanted swapping behavior.
	    if (isUserAction) {
	      // Make a mock item so we don't modify the item here, only modify in moveElement.
	      var fakeItem = {
	        x: itemToMove.x,
	        y: itemToMove.y,
	        w: itemToMove.w,
	        h: itemToMove.h };
	      fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0);
	      if (!utils.getFirstCollision(layout, fakeItem)) {
	        return utils.moveElement(layout, itemToMove, undefined, fakeItem.y);
	      }
	    }

	    // Previously this was optimized to move below the collision directly, but this can cause problems
	    // with cascading moves, as an item may actually leapflog a collision and cause a reversal in order.
	    return utils.moveElement(layout, itemToMove, undefined, itemToMove.y + 1);
	  },

	  /**
	   * Helper to convert a number to a percentage string.
	   *
	   * @param  {Number} num Any number
	   * @return {String}     That number as a percentage.
	   */
	  perc: function perc(num) {
	    return num * 100 + '%';
	  },

	  setTransform: function setTransform(style, coords) {
	    // Replace unitless items with px
	    var x = ('' + coords[0]).replace(/(\d)$/, '$1px');
	    var y = ('' + coords[1]).replace(/(\d)$/, '$1px');
	    style.transform = 'translate(' + x + ',' + y + ')';
	    style.WebkitTransform = 'translate(' + x + ',' + y + ')';
	    style.MozTransform = 'translate(' + x + ',' + y + ')';
	    style.msTransform = 'translate(' + x + ',' + y + ')';
	    style.OTransform = 'translate(' + x + ',' + y + ')';
	    return style;
	  },

	  /**
	   * Get layout items sorted from top left to right and down.
	   *
	   * @return {Array} Array of layout objects.
	   * @return {Array}        Layout, sorted static items first.
	   */
	  sortLayoutItemsByRowCol: function sortLayoutItemsByRowCol(layout) {
	    return [].concat(layout).sort(function (a, b) {
	      if (a.y > b.y || a.y === b.y && a.x > b.x) {
	        return 1;
	      }
	      return -1;
	    });
	  },

	  /**
	   * Generate a layout using the initialLayout an children as a template.
	   * Missing entries will be added, extraneous ones will be truncated.
	   *
	   * @param  {Array}  initialLayout Layout passed in through props.
	   * @param  {String} breakpoint    Current responsive breakpoint.
	   * @return {Array}                Working layout.
	   */
	  synchronizeLayoutWithChildren: function synchronizeLayoutWithChildren(initialLayout, children, cols) {
	    children = [].concat(children); // ensure 'children' is always an array
	    initialLayout = initialLayout || [];

	    // Generate one layout item per child.
	    var layout = [];
	    for (var i = 0, len = children.length; i < len; i++) {
	      var child = children[i];
	      // Don't overwrite if it already exists.
	      var exists = utils.getLayoutItem(initialLayout, child.key);
	      if (exists) {
	        // Ensure 'i' is always a string
	        exists.i = '' + exists.i;
	        layout.push(exists);
	        continue;
	      }
	      // New item: attempt to use a layout item from the child, if it exists.
	      var g = child.props._grid;
	      if (g) {
	        utils.validateLayout([g], 'ReactGridLayout.child');
	        // Validated; add it to the layout. Bottom 'y' possible is the bottom of the layout.
	        // This allows you to do nice stuff like specify {y: Infinity}
	        layout.push(assign({}, g, { y: Math.min(utils.bottom(layout), g.y), i: child.key }));
	      } else {
	        // Nothing provided: ensure this is added to the bottom
	        layout.push({ w: 1, h: 1, x: 0, y: utils.bottom(layout), i: child.key });
	      }
	    }

	    // Correct the layout.
	    layout = utils.correctBounds(layout, { cols: cols });
	    layout = utils.compact(layout);

	    return layout;
	  },

	  /**
	   * Validate a layout. Throws errors.
	   *
	   * @param  {Array}  layout        Array of layout items.
	   * @param  {String} [contextName] Context name for errors.
	   * @throw  {Error}                Validation error.
	   */
	  validateLayout: function validateLayout(layout, contextName) {
	    contextName = contextName || 'Layout';
	    var subProps = ['x', 'y', 'w', 'h'];
	    if (!Array.isArray(layout)) throw new Error(contextName + ' must be an array!');
	    for (var i = 0, len = layout.length; i < len; i++) {
	      for (var j = 0; j < subProps.length; j++) {
	        if (typeof layout[i][subProps[j]] !== 'number') {
	          throw new Error('ReactGridLayout: ' + contextName + '[' + i + '].' + subProps[j] + ' must be a Number!');
	        }
	      }
	      if (layout[i]['static'] !== undefined && typeof layout[i]['static'] !== 'boolean') {
	        throw new Error('ReactGridLayout: ' + contextName + '[' + i + '].static must be a Boolean!');
	      }
	    }
	  }
	};

/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var deepEqual = __webpack_require__(132);

	// Like PureRenderMixin, but with deep comparisons.
	var PureDeepRenderMixin = {
	  shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
	    return !deepEqual(this.props, nextProps) || !deepEqual(this.state, nextState);
	  }
	};

	module.exports = PureDeepRenderMixin;

/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var React = __webpack_require__(1);

	/**
	 * A simple mixin that provides facility for listening to container resizes.
	 */
	var WidthListeningMixin = {

	  propTypes: {
	    // This allows setting this on the server side
	    initialWidth: React.PropTypes.number,

	    // If false, you should supply width yourself. Good if you want to debounce resize events
	    // or reuse a handler from somewhere else.
	    listenToWindowResize: React.PropTypes.bool
	  },

	  getDefaultProps: function getDefaultProps() {
	    return {
	      initialWidth: 1280,
	      listenToWindowResize: true
	    };
	  },

	  componentDidMount: function componentDidMount() {
	    if (this.props.listenToWindowResize) {
	      window.addEventListener('resize', this.onWindowResize);
	      // This is intentional. Once to properly set the breakpoint and resize the elements,
	      // and again to compensate for any scrollbar that appeared because of the first step.
	      this.onWindowResize();
	      this.onWindowResize();
	    }
	  },

	  componentWillUnmount: function componentWillUnmount() {
	    window.removeEventListener('resize', this.onWindowResize);
	  },

	  /**
	   * On window resize, update width.
	   */
	  onWindowResize: function onWindowResize() {
	    this.onWidthChange(this.getDOMNode().offsetWidth);
	  }

	};

	module.exports = WidthListeningMixin;

/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(106);

	var responsiveUtils = module.exports = {

	  /**
	   * Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint).
	   *
	   * @param  {Object} breakpoints Breakpoints object (e.g. {lg: 1200, md: 960, ...})
	   * @param  {Number} width Screen width.
	   * @return {String}       Highest breakpoint that is less than width.
	   */
	  getBreakpointFromWidth: function getBreakpointFromWidth(breakpoints, width) {
	    var sorted = responsiveUtils.sortBreakpoints(breakpoints);
	    var matching = sorted[0];
	    for (var i = 1, len = sorted.length; i < len; i++) {
	      var breakpointName = sorted[i];
	      if (width > breakpoints[breakpointName]) matching = breakpointName;
	    }
	    return matching;
	  },

	  /**
	   * Given a breakpoint, get the # of cols set for it.
	   * @param  {String} breakpoint Breakpoint name.
	   * @param  {Object} cols       Map of breakpoints to cols.
	   * @return {Number}            Number of cols.
	   */
	  getColsFromBreakpoint: function getColsFromBreakpoint(breakpoint, cols) {
	    if (!cols[breakpoint]) {
	      throw new Error('ResponsiveReactGridLayout: `cols` entry for breakpoint ' + breakpoint + ' is missing!');
	    }
	    return cols[breakpoint];
	  },

	  /**
	   * Given existing layouts and a new breakpoint, find or generate a new layout.
	   *
	   * This finds the layout above the new one and generates from it, if it exists.
	   *
	   * @param  {Array} layouts     Existing layouts.
	   * @param  {Array} breakpoints All breakpoints.
	   * @param  {String} breakpoint New breakpoint.
	   * @param  {String} breakpoint Last breakpoint (for fallback).
	   * @param  {Number} cols       Column count at new breakpoint.
	   * @return {Array}             New layout.
	   */
	  findOrGenerateResponsiveLayout: function findOrGenerateResponsiveLayout(layouts, breakpoints, breakpoint, lastBreakpoint, cols) {
	    // If it already exists, just return it.
	    if (layouts[breakpoint]) {
	      return layouts[breakpoint];
	    } // Find or generate the next layout
	    var layout = layouts[lastBreakpoint];
	    var breakpointsSorted = responsiveUtils.sortBreakpoints(breakpoints);
	    var breakpointsAbove = breakpointsSorted.slice(breakpointsSorted.indexOf(breakpoint));
	    for (var i = 0, len = breakpointsAbove.length; i < len; i++) {
	      var b = breakpointsAbove[i];
	      if (layouts[b]) {
	        layout = layouts[b];
	        break;
	      }
	    }
	    layout = JSON.parse(JSON.stringify(layout || [])); // clone layout so we don't modify existing items
	    return utils.compact(utils.correctBounds(layout, { cols: cols }));
	  },

	  /**
	   * Given breakpoints, return an array of breakpoints sorted by width. This is usually
	   * e.g. ['xxs', 'xs', 'sm', ...]
	   *
	   * @param  {Object} breakpoints Key/value pair of breakpoint names to widths.
	   * @return {Array}              Sorted breakpoints.
	   */
	  sortBreakpoints: function sortBreakpoints(breakpoints) {
	    var keys = Object.keys(breakpoints);
	    return keys.sort(function (a, b) {
	      return breakpoints[a] - breakpoints[b];
	    });
	  }
	};

/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableRoot
	 */

	"use strict";

	if (process.env.NODE_ENV !== 'production') {
	  var ExecutionEnvironment = __webpack_require__(125);
	  if (ExecutionEnvironment.canUseDOM && window.top === window.self) {

	    if (!Object.assign) {
	      console.error(
	        'FixedDataTable expected an ES6 compatible `Object.assign` polyfill.'
	      );
	    }
	  }
	}

	var FixedDataTable = __webpack_require__(126);
	var FixedDataTableColumn = __webpack_require__(127);
	var FixedDataTableColumnGroup = __webpack_require__(128);

	var FixedDataTableRoot = {
	  Column: FixedDataTableColumn,
	  ColumnGroup: FixedDataTableColumnGroup,
	  Table: FixedDataTable,
	};

	FixedDataTableRoot.version = '0.1.2';

	module.exports = FixedDataTableRoot;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	/**
	 * Get elements owner document
	 *
	 * @param {ReactComponent|HTMLElement} componentOrElement
	 * @returns {HTMLElement}
	 */
	function ownerDocument(componentOrElement) {
	  var elem = _react2['default'].findDOMNode(componentOrElement);
	  return elem && elem.ownerDocument || document;
	}

	/**
	 * Shortcut to compute element style
	 *
	 * @param {HTMLElement} elem
	 * @returns {CssStyle}
	 */
	function getComputedStyles(elem) {
	  return ownerDocument(elem).defaultView.getComputedStyle(elem, null);
	}

	/**
	 * Get elements offset
	 *
	 * TODO: REMOVE JQUERY!
	 *
	 * @param {HTMLElement} DOMNode
	 * @returns {{top: number, left: number}}
	 */
	function getOffset(DOMNode) {
	  if (window.jQuery) {
	    return window.jQuery(DOMNode).offset();
	  }

	  var docElem = ownerDocument(DOMNode).documentElement;
	  var box = { top: 0, left: 0 };

	  // If we don't have gBCR, just use 0,0 rather than error
	  // BlackBerry 5, iOS 3 (original iPhone)
	  if (typeof DOMNode.getBoundingClientRect !== 'undefined') {
	    box = DOMNode.getBoundingClientRect();
	  }

	  return {
	    top: box.top + window.pageYOffset - docElem.clientTop,
	    left: box.left + window.pageXOffset - docElem.clientLeft
	  };
	}

	/**
	 * Get elements position
	 *
	 * TODO: REMOVE JQUERY!
	 *
	 * @param {HTMLElement} elem
	 * @param {HTMLElement?} offsetParent
	 * @returns {{top: number, left: number}}
	 */
	function getPosition(elem, offsetParent) {
	  if (window.jQuery) {
	    return window.jQuery(elem).position();
	  }

	  var offset = undefined,
	      parentOffset = { top: 0, left: 0 };

	  // Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
	  if (getComputedStyles(elem).position === 'fixed') {
	    // We assume that getBoundingClientRect is available when computed position is fixed
	    offset = elem.getBoundingClientRect();
	  } else {
	    if (!offsetParent) {
	      // Get *real* offsetParent
	      offsetParent = offsetParentFunc(elem);
	    }

	    // Get correct offsets
	    offset = getOffset(elem);
	    if (offsetParent.nodeName !== 'HTML') {
	      parentOffset = getOffset(offsetParent);
	    }

	    // Add offsetParent borders
	    parentOffset.top += parseInt(getComputedStyles(offsetParent).borderTopWidth, 10);
	    parentOffset.left += parseInt(getComputedStyles(offsetParent).borderLeftWidth, 10);
	  }

	  // Subtract parent offsets and element margins
	  return {
	    top: offset.top - parentOffset.top - parseInt(getComputedStyles(elem).marginTop, 10),
	    left: offset.left - parentOffset.left - parseInt(getComputedStyles(elem).marginLeft, 10)
	  };
	}

	/**
	 * Get parent element
	 *
	 * @param {HTMLElement?} elem
	 * @returns {HTMLElement}
	 */
	function offsetParentFunc(elem) {
	  var docElem = ownerDocument(elem).documentElement;
	  var offsetParent = elem.offsetParent || docElem;

	  while (offsetParent && (offsetParent.nodeName !== 'HTML' && getComputedStyles(offsetParent).position === 'static')) {
	    offsetParent = offsetParent.offsetParent;
	  }

	  return offsetParent || docElem;
	}

	exports['default'] = {
	  ownerDocument: ownerDocument,
	  getComputedStyles: getComputedStyles,
	  getOffset: getOffset,
	  getPosition: getPosition,
	  offsetParent: offsetParentFunc
	};
	module.exports = exports['default'];

/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2014 Facebook, Inc.
	 *
	 * This file contains a modified version of:
	 * https://github.com/facebook/react/blob/v0.12.0/src/vendor/stubs/EventListener.js
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 *
	 * TODO: remove in favour of solution provided by:
	 *  https://github.com/facebook/react/issues/285
	 */

	/**
	 * Does not take into account specific nature of platform.
	 */
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	var EventListener = {
	  /**
	   * Listen to DOM events during the bubble phase.
	   *
	   * @param {DOMEventTarget} target DOM element to register listener on.
	   * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
	   * @param {function} callback Callback function.
	   * @return {object} Object with a `remove` method.
	   */
	  listen: function listen(target, eventType, callback) {
	    if (target.addEventListener) {
	      target.addEventListener(eventType, callback, false);
	      return {
	        remove: function remove() {
	          target.removeEventListener(eventType, callback, false);
	        }
	      };
	    } else if (target.attachEvent) {
	      target.attachEvent('on' + eventType, callback);
	      return {
	        remove: function remove() {
	          target.detachEvent('on' + eventType, callback);
	        }
	      };
	    }
	  }
	};

	exports['default'] = EventListener;
	module.exports = exports['default'];

/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	var ANONYMOUS = '<<anonymous>>';

	var CustomPropTypes = {
	  /**
	   * Checks whether a prop provides a DOM element
	   *
	   * The element can be provided in two forms:
	   * - Directly passed
	   * - Or passed an object which has a `getDOMNode` method which will return the required DOM element
	   *
	   * @param props
	   * @param propName
	   * @param componentName
	   * @returns {Error|undefined}
	   */
	  mountable: createMountableChecker(),
	  /**
	   * Checks whether a prop matches a key of an associated object
	   *
	   * @param props
	   * @param propName
	   * @param componentName
	   * @returns {Error|undefined}
	   */
	  keyOf: createKeyOfChecker
	};

	/**
	 * Create chain-able isRequired validator
	 *
	 * Largely copied directly from:
	 *  https://github.com/facebook/react/blob/0.11-stable/src/core/ReactPropTypes.js#L94
	 */
	function createChainableTypeChecker(validate) {
	  function checkType(isRequired, props, propName, componentName) {
	    componentName = componentName || ANONYMOUS;
	    if (props[propName] == null) {
	      if (isRequired) {
	        return new Error('Required prop `' + propName + '` was not specified in ' + '`' + componentName + '`.');
	      }
	    } else {
	      return validate(props, propName, componentName);
	    }
	  }

	  var chainedCheckType = checkType.bind(null, false);
	  chainedCheckType.isRequired = checkType.bind(null, true);

	  return chainedCheckType;
	}

	function createMountableChecker() {
	  function validate(props, propName, componentName) {
	    if (typeof props[propName] !== 'object' || typeof props[propName].render !== 'function' && props[propName].nodeType !== 1) {
	      return new Error('Invalid prop `' + propName + '` supplied to ' + '`' + componentName + '`, expected a DOM element or an object that has a `render` method');
	    }
	  }

	  return createChainableTypeChecker(validate);
	}

	function createKeyOfChecker(obj) {
	  function validate(props, propName, componentName) {
	    var propValue = props[propName];
	    if (!obj.hasOwnProperty(propValue)) {
	      var valuesString = JSON.stringify(Object.keys(obj));
	      return new Error('Invalid prop \'' + propName + '\' of value \'' + propValue + '\' ' + ('supplied to \'' + componentName + '\', expected one of ' + valuesString + '.'));
	    }
	  }
	  return createChainableTypeChecker(validate);
	}

	exports['default'] = CustomPropTypes;
	module.exports = exports['default'];

/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	/**
	 * Maps children that are typically specified as `props.children`,
	 * but only iterates over children that are "valid components".
	 *
	 * The mapFunction provided index will be normalised to the components mapped,
	 * so an invalid component would not increase the index.
	 *
	 * @param {?*} children Children tree container.
	 * @param {function(*, int)} mapFunction.
	 * @param {*} mapContext Context for mapFunction.
	 * @return {object} Object containing the ordered map of results.
	 */
	function mapValidComponents(children, func, context) {
	  var index = 0;

	  return _react2['default'].Children.map(children, function (child) {
	    if (_react2['default'].isValidElement(child)) {
	      var lastIndex = index;
	      index++;
	      return func.call(context, child, lastIndex);
	    }

	    return child;
	  });
	}

	/**
	 * Iterates through children that are typically specified as `props.children`,
	 * but only iterates over children that are "valid components".
	 *
	 * The provided forEachFunc(child, index) will be called for each
	 * leaf child with the index reflecting the position relative to "valid components".
	 *
	 * @param {?*} children Children tree container.
	 * @param {function(*, int)} forEachFunc.
	 * @param {*} forEachContext Context for forEachContext.
	 */
	function forEachValidComponents(children, func, context) {
	  var index = 0;

	  return _react2['default'].Children.forEach(children, function (child) {
	    if (_react2['default'].isValidElement(child)) {
	      func.call(context, child, index);
	      index++;
	    }
	  });
	}

	/**
	 * Count the number of "valid components" in the Children container.
	 *
	 * @param {?*} children Children tree container.
	 * @returns {number}
	 */
	function numberOfValidComponents(children) {
	  var count = 0;

	  _react2['default'].Children.forEach(children, function (child) {
	    if (_react2['default'].isValidElement(child)) {
	      count++;
	    }
	  });

	  return count;
	}

	/**
	 * Determine if the Child container has one or more "valid components".
	 *
	 * @param {?*} children Children tree container.
	 * @returns {boolean}
	 */
	function hasValidComponent(children) {
	  var hasValid = false;

	  _react2['default'].Children.forEach(children, function (child) {
	    if (!hasValid && _react2['default'].isValidElement(child)) {
	      hasValid = true;
	    }
	  });

	  return hasValid;
	}

	exports['default'] = {
	  map: mapValidComponents,
	  forEach: forEachValidComponents,
	  numberOf: numberOfValidComponents,
	  hasValidComponent: hasValidComponent
	};
	module.exports = exports['default'];

/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	exports['default'] = deprecationWarning;

	function deprecationWarning(oldname, newname, link) {
	  if (process.env.NODE_ENV !== 'production') {
	    if (!window.console && typeof console.warn !== 'function') {
	      return;
	    }

	    var message = '' + oldname + ' is deprecated. Use ' + newname + ' instead.';
	    console.warn(message);

	    if (link) {
	      console.warn('You can read more about it here ' + link);
	    }
	  }
	}

	module.exports = exports['default'];
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This file contains an unmodified version of:
	 * https://github.com/facebook/react/blob/v0.12.0/src/vendor/stubs/Object.assign.js
	 *
	 * This source code is licensed under the BSD-style license found here:
	 * https://github.com/facebook/react/blob/v0.12.0/LICENSE
	 * An additional grant of patent rights can be found here:
	 * https://github.com/facebook/react/blob/v0.12.0/PATENTS
	 */

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	function assign(target, sources) {
	  if (target == null) {
	    throw new TypeError('Object.assign target cannot be null or undefined');
	  }

	  var to = Object(target);
	  var hasOwnProperty = Object.prototype.hasOwnProperty;

	  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
	    var nextSource = arguments[nextIndex];
	    if (nextSource == null) {
	      continue;
	    }

	    var from = Object(nextSource);

	    // We don't currently support accessors nor proxies. Therefore this
	    // copy cannot throw. If we ever supported this then we must handle
	    // exceptions and side-effects. We don't support symbols so they won't
	    // be transferred.

	    for (var key in from) {
	      if (hasOwnProperty.call(from, key)) {
	        to[key] = from[key];
	      }
	    }
	  }

	  return to;
	}

	exports['default'] = assign;
	module.exports = exports['default'];

/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var FormGroup = (function (_React$Component) {
	  function FormGroup() {
	    _classCallCheck(this, FormGroup);

	    if (_React$Component != null) {
	      _React$Component.apply(this, arguments);
	    }
	  }

	  _inherits(FormGroup, _React$Component);

	  _createClass(FormGroup, [{
	    key: 'render',
	    value: function render() {
	      var classes = {
	        'form-group': !this.props.standalone,
	        'form-group-lg': !this.props.standalone && this.props.bsSize === 'large',
	        'form-group-sm': !this.props.standalone && this.props.bsSize === 'small',
	        'has-feedback': this.props.hasFeedback,
	        'has-success': this.props.bsStyle === 'success',
	        'has-warning': this.props.bsStyle === 'warning',
	        'has-error': this.props.bsStyle === 'error'
	      };

	      return _react2['default'].createElement(
	        'div',
	        { className: (0, _classnames2['default'])(classes, this.props.groupClassName) },
	        this.props.children
	      );
	    }
	  }]);

	  return FormGroup;
	})(_react2['default'].Component);

	FormGroup.defaultProps = {
	  standalone: false
	};

	FormGroup.propTypes = {
	  standalone: _react2['default'].PropTypes.bool,
	  hasFeedback: _react2['default'].PropTypes.bool,
	  bsSize: function bsSize(props) {
	    if (props.standalone && props.bsSize !== undefined) {
	      return new Error('bsSize will not be used when `standalone` is set.');
	    }

	    return _react2['default'].PropTypes.oneOf(['small', 'medium', 'large']).apply(null, arguments);
	  },
	  bsStyle: _react2['default'].PropTypes.oneOf(['success', 'warning', 'error']),
	  groupClassName: _react2['default'].PropTypes.string
	};

	exports['default'] = FormGroup;
	module.exports = exports['default'];

/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _classnames = __webpack_require__(124);

	var _classnames2 = _interopRequireDefault(_classnames);

	var _FormGroup = __webpack_require__(117);

	var _FormGroup2 = _interopRequireDefault(_FormGroup);

	var InputBase = (function (_React$Component) {
	  function InputBase() {
	    _classCallCheck(this, InputBase);

	    if (_React$Component != null) {
	      _React$Component.apply(this, arguments);
	    }
	  }

	  _inherits(InputBase, _React$Component);

	  _createClass(InputBase, [{
	    key: 'getInputDOMNode',
	    value: function getInputDOMNode() {
	      return _react2['default'].findDOMNode(this.refs.input);
	    }
	  }, {
	    key: 'getValue',
	    value: function getValue() {
	      if (this.props.type === 'static') {
	        return this.props.value;
	      } else if (this.props.type) {
	        if (this.props.type === 'select' && this.props.multiple) {
	          return this.getSelectedOptions();
	        } else {
	          return this.getInputDOMNode().value;
	        }
	      } else {
	        throw 'Cannot use getValue without specifying input type.';
	      }
	    }
	  }, {
	    key: 'getChecked',
	    value: function getChecked() {
	      return this.getInputDOMNode().checked;
	    }
	  }, {
	    key: 'getSelectedOptions',
	    value: function getSelectedOptions() {
	      var values = [];

	      Array.prototype.forEach.call(this.getInputDOMNode().getElementsByTagName('option'), function (option) {
	        if (option.selected) {
	          var value = option.getAttribute('value') || option.innerHtml;
	          values.push(value);
	        }
	      });

	      return values;
	    }
	  }, {
	    key: 'isCheckboxOrRadio',
	    value: function isCheckboxOrRadio() {
	      return this.props.type === 'checkbox' || this.props.type === 'radio';
	    }
	  }, {
	    key: 'isFile',
	    value: function isFile() {
	      return this.props.type === 'file';
	    }
	  }, {
	    key: 'renderInputGroup',
	    value: function renderInputGroup(children) {
	      var addonBefore = this.props.addonBefore ? _react2['default'].createElement(
	        'span',
	        { className: 'input-group-addon', key: 'addonBefore' },
	        this.props.addonBefore
	      ) : null;

	      var addonAfter = this.props.addonAfter ? _react2['default'].createElement(
	        'span',
	        { className: 'input-group-addon', key: 'addonAfter' },
	        this.props.addonAfter
	      ) : null;

	      var buttonBefore = this.props.buttonBefore ? _react2['default'].createElement(
	        'span',
	        { className: 'input-group-btn' },
	        this.props.buttonBefore
	      ) : null;

	      var buttonAfter = this.props.buttonAfter ? _react2['default'].createElement(
	        'span',
	        { className: 'input-group-btn' },
	        this.props.buttonAfter
	      ) : null;

	      var inputGroupClassName = undefined;
	      switch (this.props.bsSize) {
	        case 'small':
	          inputGroupClassName = 'input-group-sm';break;
	        case 'large':
	          inputGroupClassName = 'input-group-lg';break;
	      }

	      return addonBefore || addonAfter || buttonBefore || buttonAfter ? _react2['default'].createElement(
	        'div',
	        { className: (0, _classnames2['default'])(inputGroupClassName, 'input-group'), key: 'input-group' },
	        addonBefore,
	        buttonBefore,
	        children,
	        addonAfter,
	        buttonAfter
	      ) : children;
	    }
	  }, {
	    key: 'renderIcon',
	    value: function renderIcon() {
	      var classes = {
	        'glyphicon': true,
	        'form-control-feedback': true,
	        'glyphicon-ok': this.props.bsStyle === 'success',
	        'glyphicon-warning-sign': this.props.bsStyle === 'warning',
	        'glyphicon-remove': this.props.bsStyle === 'error'
	      };

	      return this.props.hasFeedback ? _react2['default'].createElement('span', { className: (0, _classnames2['default'])(classes), key: 'icon' }) : null;
	    }
	  }, {
	    key: 'renderHelp',
	    value: function renderHelp() {
	      return this.props.help ? _react2['default'].createElement(
	        'span',
	        { className: 'help-block', key: 'help' },
	        this.props.help
	      ) : null;
	    }
	  }, {
	    key: 'renderCheckboxAndRadioWrapper',
	    value: function renderCheckboxAndRadioWrapper(children) {
	      var classes = {
	        'checkbox': this.props.type === 'checkbox',
	        'radio': this.props.type === 'radio'
	      };

	      return _react2['default'].createElement(
	        'div',
	        { className: (0, _classnames2['default'])(classes), key: 'checkboxRadioWrapper' },
	        children
	      );
	    }
	  }, {
	    key: 'renderWrapper',
	    value: function renderWrapper(children) {
	      return this.props.wrapperClassName ? _react2['default'].createElement(
	        'div',
	        { className: this.props.wrapperClassName, key: 'wrapper' },
	        children
	      ) : children;
	    }
	  }, {
	    key: 'renderLabel',
	    value: function renderLabel(children) {
	      var classes = {
	        'control-label': !this.isCheckboxOrRadio()
	      };
	      classes[this.props.labelClassName] = this.props.labelClassName;

	      return this.props.label ? _react2['default'].createElement(
	        'label',
	        { htmlFor: this.props.id, className: (0, _classnames2['default'])(classes), key: 'label' },
	        children,
	        this.props.label
	      ) : children;
	    }
	  }, {
	    key: 'renderInput',
	    value: function renderInput() {
	      if (!this.props.type) {
	        return this.props.children;
	      }

	      switch (this.props.type) {
	        case 'select':
	          return _react2['default'].createElement(
	            'select',
	            _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'form-control'), ref: 'input', key: 'input' }),
	            this.props.children
	          );
	        case 'textarea':
	          return _react2['default'].createElement('textarea', _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'form-control'), ref: 'input', key: 'input' }));
	        case 'static':
	          return _react2['default'].createElement(
	            'p',
	            _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, 'form-control-static'), ref: 'input', key: 'input' }),
	            this.props.value
	          );
	      }

	      var className = this.isCheckboxOrRadio() || this.isFile() ? '' : 'form-control';
	      return _react2['default'].createElement('input', _extends({}, this.props, { className: (0, _classnames2['default'])(this.props.className, className), ref: 'input', key: 'input' }));
	    }
	  }, {
	    key: 'renderFormGroup',
	    value: function renderFormGroup(children) {
	      return _react2['default'].createElement(
	        _FormGroup2['default'],
	        this.props,
	        children
	      );
	    }
	  }, {
	    key: 'renderChildren',
	    value: function renderChildren() {
	      return !this.isCheckboxOrRadio() ? [this.renderLabel(), this.renderWrapper([this.renderInputGroup(this.renderInput()), this.renderIcon(), this.renderHelp()])] : this.renderWrapper([this.renderCheckboxAndRadioWrapper(this.renderLabel(this.renderInput())), this.renderHelp()]);
	    }
	  }, {
	    key: 'render',
	    value: function render() {
	      var children = this.renderChildren();
	      return this.renderFormGroup(children);
	    }
	  }]);

	  return InputBase;
	})(_react2['default'].Component);

	InputBase.propTypes = {
	  type: _react2['default'].PropTypes.string,
	  label: _react2['default'].PropTypes.node,
	  help: _react2['default'].PropTypes.node,
	  addonBefore: _react2['default'].PropTypes.node,
	  addonAfter: _react2['default'].PropTypes.node,
	  buttonBefore: _react2['default'].PropTypes.node,
	  buttonAfter: _react2['default'].PropTypes.node,
	  bsSize: _react2['default'].PropTypes.oneOf(['small', 'medium', 'large']),
	  bsStyle: _react2['default'].PropTypes.oneOf(['success', 'warning', 'error']),
	  hasFeedback: _react2['default'].PropTypes.bool,
	  id: _react2['default'].PropTypes.string,
	  groupClassName: _react2['default'].PropTypes.string,
	  wrapperClassName: _react2['default'].PropTypes.string,
	  labelClassName: _react2['default'].PropTypes.string,
	  multiple: _react2['default'].PropTypes.bool,
	  disabled: _react2['default'].PropTypes.bool,
	  value: _react2['default'].PropTypes.any
	};

	exports['default'] = InputBase;
	module.exports = exports['default'];

/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2014, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This file contains a modified version of:
	 * https://github.com/facebook/react/blob/v0.12.0/src/addons/transitions/ReactTransitionEvents.js
	 *
	 * This source code is licensed under the BSD-style license found here:
	 * https://github.com/facebook/react/blob/v0.12.0/LICENSE
	 * An additional grant of patent rights can be found here:
	 * https://github.com/facebook/react/blob/v0.12.0/PATENTS
	 */

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	var canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);

	/**
	 * EVENT_NAME_MAP is used to determine which event fired when a
	 * transition/animation ends, based on the style property used to
	 * define that event.
	 */
	var EVENT_NAME_MAP = {
	  transitionend: {
	    'transition': 'transitionend',
	    'WebkitTransition': 'webkitTransitionEnd',
	    'MozTransition': 'mozTransitionEnd',
	    'OTransition': 'oTransitionEnd',
	    'msTransition': 'MSTransitionEnd'
	  },

	  animationend: {
	    'animation': 'animationend',
	    'WebkitAnimation': 'webkitAnimationEnd',
	    'MozAnimation': 'mozAnimationEnd',
	    'OAnimation': 'oAnimationEnd',
	    'msAnimation': 'MSAnimationEnd'
	  }
	};

	var endEvents = [];

	function detectEvents() {
	  var testEl = document.createElement('div');
	  var style = testEl.style;

	  // On some platforms, in particular some releases of Android 4.x,
	  // the un-prefixed "animation" and "transition" properties are defined on the
	  // style object but the events that fire will still be prefixed, so we need
	  // to check if the un-prefixed events are useable, and if not remove them
	  // from the map
	  if (!('AnimationEvent' in window)) {
	    delete EVENT_NAME_MAP.animationend.animation;
	  }

	  if (!('TransitionEvent' in window)) {
	    delete EVENT_NAME_MAP.transitionend.transition;
	  }

	  for (var baseEventName in EVENT_NAME_MAP) {
	    var baseEvents = EVENT_NAME_MAP[baseEventName];
	    for (var styleName in baseEvents) {
	      if (styleName in style) {
	        endEvents.push(baseEvents[styleName]);
	        break;
	      }
	    }
	  }
	}

	if (canUseDOM) {
	  detectEvents();
	}

	// We use the raw {add|remove}EventListener() call because EventListener
	// does not know how to remove event listeners and we really should
	// clean up. Also, these events are not triggered in older browsers
	// so we should be A-OK here.

	function addEventListener(node, eventName, eventListener) {
	  node.addEventListener(eventName, eventListener, false);
	}

	function removeEventListener(node, eventName, eventListener) {
	  node.removeEventListener(eventName, eventListener, false);
	}

	var ReactTransitionEvents = {
	  addEndEventListener: function addEndEventListener(node, eventListener) {
	    if (endEvents.length === 0) {
	      // If CSS transitions are not supported, trigger an "end animation"
	      // event immediately.
	      window.setTimeout(eventListener, 0);
	      return;
	    }
	    endEvents.forEach(function (endEvent) {
	      addEventListener(node, endEvent, eventListener);
	    });
	  },

	  removeEndEventListener: function removeEndEventListener(node, eventListener) {
	    if (endEvents.length === 0) {
	      return;
	    }
	    endEvents.forEach(function (endEvent) {
	      removeEventListener(node, endEvent, eventListener);
	    });
	  }
	};

	exports['default'] = ReactTransitionEvents;
	module.exports = exports['default'];

/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	exports['default'] = collapsable;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	var _deprecationWarning = __webpack_require__(115);

	var _deprecationWarning2 = _interopRequireDefault(_deprecationWarning);

	function collapsable(props, propName, componentName) {
	  if (props[propName] !== undefined) {
	    (0, _deprecationWarning2['default'])('' + propName + ' in ' + componentName, 'collapsible', 'https://github.com/react-bootstrap/react-bootstrap/issues/425');
	  }
	  return _react2['default'].PropTypes.bool.call(null, props, propName, componentName);
	}

	module.exports = exports['default'];

/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Safe chained function
	 *
	 * Will only create a new function if needed,
	 * otherwise will pass back existing functions or null.
	 *
	 * @param {function} one
	 * @param {function} two
	 * @returns {function|null}
	 */
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	function createChainedFunction(one, two) {
	  var hasOne = typeof one === 'function';
	  var hasTwo = typeof two === 'function';

	  if (!hasOne && !hasTwo) {
	    return null;
	  }
	  if (!hasOne) {
	    return two;
	  }
	  if (!hasTwo) {
	    return one;
	  }

	  return function chainedFunction() {
	    one.apply(this, arguments);
	    two.apply(this, arguments);
	  };
	}

	exports['default'] = createChainedFunction;
	module.exports = exports['default'];

/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	/**
	 * Creates new trigger class that injects context into overlay.
	 */
	exports['default'] = createContextWrapper;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

	var _react = __webpack_require__(1);

	var _react2 = _interopRequireDefault(_react);

	function createContextWrapper(Trigger, propName) {
	  return function (contextTypes) {
	    var ContextWrapper = (function (_React$Component) {
	      function ContextWrapper() {
	        _classCallCheck(this, ContextWrapper);

	        if (_React$Component != null) {
	          _React$Component.apply(this, arguments);
	        }
	      }

	      _inherits(ContextWrapper, _React$Component);

	      _createClass(ContextWrapper, [{
	        key: 'getChildContext',
	        value: function getChildContext() {
	          return this.props.context;
	        }
	      }, {
	        key: 'render',
	        value: function render() {
	          // Strip injected props from below.
	          var _props = this.props;
	          var wrapped = _props.wrapped;

	          var props = _objectWithoutProperties(_props, ['wrapped']);

	          // eslint-disable-line object-shorthand
	          delete props.context;

	          return _react2['default'].cloneElement(wrapped, props);
	        }
	      }]);

	      return ContextWrapper;
	    })(_react2['default'].Component);

	    ContextWrapper.childContextTypes = contextTypes;

	    var TriggerWithContext = (function () {
	      function TriggerWithContext() {
	        _classCallCheck(this, TriggerWithContext);
	      }

	      _createClass(TriggerWithContext, [{
	        key: 'render',
	        value: function render() {
	          var props = _extends({}, this.props);
	          props[propName] = this.getWrappedOverlay();

	          return _react2['default'].createElement(
	            Trigger,
	            props,
	            this.props.children
	          );
	        }
	      }, {
	        key: 'getWrappedOverlay',
	        value: function getWrappedOverlay() {
	          return _react2['default'].createElement(ContextWrapper, {
	            context: this.context,
	            wrapped: this.props[propName]
	          });
	        }
	      }]);

	      return TriggerWithContext;
	    })();

	    TriggerWithContext.contextTypes = contextTypes;

	    return TriggerWithContext;
	  };
	}

	module.exports = exports['default'];

/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    draining = true;
	    var currentQueue;
	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        var i = -1;
	        while (++i < len) {
	            currentQueue[i]();
	        }
	        len = queue.length;
	    }
	    draining = false;
	}
	process.nextTick = function (fun) {
	    queue.push(fun);
	    if (!draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	  Copyright (c) 2015 Jed Watson.
	  Licensed under the MIT License (MIT), see
	  http://jedwatson.github.io/classnames
	*/

	function classNames () {
		'use strict';

		var classes = '';

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if ('string' === argType || 'number' === argType) {
				classes += ' ' + arg;

			} else if (Array.isArray(arg)) {
				classes += ' ' + classNames.apply(null, arg);

			} else if ('object' === argType) {
				for (var key in arg) {
					if (arg.hasOwnProperty(key) && arg[key]) {
						classes += ' ' + key;
					}
				}
			}
		}

		return classes.substr(1);
	}

	// safely export classNames for node / browserify
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	}

	/* global define */
	// safely export classNames for RequireJS
	if (true) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
			return classNames;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}


/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ExecutionEnvironment
	 */

	/*jslint evil: true */

	"use strict";

	var canUseDOM = !!(
	  typeof window !== 'undefined' &&
	  window.document &&
	  window.document.createElement
	);

	/**
	 * Simple, lightweight module assisting with the detection and context of
	 * Worker. Helps avoid circular dependencies and allows code to reason about
	 * whether or not they are in a Worker, even if they never include the main
	 * `ReactWorker` dependency.
	 */
	var ExecutionEnvironment = {

	  canUseDOM: canUseDOM,

	  canUseWorkers: typeof Worker !== 'undefined',

	  canUseEventListeners:
	    canUseDOM && !!(window.addEventListener || window.attachEvent),

	  canUseViewport: canUseDOM && !!window.screen,

	  isInWorker: !canUseDOM // For now, this is true - might change in the future.

	};

	module.exports = ExecutionEnvironment;


/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTable.react
	 * @typechecks
	 */

	/* jslint bitwise: true */

	var FixedDataTableHelper = __webpack_require__(135);
	var Locale = __webpack_require__(136);
	var React = __webpack_require__(134);
	var ReactComponentWithPureRenderMixin = __webpack_require__(137);
	var ReactWheelHandler = __webpack_require__(138);
	var Scrollbar = __webpack_require__(139);
	var FixedDataTableBufferedRows = __webpack_require__(140);
	var FixedDataTableColumnResizeHandle = __webpack_require__(141);
	var FixedDataTableRow = __webpack_require__(142);
	var FixedDataTableScrollHelper = __webpack_require__(143);
	var FixedDataTableWidthHelper = __webpack_require__(144);

	var cloneWithProps = __webpack_require__(145);
	var cx = __webpack_require__(146);
	var debounceCore = __webpack_require__(147);
	var emptyFunction = __webpack_require__(148);
	var invariant = __webpack_require__(149);
	var shallowEqual = __webpack_require__(150);
	var translateDOMPositionXY = __webpack_require__(151);

	var PropTypes = React.PropTypes;
	var ReactChildren = React.Children;

	var renderToString = FixedDataTableHelper.renderToString;
	var EMPTY_OBJECT = {};
	var COLUMN_SETTING_NAMES = [
	  'bodyFixedColumns',
	  'bodyScrollableColumns',
	  'headFixedColumns',
	  'headScrollableColumns',
	  'footFixedColumns',
	  'footScrollableColumns',
	];

	/**
	 * Data grid component with fixed or scrollable header and columns.
	 *
	 * The layout of the data table is as follow:
	 *
	 * ```
	 * +---------------------------------------------------+
	 * | Fixed Column Group    | Scrollable Column Group   |
	 * | Header                | Header                    |
	 * |                       |                           |
	 * +---------------------------------------------------+
	 * |                       |                           |
	 * | Fixed Header Columns  | Scrollable Header Columns |
	 * |                       |                           |
	 * +-----------------------+---------------------------+
	 * |                       |                           |
	 * | Fixed Body Columns    | Scrollable Body Columns   |
	 * |                       |                           |
	 * +-----------------------+---------------------------+
	 * |                       |                           |
	 * | Fixed Footer Columns  | Scrollable Footer Columns |
	 * |                       |                           |
	 * +-----------------------+---------------------------+
	 * ```
	 *
	 * - Fixed Column Group Header: These are the headers for a group
	 *   of columns if included in the table that do not scroll
	 *   vertically or horizontally.
	 *
	 * - Scrollable Column Group Header:  The header for a group of columns
	 *   that do not move while scrolling vertically, but move horizontally
	 *   with the horizontal scrolling.
	 *
	 * - Fixed Header Columns: The header columns that do not move while scrolling
	 *   vertically or horizontally.
	 *
	 * - Scrollable Header Columns: The header columns that do not move
	 *   while scrolling vertically, but move horizontally with the horizontal
	 *   scrolling.
	 *
	 * - Fixed Body Columns: The body columns that do not move while scrolling
	 *   horizontally, but move vertically with the vertical scrolling.
	 *
	 * - Scrollable Body Columns: The body columns that move while scrolling
	 *   vertically or horizontally.
	 */
	var FixedDataTable = React.createClass({displayName: "FixedDataTable",

	  propTypes: {

	    /**
	     * Pixel width of table. If all rows do not fit,
	     * a horizontal scrollbar will appear.
	     */
	    width: PropTypes.number.isRequired,

	    /**
	     * Pixel height of table. If all rows do not fit,
	     * a vertical scrollbar will appear.
	     *
	     * Either `height` or `maxHeight` must be specified.
	     */
	    height: PropTypes.number,

	    /**
	     * Maximum pixel height of table. If all rows do not fit,
	     * a vertical scrollbar will appear.
	     *
	     * Either `height` or `maxHeight` must be specified.
	     */
	    maxHeight: PropTypes.number,

	    /**
	     * Pixel height of table's owner, This is used to make sure the footer
	     * and scrollbar of the table are visible when current space for table in
	     * view is smaller than final height of table. It allows to avoid resizing
	     * and reflowing table whan it is moving in the view.
	     *
	     * This is used if `ownerHeight < height`.
	     */
	    ownerHeight: PropTypes.number,

	    overflowX: PropTypes.oneOf(['hidden', 'auto']),
	    overflowY: PropTypes.oneOf(['hidden', 'auto']),

	    /**
	     * Number of rows in the table.
	     */
	    rowsCount: PropTypes.number.isRequired,

	    /**
	     * Pixel height of rows unless rowHeightGetter is specified and returns
	     * different value.
	     */
	    rowHeight: PropTypes.number.isRequired,

	    /**
	     * If specified, `rowHeightGetter(index)` is called for each row and the
	     * returned value overrides rowHeight for particular row.
	     */
	    rowHeightGetter: PropTypes.func,

	    /**
	     * To get rows to display in table, `rowGetter(index)`
	     * is called. rowGetter should be smart enough to handle async
	     * fetching of data and returning temporary objects
	     * while data is being fetched.
	     */
	    rowGetter: PropTypes.func.isRequired,

	    /**
	     * To get any additional css classes that should be added to a row,
	     * `rowClassNameGetter(index)` is called.
	     */
	    rowClassNameGetter: PropTypes.func,

	    /**
	     * Pixel height of the column group header.
	     */
	    groupHeaderHeight: PropTypes.number,

	    /**
	     * Pixel height of header.
	     */
	    headerHeight: PropTypes.number.isRequired,

	    /**
	     * Function that is called to get the data for the header row.
	     */
	    headerDataGetter: PropTypes.func,

	    /**
	     * Pixel height of footer.
	     */
	    footerHeight: PropTypes.number,

	    /**
	     * Data that will be passed to footer cell renderers.
	     */
	    footerData: PropTypes.oneOfType([
	      PropTypes.object,
	      PropTypes.array,
	    ]),

	    /**
	     * Value of horizontal scroll.
	     */
	    scrollLeft: PropTypes.number,

	    /**
	     * Index of column to scroll to.
	     */
	    scrollToColumn: PropTypes.number,

	    /**
	     * Value of vertical scroll.
	     */
	    scrollTop: PropTypes.number,

	    /**
	     * Index of row to scroll to.
	     */
	    scrollToRow: PropTypes.number,

	    /**
	     * Callback that is called when scrolling ends or stops with new horizontal
	     * and vertical scroll values.
	     */
	    onScrollEnd: PropTypes.func,

	    /**
	     * Callback that is called when `rowHeightGetter` returns a different height
	     * for a row than the `rowHeight` prop. This is necessary because initially
	     * table estimates heights of some parts of the content.
	     */
	    onContentHeightChange: PropTypes.func,

	    /**
	     * Callback that is called when a row is clicked.
	     */
	    onRowClick: PropTypes.func,

	    /**
	     * Callback that is called when mouse down event happens above a row.
	     */
	    onRowMouseDown: PropTypes.func,

	    /**
	     * Callback that is called when the mouse enters a row.
	     */
	    onRowMouseEnter: PropTypes.func,

	    /**
	     * Callback that is called when resizer has been released
	     * and column needs to be updated.
	     */
	    onColumnResizeEndCallback: PropTypes.func,

	    /**
	     * Whether a column is currently being resized.
	     */
	    isColumnResizing: PropTypes.bool,
	  },

	  getDefaultProps:function() /*object*/ {
	    return {
	      footerHeight: 0,
	      groupHeaderHeight: 0,
	      headerHeight: 0,
	      scrollLeft: 0,
	      scrollTop: 0,
	    };
	  },

	  getInitialState:function() /*object*/ {
	    var props = this.props;
	    var viewportHeight = props.height -
	      props.headerHeight -
	      props.footerHeight -
	      props.groupHeaderHeight;
	    this._scrollHelper = new FixedDataTableScrollHelper(
	      props.rowsCount,
	      props.rowHeight,
	      viewportHeight,
	      props.rowHeightGetter
	    );
	    if (props.scrollTop) {
	      this._scrollHelper.scrollTo(props.scrollTop);
	    }
	    this._didScrollStop = debounceCore(this._didScrollStop, 160, this);

	    return this._calculateState(this.props);
	  },

	  componentWillMount:function() {
	    var scrollToRow = this.props.scrollToRow;
	    if (scrollToRow !== undefined && scrollToRow !== null) {
	      this._rowToScrollTo = scrollToRow;
	    }
	    var scrollToColumn = this.props.scrollToColumn;
	    if (scrollToColumn !== undefined && scrollToColumn !== null) {
	      this._columnToScrollTo = scrollToColumn;
	    }
	    this._wheelHandler = new ReactWheelHandler(
	      this._onWheel,
	      this.props.overflowX !== 'hidden', // Should handle horizontal scroll
	      this.props.overflowY !== 'hidden' // Should handle vertical scroll
	    );
	  },

	  _reportContentHeight:function() {
	    var scrollContentHeight = this.state.scrollContentHeight;
	    var reservedHeight = this.state.reservedHeight;
	    var requiredHeight = scrollContentHeight + reservedHeight;
	    var contentHeight;
	    if (this.state.height > requiredHeight && this.props.ownerHeight) {
	      contentHeight = Math.max(requiredHeight, this.props.ownerHeight);
	    } else {
	      var maxScrollY = scrollContentHeight - this.state.bodyHeight;
	      contentHeight = this.props.height + maxScrollY;
	    }
	    if (contentHeight !== this._contentHeight &&
	        this.props.onContentHeightChange) {
	      this.props.onContentHeightChange(contentHeight);
	    }
	    this._contentHeight = contentHeight;
	  },

	  componentDidMount:function() {
	    this._reportContentHeight();
	  },

	  componentWillReceiveProps:function(/*object*/ nextProps) {
	    var scrollToRow = nextProps.scrollToRow;
	    if (scrollToRow !== undefined && scrollToRow !== null) {
	      this._rowToScrollTo = scrollToRow;
	    }
	    var scrollToColumn = nextProps.scrollToColumn;
	    if (scrollToColumn !== undefined && scrollToColumn !== null) {
	      this._columnToScrollTo = scrollToColumn;
	    }

	    var newOverflowX = nextProps.overflowX;
	    var newOverflowY = nextProps.overflowY;
	    if (newOverflowX !== this.props.overflowX ||
	        newOverflowY !== this.props.overflowY) {
	      this._wheelHandler = new ReactWheelHandler(
	        this._onWheel,
	        newOverflowX !== 'hidden', // Should handle horizontal scroll
	        newOverflowY !== 'hidden' // Should handle vertical scroll
	      );
	    }

	    this.setState(this._calculateState(nextProps, this.state));
	  },

	  componentDidUpdate:function() {
	    this._reportContentHeight();
	  },

	  render:function() /*object*/ {
	    var state = this.state;
	    var props = this.props;

	    var groupHeader;
	    if (state.useGroupHeader) {
	      groupHeader = (
	        React.createElement(FixedDataTableRow, {
	          key: "group_header", 
	          className: cx('public/fixedDataTable/header'), 
	          data: state.groupHeaderData, 
	          width: state.width, 
	          height: state.groupHeaderHeight, 
	          index: 0, 
	          zIndex: 1, 
	          offsetTop: 0, 
	          scrollLeft: state.scrollX, 
	          fixedColumns: state.groupHeaderFixedColumns, 
	          scrollableColumns: state.groupHeaderScrollableColumns}
	        )
	      );
	    }

	    var maxScrollY = this.state.scrollContentHeight - this.state.bodyHeight;
	    var showScrollbarX = state.maxScrollX > 0 && state.overflowX !== 'hidden';
	    var showScrollbarY = maxScrollY > 0 && state.overflowY !== 'hidden';
	    var scrollbarXHeight = showScrollbarX ? Scrollbar.SIZE : 0;
	    var scrollbarYHeight = state.height - scrollbarXHeight;

	    var headerOffsetTop = state.useGroupHeader ? state.groupHeaderHeight : 0;
	    var bodyOffsetTop = headerOffsetTop + state.headerHeight;
	    var bottomSectionOffset = 0;
	    var footOffsetTop = bodyOffsetTop + state.bodyHeight;
	    var rowsContainerHeight = footOffsetTop + state.footerHeight;

	    if (props.ownerHeight !== undefined  && props.ownerHeight < props.height) {
	      bottomSectionOffset = props.ownerHeight - props.height;
	      footOffsetTop = Math.min(
	        footOffsetTop,
	        scrollbarYHeight + bottomSectionOffset - state.footerHeight
	      );
	      scrollbarYHeight = props.ownerHeight - scrollbarXHeight;
	    }

	    var verticalScrollbar;
	    if (showScrollbarY) {
	      verticalScrollbar =
	        React.createElement(Scrollbar, {
	          size: scrollbarYHeight, 
	          contentSize: scrollbarYHeight + maxScrollY, 
	          onScroll: this._onVerticalScroll, 
	          position: state.scrollY}
	        );
	    }

	    var horizontalScrollbar;
	    if (showScrollbarX) {
	      var scrollbarYWidth = showScrollbarY ? Scrollbar.SIZE : 0;
	      var scrollbarXWidth = state.width - scrollbarYWidth;
	      horizontalScrollbar =
	        React.createElement(HorizontalScrollbar, {
	          contentSize: scrollbarXWidth + state.maxScrollX, 
	          offset: bottomSectionOffset, 
	          onScroll: this._onHorizontalScroll, 
	          position: state.scrollX, 
	          size: scrollbarXWidth}
	        );
	    }

	    var dragKnob =
	      React.createElement(FixedDataTableColumnResizeHandle, {
	        height: state.height, 
	        initialWidth: state.columnResizingData.width || 0, 
	        minWidth: state.columnResizingData.minWidth || 0, 
	        maxWidth: state.columnResizingData.maxWidth || Number.MAX_VALUE, 
	        visible: !!state.isColumnResizing, 
	        leftOffset: state.columnResizingData.left || 0, 
	        knobHeight: state.headerHeight, 
	        initialEvent: state.columnResizingData.initialEvent, 
	        onColumnResizeEnd: props.onColumnResizeEndCallback, 
	        columnKey: state.columnResizingData.key}
	      );

	    var footer = null;
	    if (state.footerHeight) {
	      footer =
	        React.createElement(FixedDataTableRow, {
	          key: "footer", 
	          className: cx('public/fixedDataTable/footer'), 
	          data: state.footerData, 
	          fixedColumns: state.footFixedColumns, 
	          height: state.footerHeight, 
	          index: -1, 
	          zIndex: 1, 
	          offsetTop: footOffsetTop, 
	          scrollableColumns: state.footScrollableColumns, 
	          scrollLeft: state.scrollX, 
	          width: state.width}
	        );
	    }

	    var rows = this._renderRows(bodyOffsetTop);

	    var header =
	      React.createElement(FixedDataTableRow, {
	        key: "header", 
	        className: cx('public/fixedDataTable/header'), 
	        data: state.headData, 
	        width: state.width, 
	        height: state.headerHeight, 
	        index: -1, 
	        zIndex: 1, 
	        offsetTop: headerOffsetTop, 
	        scrollLeft: state.scrollX, 
	        fixedColumns: state.headFixedColumns, 
	        scrollableColumns: state.headScrollableColumns, 
	        onColumnResize: this._onColumnResize}
	      );

	    var shadow;
	    if (state.scrollY) {
	      shadow =
	        React.createElement("div", {
	          className: cx('fixedDataTable/shadow'), 
	          style: {top: bodyOffsetTop}}
	        );
	    }

	    return (
	      React.createElement("div", {
	        className: cx('public/fixedDataTable/main'), 
	        onWheel: this._wheelHandler.onWheel, 
	        style: {height: state.height, width: state.width}}, 
	        React.createElement("div", {
	          className: cx('fixedDataTable/rowsContainer'), 
	          style: {height: rowsContainerHeight, width: state.width}}, 
	          dragKnob, 
	          groupHeader, 
	          header, 
	          rows, 
	          footer, 
	          shadow
	        ), 
	        verticalScrollbar, 
	        horizontalScrollbar
	      )
	    );
	  },

	  _renderRows:function(/*number*/ offsetTop) /*object*/ {
	    var state = this.state;

	    return (
	      React.createElement(FixedDataTableBufferedRows, {
	        defaultRowHeight: state.rowHeight, 
	        firstRowIndex: state.firstRowIndex, 
	        firstRowOffset: state.firstRowOffset, 
	        fixedColumns: state.bodyFixedColumns, 
	        height: state.bodyHeight, 
	        offsetTop: offsetTop, 
	        onRowClick: state.onRowClick, 
	        onRowMouseDown: state.onRowMouseDown, 
	        onRowMouseEnter: state.onRowMouseEnter, 
	        rowClassNameGetter: state.rowClassNameGetter, 
	        rowsCount: state.rowsCount, 
	        rowGetter: state.rowGetter, 
	        rowHeightGetter: state.rowHeightGetter, 
	        scrollLeft: state.scrollX, 
	        scrollableColumns: state.bodyScrollableColumns, 
	        showLastRowBorder: !state.footerHeight, 
	        width: state.width}
	      )
	    );
	  },

	  /**
	   * This is called when a cell that is in the header of a column has its
	   * resizer knob clicked on. It displays the resizer and puts in the correct
	   * location on the table.
	   */
	  _onColumnResize:function(
	    /*number*/ combinedWidth,
	    /*number*/ leftOffset,
	    /*number*/ cellWidth,
	    /*?number*/ cellMinWidth,
	    /*?number*/ cellMaxWidth,
	    /*number|string*/ columnKey,
	    /*object*/ event) {
	    if (Locale.isRTL()) {
	      leftOffset = -leftOffset;
	    }
	    this.setState({
	      isColumnResizing: true,
	      columnResizingData: {
	        left: leftOffset + combinedWidth - cellWidth,
	        width: cellWidth,
	        minWidth: cellMinWidth,
	        maxWidth: cellMaxWidth,
	        initialEvent: {
	          clientX: event.clientX,
	          clientY: event.clientY,
	          preventDefault: emptyFunction
	        },
	        key: columnKey
	      }
	    });
	  },

	  _populateColumnsAndColumnData:function(
	    /*array*/ columns,
	    /*?array*/ columnGroups
	  ) /*object*/ {
	    var columnInfo = {};
	    var bodyColumnTypes = this._splitColumnTypes(columns);
	    columnInfo.bodyFixedColumns = bodyColumnTypes.fixed;
	    columnInfo.bodyScrollableColumns = bodyColumnTypes.scrollable;

	    columnInfo.headData = this._getHeadData(columns);
	    var headColumnTypes = this._splitColumnTypes(
	      this._createHeadColumns(columns)
	    );
	    columnInfo.headFixedColumns = headColumnTypes.fixed;
	    columnInfo.headScrollableColumns = headColumnTypes.scrollable;

	    var footColumnTypes = this._splitColumnTypes(
	      this._createFootColumns(columns)
	    );
	    columnInfo.footFixedColumns = footColumnTypes.fixed;
	    columnInfo.footScrollableColumns = footColumnTypes.scrollable;

	    if (columnGroups) {
	      columnInfo.groupHeaderData = this._getGroupHeaderData(columnGroups);
	      columnGroups = this._createGroupHeaderColumns(columnGroups);
	      var groupHeaderColumnTypes = this._splitColumnTypes(columnGroups);
	      columnInfo.groupHeaderFixedColumns = groupHeaderColumnTypes.fixed;
	      columnInfo.groupHeaderScrollableColumns =
	        groupHeaderColumnTypes.scrollable;
	    }
	    return columnInfo;
	  },

	  _calculateState:function(/*object*/ props, /*?object*/ oldState) /*object*/ {
	    invariant(
	      props.height !== undefined || props.maxHeight !== undefined,
	      'You must set either a height or a maxHeight'
	    );

	    var firstRowIndex = (oldState && oldState.firstRowIndex) || 0;
	    var firstRowOffset = (oldState && oldState.firstRowOffset) || 0;
	    var scrollX, scrollY;
	    if (oldState && props.overflowX !== 'hidden') {
	      scrollX = oldState.scrollX;
	    } else {
	      scrollX = props.scrollLeft;
	    }
	    if (oldState && props.overflowY !== 'hidden') {
	      scrollY = oldState.scrollY;
	    } else {
	      scrollState = this._scrollHelper.scrollTo(props.scrollTop);
	      firstRowIndex = scrollState.index;
	      firstRowOffset = scrollState.offset;
	      scrollY = scrollState.position;
	    }

	    if (this._rowToScrollTo !== undefined) {
	      scrollState =
	        this._scrollHelper.scrollRowIntoView(this._rowToScrollTo);
	      firstRowIndex = scrollState.index;
	      firstRowOffset = scrollState.offset;
	      scrollY = scrollState.position;
	      delete this._rowToScrollTo;
	    }

	    if (oldState && props.rowsCount !== oldState.rowsCount) {
	      // Number of rows changed, try to scroll to the row from before the
	      // change
	      var viewportHeight = props.height -
	        props.headerHeight -
	        props.footerHeight -
	        props.groupHeaderHeight;
	      this._scrollHelper = new FixedDataTableScrollHelper(
	        props.rowsCount,
	        props.rowHeight,
	        viewportHeight,
	        props.rowHeightGetter
	      );
	      var scrollState =
	        this._scrollHelper.scrollToRow(firstRowIndex, firstRowOffset);
	      firstRowIndex = scrollState.index;
	      firstRowOffset = scrollState.offset;
	      scrollY = scrollState.position;
	    } else if (oldState && props.rowHeightGetter !== oldState.rowHeightGetter) {
	      this._scrollHelper.setRowHeightGetter(props.rowHeightGetter);
	    }

	    var columnResizingData;
	    if (props.isColumnResizing) {
	      columnResizingData = oldState && oldState.columnResizingData;
	    } else {
	      columnResizingData = EMPTY_OBJECT;
	    }

	    var children = [];

	    ReactChildren.forEach(props.children, function(child, index)  {
	      if (child == null) {
	        return;
	      }
	      invariant(
	        child.type.__TableColumnGroup__ ||
	        child.type.__TableColumn__,
	        'child type should be <FixedDataTableColumn /> or ' +
	        '<FixedDataTableColumnGroup />'
	      );
	      children.push(child);
	    });

	    var useGroupHeader = false;
	    if (children.length && children[0].type.__TableColumnGroup__) {
	      useGroupHeader = true;
	    }

	    var columns;
	    var columnGroups;

	    if (useGroupHeader) {
	      var columnGroupSettings =
	        FixedDataTableWidthHelper.adjustColumnGroupWidths(
	          children,
	          props.width
	      );
	      columns = columnGroupSettings.columns;
	      columnGroups = columnGroupSettings.columnGroups;
	    } else {
	      columns = FixedDataTableWidthHelper.adjustColumnWidths(
	        children,
	        props.width
	      );
	    }

	    var columnInfo = this._populateColumnsAndColumnData(
	      columns,
	      columnGroups
	    );

	    if (oldState) {
	      columnInfo = this._tryReusingColumnSettings(columnInfo, oldState);
	    }

	    if (this._columnToScrollTo !== undefined) {
	      // If selected column is a fixed column, don't scroll
	      var fixedColumnsCount = columnInfo.bodyFixedColumns.length;
	      if (this._columnToScrollTo >= fixedColumnsCount) {
	        var totalFixedColumnsWidth = 0;
	        var i, column;
	        for (i = 0; i < columnInfo.bodyFixedColumns.length; ++i) {
	          column = columnInfo.bodyFixedColumns[i];
	          totalFixedColumnsWidth += column.props.width;
	        }

	        var scrollableColumnIndex = this._columnToScrollTo - fixedColumnsCount;
	        var previousColumnsWidth = 0;
	        for (i = 0; i < scrollableColumnIndex; ++i) {
	          column = columnInfo.bodyScrollableColumns[i];
	          previousColumnsWidth += column.props.width;
	        }

	        var availableScrollWidth = props.width - totalFixedColumnsWidth;
	        var selectedColumnWidth = columnInfo.bodyScrollableColumns[
	          this._columnToScrollTo - fixedColumnsCount
	        ].props.width;
	        var minAcceptableScrollPosition =
	          previousColumnsWidth + selectedColumnWidth - availableScrollWidth;

	        if (scrollX < minAcceptableScrollPosition) {
	          scrollX = minAcceptableScrollPosition;
	        }

	        if (scrollX > previousColumnsWidth) {
	          scrollX = previousColumnsWidth;
	        }
	      }
	      delete this._columnToScrollTo;
	    }

	    var useMaxHeight = props.height === undefined;
	    var height = useMaxHeight ? props.maxHeight : props.height;
	    var totalHeightReserved = props.footerHeight + props.headerHeight +
	      props.groupHeaderHeight;
	    var bodyHeight = height - totalHeightReserved;
	    var scrollContentHeight = this._scrollHelper.getContentHeight();
	    var totalHeightNeeded = scrollContentHeight + totalHeightReserved;
	    var scrollContentWidth =
	      FixedDataTableWidthHelper.getTotalWidth(columns);

	    var horizontalScrollbarVisible = scrollContentWidth > props.width &&
	      props.overflowX !== 'hidden';

	    if (horizontalScrollbarVisible) {
	      bodyHeight -= Scrollbar.SIZE;
	      totalHeightNeeded += Scrollbar.SIZE;
	      totalHeightReserved += Scrollbar.SIZE;
	    }

	    var maxScrollX = Math.max(0, scrollContentWidth - props.width);
	    var maxScrollY = Math.max(0, scrollContentHeight - bodyHeight);
	    scrollX = Math.min(scrollX, maxScrollX);
	    scrollY = Math.min(scrollY, maxScrollY);

	    if (!maxScrollY) {
	      // no vertical scrollbar necessary, use the totals we tracked so we
	      // can shrink-to-fit vertically
	      if (useMaxHeight) {
	        height = totalHeightNeeded;
	      }
	      bodyHeight = totalHeightNeeded - totalHeightReserved;
	    }

	    this._scrollHelper.setViewportHeight(bodyHeight);

	    // The order of elements in this object metters and bringing bodyHeight,
	    // height or useGroupHeader to the top can break various features
	    var newState = Object.assign({
	      isColumnResizing: oldState && oldState.isColumnResizing},
	      // isColumnResizing should be overwritten by value from props if
	      // avaialble

	      columnInfo,
	      props,

	      {columnResizingData:columnResizingData,
	      firstRowIndex:firstRowIndex,
	      firstRowOffset:firstRowOffset,
	      horizontalScrollbarVisible:horizontalScrollbarVisible,
	      maxScrollX:maxScrollX,
	      reservedHeight: totalHeightReserved,
	      scrollContentHeight:scrollContentHeight,
	      scrollX:scrollX,
	      scrollY:scrollY,

	      // These properties may overwrite properties defined in
	      // columnInfo and props
	      bodyHeight:bodyHeight,
	      height:height,
	      useGroupHeader:useGroupHeader
	    });

	    // Both `headData` and `groupHeaderData` are generated by
	    // `FixedDataTable` will be passed to each header cell to render.
	    // In order to prevent over-rendering the cells, we do not pass the
	    // new `headData` or `groupHeaderData`
	    // if they haven't changed.
	    if (oldState) {
	      if (shallowEqual(oldState.headData, newState.headData)) {
	        newState.headData = oldState.headData;
	      }
	      if (shallowEqual(oldState.groupHeaderData, newState.groupHeaderData)) {
	        newState.groupHeaderData = oldState.groupHeaderData;
	      }
	    }

	    return newState;
	  },

	  _tryReusingColumnSettings:function(
	    /*object*/ columnInfo,
	    /*object*/ oldState
	  ) /*object*/ {
	    COLUMN_SETTING_NAMES.forEach(function(settingName)  {
	      if (columnInfo[settingName].length === oldState[settingName].length) {
	        var canReuse = true;
	        for (var index = 0; index < columnInfo[settingName].length; ++index) {
	          if (!shallowEqual(
	              columnInfo[settingName][index].props,
	              oldState[settingName][index].props
	          )) {
	            canReuse = false;
	            break;
	          }
	        }
	        if (canReuse) {
	          columnInfo[settingName] = oldState[settingName];
	        }
	      }
	    });
	    return columnInfo;
	  },

	  _createGroupHeaderColumns:function(/*array*/ columnGroups) /*array*/  {
	    var newColumnGroups = [];
	    for (var i = 0; i < columnGroups.length; ++i) {
	      newColumnGroups[i] = cloneWithProps(
	        columnGroups[i],
	        {
	          dataKey: i,
	          children: undefined,
	          columnData: columnGroups[i].props.columnGroupData,
	          isHeaderCell: true,
	        }
	      );
	    }
	    return newColumnGroups;
	  },

	  _createHeadColumns:function(/*array*/ columns) /*array*/ {
	    var headColumns = [];
	    for (var i = 0; i < columns.length; ++i) {
	      var columnProps = columns[i].props;
	      headColumns.push(cloneWithProps(
	        columns[i],
	        {
	          cellRenderer: columnProps.headerRenderer || renderToString,
	          columnData: columnProps.columnData,
	          dataKey: columnProps.dataKey,
	          isHeaderCell: true,
	          label: columnProps.label,
	        }
	      ));
	    }
	    return headColumns;
	  },

	  _createFootColumns:function(/*array*/ columns) /*array*/ {
	    var footColumns = [];
	    for (var i = 0; i < columns.length; ++i) {
	      var columnProps = columns[i].props;
	      footColumns.push(cloneWithProps(
	        columns[i],
	        {
	          cellRenderer: columnProps.footerRenderer || renderToString,
	          columnData: columnProps.columnData,
	          dataKey: columnProps.dataKey,
	          isFooterCell: true,
	        }
	      ));
	    }
	    return footColumns;
	  },

	  _getHeadData:function(/*array*/ columns) /*object*/ {
	    var headData = {};
	    for (var i = 0; i < columns.length; ++i) {
	      var columnProps = columns[i].props;
	      if (this.props.headerDataGetter) {
	        headData[columnProps.dataKey] =
	          this.props.headerDataGetter(columnProps.dataKey);
	      } else {
	        headData[columnProps.dataKey] = columnProps.label || '';
	      }
	    }
	    return headData;
	  },

	  _getGroupHeaderData:function(/*array*/ columnGroups) /*array*/ {
	    var groupHeaderData = [];
	    for (var i = 0; i < columnGroups.length; ++i) {
	      groupHeaderData[i] = columnGroups[i].props.label || '';
	    }
	    return groupHeaderData;
	  },

	  _splitColumnTypes:function(/*array*/ columns) /*object*/ {
	    var fixedColumns = [];
	    var scrollableColumns = [];
	    for (var i = 0; i < columns.length; ++i) {
	      if (columns[i].props.fixed) {
	        fixedColumns.push(columns[i]);
	      } else {
	        scrollableColumns.push(columns[i]);
	      }
	    }
	    return {
	      fixed: fixedColumns,
	      scrollable: scrollableColumns,
	    };
	  },

	  _onWheel:function(/*number*/ deltaX, /*number*/ deltaY) {
	    if (this.isMounted()) {
	      var x = this.state.scrollX;
	      if (Math.abs(deltaY) > Math.abs(deltaX) &&
	          this.props.overflowY !== 'hidden') {
	        var scrollState = this._scrollHelper.scrollBy(Math.round(deltaY));
	        this.setState({
	          firstRowIndex: scrollState.index,
	          firstRowOffset: scrollState.offset,
	          scrollY: scrollState.position,
	          scrollContentHeight: scrollState.contentHeight,
	        });
	      } else if (deltaX && this.props.overflowX !== 'hidden') {
	        x += deltaX;
	        x = x < 0 ? 0 : x;
	        x = x > this.state.maxScrollX ? this.state.maxScrollX : x;
	        this.setState({
	          scrollX: x,
	        });
	      }

	      this._didScrollStop();
	    }
	  },


	  _onHorizontalScroll:function(/*number*/ scrollPos) {
	    if (this.isMounted() && scrollPos !== this.state.scrollX) {
	      this.setState({
	        scrollX: scrollPos,
	      });
	      this._didScrollStop();
	    }
	  },

	  _onVerticalScroll:function(/*number*/ scrollPos) {
	    if (this.isMounted() && scrollPos !== this.state.scrollY) {
	      var scrollState = this._scrollHelper.scrollTo(Math.round(scrollPos));
	      this.setState({
	        firstRowIndex: scrollState.index,
	        firstRowOffset: scrollState.offset,
	        scrollY: scrollState.position,
	        scrollContentHeight: scrollState.contentHeight,
	      });
	      this._didScrollStop();
	    }
	  },

	  _didScrollStop:function() {
	    if (this.isMounted()) {
	      if (this.props.onScrollEnd) {
	        this.props.onScrollEnd(this.state.scrollX, this.state.scrollY);
	      }
	    }
	  }
	});

	var HorizontalScrollbar = React.createClass({displayName: "HorizontalScrollbar",
	  mixins: [ReactComponentWithPureRenderMixin],
	  propTypes: {
	    contentSize: PropTypes.number.isRequired,
	    offset: PropTypes.number.isRequired,
	    onScroll: PropTypes.func.isRequired,
	    position: PropTypes.number.isRequired,
	    size: PropTypes.number.isRequired,
	  },

	  render:function() /*object*/ {
	    var outerContainerStyle = {
	      height: Scrollbar.SIZE,
	      width: this.props.size,
	    };
	    var innerContainerStyle = {
	      height: Scrollbar.SIZE,
	      position: 'absolute',
	      width: this.props.size,
	    };
	    translateDOMPositionXY(
	      innerContainerStyle,
	      0,
	      this.props.offset
	    );

	    return (
	      React.createElement("div", {
	        className: cx('fixedDataTable/horizontalScrollbar'), 
	        style: outerContainerStyle}, 
	        React.createElement("div", {style: innerContainerStyle}, 
	          React.createElement(Scrollbar, React.__spread({}, 
	            this.props, 
	            {isOpaque: true, 
	            orientation: "horizontal", 
	            offset: undefined})
	          )
	        )
	      )
	    );
	  },
	});

	module.exports = FixedDataTable;


/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableColumn.react
	 * @typechecks
	 */

	var React = __webpack_require__(134);

	var PropTypes = React.PropTypes;

	/**
	 * Component that defines the attributes of table column.
	 */
	var FixedDataTableColumn = React.createClass({displayName: "FixedDataTableColumn",
	  statics: {
	    __TableColumn__: true
	  },

	  propTypes: {
	    /**
	     * The horizontal alignment of the table cell content.
	     */
	    align: PropTypes.oneOf(['left', 'center', 'right']),

	    /**
	     * className for each of this column's data cells.
	     */
	    cellClassName: PropTypes.string,

	    /**
	     * The cell renderer that returns React-renderable content for table cell.
	     * ```
	     * function(
	     *   cellData: any,
	     *   cellDataKey: string,
	     *   rowData: object,
	     *   rowIndex: number,
	     *   columnData: any,
	     *   width: number
	     * ): ?$jsx
	     * ```
	     */
	    cellRenderer: PropTypes.func,

	    /**
	     * The getter `function(string_cellDataKey, object_rowData)` that returns
	     * the cell data for the `cellRenderer`.
	     * If not provided, the cell data will be collected from
	     * `rowData[cellDataKey]` instead. The value that `cellDataGetter` returns
	     * will be used to determine whether the cell should re-render.
	     */
	    cellDataGetter: PropTypes.func,

	    /**
	     * The key to retrieve the cell data from the data row. Provided key type
	     * must be either `string` or `number`. Since we use this
	     * for keys, it must be specified for each column.
	     */
	    dataKey: PropTypes.oneOfType([
	      PropTypes.string,
	      PropTypes.number,
	    ]).isRequired,

	    /**
	     * The cell renderer that returns React-renderable content for table column
	     * header.
	     * ```
	     * function(
	     *   label: ?string,
	     *   cellDataKey: string,
	     *   columnData: any,
	     *   rowData: array<?object>,
	     *   width: number
	     * ): ?$jsx
	     * ```
	     */
	    headerRenderer: PropTypes.func,

	    /**
	     * The cell renderer that returns React-renderable content for table column
	     * footer.
	     * ```
	     * function(
	     *   label: ?string,
	     *   cellDataKey: string,
	     *   columnData: any,
	     *   rowData: array<?object>,
	     *   width: number
	     * ): ?$jsx
	     * ```
	     */
	    footerRenderer: PropTypes.func,

	    /**
	     * Bucket for any data to be passed into column renderer functions.
	     */
	    columnData: PropTypes.object,

	    /**
	     * The column's header label.
	     */
	    label: PropTypes.string,

	    /**
	     * The pixel width of the column.
	     */
	    width: PropTypes.number.isRequired,

	    /**
	     * If this is a resizable column this is its minimum pixel width.
	     */
	    minWidth: PropTypes.number,

	    /**
	     * If this is a resizable column this is its maximum pixel width.
	     */
	    maxWidth: PropTypes.number,

	    /**
	     * The grow factor relative to other columns. Same as the flex-grow API
	     * from http://www.w3.org/TR/css3-flexbox/. Basically, take any available
	     * extra width and distribute it proportionally according to all columns'
	     * flexGrow values. Defaults to zero (no-flexing).
	     */
	    flexGrow: PropTypes.number,

	    /**
	     * Whether the column can be resized with the
	     * FixedDataTableColumnResizeHandle. Please note that if a column
	     * has a flex grow, once you resize the column this will be set to 0.
	     */
	    isResizable: PropTypes.bool,
	  },

	  render:function() {
	    if (process.env.NODE_ENV !== 'production') {
	      throw new Error(
	        'Component <FixedDataTableColumn /> should never render'
	      );
	    }
	    return null;
	  },
	});

	module.exports = FixedDataTableColumn;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableColumnGroup.react
	 * @typechecks
	 */

	var React = __webpack_require__(134);

	var PropTypes = React.PropTypes;

	/**
	 * Component that defines the attributes of a table column group.
	 */
	var FixedDataTableColumnGroup = React.createClass({displayName: "FixedDataTableColumnGroup",
	  statics: {
	    __TableColumnGroup__: true
	  },

	  propTypes: {
	    /**
	     * The horizontal alignment of the table cell content.
	     */
	    align: PropTypes.oneOf(['left', 'center', 'right']),

	    /**
	     * Whether the column group is fixed.
	     */
	    fixed: PropTypes.bool.isRequired,

	    /**
	     * Bucket for any data to be passed into column group renderer functions.
	     */
	    columnGroupData: PropTypes.object,

	    /**
	     * The column group's header label.
	     */
	    label: PropTypes.string,

	    /**
	     * The cell renderer that returns React-renderable content for a table
	     * column group header. If it's not specified, the label from props will
	     * be rendered as header content.
	     * ```
	     * function(
	     *   label: ?string,
	     *   cellDataKey: string,
	     *   columnGroupData: any,
	     *   rowData: array<?object>, // array of labels of all coludmnGroups
	     *   width: number
	     * ): ?$jsx
	     * ```
	     */
	    groupHeaderRenderer: PropTypes.func,
	  },

	  render:function() {
	    if (process.env.NODE_ENV !== 'production') {
	      throw new Error(
	        'Component <FixedDataTableColumnGroup /> should never render'
	      );
	    }
	    return null;
	  },
	});

	module.exports = FixedDataTableColumnGroup;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(152);


/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
	  throw new Error("Don't instantiate Resizable directly! Use require('react-resizable').Resizable");
	};

	module.exports.Resizable = __webpack_require__(153);
	module.exports.ResizableBox = __webpack_require__(154);


/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function ToObject(val) {
		if (val == null) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	module.exports = Object.assign || function (target, source) {
		var from;
		var keys;
		var to = ToObject(target);

		for (var s = 1; s < arguments.length; s++) {
			from = arguments[s];
			keys = Object.keys(Object(from));

			for (var i = 0; i < keys.length; i++) {
				to[keys[i]] = from[keys[i]];
			}
		}

		return to;
	};


/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(155);
	var isArguments = __webpack_require__(156);

	var deepEqual = module.exports = function (actual, expected, opts) {
	  if (!opts) opts = {};
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;

	  } else if (actual instanceof Date && expected instanceof Date) {
	    return actual.getTime() === expected.getTime();

	  // 7.3. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (typeof actual != 'object' && typeof expected != 'object') {
	    return opts.strict ? actual === expected : actual == expected;

	  // 7.4. For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected, opts);
	  }
	}

	function isUndefinedOrNull(value) {
	  return value === null || value === undefined;
	}

	function isBuffer (x) {
	  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
	  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
	    return false;
	  }
	  if (x.length > 0 && typeof x[0] !== 'number') return false;
	  return true;
	}

	function objEquiv(a, b, opts) {
	  var i, key;
	  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (isArguments(a)) {
	    if (!isArguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return deepEqual(a, b, opts);
	  }
	  if (isBuffer(a)) {
	    if (!isBuffer(b)) {
	      return false;
	    }
	    if (a.length !== b.length) return false;
	    for (i = 0; i < a.length; i++) {
	      if (a[i] !== b[i]) return false;
	    }
	    return true;
	  }
	  try {
	    var ka = objectKeys(a),
	        kb = objectKeys(b);
	  } catch (e) {//happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!deepEqual(a[key], b[key], opts)) return false;
	  }
	  return typeof a === typeof b;
	}


/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @typechecks static-only
	 * @providesModule cloneWithProps
	 */

	'use strict';

	var ReactElement = __webpack_require__(157);
	var ReactPropTransferer = __webpack_require__(158);

	var keyOf = __webpack_require__(159);
	var warning = __webpack_require__(160);

	var CHILDREN_PROP = keyOf({children: null});

	/**
	 * Sometimes you want to change the props of a child passed to you. Usually
	 * this is to add a CSS class.
	 *
	 * @param {ReactElement} child child element you'd like to clone
	 * @param {object} props props you'd like to modify. className and style will be
	 * merged automatically.
	 * @return {ReactElement} a clone of child with props merged in.
	 */
	function cloneWithProps(child, props) {
	  if ("production" !== process.env.NODE_ENV) {
	    ("production" !== process.env.NODE_ENV ? warning(
	      !child.ref,
	      'You are calling cloneWithProps() on a child with a ref. This is ' +
	      'dangerous because you\'re creating a new child which will not be ' +
	      'added as a ref to its parent.'
	    ) : null);
	  }

	  var newProps = ReactPropTransferer.mergeProps(props, child.props);

	  // Use `child.props.children` if it is provided.
	  if (!newProps.hasOwnProperty(CHILDREN_PROP) &&
	      child.props.hasOwnProperty(CHILDREN_PROP)) {
	    newProps.children = child.props.children;
	  }

	  // The current API doesn't retain _owner and _context, which is why this
	  // doesn't use ReactElement.cloneAndReplaceProps.
	  return ReactElement.createElement(child.type, newProps);
	}

	module.exports = cloneWithProps;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule React
	 */

	module.exports = __webpack_require__(1);


/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableHelper
	 * @typechecks
	 */

	"use strict";

	var Locale = __webpack_require__(136);
	var React = __webpack_require__(134);
	var FixedDataTableColumnGroup = __webpack_require__(128);
	var FixedDataTableColumn = __webpack_require__(127);

	var cloneWithProps = __webpack_require__(145);

	var DIR_SIGN = (Locale.isRTL() ? -1 : +1);
	// A cell up to 5px outside of the visible area will still be considered visible
	var CELL_VISIBILITY_TOLERANCE = 5; // used for flyouts

	function renderToString(value) /*string*/ {
	  if (value === null || value === undefined) {
	    return '';
	  } else {
	    return String(value);
	  }
	}

	/**
	 * Helper method to execute a callback against all columns given the children
	 * of a table.
	 * @param {?object|array} children
	 *    Children of a table.
	 * @param {function} callback
	 *    Function to excecute for each column. It is passed the column.
	 */
	function forEachColumn(children, callback) {
	  React.Children.forEach(children, function(child)  {
	    if (child.type === FixedDataTableColumnGroup.type) {
	      forEachColumn(child.props.children, callback);
	    } else if (child.type === FixedDataTableColumn.type) {
	      callback(child);
	    }
	  });
	}

	/**
	 * Helper method to map columns to new columns. This takes into account column
	 * groups and will generate a new column group if its columns change.
	 * @param {?object|array} children
	 *    Children of a table.
	 * @param {function} callback
	 *    Function to excecute for each column. It is passed the column and should
	 *    return a result column.
	 */
	function mapColumns(children, callback) {
	  var newChildren = [];
	  React.Children.forEach(children, function(originalChild)  {
	    var newChild = originalChild;

	    // The child is either a column group or a column. If it is a column group
	    // we need to iterate over its columns and then potentially generate a
	    // new column group
	    if (originalChild.type === FixedDataTableColumnGroup.type) {
	      var haveColumnsChanged = false;
	      var newColumns = [];

	      forEachColumn(originalChild.props.children, function(originalcolumn)  {
	        var newColumn = callback(originalcolumn);
	        if (newColumn !== originalcolumn) {
	          haveColumnsChanged = true;
	        }
	        newColumns.push(newColumn);
	      });

	      // If the column groups columns have changed clone the group and supply
	      // new children
	      if (haveColumnsChanged) {
	        newChild = cloneWithProps(originalChild, {children: newColumns});
	      }
	    } else if (originalChild.type === FixedDataTableColumn.type) {
	      newChild = callback(originalChild);
	    }

	    newChildren.push(newChild);
	  });

	  return newChildren;
	}

	var FixedDataTableHelper = {
	  DIR_SIGN:DIR_SIGN,
	  CELL_VISIBILITY_TOLERANCE:CELL_VISIBILITY_TOLERANCE,
	  renderToString:renderToString,
	  forEachColumn:forEachColumn,
	  mapColumns:mapColumns,
	};

	module.exports = FixedDataTableHelper;


/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Locale
	 */

	"use strict";

	// Hard code this for now.
	var Locale = {
	  isRTL: function()  {return false;},
	  getDirection: function()  {return 'LTR';}
	};

	module.exports = Locale;


/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactComponentWithPureRenderMixin
	 */

	module.exports = __webpack_require__(161);


/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactWheelHandler
	 * @typechecks
	 */

	"use strict";

	var normalizeWheel = __webpack_require__(162);
	var requestAnimationFramePolyfill = __webpack_require__(163);


	  /**
	   * onWheel is the callback that will be called with right frame rate if
	   * any wheel events happened
	   * onWheel should is to be called with two arguments: deltaX and deltaY in
	   * this order
	   */
	  function ReactWheelHandler(
	onWheel,
	    /*boolean*/ handleScrollX,
	    /*boolean*/ handleScrollY,
	    /*?boolean*/ stopPropagation)
	   {
	    this.$ReactWheelHandler_animationFrameID = null;
	    this.$ReactWheelHandler_deltaX = 0;
	    this.$ReactWheelHandler_deltaY = 0;
	    this.$ReactWheelHandler_didWheel = this.$ReactWheelHandler_didWheel.bind(this);
	    this.$ReactWheelHandler_handleScrollX = handleScrollX;
	    this.$ReactWheelHandler_handleScrollY = handleScrollY;
	    this.$ReactWheelHandler_stopPropagation = !!stopPropagation;
	    this.$ReactWheelHandler_onWheelCallback = onWheel;
	    this.onWheel = this.onWheel.bind(this);
	  }

	  ReactWheelHandler.prototype.onWheel=function(event) {
	    if (this.$ReactWheelHandler_handleScrollX || this.$ReactWheelHandler_handleScrollY) {
	      event.preventDefault();
	    }
	    var normalizedEvent = normalizeWheel(event);

	    this.$ReactWheelHandler_deltaX += this.$ReactWheelHandler_handleScrollX ? normalizedEvent.pixelX : 0;
	    this.$ReactWheelHandler_deltaY += this.$ReactWheelHandler_handleScrollY ? normalizedEvent.pixelY : 0;

	    var changed;
	    if (this.$ReactWheelHandler_deltaX !== 0 || this.$ReactWheelHandler_deltaY !== 0) {
	      if (this.$ReactWheelHandler_stopPropagation) {
	        event.stopPropagation();
	      }
	      changed = true;
	    }

	    if (changed === true && this.$ReactWheelHandler_animationFrameID === null) {
	      this.$ReactWheelHandler_animationFrameID = requestAnimationFramePolyfill(this.$ReactWheelHandler_didWheel);
	    }
	  };

	  ReactWheelHandler.prototype.$ReactWheelHandler_didWheel=function() {
	    this.$ReactWheelHandler_animationFrameID = null;
	    this.$ReactWheelHandler_onWheelCallback(this.$ReactWheelHandler_deltaX, this.$ReactWheelHandler_deltaY);
	    this.$ReactWheelHandler_deltaX = 0;
	    this.$ReactWheelHandler_deltaY = 0;
	  };


	module.exports = ReactWheelHandler;


/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Scrollbar.react
	 * @typechecks
	 */

	var DOMMouseMoveTracker = __webpack_require__(164);
	var Keys = __webpack_require__(165);
	var React = __webpack_require__(134);
	var ReactComponentWithPureRenderMixin = __webpack_require__(137);
	var ReactWheelHandler = __webpack_require__(138);

	var cssVar = __webpack_require__(166);
	var cx = __webpack_require__(146);
	var emptyFunction = __webpack_require__(148);
	var translateDOMPositionXY = __webpack_require__(151);

	var PropTypes = React.PropTypes;

	var UNSCROLLABLE_STATE = {
	  position: 0,
	  scrollable: false,
	};

	var FACE_MARGIN = parseInt(cssVar('scrollbar-face-margin'), 10);
	var FACE_MARGIN_2 = FACE_MARGIN * 2;
	var FACE_SIZE_MIN = 30;
	var KEYBOARD_SCROLL_AMOUNT = 40;

	var _lastScrolledScrollbar = null;

	var Scrollbar = React.createClass({displayName: "Scrollbar",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {
	    contentSize: PropTypes.number.isRequired,
	    defaultPosition: PropTypes.number,
	    isOpaque: PropTypes.bool,
	    orientation: PropTypes.oneOf(['vertical', 'horizontal']),
	    onScroll: PropTypes.func,
	    position: PropTypes.number,
	    size: PropTypes.number.isRequired,
	    trackColor: PropTypes.oneOf(['gray']),
	    zIndex: PropTypes.number,
	  },

	  getInitialState:function() /*object*/ {
	    var props = this.props;
	    return this._calculateState(
	      props.position || props.defaultPosition || 0,
	      props.size,
	      props.contentSize,
	      props.orientation
	    );
	  },

	  componentWillReceiveProps:function(/*object*/ nextProps) {
	    var controlledPosition = nextProps.position;
	    if (controlledPosition === undefined) {
	      this._setNextState(
	        this._calculateState(
	          this.state.position,
	          nextProps.size,
	          nextProps.contentSize,
	          nextProps.orientation
	        )
	      );
	    } else {
	      this._setNextState(
	        this._calculateState(
	          controlledPosition,
	          nextProps.size,
	          nextProps.contentSize,
	          nextProps.orientation
	        ),
	        nextProps
	      );
	    }
	  },

	  getDefaultProps:function() /*object*/ {
	    return {
	      defaultPosition: 0,
	      isOpaque: false,
	      onScroll: emptyFunction,
	      orientation: 'vertical',
	      zIndex: 99,
	    };
	  },

	  render:function() /*?object*/ {
	    if (!this.state.scrollable) {
	      return null;
	    }

	    var size = this.props.size;
	    var mainStyle;
	    var faceStyle;
	    var isHorizontal = this.state.isHorizontal;
	    var isVertical = !isHorizontal;
	    var isActive = this.state.focused || this.state.isDragging;
	    var faceSize = this.state.faceSize;
	    var isOpaque = this.props.isOpaque;

	    var mainClassName = cx({
	      'public/Scrollbar/main': true,
	      'public/Scrollbar/mainHorizontal': isHorizontal,
	      'public/Scrollbar/mainVertical': isVertical,
	      'Scrollbar/mainActive': isActive,
	      'Scrollbar/mainOpaque': isOpaque,
	    });

	    var faceClassName = cx({
	      'Scrollbar/face': true,
	      'Scrollbar/faceHorizontal': isHorizontal,
	      'Scrollbar/faceVertical': isVertical,
	      'Scrollbar/faceActive': isActive,
	    });

	    var position = this.state.position * this.state.scale + FACE_MARGIN;

	    if (isHorizontal) {
	      mainStyle = {
	        width: size,
	      };
	      faceStyle = {
	        width: faceSize - FACE_MARGIN_2
	      };
	      translateDOMPositionXY(faceStyle, position, 0);
	    } else {
	      mainStyle = {
	        height: size,
	      };
	      faceStyle = {
	        height: faceSize - FACE_MARGIN_2,
	      };
	      translateDOMPositionXY(faceStyle, 0, position);
	    }

	    mainStyle.zIndex = this.props.zIndex;

	    if (this.props.trackColor === 'gray') {
	      mainStyle.backgroundColor = cssVar('ads-cf-bg-color-gray');
	    }

	    return (
	      React.createElement("div", {
	        onFocus: this._onFocus, 
	        onBlur: this._onBlur, 
	        onKeyDown: this._onKeyDown, 
	        onMouseDown: this._onMouseDown, 
	        onWheel: this._wheelHandler.onWheel, 
	        className: mainClassName, 
	        style: mainStyle, 
	        tabIndex: 0}, 
	        React.createElement("div", {
	          ref: "face", 
	          className: faceClassName, 
	          style: faceStyle}
	        )
	      )
	    );
	  },

	  componentWillMount:function() {
	    var isHorizontal = this.props.orientation === 'horizontal';
	    var onWheel = isHorizontal ? this._onWheelX : this._onWheelY;

	    this._wheelHandler = new ReactWheelHandler(
	      onWheel,
	      isHorizontal, // Should hanlde horizontal scroll
	      !isHorizontal // Should handle vertical scroll
	    );
	  },

	  componentDidMount:function() {
	    this._mouseMoveTracker = new DOMMouseMoveTracker(
	      this._onMouseMove,
	      this._onMouseMoveEnd,
	      document.documentElement
	    );

	    if (this.props.position !== undefined &&
	      this.state.position !== this.props.position) {
	      this._didScroll();
	    }
	  },

	  componentWillUnmount:function() {
	    this._nextState = null;
	    this._mouseMoveTracker.releaseMouseMoves();
	    if (_lastScrolledScrollbar === this) {
	      _lastScrolledScrollbar = null;
	    }
	    delete this._mouseMoveTracker;
	  },

	  scrollBy:function(/*number*/ delta) {
	    this._onWheel(delta);
	  },

	  _calculateState:function(
	    /*?number*/ position,
	    /*number*/ size,
	    /*number*/ contentSize,
	    /*string*/ orientation
	    ) /*object*/ {

	    if (size < 1 || contentSize <= size) {
	      return UNSCROLLABLE_STATE;
	    }

	    position = position || 0;

	    // There are two types of positions here.
	    // 1) Phisical position: changed by mouse / keyboard
	    // 2) Logical position: changed by props.
	    // The logical position will be kept as as internal state and the `render()`
	    // function will translate it into physical position to render.

	    var isHorizontal = orientation === 'horizontal';
	    var scale = size / contentSize;
	    var faceSize = Math.round(size * scale);

	    if (faceSize < FACE_SIZE_MIN) {
	      scale = (size - FACE_SIZE_MIN) / (contentSize - FACE_SIZE_MIN);
	      faceSize = FACE_SIZE_MIN;
	    }

	    var scrollable = true;
	    var maxPosition = contentSize - size;

	    if (position < 0) {
	      position = 0;
	    } else if (position > maxPosition) {
	      position = maxPosition;
	    }

	    var isDragging = this._mouseMoveTracker ?
	      this._mouseMoveTracker.isDragging() :
	      false;

	    position = Math.round(position);
	    faceSize = Math.round(faceSize);

	    // This function should only return flat values that can be compared quiclky
	    // by `ReactComponentWithPureRenderMixin`.
	    return {
	      faceSize:faceSize,
	      isDragging:isDragging,
	      isHorizontal:isHorizontal,
	      position:position,
	      scale:scale,
	      scrollable:scrollable,
	    };
	  },

	  _onWheelY:function(/*number*/ deltaX, /*number*/ deltaY) {
	    this._onWheel(deltaY);
	  },

	  _onWheelX:function(/*number*/ deltaX, /*number*/ deltaY) {
	    this._onWheel(deltaX);
	  },

	  _onWheel:function(/*number*/ delta){
	    var props = this.props;

	    // The mouse may move faster then the animation frame does.
	    // Use `requestAnimationFrame` to avoid over-updating.
	    this._setNextState(
	      this._calculateState(
	        this.state.position + delta,
	        props.size,
	        props.contentSize,
	        props.orientation
	      )
	    );
	  },

	  _onMouseDown:function(/*object*/ event) {
	    var nextState;

	    if (event.target !== this.refs.face.getDOMNode()) {
	      // Both `offsetX` and `layerX` are non-standard DOM property but they are
	      // magically available for browsers somehow.
	      var nativeEvent = event.nativeEvent;
	      var position = this.state.isHorizontal ?
	        nativeEvent.offsetX || nativeEvent.layerX :
	        nativeEvent.offsetY || nativeEvent.layerY;

	      // MouseDown on the scroll-track directly, move the center of the
	      // scroll-face to the mouse position.
	      var props = this.props;
	      position = position / this.state.scale;
	      nextState = this._calculateState(
	        position - (this.state.faceSize * 0.5 / this.state.scale),
	        props.size,
	        props.contentSize,
	        props.orientation
	      );
	    } else {
	      nextState = {};
	    }

	    nextState.focused = true;
	    this._setNextState(nextState);

	    this._mouseMoveTracker.captureMouseMoves(event);
	    // Focus the node so it may receive keyboard event.
	    this.getDOMNode().focus();
	  },

	  _onMouseMove:function(/*number*/ deltaX, /*number*/ deltaY) {
	    var props = this.props;
	    var delta = this.state.isHorizontal ? deltaX : deltaY;
	    delta = delta / this.state.scale;

	    this._setNextState(
	      this._calculateState(
	        this.state.position + delta,
	        props.size,
	        props.contentSize,
	        props.orientation
	      )
	    );
	  },

	  _onMouseMoveEnd:function() {
	    this._nextState = null;
	    this._mouseMoveTracker.releaseMouseMoves();
	    this.setState({isDragging: false});
	  },

	  _onKeyDown:function(/*object*/ event) {
	    var keyCode = event.keyCode;

	    if (keyCode === Keys.TAB) {
	      // Let focus move off the scrollbar.
	      return;
	    }

	    var distance = KEYBOARD_SCROLL_AMOUNT;
	    var direction = 0;

	    if (this.state.isHorizontal) {
	      switch (keyCode) {
	        case Keys.HOME:
	          direction = -1;
	          distance = this.props.contentSize;
	          break;

	        case Keys.LEFT:
	          direction = -1;
	          break;

	        case Keys.RIGHT:
	          direction = 1;
	          break;

	        default:
	          return;
	      }
	    }

	    if (!this.state.isHorizontal) {
	      switch (keyCode) {
	        case Keys.SPACE:
	          if (event.shiftKey) {
	            direction = -1;
	          } else {
	            direction = 1;
	          }
	          break;

	        case Keys.HOME:
	          direction = -1;
	          distance = this.props.contentSize;
	          break;

	        case Keys.UP:
	          direction = -1;
	          break;

	        case Keys.DOWN:
	          direction = 1;
	          break;

	        case Keys.PAGE_UP:
	          direction = -1;
	          distance = this.props.size;
	          break;

	        case Keys.PAGE_DOWN:
	          direction = 1;
	          distance = this.props.size;
	          break;

	        default:
	          return;
	      }
	    }

	    event.preventDefault();

	    var props = this.props;
	    this._setNextState(
	      this._calculateState(
	        this.state.position + (distance * direction),
	        props.size,
	        props.contentSize,
	        props.orientation
	      )
	    );
	  },

	  _onFocus:function() {
	    this.setState({
	      focused: true,
	    });
	  },

	  _onBlur:function() {
	    this.setState({
	      focused: false,
	    });
	  },

	  _blur:function() {
	    if (this.isMounted()) {
	      try {
	        this._onBlur();
	        this.getDOMNode().blur();
	      } catch (oops) {
	        // pass
	      }
	    }
	  },

	  _setNextState:function(/*object*/ nextState, /*?object*/ props) {
	    props = props || this.props;
	    var controlledPosition = props.position;
	    var willScroll = this.state.position !== nextState.position;
	    if (controlledPosition === undefined) {
	      var callback = willScroll ? this._didScroll : undefined;
	      this.setState(nextState, callback);
	    } else if (controlledPosition === nextState.position) {
	      this.setState(nextState);
	    } else {
	      // Scrolling is controlled. Don't update the state and let the owner
	      // to update the scrollbar instead.
	      if (nextState.position !== undefined &&
	        nextState.position !== this.state.position) {
	        this.props.onScroll(nextState.position);
	      }
	      return;
	    }

	    if (willScroll && _lastScrolledScrollbar !== this) {
	      _lastScrolledScrollbar && _lastScrolledScrollbar._blur();
	      _lastScrolledScrollbar = this;
	    }
	  },

	  _didScroll:function() {
	    this.props.onScroll(this.state.position);
	  },
	});

	Scrollbar.KEYBOARD_SCROLL_AMOUNT = KEYBOARD_SCROLL_AMOUNT;
	Scrollbar.SIZE = parseInt(cssVar('scrollbar-size'), 10);

	module.exports = Scrollbar;


/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableBufferedRows.react
	 * @typechecks
	 */

	var React = __webpack_require__(134);
	var FixedDataTableRowBuffer = __webpack_require__(169);
	var FixedDataTableRow = __webpack_require__(142);

	var cx = __webpack_require__(146);
	var emptyFunction = __webpack_require__(148);
	var joinClasses = __webpack_require__(170);

	var PropTypes = React.PropTypes;

	var FixedDataTableBufferedRows = React.createClass({displayName: "FixedDataTableBufferedRows",

	  propTypes: {
	    defaultRowHeight: PropTypes.number.isRequired,
	    firstRowIndex: PropTypes.number.isRequired,
	    firstRowOffset: PropTypes.number.isRequired,
	    fixedColumns: PropTypes.array.isRequired,
	    height: PropTypes.number.isRequired,
	    offsetTop: PropTypes.number.isRequired,
	    onRowClick: PropTypes.func,
	    onRowMouseDown: PropTypes.func,
	    onRowMouseEnter: PropTypes.func,
	    rowClassNameGetter: PropTypes.func,
	    rowsCount: PropTypes.number.isRequired,
	    rowGetter: PropTypes.func.isRequired,
	    rowHeightGetter: PropTypes.func,
	    scrollLeft: PropTypes.number.isRequired,
	    scrollableColumns: PropTypes.array.isRequired,
	    showLastRowBorder: PropTypes.bool,
	    width: PropTypes.number.isRequired,
	  },

	  getInitialState:function() /*object*/ {
	    this._rowBuffer =
	      new FixedDataTableRowBuffer(
	        this.props.rowsCount,
	        this.props.defaultRowHeight,
	        this.props.height,
	        this._getRowHeight
	      );
	    return ({
	      rowsToRender: this._rowBuffer.getRows(
	        this.props.firstRowIndex,
	        this.props.firstRowOffset
	      ),
	    });
	  },

	  componentWillMount:function() {
	    this._staticRowArray = [];
	  },

	  componentDidMount:function() {
	    this._bufferUpdateTimer = setTimeout(this._updateBuffer, 500);
	  },

	  componentWillReceiveProps:function(/*object*/ nextProps) {
	    if (nextProps.rowsCount !== this.props.rowsCount ||
	        nextProps.defaultRowHeight !== this.props.defaultRowHeight ||
	        nextProps.height !== this.props.height) {
	      this._rowBuffer =
	        new FixedDataTableRowBuffer(
	          nextProps.rowsCount,
	          nextProps.defaultRowHeight,
	          nextProps.height,
	          this._getRowHeight
	        );
	    }
	    this.setState({
	      rowsToRender: this._rowBuffer.getRows(
	        nextProps.firstRowIndex,
	        nextProps.firstRowOffset
	      ),
	    });
	    if (this._bufferUpdateTimer) {
	      clearTimeout(this._bufferUpdateTimer);
	    }
	    this._bufferUpdateTimer = setTimeout(this._updateBuffer, 400);
	  },

	  _updateBuffer:function() {
	    this._bufferUpdateTimer = null;
	    if (this.isMounted()) {
	      this.setState({
	        rowsToRender: this._rowBuffer.getRowsWithUpdatedBuffer(),
	      });
	    }
	  },

	  shouldComponentUpdate:function() /*boolean*/ {
	    // Don't add PureRenderMixin to this component please.
	    return true;
	  },

	  componentWillUnmount:function() {
	    this._staticRowArray.length = 0;
	  },

	  render:function() /*object*/ {
	    var props = this.props;
	    var offsetTop = props.offsetTop;
	    var rowClassNameGetter = props.rowClassNameGetter || emptyFunction;
	    var rowGetter = props.rowGetter;

	    var rowsToRender = this.state.rowsToRender;
	    this._staticRowArray.length = rowsToRender.length;

	    for (var i = 0; i < rowsToRender.length; ++i) {
	      var rowInfo = rowsToRender[i];
	      var rowIndex = rowInfo.rowIndex;
	      var rowOffsetTop = rowInfo.offsetTop;
	      var currentRowHeight = this._getRowHeight(rowIndex);

	      var hasBottomBorder =
	        rowIndex === props.rowsCount - 1 && props.showLastRowBorder;

	      this._staticRowArray[i] =
	        React.createElement(FixedDataTableRow, {
	          key: i, 
	          index: rowIndex, 
	          data: rowGetter(rowIndex), 
	          width: props.width, 
	          height: currentRowHeight, 
	          scrollLeft: Math.round(props.scrollLeft), 
	          offsetTop: Math.round(offsetTop + rowOffsetTop), 
	          fixedColumns: props.fixedColumns, 
	          scrollableColumns: props.scrollableColumns, 
	          onClick: props.onRowClick, 
	          onMouseDown: props.onRowMouseDown, 
	          onMouseEnter: props.onRowMouseEnter, 
	          className: joinClasses(
	            rowClassNameGetter(rowIndex),
	            cx('public/fixedDataTable/bodyRow'),
	            hasBottomBorder ? cx('fixedDataTable/hasBottomBorder') : null
	          )}
	        );
	    }

	    return React.createElement("div", null, this._staticRowArray);
	  },

	  _getRowHeight:function(/*number*/ index) /*number*/ {
	    return this.props.rowHeightGetter ?
	      this.props.rowHeightGetter(index) :
	      this.props.defaultRowHeight;
	  },
	});

	module.exports = FixedDataTableBufferedRows;


/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * This is to be used with the FixedDataTable. It is a read line
	 * that when you click on a column that is resizable appears and allows
	 * you to resize the corresponding column.
	 *
	 * @providesModule FixedDataTableColumnResizeHandle.react
	 * @typechecks
	 */

	var DOMMouseMoveTracker = __webpack_require__(164);
	var Locale = __webpack_require__(136);
	var React = __webpack_require__(134);
	var ReactComponentWithPureRenderMixin = __webpack_require__(137);

	var clamp = __webpack_require__(168);
	var cx = __webpack_require__(146);

	var PropTypes = React.PropTypes;

	var FixedDataTableColumnResizeHandle = React.createClass({displayName: "FixedDataTableColumnResizeHandle",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {
	    visible: PropTypes.bool.isRequired,

	    /**
	     * This is the height of the line
	     */
	    height: PropTypes.number.isRequired,

	    /**
	     * Offset from left border of the table, please note
	     * that the line is a border on diff. So this is really the
	     * offset of the column itself.
	     */
	    leftOffset: PropTypes.number.isRequired,

	    /**
	     * Height of the clickable region of the line.
	     * This is assumed to be at the top of the line.
	     */
	    knobHeight: PropTypes.number.isRequired,

	    /**
	     * The line is a border on a diff, so this is essentially
	     * the width of column.
	     */
	    initialWidth: PropTypes.number,

	    /**
	     * The minimum width this dragger will collapse to
	     */
	    minWidth: PropTypes.number,

	    /**
	     * The maximum width this dragger will collapse to
	     */
	    maxWidth: PropTypes.number,

	    /**
	     * Initial click event on the header cell.
	     */
	    initialEvent: PropTypes.object,

	    /**
	     * When resizing is complete this is called.
	     */
	    onColumnResizeEnd: PropTypes.func,

	    /**
	     * Column key for the column being resized.
	     */
	    columnKey: PropTypes.oneOfType([
	      PropTypes.string,
	      PropTypes.number
	    ]),
	  },

	  getInitialState:function() /*object*/ {
	    return {
	      width: 0,
	      cursorDelta: 0
	    };
	  },

	  componentWillReceiveProps:function(/*object*/ newProps) {
	    if (newProps.initialEvent && !this._mouseMoveTracker.isDragging()) {
	      this._mouseMoveTracker.captureMouseMoves(newProps.initialEvent);
	      this.setState({
	        width: newProps.initialWidth,
	        cursorDelta: newProps.initialWidth
	      });
	    }
	  },

	  componentDidMount:function() {
	    this._mouseMoveTracker = new DOMMouseMoveTracker(
	      this._onMove,
	      this._onColumnResizeEnd,
	      document.body
	    );
	  },

	  componentWillUnmount:function() {
	    this._mouseMoveTracker.releaseMouseMoves();
	    this._mouseMoveTracker = null;
	  },

	  render:function() /*object*/ {
	    var style = {
	      width: this.state.width,
	      height: this.props.height,
	    };
	    if (Locale.isRTL()) {
	      style.right = this.props.leftOffset;
	    } else {
	      style.left = this.props.leftOffset;
	    }
	    return (
	      React.createElement("div", {
	        className: cx({
	          'fixedDataTableColumnResizerLine/main': true,
	          'fixedDataTableColumnResizerLine/hiddenElem': !this.props.visible
	        }), 
	        style: style}, 
	        React.createElement("div", {
	          className: cx('fixedDataTableColumnResizerLine/mouseArea'), 
	          style: {height: this.props.height}}
	        )
	      )
	    );
	  },

	  _onMove:function(/*number*/ deltaX) {
	    if (Locale.isRTL()) {
	      deltaX = -deltaX;
	    }
	    var newWidth = this.state.cursorDelta + deltaX;
	    var newColumnWidth =
	      clamp(this.props.minWidth, newWidth, this.props.maxWidth);

	    // Please note cursor delta is the different between the currently width
	    // and the new width.
	    this.setState({
	      width: newColumnWidth,
	      cursorDelta: newWidth
	    });
	  },

	  _onColumnResizeEnd:function() {
	    this._mouseMoveTracker.releaseMouseMoves();
	    this.props.onColumnResizeEnd(
	      this.state.width,
	      this.props.columnKey
	    );
	  },
	});

	module.exports = FixedDataTableColumnResizeHandle;


/***/ },
/* 142 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableRow.react
	 * @typechecks
	 */

	"use strict";

	var FixedDataTableHelper = __webpack_require__(135);
	var React = __webpack_require__(134);
	var ReactComponentWithPureRenderMixin = __webpack_require__(137);
	var FixedDataTableCellGroup = __webpack_require__(171);

	var cx = __webpack_require__(146);
	var joinClasses = __webpack_require__(170);
	var translateDOMPositionXY = __webpack_require__(151);

	var DIR_SIGN = FixedDataTableHelper.DIR_SIGN;
	var PropTypes = React.PropTypes;

	/**
	 * Component that renders the row for <FixedDataTable />.
	 * This component should not be used directly by developer. Instead,
	 * only <FixedDataTable /> should use the component internally.
	 */
	var FixedDataTableRowImpl = React.createClass({displayName: "FixedDataTableRowImpl",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {
	    /**
	     * The row data to render. The data format can be a simple Map object
	     * or an Array of data.
	     */
	    data: PropTypes.oneOfType([
	      PropTypes.object,
	      PropTypes.array
	    ]),

	    /**
	     * Array of <FixedDataTableColumn /> for the fixed columns.
	     */
	    fixedColumns: PropTypes.array.isRequired,

	    /**
	     * Height of the row.
	     */
	    height: PropTypes.number.isRequired,

	    /**
	     * The row index.
	     */
	    index: PropTypes.number.isRequired,

	    /**
	     * Array of <FixedDataTableColumn /> for the scrollable columns.
	     */
	    scrollableColumns: PropTypes.array.isRequired,

	    /**
	     * The distance between the left edge of the table and the leftmost portion
	     * of the row currently visible in the table.
	     */
	    scrollLeft: PropTypes.number.isRequired,

	    /**
	     * Width of the row.
	     */
	    width: PropTypes.number.isRequired,

	    /**
	     * Fire when a row is clicked.
	     */
	    onClick: PropTypes.func,

	    /**
	     * Callback for when resizer knob (in FixedDataTableCell) is clicked
	     * to initialize resizing. Please note this is only on the cells
	     * in the header.
	     * @param number combinedWidth
	     * @param number leftOffset
	     * @param number cellWidth
	     * @param number|string columnKey
	     * @param object event
	     */
	    onColumnResize: PropTypes.func,
	  },

	  render:function() /*object*/ {
	    var style = {
	      width: this.props.width,
	      height: this.props.height,
	    };

	    var className = cx({
	      'public/fixedDataTableRow/main': true,
	      'public/fixedDataTableRow/highlighted': (this.props.index % 2 === 1)
	    });

	    if (!this.props.data) {
	      return (
	        React.createElement("div", {
	          className: joinClasses(className, this.props.className), 
	          style: style}
	        )
	      );
	    }

	    var fixedColumns =
	      React.createElement(FixedDataTableCellGroup, {
	        key: "fixed_cells", 
	        height: this.props.height, 
	        left: 0, 
	        zIndex: 2, 
	        columns: this.props.fixedColumns, 
	        data: this.props.data, 
	        onColumnResize: this.props.onColumnResize, 
	        rowHeight: this.props.height, 
	        rowIndex: this.props.index}
	      );
	    var fixedColumnsWidth = this._getColumnsWidth(this.props.fixedColumns);
	    var columnsShadow = this._renderColumnsShadow(fixedColumnsWidth);
	    var scrollableColumns =
	      React.createElement(FixedDataTableCellGroup, {
	        key: "scrollable_cells", 
	        height: this.props.height, 
	        left: (fixedColumnsWidth - this.props.scrollLeft) * DIR_SIGN, 
	        zIndex: 0, 
	        columns: this.props.scrollableColumns, 
	        data: this.props.data, 
	        onColumnResize: this.props.onColumnResize, 
	        rowHeight: this.props.height, 
	        rowIndex: this.props.index}
	      );

	    return (
	      React.createElement("div", {
	        className: joinClasses(className, this.props.className), 
	        onClick: this.props.onClick ? this._onClick : null, 
	        onMouseDown: this.props.onMouseDown ? this._onMouseDown : null, 
	        onMouseEnter: this.props.onMouseEnter ? this._onMouseEnter : null, 
	        style: style}, 
	        React.createElement("div", {className: cx('fixedDataTableRow/body')}, 
	          fixedColumns, 
	          scrollableColumns, 
	          columnsShadow
	        )
	      )
	    );
	  },

	  _getColumnsWidth:function(/*array*/ columns) /*number*/ {
	    var width = 0;
	    for (var i = 0; i < columns.length; ++i) {
	      width += columns[i].props.width;
	    }
	    return width;
	  },

	  _renderColumnsShadow:function(/*number*/ left) /*?object*/ {
	    if (left > 0) {
	      var className = cx({
	        'fixedDataTableRow/fixedColumnsDivider': true,
	        'fixedDataTableRow/columnsShadow': this.props.scrollLeft > 0,
	      });
	      var style = {
	        left: left,
	        height: this.props.height
	      };
	      return React.createElement("div", {className: className, style: style});
	    }
	  },

	  _onClick:function(/*object*/ event) {
	    this.props.onClick(event, this.props.index, this.props.data);
	  },

	  _onMouseDown:function(/*object*/ event) {
	    this.props.onMouseDown(event, this.props.index, this.props.data);
	  },

	  _onMouseEnter:function(/*object*/ event) {
	    this.props.onMouseEnter(event, this.props.index, this.props.data);
	  },
	});

	var FixedDataTableRow = React.createClass({displayName: "FixedDataTableRow",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {
	    /**
	     * Height of the row.
	     */
	    height: PropTypes.number.isRequired,

	    /**
	     * Z-index on which the row will be displayed. Used e.g. for keeping
	     * header and footer in front of other rows.
	     */
	    zIndex: PropTypes.number,

	    /**
	     * The vertical position where the row should render itself
	     */
	    offsetTop: PropTypes.number.isRequired,

	    /**
	     * Width of the row.
	     */
	    width: PropTypes.number.isRequired,
	  },

	  render:function() /*object*/ {
	    var style = {
	      width: this.props.width,
	      height: this.props.height,
	      zIndex: (this.props.zIndex ? this.props.zIndex : 0),
	    };
	    translateDOMPositionXY(style, 0, this.props.offsetTop);

	    return (
	      React.createElement("div", {
	        style: style, 
	        className: cx('fixedDataTableRow/rowWrapper')}, 
	        React.createElement(FixedDataTableRowImpl, React.__spread({}, 
	          this.props, 
	          {offsetTop: undefined, 
	          zIndex: undefined})
	        )
	      )
	    );
	  },
	});


	module.exports = FixedDataTableRow;


/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableScrollHelper
	 * @typechecks
	 */
	'use strict';

	var PrefixIntervalTree = __webpack_require__(167);
	var clamp = __webpack_require__(168);

	var BUFFER_ROWS = 5;


	  function FixedDataTableScrollHelper(
	rowCount,
	    /*number*/ defaultRowHeight,
	    /*number*/ viewportHeight,
	    /*?function*/ rowHeightGetter)
	   {
	    this.$FixedDataTableScrollHelper_rowOffsets = new PrefixIntervalTree(rowCount, defaultRowHeight);
	    this.$FixedDataTableScrollHelper_storedHeights = new Array(rowCount);
	    for (var i = 0; i < rowCount; ++i) {
	      this.$FixedDataTableScrollHelper_storedHeights[i] = defaultRowHeight;
	    }
	    this.$FixedDataTableScrollHelper_rowCount = rowCount;
	    this.$FixedDataTableScrollHelper_position = 0;
	    this.$FixedDataTableScrollHelper_contentHeight = rowCount * defaultRowHeight;
	    this.$FixedDataTableScrollHelper_defaultRowHeight = defaultRowHeight;
	    this.$FixedDataTableScrollHelper_rowHeightGetter = rowHeightGetter ?
	      rowHeightGetter :
	      function()  {return defaultRowHeight;};
	    this.$FixedDataTableScrollHelper_viewportHeight = viewportHeight;
	    this.scrollRowIntoView = this.scrollRowIntoView.bind(this);
	    this.setViewportHeight = this.setViewportHeight.bind(this);
	    this.scrollBy = this.scrollBy.bind(this);
	    this.scrollTo = this.scrollTo.bind(this);
	    this.scrollToRow = this.scrollToRow.bind(this);
	    this.setRowHeightGetter = this.setRowHeightGetter.bind(this);
	    this.getContentHeight = this.getContentHeight.bind(this);

	    this.$FixedDataTableScrollHelper_updateHeightsInViewport(0, 0);
	  }

	  FixedDataTableScrollHelper.prototype.setRowHeightGetter=function(rowHeightGetter) {
	    this.$FixedDataTableScrollHelper_rowHeightGetter = rowHeightGetter;
	  };

	  FixedDataTableScrollHelper.prototype.setViewportHeight=function(viewportHeight) {
	    this.$FixedDataTableScrollHelper_viewportHeight = viewportHeight;
	  };

	  FixedDataTableScrollHelper.prototype.getContentHeight=function()  {
	    return this.$FixedDataTableScrollHelper_contentHeight;
	  };

	  FixedDataTableScrollHelper.prototype.$FixedDataTableScrollHelper_updateHeightsInViewport=function(
	firstRowIndex,
	    /*number*/ firstRowOffset)
	   {
	    var top = firstRowOffset;
	    var index = firstRowIndex;
	    while (top <= this.$FixedDataTableScrollHelper_viewportHeight && index < this.$FixedDataTableScrollHelper_rowCount) {
	      this.$FixedDataTableScrollHelper_updateRowHeight(index);
	      top += this.$FixedDataTableScrollHelper_storedHeights[index];
	      index++;
	    }
	  };

	  FixedDataTableScrollHelper.prototype.$FixedDataTableScrollHelper_updateHeightsAboveViewport=function(firstRowIndex) {
	    var index = firstRowIndex - 1;
	    while (index >= 0 && index >= firstRowIndex - BUFFER_ROWS) {
	      var delta = this.$FixedDataTableScrollHelper_updateRowHeight(index);
	      this.$FixedDataTableScrollHelper_position += delta;
	      index--;
	    }
	  };

	  FixedDataTableScrollHelper.prototype.$FixedDataTableScrollHelper_updateRowHeight=function(rowIndex)  {
	    if (rowIndex < 0 || rowIndex >= this.$FixedDataTableScrollHelper_rowCount) {
	      return 0;
	    }
	    var newHeight = this.$FixedDataTableScrollHelper_rowHeightGetter(rowIndex);
	    if (newHeight !== this.$FixedDataTableScrollHelper_storedHeights[rowIndex]) {
	      var change = newHeight - this.$FixedDataTableScrollHelper_storedHeights[rowIndex];
	      this.$FixedDataTableScrollHelper_rowOffsets.set(rowIndex, newHeight);
	      this.$FixedDataTableScrollHelper_storedHeights[rowIndex] = newHeight;
	      this.$FixedDataTableScrollHelper_contentHeight += change;
	      return change;
	    }
	    return 0;
	  };

	  FixedDataTableScrollHelper.prototype.scrollBy=function(delta)  {
	    var firstRow = this.$FixedDataTableScrollHelper_rowOffsets.upperBound(this.$FixedDataTableScrollHelper_position);
	    var firstRowPosition =
	      firstRow.value - this.$FixedDataTableScrollHelper_storedHeights[firstRow.index];
	    var rowIndex = firstRow.index;
	    var position = this.$FixedDataTableScrollHelper_position;

	    var rowHeightChange = this.$FixedDataTableScrollHelper_updateRowHeight(rowIndex);
	    if (firstRowPosition !== 0) {
	      position += rowHeightChange;
	    }
	    var visibleRowHeight = this.$FixedDataTableScrollHelper_storedHeights[rowIndex] -
	      (position - firstRowPosition);

	    if (delta >= 0) {

	      while (delta > 0 && rowIndex < this.$FixedDataTableScrollHelper_rowCount) {
	        if (delta < visibleRowHeight) {
	          position += delta;
	          delta = 0;
	        } else {
	          delta -= visibleRowHeight;
	          position += visibleRowHeight;
	          rowIndex++;
	        }
	        if (rowIndex < this.$FixedDataTableScrollHelper_rowCount) {
	          this.$FixedDataTableScrollHelper_updateRowHeight(rowIndex);
	          visibleRowHeight = this.$FixedDataTableScrollHelper_storedHeights[rowIndex];
	        }
	      }
	    } else if (delta < 0) {
	      delta = -delta;
	      var invisibleRowHeight = this.$FixedDataTableScrollHelper_storedHeights[rowIndex] - visibleRowHeight;

	      while (delta > 0 && rowIndex >= 0) {
	        if (delta < invisibleRowHeight) {
	          position -= delta;
	          delta = 0;
	        } else {
	          position -= invisibleRowHeight;
	          delta -= invisibleRowHeight;
	          rowIndex--;
	        }
	        if (rowIndex >= 0) {
	          var change = this.$FixedDataTableScrollHelper_updateRowHeight(rowIndex);
	          invisibleRowHeight = this.$FixedDataTableScrollHelper_storedHeights[rowIndex];
	          position += change;
	        }
	      }
	    }

	    var maxPosition = this.$FixedDataTableScrollHelper_contentHeight - this.$FixedDataTableScrollHelper_viewportHeight;
	    position = clamp(0, position, maxPosition);
	    this.$FixedDataTableScrollHelper_position = position;
	    var firstVisibleRow = this.$FixedDataTableScrollHelper_rowOffsets.upperBound(position);
	    var firstRowIndex = firstVisibleRow.index;
	    firstRowPosition =
	      firstVisibleRow.value - this.$FixedDataTableScrollHelper_rowHeightGetter(firstRowIndex);
	    var firstRowOffset = firstRowPosition - position;

	    this.$FixedDataTableScrollHelper_updateHeightsInViewport(firstRowIndex, firstRowOffset);
	    this.$FixedDataTableScrollHelper_updateHeightsAboveViewport(firstRowIndex);

	    return {
	      index: firstRowIndex,
	      offset: firstRowOffset,
	      position: this.$FixedDataTableScrollHelper_position,
	      contentHeight: this.$FixedDataTableScrollHelper_contentHeight,
	    };
	  };

	  FixedDataTableScrollHelper.prototype.$FixedDataTableScrollHelper_getRowAtEndPosition=function(rowIndex)  {
	    // We need to update enough rows above the selected one to be sure that when
	    // we scroll to selected position all rows between first shown and selected
	    // one have most recent heights computed and will not resize
	    this.$FixedDataTableScrollHelper_updateRowHeight(rowIndex);
	    var currentRowIndex = rowIndex;
	    var top = this.$FixedDataTableScrollHelper_storedHeights[currentRowIndex];
	    while (top < this.$FixedDataTableScrollHelper_viewportHeight && currentRowIndex >= 0) {
	      currentRowIndex--;
	      if (currentRowIndex >= 0) {
	        this.$FixedDataTableScrollHelper_updateRowHeight(currentRowIndex);
	        top += this.$FixedDataTableScrollHelper_storedHeights[currentRowIndex];
	      }
	    }
	    var position = this.$FixedDataTableScrollHelper_rowOffsets.get(rowIndex).value - this.$FixedDataTableScrollHelper_viewportHeight;
	    if (position < 0) {
	      position = 0;
	    }
	    return position;
	  };

	  FixedDataTableScrollHelper.prototype.scrollTo=function(position)  {
	    if (position <= 0) {
	      // If position less than or equal to 0 first row should be fully visible
	      // on top
	      this.$FixedDataTableScrollHelper_position = 0;
	      this.$FixedDataTableScrollHelper_updateHeightsInViewport(0, 0);

	      return {
	        index: 0,
	        offset: 0,
	        position: this.$FixedDataTableScrollHelper_position,
	        contentHeight: this.$FixedDataTableScrollHelper_contentHeight,
	      };
	    } else if (position >= this.$FixedDataTableScrollHelper_contentHeight - this.$FixedDataTableScrollHelper_viewportHeight) {
	      // If position is equal to or greater than max scroll value, we need
	      // to make sure to have bottom border of last row visible.
	      var rowIndex = this.$FixedDataTableScrollHelper_rowCount - 1;
	      position = this.$FixedDataTableScrollHelper_getRowAtEndPosition(rowIndex);
	    }
	    this.$FixedDataTableScrollHelper_position = position;

	    var firstVisibleRow = this.$FixedDataTableScrollHelper_rowOffsets.upperBound(position);
	    var firstRowIndex = Math.max(firstVisibleRow.index, 0);
	    var firstRowPosition =
	      firstVisibleRow.value - this.$FixedDataTableScrollHelper_rowHeightGetter(firstRowIndex);
	    var firstRowOffset = firstRowPosition - position;

	    this.$FixedDataTableScrollHelper_updateHeightsInViewport(firstRowIndex, firstRowOffset);
	    this.$FixedDataTableScrollHelper_updateHeightsAboveViewport(firstRowIndex);

	    return {
	      index: firstRowIndex,
	      offset: firstRowOffset,
	      position: this.$FixedDataTableScrollHelper_position,
	      contentHeight: this.$FixedDataTableScrollHelper_contentHeight,
	    };
	  };

	  /**
	   * Allows to scroll to selected row with specified offset. It always
	   * brings that row to top of viewport with that offset
	   */
	  FixedDataTableScrollHelper.prototype.scrollToRow=function(rowIndex, /*number*/ offset)  {
	    rowIndex = clamp(0, rowIndex, this.$FixedDataTableScrollHelper_rowCount - 1);
	    offset = clamp(-this.$FixedDataTableScrollHelper_storedHeights[rowIndex], offset, 0);
	    var firstRow = this.$FixedDataTableScrollHelper_rowOffsets.get(rowIndex);
	    return this.scrollTo(
	      firstRow.value - this.$FixedDataTableScrollHelper_storedHeights[rowIndex] - offset
	    );
	  };

	  /**
	   * Allows to scroll to selected row by bringing it to viewport with minimal
	   * scrolling. This that if row is fully visible, scroll will not be changed.
	   * If top border of row is above top of viewport it will be scrolled to be
	   * fully visible on the top of viewport. If the bottom border of row is
	   * below end of viewport, it will be scrolled up to be fully visible on the
	   * bottom of viewport.
	   */
	  FixedDataTableScrollHelper.prototype.scrollRowIntoView=function(rowIndex)  {
	    rowIndex = clamp(0, rowIndex, this.$FixedDataTableScrollHelper_rowCount - 1);
	    var rowEnd = this.$FixedDataTableScrollHelper_rowOffsets.get(rowIndex).value;
	    var rowBegin = rowEnd - this.$FixedDataTableScrollHelper_storedHeights[rowIndex];
	    if (rowBegin < this.$FixedDataTableScrollHelper_position) {
	      return this.scrollTo(rowBegin);
	    } else if (rowEnd > this.$FixedDataTableScrollHelper_position + this.$FixedDataTableScrollHelper_viewportHeight) {
	      var position = this.$FixedDataTableScrollHelper_getRowAtEndPosition(rowIndex);
	      return this.scrollTo(position);
	    }
	    return this.scrollTo(this.$FixedDataTableScrollHelper_position);
	  };


	module.exports = FixedDataTableScrollHelper;


/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableWidthHelper
	 * @typechecks
	 */
	'use strict';

	var React = __webpack_require__(134);

	var cloneWithProps = __webpack_require__(145);

	function getTotalWidth(/*array*/ columns) /*number*/ {
	  var totalWidth = 0;
	  for (var i = 0; i < columns.length; ++i) {
	    totalWidth += columns[i].props.width;
	  }
	  return totalWidth;
	}

	function getTotalFlexGrow(/*array*/ columns) /*number*/ {
	  var totalFlexGrow = 0;
	  for (var i = 0; i < columns.length; ++i) {
	    totalFlexGrow += columns[i].props.flexGrow || 0;
	  }
	  return totalFlexGrow;
	}

	function distributeFlexWidth(
	  /*array*/ columns,
	  /*number*/ flexWidth
	) /*object*/ {
	  if (flexWidth <= 0) {
	    return {
	      columns: columns,
	      width: getTotalWidth(columns),
	    };
	  }
	  var remainingFlexGrow = getTotalFlexGrow(columns);
	  var remainingFlexWidth = flexWidth;
	  var newColumns = [];
	  var totalWidth = 0;
	  for (var i = 0; i < columns.length; ++i) {
	    var column = columns[i];
	    if (!column.props.flexGrow) {
	      totalWidth += column.props.width;
	      newColumns.push(column);
	      continue;
	    }
	    var columnFlexWidth = Math.floor(
	      column.props.flexGrow / remainingFlexGrow * remainingFlexWidth
	    );
	    var newColumnWidth = Math.floor(column.props.width + columnFlexWidth);
	    totalWidth += newColumnWidth;

	    remainingFlexGrow -= column.props.flexGrow;
	    remainingFlexWidth -= columnFlexWidth;

	    newColumns.push(cloneWithProps(
	      column,
	      {width: newColumnWidth}
	    ));
	  }

	  return {
	    columns: newColumns,
	    width: totalWidth,
	  };
	}

	function adjustColumnGroupWidths(
	  /*array*/ columnGroups,
	  /*number*/ expectedWidth
	) /*object*/ {
	  var allColumns = [];
	  var i;
	  for (i = 0; i < columnGroups.length; ++i) {
	    React.Children.forEach(
	      columnGroups[i].props.children,
	      function(column)  {allColumns.push(column);}
	    );
	  }
	  var columnsWidth = getTotalWidth(allColumns);
	  var remainingFlexGrow = getTotalFlexGrow(allColumns);
	  var remainingFlexWidth = Math.max(expectedWidth - columnsWidth, 0);

	  var newAllColumns = [];
	  var newColumnGroups = [];

	  for (i = 0; i < columnGroups.length; ++i) {
	    var columnGroup = columnGroups[i];
	    var currentColumns = [];

	    React.Children.forEach(
	      columnGroup.props.children,
	      function(column)  {currentColumns.push(column);}
	    );

	    var columnGroupFlexGrow = getTotalFlexGrow(currentColumns);
	    var columnGroupFlexWidth = Math.floor(
	      columnGroupFlexGrow / remainingFlexGrow * remainingFlexWidth
	    );

	    var newColumnSettings = distributeFlexWidth(
	      currentColumns,
	      columnGroupFlexWidth
	    );

	    remainingFlexGrow -= columnGroupFlexGrow;
	    remainingFlexWidth -= columnGroupFlexWidth;

	    for (var j = 0; j < newColumnSettings.columns.length; ++j) {
	      newAllColumns.push(newColumnSettings.columns[j]);
	    }

	    newColumnGroups.push(cloneWithProps(
	      columnGroup,
	      {width: newColumnSettings.width}
	    ));
	  }

	  return {
	    columns: newAllColumns,
	    columnGroups: newColumnGroups,
	  };
	}

	function adjustColumnWidths(
	  /*array*/ columns,
	  /*number*/ expectedWidth
	) /*array*/ {
	  var columnsWidth = getTotalWidth(columns);
	  if (columnsWidth < expectedWidth) {
	    return distributeFlexWidth(columns, expectedWidth - columnsWidth).columns;
	  }
	  return columns;
	}

	var FixedDataTableWidthHelper = {
	  getTotalWidth:getTotalWidth,
	  getTotalFlexGrow:getTotalFlexGrow,
	  distributeFlexWidth:distributeFlexWidth,
	  adjustColumnWidths:adjustColumnWidths,
	  adjustColumnGroupWidths:adjustColumnGroupWidths,
	};

	module.exports = FixedDataTableWidthHelper;


/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule cloneWithProps
	 */

	module.exports = __webpack_require__(133);


/***/ },
/* 146 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule cx
	 */

	var slashReplaceRegex = /\//g;
	var cache = {};

	function getClassName(className) {
	  if (cache[className]) {
	    return cache[className];
	  }

	  cache[className] = className.replace(slashReplaceRegex, '_');
	  return cache[className];
	}

	/**
	 * This function is used to mark string literals representing CSS class names
	 * so that they can be transformed statically. This allows for modularization
	 * and minification of CSS class names.
	 *
	 * In static_upstream, this function is actually implemented, but it should
	 * eventually be replaced with something more descriptive, and the transform
	 * that is used in the main stack should be ported for use elsewhere.
	 *
	 * @param string|object className to modularize, or an object of key/values.
	 *                      In the object case, the values are conditions that
	 *                      determine if the className keys should be included.
	 * @param [string ...]  Variable list of classNames in the string case.
	 * @return string       Renderable space-separated CSS className.
	 */
	function cx(classNames) {
	  var classNamesArray;
	  if (typeof classNames == 'object') {
	    classNamesArray = Object.keys(classNames).filter(function(className) {
	      return classNames[className];
	    });
	  } else {
	    classNamesArray = Array.prototype.slice.call(arguments);
	  }

	  return classNamesArray.map(getClassName).join(' ');
	}

	module.exports = cx;


/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule debounceCore
	 * @typechecks
	 */

	/**
	 * Invokes the given callback after a specified number of milliseconds have
	 * elapsed, ignoring subsequent calls.
	 *
	 * For example, if you wanted to update a preview after the user stops typing
	 * you could do the following:
	 *
	 *   elem.addEventListener('keyup', debounce(this.updatePreview, 250), false);
	 *
	 * The returned function has a reset method which can be called to cancel a
	 * pending invocation.
	 *
	 *   var debouncedUpdatePreview = debounce(this.updatePreview, 250);
	 *   elem.addEventListener('keyup', debouncedUpdatePreview, false);
	 *
	 *   // later, to cancel pending calls
	 *   debouncedUpdatePreview.reset();
	 *
	 * @param {function} func - the function to debounce
	 * @param {number} wait - how long to wait in milliseconds
	 * @param {*} context - optional context to invoke the function in
	 * @param {?function} setTimeoutFunc - an implementation of setTimeout
	 *  if nothing is passed in the default setTimeout function is used
	  * @param {?function} clearTimeoutFunc - an implementation of clearTimeout
	 *  if nothing is passed in the default clearTimeout function is used
	 */
	function debounce(func, wait, context, setTimeoutFunc, clearTimeoutFunc) {
	  setTimeoutFunc = setTimeoutFunc || setTimeout;
	  clearTimeoutFunc = clearTimeoutFunc || clearTimeout;
	  var timeout;

	  function debouncer() {for (var args=[],$__0=0,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
	    debouncer.reset();

	    timeout = setTimeoutFunc(function() {
	      func.apply(context, args);
	    }, wait);
	  }

	  debouncer.reset = function() {
	    clearTimeoutFunc(timeout);
	  };

	  return debouncer;
	}

	module.exports = debounce;


/***/ },
/* 148 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule emptyFunction
	 */

	function makeEmptyFunction(arg) {
	  return function() {
	    return arg;
	  };
	}

	/**
	 * This function accepts and discards inputs; it has no side effects. This is
	 * primarily useful idiomatically for overridable function endpoints which
	 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
	 */
	function emptyFunction() {}

	emptyFunction.thatReturns = makeEmptyFunction;
	emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
	emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
	emptyFunction.thatReturnsNull = makeEmptyFunction(null);
	emptyFunction.thatReturnsThis = function() { return this; };
	emptyFunction.thatReturnsArgument = function(arg) { return arg; };

	module.exports = emptyFunction;


/***/ },
/* 149 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule invariant
	 */

	"use strict";

	/**
	 * Use invariant() to assert state which your program assumes to be true.
	 *
	 * Provide sprintf-style format (only %s is supported) and arguments
	 * to provide information about what broke and what you were
	 * expecting.
	 *
	 * The invariant message will be stripped in production, but the invariant
	 * will remain to ensure logic does not differ in production.
	 */

	var invariant = function(condition, format, a, b, c, d, e, f) {
	  if (process.env.NODE_ENV !== 'production') {
	    if (format === undefined) {
	      throw new Error('invariant requires an error message argument');
	    }
	  }

	  if (!condition) {
	    var error;
	    if (format === undefined) {
	      error = new Error(
	        'Minified exception occurred; use the non-minified dev environment ' +
	        'for the full error message and additional helpful warnings.'
	      );
	    } else {
	      var args = [a, b, c, d, e, f];
	      var argIndex = 0;
	      error = new Error(
	        'Invariant Violation: ' +
	        format.replace(/%s/g, function() { return args[argIndex++]; })
	      );
	    }

	    error.framesToPop = 1; // we don't care about invariant's own frame
	    throw error;
	  }
	};

	module.exports = invariant;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule shallowEqual
	 */

	'use strict';

	/**
	 * Performs equality by iterating through keys on an object and returning
	 * false when any key has values which are not strictly equal between
	 * objA and objB. Returns true when the values of all keys are strictly equal.
	 *
	 * @return {boolean}
	 */
	function shallowEqual(objA, objB) {
	  if (objA === objB) {
	    return true;
	  }
	  var key;
	  // Test for A's keys different from B.
	  for (key in objA) {
	    if (objA.hasOwnProperty(key) &&
	        (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
	      return false;
	    }
	  }
	  // Test for B's keys missing from A.
	  for (key in objB) {
	    if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
	      return false;
	    }
	  }
	  return true;
	}

	module.exports = shallowEqual;


/***/ },
/* 151 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule translateDOMPositionXY
	 * @typechecks
	 */

	"use strict";

	var BrowserSupportCore = __webpack_require__(172);

	var getVendorPrefixedName = __webpack_require__(173);

	var TRANSFORM = getVendorPrefixedName('transform');
	var BACKFACE_VISIBILITY = getVendorPrefixedName('backfaceVisibility');

	var translateDOMPositionXY = (function() {
	  if (BrowserSupportCore.hasCSSTransforms()) {
	    var ua = global.window ? global.window.navigator.userAgent : 'UNKNOWN';
	    var isSafari = (/Safari\//).test(ua) && !(/Chrome\//).test(ua);
	    // It appears that Safari messes up the composition order
	    // of GPU-accelerated layers
	    // (see bug https://bugs.webkit.org/show_bug.cgi?id=61824).
	    // Use 2D translation instead.
	    if (!isSafari && BrowserSupportCore.hasCSS3DTransforms()) {
	      return function(/*object*/ style, /*number*/ x, /*number*/ y) {
	        style[TRANSFORM] ='translate3d(' + x + 'px,' + y + 'px,0)';
	        style[BACKFACE_VISIBILITY] = 'hidden';
	      };
	    } else {
	      return function(/*object*/ style, /*number*/ x, /*number*/ y) {
	        style[TRANSFORM] = 'translate(' + x + 'px,' + y + 'px)';
	      };
	    }
	  } else {
	    return function(/*object*/ style, /*number*/ x, /*number*/ y) {
	      style.left = x + 'px';
	      style.top = y + 'px';
	    };
	  }
	})();

	module.exports = translateDOMPositionXY;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 152 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var PureRenderMixin = __webpack_require__(161);
	var emptyFunction = __webpack_require__(174);
	var cloneWithProps = __webpack_require__(133);

	function createUIEvent(draggable) {
		return {
			element: draggable.getDOMNode(),
			position: {
				top: (draggable._pendingState || draggable.state).clientY,
				left: (draggable._pendingState || draggable.state).clientX
			}
		};
	}

	function canDragY(draggable) {
		return draggable.props.axis === 'both' ||
				draggable.props.axis === 'y';
	}

	function canDragX(draggable) {
		return draggable.props.axis === 'both' ||
				draggable.props.axis === 'x';
	}

	function isFunction(func) {
	  return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]';
	}

	// @credits https://gist.github.com/rogozhnikoff/a43cfed27c41e4e68cdc
	function findInArray(array, callback) {
	  for (var i = 0, length = array.length, element = null; i < length, element = array[i]; i++) {
	    if (callback.apply(callback, [element, i, array])) return element;
	  }
	}

	function matchesSelector(el, selector) {
	  var method = findInArray([
	    'matches',
	    'webkitMatchesSelector',
	    'mozMatchesSelector',
	    'msMatchesSelector',
	    'oMatchesSelector'
	  ], function(method){
	    return isFunction(el[method]);
	  });

	  return el[method].call(el, selector);
	}

	function positionToCSSTransform(style) {
		// Replace unitless items with px
		var x = ('' + style.left).replace(/(\d)$/, '$1px');
		var y = ('' + style.top).replace(/(\d)$/, '$1px');
		style.transform = 'translate(' + x + ',' + y + ')';
		style.WebkitTransform = 'translate(' + x + ',' + y + ')';
		style.OTransform = 'translate(' + x + ',' + y + ')';
		style.msTransform = 'translate(' + x + ',' + y + ')';
		style.MozTransform = 'translate(' + x + ',' + y + ')';
		delete style.left;
		delete style.top;
		return style;
	}

	// @credits: http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript/4819886#4819886
	/* Conditional to fix node server side rendering of component */
	if (typeof window === 'undefined') {
	    // Do Node Stuff
	    var isTouchDevice = false;
	} else {
	    // Do Browser Stuff
	    var isTouchDevice = 'ontouchstart' in window || // works on most browsers
	      'onmsgesturechange' in window; // works on ie10 on ms surface
	}

	// look ::handleDragStart
	//function isMultiTouch(e) {
	//  return e.touches && Array.isArray(e.touches) && e.touches.length > 1
	//}

	/**
	 * simple abstraction for dragging events names
	 * */
	var dragEventFor = (function () {
	  var eventsFor = {
	    touch: {
	      start: 'touchstart',
	      move: 'touchmove',
	      end: 'touchend'
	    },
	    mouse: {
	      start: 'mousedown',
	      move: 'mousemove',
	      end: 'mouseup'
	    }
	  };
	  return eventsFor[isTouchDevice ? 'touch' : 'mouse'];
	})();

	/**
	 * get {clientX, clientY} positions of control
	 * */
	function getControlPosition(e) {
	  var position = (e.touches && e.touches[0]) || e;
	  return {
	    clientX: position.clientX,
	    clientY: position.clientY
	  };
	}

	function addEvent(el, event, handler) {
		if (!el) { return; }
		if (el.attachEvent) {
			el.attachEvent('on' + event, handler);
		} else if (el.addEventListener) {
			el.addEventListener(event, handler, true);
		} else {
			el['on' + event] = handler;
		}
	}

	function removeEvent(el, event, handler) {
		if (!el) { return; }
		if (el.detachEvent) {
			el.detachEvent('on' + event, handler);
		} else if (el.removeEventListener) {
			el.removeEventListener(event, handler, true);
		} else {
			el['on' + event] = null;
		}
	}

	module.exports = React.createClass({
		displayName: 'Draggable',
		mixins: [PureRenderMixin],

		propTypes: {
			/**
			 * `axis` determines which axis the draggable can move.
			 *
			 * 'both' allows movement horizontally and vertically.
			 * 'x' limits movement to horizontal axis.
			 * 'y' limits movement to vertical axis.
			 *
			 * Defaults to 'both'.
			 */
			axis: React.PropTypes.oneOf(['both', 'x', 'y']),

			/**
			 * `handle` specifies a selector to be used as the handle that initiates drag.
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 	    render: function () {
			 * 	    	return (
			 * 	    	 	<Draggable handle=".handle">
			 * 	    	 	  <div>
			 * 	    	 	      <div className="handle">Click me to drag</div>
			 * 	    	 	      <div>This is some other content</div>
			 * 	    	 	  </div>
			 * 	    		</Draggable>
			 * 	    	);
			 * 	    }
			 * 	});
			 * ```
			 */
			handle: React.PropTypes.string,

			/**
			 * `cancel` specifies a selector to be used to prevent drag initialization.
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 	    render: function () {
			 * 	        return(
			 * 	            <Draggable cancel=".cancel">
			 * 	                <div>
			 * 	                	<div className="cancel">You can't drag from here</div>
			 *						<div>Dragging here works fine</div>
			 * 	                </div>
			 * 	            </Draggable>
			 * 	        );
			 * 	    }
			 * 	});
			 * ```
			 */
			cancel: React.PropTypes.string,

			/**
			 * `grid` specifies the x and y that dragging should snap to.
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 	    render: function () {
			 * 	        return (
			 * 	            <Draggable grid={[25, 25]}>
			 * 	                <div>I snap to a 25 x 25 grid</div>
			 * 	            </Draggable>
			 * 	        );
			 * 	    }
			 * 	});
			 * ```
			 */
			grid: React.PropTypes.arrayOf(React.PropTypes.number),

			/**
			 * `start` specifies the x and y that the dragged item should start at
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 	    render: function () {
			 * 	        return (
			 * 	            <Draggable start={{x: 25, y: 25}}>
			 * 	                <div>I start with left: 25px; top: 25px;</div>
			 * 	            </Draggable>
			 * 	        );
			 * 	    }
			 * 	});
			 * ```
			 */
			start: React.PropTypes.object,

			/**
			 * `moveOnStartChange` tells the Draggable element to reset its position
			 * if the `start` parameters are changed. By default, if the `start` 
			 * parameters change, the Draggable element still remains where it started
			 * or was dragged to.
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 			onButtonClick: function () {
			 * 				this.setState({clicked: true});
			 * 			},
			 * 	    render: function () {
			 * 	    		var start = this.state.clicked ?
			 * 	    		  {x: 25, y: 25} :
			 * 	    		  {x: 125, y: 125};
			 * 	        return (
			 * 	            <Draggable start={start}>
			 * 	                <div>I start with left: 25px; top: 25px;,
			 * 	                but move to left: 125px; top: 125px; when the button
			 * 	                is clicked.</div>
			 * 	                <div onClick={this.onButtonClick}>Button</div>
			 * 	            </Draggable>
			 * 	        );
			 * 	    }
			 * 	});
			 * ```
			 */
			moveOnStartChange: React.PropTypes.bool,

			/**
			 * `useCSSTransforms` if true will place the element using translate(x, y)
			 * rather than CSS top/left.
			 *
			 * This generally gives better performance, and is useful in combination with
			 * other layout systems that use translate(), such as react-grid-layout.
			 */
			useCSSTransforms: React.PropTypes.bool,

			/**
			 * `zIndex` specifies the zIndex to use while dragging.
			 *
			 * Example:
			 *
			 * ```jsx
			 * 	var App = React.createClass({
			 * 	    render: function () {
			 * 	        return (
			 * 	            <Draggable zIndex={100}>
			 * 	                <div>I have a zIndex</div>
			 * 	            </Draggable>
			 * 	        );
			 * 	    }
			 * 	});
			 * ```
			 */
			zIndex: React.PropTypes.number,

			/**
			 * Called when dragging starts.
			 *
			 * Example:
			 *
			 * ```js
			 *	function (event, ui) {}
			 * ```
			 *
			 * `event` is the Event that was triggered.
			 * `ui` is an object:
			 *
			 * ```js
			 *	{
			 *		position: {top: 0, left: 0}
			 *	}
			 * ```
			 */
			onStart: React.PropTypes.func,

			/**
			 * Called while dragging.
			 *
			 * Example:
			 *
			 * ```js
			 *	function (event, ui) {}
			 * ```
			 *
			 * `event` is the Event that was triggered.
			 * `ui` is an object:
			 *
			 * ```js
			 *	{
			 *		position: {top: 0, left: 0}
			 *	}
			 * ```
			 */
			onDrag: React.PropTypes.func,

			/**
			 * Called when dragging stops.
			 *
			 * Example:
			 *
			 * ```js
			 *	function (event, ui) {}
			 * ```
			 *
			 * `event` is the Event that was triggered.
			 * `ui` is an object:
			 *
			 * ```js
			 *	{
			 *		position: {top: 0, left: 0}
			 *	}
			 * ```
			 */
			onStop: React.PropTypes.func,

			/**
			 * A workaround option which can be passed if onMouseDown needs to be accessed, 
			 * since it'll always be blocked (due to that there's internal use of onMouseDown)
			 *
			 */
			onMouseDown: React.PropTypes.func
		},

		componentWillUnmount: function() {
			// Remove any leftover event handlers
			removeEvent(window, dragEventFor['move'], this.handleDrag);
			removeEvent(window, dragEventFor['end'], this.handleDragEnd);
		},

		componentWillReceiveProps: function(nextProps) {
			// If this is set to watch a changing start position, 
			// set x and y to the new position.
			if (nextProps.moveOnStartChange) {
				this.setState({
					clientX: nextProps.start.x,
					clientY: nextProps.start.y
				});
			}
		},

		getDefaultProps: function () {
			return {
				axis: 'both',
				handle: null,
				cancel: null,
				grid: null,
				start: {
					x: 0,
					y: 0
				},
				moveOnStartChange: false,
				useCSSTransforms: false,
				zIndex: NaN,
				onStart: emptyFunction,
				onDrag: emptyFunction,
				onStop: emptyFunction,
				onMouseDown: emptyFunction
			};
		},

		getInitialState: function () {
			return {
				// Whether or not currently dragging
				dragging: false,

				// Start top/left of this.getDOMNode()
				startX: 0, startY: 0,

				// Offset between start top/left and mouse top/left
				offsetX: 0, offsetY: 0,

				// Current top/left of this.getDOMNode()
				clientX: this.props.start.x, clientY: this.props.start.y
			};
		},

		handleDragStart: function (e) {
	    // todo: write right implementation to prevent multitouch drag
	    // prevent multi-touch events
	    // if (isMultiTouch(e)) {
	    //     this.handleDragEnd.apply(e, arguments);
	    //     return
	    // }

			// Make it possible to attach event handlers on top of this one
			this.props.onMouseDown(e);

			// Only catch left clicks, if clicking
			if (typeof e.button === "number" && e.button !== 0) {
				return;
			}

			var node = this.getDOMNode();

			// Short circuit if handle or cancel prop was provided and selector doesn't match
			if ((this.props.handle && !matchesSelector(e.target, this.props.handle)) ||
				(this.props.cancel && matchesSelector(e.target, this.props.cancel))) {
				return;
			}

	    var dragPoint = getControlPosition(e);

			// Initiate dragging
			this.setState({
				dragging: true,
				offsetX: parseInt(dragPoint.clientX, 10),
				offsetY: parseInt(dragPoint.clientY, 10),
				startX: parseInt(this.state.clientX, 10) || 0,
				startY: parseInt(this.state.clientY, 10) || 0
			});

			// Add a class to the body to disable user-select. This prevents text from 
			// being selected all over the page.
			document.body.className += " react-draggable-active";

			// Call event handler
			this.props.onStart(e, createUIEvent(this));

			// Add event handlers
			addEvent(window, dragEventFor['move'], this.handleDrag);
			addEvent(window, dragEventFor['end'], this.handleDragEnd);
		},

		handleDragEnd: function (e) {
			// Short circuit if not currently dragging
			if (!this.state.dragging) {
				return;
			}

			// Turn off dragging
			this.setState({
				dragging: false
			});

			// Remove the body class used to disable user-select.
			document.body.className = document.body.className.replace(" react-draggable-active", "");

			// Call event handler
			this.props.onStop(e, createUIEvent(this));

			// Remove event handlers
	    removeEvent(window, dragEventFor['move'], this.handleDrag);
	    removeEvent(window, dragEventFor['end'], this.handleDragEnd);
		},

		handleDrag: function (e) {
	    var dragPoint = getControlPosition(e);

			// Calculate top and left
	    var clientX = (this.state.startX + (dragPoint.clientX - this.state.offsetX));
	    var clientY = (this.state.startY + (dragPoint.clientY - this.state.offsetY));

			// Snap to grid if prop has been provided
			if (Array.isArray(this.props.grid)) {
				var directionX = clientX < parseInt(this.state.clientX, 10) ? -1 : 1;
				var directionY = clientY < parseInt(this.state.clientY, 10) ? -1 : 1;

				clientX = Math.abs(clientX - parseInt(this.state.clientX, 10)) >= this.props.grid[0]
						? (parseInt(this.state.clientX, 10) + (this.props.grid[0] * directionX))
						: parseInt(this.state.clientX, 10);

				clientY = Math.abs(clientY - parseInt(this.state.clientY, 10)) >= this.props.grid[1]
						? (parseInt(this.state.clientY, 10) + (this.props.grid[1] * directionY))
						: parseInt(this.state.clientY, 10);
			}

			// Min/max constraints
			if (Array.isArray(this.props.minConstraints)) {
				clientX = Math.max(this.props.minConstraints[0], clientX);
				clientY = Math.max(this.props.minConstraints[1], clientY);
			}
			if (Array.isArray(this.props.maxConstraints)) {
				clientX = Math.min(this.props.maxConstraints[0], clientX);
				clientY = Math.min(this.props.maxConstraints[1], clientY);
			}

			// Update top and left
			this.setState({
				clientX: clientX,
				clientY: clientY
			});

			// Call event handler
			this.props.onDrag(e, createUIEvent(this));
		},

		render: function () {
			var style = {
				// Set top if vertical drag is enabled
				top: canDragY(this)
					? this.state.clientY
					: this.state.startY,

				// Set left if horizontal drag is enabled
				left: canDragX(this)
					? this.state.clientX
					: this.state.startX
			};

			if (this.props.useCSSTransforms) {
				style = positionToCSSTransform(style);
			}

			// Set zIndex if currently dragging and prop has been provided
			if (this.state.dragging && !isNaN(this.props.zIndex)) {
				style.zIndex = this.props.zIndex;
			}

			// Reuse the child provided
			// This makes it flexible to use whatever element is wanted (div, ul, etc)
			return cloneWithProps(React.Children.only(this.props.children), {
				style: style,
				className: 'react-draggable' + (this.state.dragging ? ' react-draggable-dragging' : ''),

				onMouseDown: this.handleDragStart,
				onTouchStart: function(ev){
	        ev.preventDefault(); // prevent for scroll
	        return this.handleDragStart.apply(this, arguments);
	      }.bind(this),

				onMouseUp: this.handleDragEnd,
				onTouchEnd: this.handleDragEnd
			});
		}
	});


/***/ },
/* 153 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var React = __webpack_require__(1);
	var Draggable = __webpack_require__(129);
	var assign = __webpack_require__(131);
	var PureRenderMixin = __webpack_require__(161);
	var cloneWithProps = __webpack_require__(133);

	var Resizable = module.exports = React.createClass({
	  displayName: "Resizable",
	  mixins: [PureRenderMixin],

	  propTypes: {
	    children: React.PropTypes.element,
	    // Functions
	    onResizeStop: React.PropTypes.func,
	    onResizeStart: React.PropTypes.func,
	    onResize: React.PropTypes.func,

	    width: React.PropTypes.number.isRequired,
	    height: React.PropTypes.number.isRequired,
	    // If you change this, be sure to update your css
	    handleSize: React.PropTypes.array,
	    // These will be passed wholesale to react-draggable
	    draggableOpts: React.PropTypes.object
	  },

	  getDefaultProps: function () {
	    return {
	      handleSize: [20, 20]
	    };
	  },

	  minConstraints: function () {
	    return parseConstraints(this.props.minConstraints, this.props.handleSize[0]) || this.props.handleSize;
	  },

	  maxConstraints: function () {
	    return parseConstraints(this.props.maxConstraints, this.props.handleSize[1]);
	  },


	  /**
	   * Wrapper around drag events to provide more useful data.
	   * 
	   * @param  {String} handlerName Handler name to wrap.
	   * @return {Function}           Handler function.
	   */
	  resizeHandler: function (handlerName) {
	    var me = this;
	    return function (e, _ref) {
	      var element = _ref.element;
	      var position = _ref.position;
	      me.props[handlerName] && me.props[handlerName](e, { element: element, size: calcWH(position, me.props.handleSize) });
	    };
	  },

	  render: function () {
	    var p = this.props;
	    // What we're doing here is getting the child of this element, and cloning it with this element's props.
	    // We are then defining its children as:
	    // Its original children (resizable's child's children), and
	    // A draggable handle.

	    return cloneWithProps(p.children, assign({}, p, {
	      children: [p.children.props.children, React.createElement(Draggable, React.__spread({}, p.draggableOpts, {
	        start: { x: p.width - 20, y: p.height - 20 },
	        moveOnStartChange: true,
	        onStop: this.resizeHandler("onResizeStop"),
	        onStart: this.resizeHandler("onResizeStart"),
	        onDrag: this.resizeHandler("onResize"),
	        minConstraints: this.minConstraints(),
	        maxConstraints: this.maxConstraints()
	      }), React.createElement("span", {
	        className: "react-resizable-handle"
	      }))]
	    }));
	  }
	});

	/**
	 * Parse left and top coordinates; we have to add the handle size to get the full picture.
	 * @param  {Number} options.left Left coordinate.
	 * @param  {Number} options.top  Top coordinate.
	 * @param  {Array}  handleSize   Handle data.
	 * @return {Object}              Coordinates
	 */
	function calcWH(_ref2, handleSize) {
	  var left = _ref2.left;
	  var top = _ref2.top;
	  return { width: left + handleSize[0], height: top + handleSize[1] };
	}

	/**
	 * Constraints must be subtracted by the size of the handle to work properly.
	 * This has a side-effect of effectively limiting the minimum size to the handleSize,
	 * which IMO is fine.
	 * @param  {Array} constraints Constraints array.
	 * @param  {Array} handleSize  Handle size array.
	 * @return {Array}             Transformed constraints.
	 */
	function parseConstraints(constraints, handleSize) {
	  if (!constraints) return;
	  return constraints.map(function (c) {
	    return c - handleSize;
	  });
	}

/***/ },
/* 154 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _objectWithoutProperties = function (obj, keys) {
	  var target = {};
	  for (var i in obj) {
	    if (keys.indexOf(i) >= 0) continue;
	    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
	    target[i] = obj[i];
	  }

	  return target;
	};

	"use strict";
	var React = __webpack_require__(1);
	var PureRenderMixin = __webpack_require__(161);
	var Resizable = __webpack_require__(153);

	// An example use of Resizable.
	var ResizableBox = module.exports = React.createClass({
	  displayName: "ResizableBox",
	  mixins: [PureRenderMixin],

	  propTypes: {},

	  getInitialState: function () {
	    return {
	      width: this.props.width,
	      height: this.props.height
	    };
	  },

	  onResize: function (event, _ref) {
	    var element = _ref.element;
	    var size = _ref.size;
	    if (size.width !== this.state.width || size.height !== this.state.height) {
	      this.setState({
	        width: size.width,
	        height: size.height
	      });
	    }
	  },

	  render: function () {
	    // Basic wrapper around a Resizable instance.
	    // If you use Resizable directly, you are responsible for updating the component
	    // with a new width and height.
	    var handleSize = this.props.handleSize;
	    var minConstraints = this.props.minConstraints;
	    var maxConstraints = this.props.maxConstraints;
	    var props = _objectWithoutProperties(this.props, ["handleSize", "minConstraints", "maxConstraints"]);

	    return React.createElement(Resizable, {
	      minConstraints: minConstraints,
	      maxConstraints: maxConstraints,
	      handleSize: handleSize,
	      width: this.state.width,
	      height: this.state.height,
	      onResize: this.onResize,
	      draggableOpts: this.props.draggableOpts
	    }, React.createElement("div", React.__spread({
	      style: { width: this.state.width + "px", height: this.state.height + "px" }
	    }, props), this.props.children));
	  }
	});

/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = typeof Object.keys === 'function'
	  ? Object.keys : shim;

	exports.shim = shim;
	function shim (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}


/***/ },
/* 156 */
/***/ function(module, exports, __webpack_require__) {

	var supportsArgumentsClass = (function(){
	  return Object.prototype.toString.call(arguments)
	})() == '[object Arguments]';

	exports = module.exports = supportsArgumentsClass ? supported : unsupported;

	exports.supported = supported;
	function supported(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	};

	exports.unsupported = unsupported;
	function unsupported(object){
	  return object &&
	    typeof object == 'object' &&
	    typeof object.length == 'number' &&
	    Object.prototype.hasOwnProperty.call(object, 'callee') &&
	    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
	    false;
	};


/***/ },
/* 157 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactElement
	 */

	'use strict';

	var ReactContext = __webpack_require__(177);
	var ReactCurrentOwner = __webpack_require__(178);

	var assign = __webpack_require__(175);
	var warning = __webpack_require__(160);

	var RESERVED_PROPS = {
	  key: true,
	  ref: true
	};

	/**
	 * Warn for mutations.
	 *
	 * @internal
	 * @param {object} object
	 * @param {string} key
	 */
	function defineWarningProperty(object, key) {
	  Object.defineProperty(object, key, {

	    configurable: false,
	    enumerable: true,

	    get: function() {
	      if (!this._store) {
	        return null;
	      }
	      return this._store[key];
	    },

	    set: function(value) {
	      ("production" !== process.env.NODE_ENV ? warning(
	        false,
	        'Don\'t set the %s property of the React element. Instead, ' +
	        'specify the correct value when initially creating the element.',
	        key
	      ) : null);
	      this._store[key] = value;
	    }

	  });
	}

	/**
	 * This is updated to true if the membrane is successfully created.
	 */
	var useMutationMembrane = false;

	/**
	 * Warn for mutations.
	 *
	 * @internal
	 * @param {object} element
	 */
	function defineMutationMembrane(prototype) {
	  try {
	    var pseudoFrozenProperties = {
	      props: true
	    };
	    for (var key in pseudoFrozenProperties) {
	      defineWarningProperty(prototype, key);
	    }
	    useMutationMembrane = true;
	  } catch (x) {
	    // IE will fail on defineProperty
	  }
	}

	/**
	 * Base constructor for all React elements. This is only used to make this
	 * work with a dynamic instanceof check. Nothing should live on this prototype.
	 *
	 * @param {*} type
	 * @param {string|object} ref
	 * @param {*} key
	 * @param {*} props
	 * @internal
	 */
	var ReactElement = function(type, key, ref, owner, context, props) {
	  // Built-in properties that belong on the element
	  this.type = type;
	  this.key = key;
	  this.ref = ref;

	  // Record the component responsible for creating this element.
	  this._owner = owner;

	  // TODO: Deprecate withContext, and then the context becomes accessible
	  // through the owner.
	  this._context = context;

	  if ("production" !== process.env.NODE_ENV) {
	    // The validation flag and props are currently mutative. We put them on
	    // an external backing store so that we can freeze the whole object.
	    // This can be replaced with a WeakMap once they are implemented in
	    // commonly used development environments.
	    this._store = {props: props, originalProps: assign({}, props)};

	    // To make comparing ReactElements easier for testing purposes, we make
	    // the validation flag non-enumerable (where possible, which should
	    // include every environment we run tests in), so the test framework
	    // ignores it.
	    try {
	      Object.defineProperty(this._store, 'validated', {
	        configurable: false,
	        enumerable: false,
	        writable: true
	      });
	    } catch (x) {
	    }
	    this._store.validated = false;

	    // We're not allowed to set props directly on the object so we early
	    // return and rely on the prototype membrane to forward to the backing
	    // store.
	    if (useMutationMembrane) {
	      Object.freeze(this);
	      return;
	    }
	  }

	  this.props = props;
	};

	// We intentionally don't expose the function on the constructor property.
	// ReactElement should be indistinguishable from a plain object.
	ReactElement.prototype = {
	  _isReactElement: true
	};

	if ("production" !== process.env.NODE_ENV) {
	  defineMutationMembrane(ReactElement.prototype);
	}

	ReactElement.createElement = function(type, config, children) {
	  var propName;

	  // Reserved names are extracted
	  var props = {};

	  var key = null;
	  var ref = null;

	  if (config != null) {
	    ref = config.ref === undefined ? null : config.ref;
	    key = config.key === undefined ? null : '' + config.key;
	    // Remaining properties are added to a new props object
	    for (propName in config) {
	      if (config.hasOwnProperty(propName) &&
	          !RESERVED_PROPS.hasOwnProperty(propName)) {
	        props[propName] = config[propName];
	      }
	    }
	  }

	  // Children can be more than one argument, and those are transferred onto
	  // the newly allocated props object.
	  var childrenLength = arguments.length - 2;
	  if (childrenLength === 1) {
	    props.children = children;
	  } else if (childrenLength > 1) {
	    var childArray = Array(childrenLength);
	    for (var i = 0; i < childrenLength; i++) {
	      childArray[i] = arguments[i + 2];
	    }
	    props.children = childArray;
	  }

	  // Resolve default props
	  if (type && type.defaultProps) {
	    var defaultProps = type.defaultProps;
	    for (propName in defaultProps) {
	      if (typeof props[propName] === 'undefined') {
	        props[propName] = defaultProps[propName];
	      }
	    }
	  }

	  return new ReactElement(
	    type,
	    key,
	    ref,
	    ReactCurrentOwner.current,
	    ReactContext.current,
	    props
	  );
	};

	ReactElement.createFactory = function(type) {
	  var factory = ReactElement.createElement.bind(null, type);
	  // Expose the type on the factory and the prototype so that it can be
	  // easily accessed on elements. E.g. <Foo />.type === Foo.type.
	  // This should not be named `constructor` since this may not be the function
	  // that created the element, and it may not even be a constructor.
	  // Legacy hook TODO: Warn if this is accessed
	  factory.type = type;
	  return factory;
	};

	ReactElement.cloneAndReplaceProps = function(oldElement, newProps) {
	  var newElement = new ReactElement(
	    oldElement.type,
	    oldElement.key,
	    oldElement.ref,
	    oldElement._owner,
	    oldElement._context,
	    newProps
	  );

	  if ("production" !== process.env.NODE_ENV) {
	    // If the key on the original is valid, then the clone is valid
	    newElement._store.validated = oldElement._store.validated;
	  }
	  return newElement;
	};

	ReactElement.cloneElement = function(element, config, children) {
	  var propName;

	  // Original props are copied
	  var props = assign({}, element.props);

	  // Reserved names are extracted
	  var key = element.key;
	  var ref = element.ref;

	  // Owner will be preserved, unless ref is overridden
	  var owner = element._owner;

	  if (config != null) {
	    if (config.ref !== undefined) {
	      // Silently steal the ref from the parent.
	      ref = config.ref;
	      owner = ReactCurrentOwner.current;
	    }
	    if (config.key !== undefined) {
	      key = '' + config.key;
	    }
	    // Remaining properties override existing props
	    for (propName in config) {
	      if (config.hasOwnProperty(propName) &&
	          !RESERVED_PROPS.hasOwnProperty(propName)) {
	        props[propName] = config[propName];
	      }
	    }
	  }

	  // Children can be more than one argument, and those are transferred onto
	  // the newly allocated props object.
	  var childrenLength = arguments.length - 2;
	  if (childrenLength === 1) {
	    props.children = children;
	  } else if (childrenLength > 1) {
	    var childArray = Array(childrenLength);
	    for (var i = 0; i < childrenLength; i++) {
	      childArray[i] = arguments[i + 2];
	    }
	    props.children = childArray;
	  }

	  return new ReactElement(
	    element.type,
	    key,
	    ref,
	    owner,
	    element._context,
	    props
	  );
	};

	/**
	 * @param {?object} object
	 * @return {boolean} True if `object` is a valid component.
	 * @final
	 */
	ReactElement.isValidElement = function(object) {
	  // ReactTestUtils is often used outside of beforeEach where as React is
	  // within it. This leads to two different instances of React on the same
	  // page. To identify a element from a different React instance we use
	  // a flag instead of an instanceof check.
	  var isElement = !!(object && object._isReactElement);
	  // if (isElement && !(object instanceof ReactElement)) {
	  // This is an indicator that you're using multiple versions of React at the
	  // same time. This will screw with ownership and stuff. Fix it, please.
	  // TODO: We could possibly warn here.
	  // }
	  return isElement;
	};

	module.exports = ReactElement;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 158 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactPropTransferer
	 */

	'use strict';

	var assign = __webpack_require__(175);
	var emptyFunction = __webpack_require__(174);
	var joinClasses = __webpack_require__(176);

	/**
	 * Creates a transfer strategy that will merge prop values using the supplied
	 * `mergeStrategy`. If a prop was previously unset, this just sets it.
	 *
	 * @param {function} mergeStrategy
	 * @return {function}
	 */
	function createTransferStrategy(mergeStrategy) {
	  return function(props, key, value) {
	    if (!props.hasOwnProperty(key)) {
	      props[key] = value;
	    } else {
	      props[key] = mergeStrategy(props[key], value);
	    }
	  };
	}

	var transferStrategyMerge = createTransferStrategy(function(a, b) {
	  // `merge` overrides the first object's (`props[key]` above) keys using the
	  // second object's (`value`) keys. An object's style's existing `propA` would
	  // get overridden. Flip the order here.
	  return assign({}, b, a);
	});

	/**
	 * Transfer strategies dictate how props are transferred by `transferPropsTo`.
	 * NOTE: if you add any more exceptions to this list you should be sure to
	 * update `cloneWithProps()` accordingly.
	 */
	var TransferStrategies = {
	  /**
	   * Never transfer `children`.
	   */
	  children: emptyFunction,
	  /**
	   * Transfer the `className` prop by merging them.
	   */
	  className: createTransferStrategy(joinClasses),
	  /**
	   * Transfer the `style` prop (which is an object) by merging them.
	   */
	  style: transferStrategyMerge
	};

	/**
	 * Mutates the first argument by transferring the properties from the second
	 * argument.
	 *
	 * @param {object} props
	 * @param {object} newProps
	 * @return {object}
	 */
	function transferInto(props, newProps) {
	  for (var thisKey in newProps) {
	    if (!newProps.hasOwnProperty(thisKey)) {
	      continue;
	    }

	    var transferStrategy = TransferStrategies[thisKey];

	    if (transferStrategy && TransferStrategies.hasOwnProperty(thisKey)) {
	      transferStrategy(props, thisKey, newProps[thisKey]);
	    } else if (!props.hasOwnProperty(thisKey)) {
	      props[thisKey] = newProps[thisKey];
	    }
	  }
	  return props;
	}

	/**
	 * ReactPropTransferer are capable of transferring props to another component
	 * using a `transferPropsTo` method.
	 *
	 * @class ReactPropTransferer
	 */
	var ReactPropTransferer = {

	  /**
	   * Merge two props objects using TransferStrategies.
	   *
	   * @param {object} oldProps original props (they take precedence)
	   * @param {object} newProps new props to merge in
	   * @return {object} a new object containing both sets of props merged.
	   */
	  mergeProps: function(oldProps, newProps) {
	    return transferInto(assign({}, oldProps), newProps);
	  }

	};

	module.exports = ReactPropTransferer;


/***/ },
/* 159 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule keyOf
	 */

	/**
	 * Allows extraction of a minified key. Let's the build system minify keys
	 * without loosing the ability to dynamically use key strings as values
	 * themselves. Pass in an object with a single key/val pair and it will return
	 * you the string key of that single record. Suppose you want to grab the
	 * value for a key 'className' inside of an object. Key/val minification may
	 * have aliased that key to be 'xa12'. keyOf({className: null}) will return
	 * 'xa12' in that case. Resolve keys you want to use once at startup time, then
	 * reuse those resolutions.
	 */
	var keyOf = function(oneKeyObj) {
	  var key;
	  for (key in oneKeyObj) {
	    if (!oneKeyObj.hasOwnProperty(key)) {
	      continue;
	    }
	    return key;
	  }
	  return null;
	};


	module.exports = keyOf;


/***/ },
/* 160 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule warning
	 */

	"use strict";

	var emptyFunction = __webpack_require__(174);

	/**
	 * Similar to invariant but only logs a warning if the condition is not met.
	 * This can be used to log issues in development environments in critical
	 * paths. Removing the logging code for production environments will keep the
	 * same logic and follow the same code paths.
	 */

	var warning = emptyFunction;

	if ("production" !== process.env.NODE_ENV) {
	  warning = function(condition, format ) {for (var args=[],$__0=2,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
	    if (format === undefined) {
	      throw new Error(
	        '`warning(condition, format, ...args)` requires a warning ' +
	        'message argument'
	      );
	    }

	    if (format.length < 10 || /^[s\W]*$/.test(format)) {
	      throw new Error(
	        'The warning format should be able to uniquely identify this ' +
	        'warning. Please, use a more descriptive format than: ' + format
	      );
	    }

	    if (format.indexOf('Failed Composite propType: ') === 0) {
	      return; // Ignore CompositeComponent proptype check.
	    }

	    if (!condition) {
	      var argIndex = 0;
	      var message = 'Warning: ' + format.replace(/%s/g, function()  {return args[argIndex++];});
	      console.warn(message);
	      try {
	        // --- Welcome to debugging React ---
	        // This error was thrown as a convenience so that you can use this stack
	        // to find the callsite that caused this warning to fire.
	        throw new Error(message);
	      } catch(x) {}
	    }
	  };
	}

	module.exports = warning;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 161 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	* @providesModule ReactComponentWithPureRenderMixin
	*/

	'use strict';

	var shallowEqual = __webpack_require__(179);

	/**
	 * If your React component's render function is "pure", e.g. it will render the
	 * same result given the same props and state, provide this Mixin for a
	 * considerable performance boost.
	 *
	 * Most React components have pure render functions.
	 *
	 * Example:
	 *
	 *   var ReactComponentWithPureRenderMixin =
	 *     require('ReactComponentWithPureRenderMixin');
	 *   React.createClass({
	 *     mixins: [ReactComponentWithPureRenderMixin],
	 *
	 *     render: function() {
	 *       return <div className={this.props.className}>foo</div>;
	 *     }
	 *   });
	 *
	 * Note: This only checks shallow equality for props and state. If these contain
	 * complex data structures this mixin may have false-negatives for deeper
	 * differences. Only mixin to components which have simple props and state, or
	 * use `forceUpdate()` when you know deep data structures have changed.
	 */
	var ReactComponentWithPureRenderMixin = {
	  shouldComponentUpdate: function(nextProps, nextState) {
	    return !shallowEqual(this.props, nextProps) ||
	           !shallowEqual(this.state, nextState);
	  }
	};

	module.exports = ReactComponentWithPureRenderMixin;


/***/ },
/* 162 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule normalizeWheel
	 * @typechecks
	 */

	"use strict";

	var UserAgent_DEPRECATED = __webpack_require__(183);

	var isEventSupported = __webpack_require__(184);


	// Reasonable defaults
	var PIXEL_STEP  = 10;
	var LINE_HEIGHT = 40;
	var PAGE_HEIGHT = 800;

	/**
	 * Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
	 * complicated, thus this doc is long and (hopefully) detailed enough to answer
	 * your questions.
	 *
	 * If you need to react to the mouse wheel in a predictable way, this code is
	 * like your bestest friend. * hugs *
	 *
	 * As of today, there are 4 DOM event types you can listen to:
	 *
	 *   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
	 *   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
	 *   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
	 *   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
	 *
	 * So what to do?  The is the best:
	 *
	 *   normalizeWheel.getEventType();
	 *
	 * In your event callback, use this code to get sane interpretation of the
	 * deltas.  This code will return an object with properties:
	 *
	 *   spinX   -- normalized spin speed (use for zoom) - x plane
	 *   spinY   -- " - y plane
	 *   pixelX  -- normalized distance (to pixels) - x plane
	 *   pixelY  -- " - y plane
	 *
	 * Wheel values are provided by the browser assuming you are using the wheel to
	 * scroll a web page by a number of lines or pixels (or pages).  Values can vary
	 * significantly on different platforms and browsers, forgetting that you can
	 * scroll at different speeds.  Some devices (like trackpads) emit more events
	 * at smaller increments with fine granularity, and some emit massive jumps with
	 * linear speed or acceleration.
	 *
	 * This code does its best to normalize the deltas for you:
	 *
	 *   - spin is trying to normalize how far the wheel was spun (or trackpad
	 *     dragged).  This is super useful for zoom support where you want to
	 *     throw away the chunky scroll steps on the PC and make those equal to
	 *     the slow and smooth tiny steps on the Mac. Key data: This code tries to
	 *     resolve a single slow step on a wheel to 1.
	 *
	 *   - pixel is normalizing the desired scroll delta in pixel units.  You'll
	 *     get the crazy differences between browsers, but at least it'll be in
	 *     pixels!
	 *
	 *   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
	 *     should translate to positive value zooming IN, negative zooming OUT.
	 *     This matches the newer 'wheel' event.
	 *
	 * Why are there spinX, spinY (or pixels)?
	 *
	 *   - spinX is a 2-finger side drag on the trackpad, and a shift + wheel turn
	 *     with a mouse.  It results in side-scrolling in the browser by default.
	 *
	 *   - spinY is what you expect -- it's the classic axis of a mouse wheel.
	 *
	 *   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
	 *     probably is by browsers in conjunction with fancy 3D controllers .. but
	 *     you know.
	 *
	 * Implementation info:
	 *
	 * Examples of 'wheel' event if you scroll slowly (down) by one step with an
	 * average mouse:
	 *
	 *   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
	 *   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
	 *   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
	 *   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
	 *   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
	 *
	 * On the trackpad:
	 *
	 *   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
	 *   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
	 *
	 * On other/older browsers.. it's more complicated as there can be multiple and
	 * also missing delta values.
	 *
	 * The 'wheel' event is more standard:
	 *
	 * http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
	 *
	 * The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
	 * deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
	 * backward compatibility with older events.  Those other values help us
	 * better normalize spin speed.  Example of what the browsers provide:
	 *
	 *                          | event.wheelDelta | event.detail
	 *        ------------------+------------------+--------------
	 *          Safari v5/OS X  |       -120       |       0
	 *          Safari v5/Win7  |       -120       |       0
	 *         Chrome v17/OS X  |       -120       |       0
	 *         Chrome v17/Win7  |       -120       |       0
	 *                IE9/Win7  |       -120       |   undefined
	 *         Firefox v4/OS X  |     undefined    |       1
	 *         Firefox v4/Win7  |     undefined    |       3
	 *
	 */
	function normalizeWheel(/*object*/ event) /*object*/ {
	  var sX = 0, sY = 0,       // spinX, spinY
	      pX = 0, pY = 0;       // pixelX, pixelY

	  // Legacy
	  if ('detail'      in event) { sY = event.detail; }
	  if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
	  if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
	  if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

	  // side scrolling on FF with DOMMouseScroll
	  if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
	    sX = sY;
	    sY = 0;
	  }

	  pX = sX * PIXEL_STEP;
	  pY = sY * PIXEL_STEP;

	  if ('deltaY' in event) { pY = event.deltaY; }
	  if ('deltaX' in event) { pX = event.deltaX; }

	  if ((pX || pY) && event.deltaMode) {
	    if (event.deltaMode == 1) {          // delta in LINE units
	      pX *= LINE_HEIGHT;
	      pY *= LINE_HEIGHT;
	    } else {                             // delta in PAGE units
	      pX *= PAGE_HEIGHT;
	      pY *= PAGE_HEIGHT;
	    }
	  }

	  // Fall-back if spin cannot be determined
	  if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
	  if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

	  return { spinX  : sX,
	           spinY  : sY,
	           pixelX : pX,
	           pixelY : pY };
	}


	/**
	 * The best combination if you prefer spinX + spinY normalization.  It favors
	 * the older DOMMouseScroll for Firefox, as FF does not include wheelDelta with
	 * 'wheel' event, making spin speed determination impossible.
	 */
	normalizeWheel.getEventType = function() /*string*/ {
	  return (UserAgent_DEPRECATED.firefox())
	           ? 'DOMMouseScroll'
	           : (isEventSupported('wheel'))
	               ? 'wheel'
	               : 'mousewheel';
	};

	module.exports = normalizeWheel;


/***/ },
/* 163 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule requestAnimationFramePolyfill
	 */

	var emptyFunction = __webpack_require__(148);
	var nativeRequestAnimationFrame = __webpack_require__(180);

	var lastTime = 0;

	/**
	 * Here is the native and polyfill version of requestAnimationFrame.
	 * Please don't use it directly and use requestAnimationFrame module instead.
	 */
	var requestAnimationFrame =
	  nativeRequestAnimationFrame ||
	  function(callback) {
	    var currTime = Date.now();
	    var timeDelay = Math.max(0, 16 - (currTime - lastTime));
	    lastTime = currTime + timeDelay;
	    return global.setTimeout(function() {
	      callback(Date.now());
	    }, timeDelay);
	  };

	// Works around a rare bug in Safari 6 where the first request is never invoked.
	requestAnimationFrame(emptyFunction);

	module.exports = requestAnimationFrame;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 164 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule DOMMouseMoveTracker
	 * @typechecks
	 */

	"use strict";

	var EventListener = __webpack_require__(181);

	var cancelAnimationFramePolyfill = __webpack_require__(182);
	var requestAnimationFramePolyfill = __webpack_require__(163);


	  /**
	   * onMove is the callback that will be called on every mouse move.
	   * onMoveEnd is called on mouse up when movement has ended.
	   */
	  function DOMMouseMoveTracker(
	onMove,
	    /*function*/ onMoveEnd,
	    /*DOMElement*/ domNode) {
	    this.$DOMMouseMoveTracker_isDragging = false;
	    this.$DOMMouseMoveTracker_animationFrameID = null;
	    this.$DOMMouseMoveTracker_domNode = domNode;
	    this.$DOMMouseMoveTracker_onMove = onMove;
	    this.$DOMMouseMoveTracker_onMoveEnd = onMoveEnd;
	    this.$DOMMouseMoveTracker_onMouseMove = this.$DOMMouseMoveTracker_onMouseMove.bind(this);
	    this.$DOMMouseMoveTracker_onMouseUp = this.$DOMMouseMoveTracker_onMouseUp.bind(this);
	    this.$DOMMouseMoveTracker_didMouseMove = this.$DOMMouseMoveTracker_didMouseMove.bind(this);
	  }

	  /**
	   * This is to set up the listeners for listening to mouse move
	   * and mouse up signaling the movement has ended. Please note that these
	   * listeners are added at the document.body level. It takes in an event
	   * in order to grab inital state.
	   */
	  DOMMouseMoveTracker.prototype.captureMouseMoves=function(event) {
	    if (!this.$DOMMouseMoveTracker_eventMoveToken && !this.$DOMMouseMoveTracker_eventUpToken) {
	      this.$DOMMouseMoveTracker_eventMoveToken = EventListener.listen(
	        this.$DOMMouseMoveTracker_domNode,
	        'mousemove',
	        this.$DOMMouseMoveTracker_onMouseMove
	      );
	      this.$DOMMouseMoveTracker_eventUpToken = EventListener.listen(
	        this.$DOMMouseMoveTracker_domNode,
	        'mouseup',
	        this.$DOMMouseMoveTracker_onMouseUp
	      );
	    }

	    if (!this.$DOMMouseMoveTracker_isDragging) {
	      this.$DOMMouseMoveTracker_deltaX = 0;
	      this.$DOMMouseMoveTracker_deltaY = 0;
	      this.$DOMMouseMoveTracker_isDragging = true;
	      this.$DOMMouseMoveTracker_x = event.clientX;
	      this.$DOMMouseMoveTracker_y = event.clientY;
	    }
	    event.preventDefault();
	  };

	  /**
	   * These releases all of the listeners on document.body.
	   */
	  DOMMouseMoveTracker.prototype.releaseMouseMoves=function() {
	    if (this.$DOMMouseMoveTracker_eventMoveToken && this.$DOMMouseMoveTracker_eventUpToken) {
	      this.$DOMMouseMoveTracker_eventMoveToken.remove();
	      this.$DOMMouseMoveTracker_eventMoveToken = null;
	      this.$DOMMouseMoveTracker_eventUpToken.remove();
	      this.$DOMMouseMoveTracker_eventUpToken = null;
	    }

	    if (this.$DOMMouseMoveTracker_animationFrameID !== null) {
	      cancelAnimationFramePolyfill(this.$DOMMouseMoveTracker_animationFrameID);
	      this.$DOMMouseMoveTracker_animationFrameID = null;
	    }

	    if (this.$DOMMouseMoveTracker_isDragging) {
	      this.$DOMMouseMoveTracker_isDragging = false;
	      this.$DOMMouseMoveTracker_x = null;
	      this.$DOMMouseMoveTracker_y = null;
	    }
	  };

	  /**
	   * Returns whether or not if the mouse movement is being tracked.
	   */
	  DOMMouseMoveTracker.prototype.isDragging=function() {
	    return this.$DOMMouseMoveTracker_isDragging;
	  };

	  /**
	   * Calls onMove passed into constructor and updates internal state.
	   */
	  DOMMouseMoveTracker.prototype.$DOMMouseMoveTracker_onMouseMove=function(event) {
	    var x = event.clientX;
	    var y = event.clientY;

	    this.$DOMMouseMoveTracker_deltaX += (x - this.$DOMMouseMoveTracker_x);
	    this.$DOMMouseMoveTracker_deltaY += (y - this.$DOMMouseMoveTracker_y);

	    if (this.$DOMMouseMoveTracker_animationFrameID === null) {
	      // The mouse may move faster then the animation frame does.
	      // Use `requestAnimationFramePolyfill` to avoid over-updating.
	      this.$DOMMouseMoveTracker_animationFrameID =
	        requestAnimationFramePolyfill(this.$DOMMouseMoveTracker_didMouseMove);
	    }

	    this.$DOMMouseMoveTracker_x = x;
	    this.$DOMMouseMoveTracker_y = y;
	    event.preventDefault();
	  };

	  DOMMouseMoveTracker.prototype.$DOMMouseMoveTracker_didMouseMove=function() {
	    this.$DOMMouseMoveTracker_animationFrameID = null;
	    this.$DOMMouseMoveTracker_onMove(this.$DOMMouseMoveTracker_deltaX, this.$DOMMouseMoveTracker_deltaY);
	    this.$DOMMouseMoveTracker_deltaX = 0;
	    this.$DOMMouseMoveTracker_deltaY = 0;
	  };

	  /**
	   * Calls onMoveEnd passed into constructor and updates internal state.
	   */
	  DOMMouseMoveTracker.prototype.$DOMMouseMoveTracker_onMouseUp=function() {
	    if (this.$DOMMouseMoveTracker_animationFrameID) {
	      this.$DOMMouseMoveTracker_didMouseMove();
	    }
	    this.$DOMMouseMoveTracker_onMoveEnd();
	  };


	module.exports = DOMMouseMoveTracker;


/***/ },
/* 165 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Keys
	 */

	module.exports = {
	  BACKSPACE:  8,
	  TAB:        9,
	  RETURN:    13,
	  ALT:       18,
	  ESC:       27,
	  SPACE:     32,
	  PAGE_UP:   33,
	  PAGE_DOWN: 34,
	  END:       35,
	  HOME:      36,
	  LEFT:      37,
	  UP:        38,
	  RIGHT:     39,
	  DOWN:      40,
	  DELETE:    46,
	  COMMA:    188,
	  PERIOD:   190,
	  A:         65,
	  Z:         90,
	  ZERO:      48,
	  NUMPAD_0:  96,
	  NUMPAD_9: 105
	};


/***/ },
/* 166 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule cssVar
	 * @typechecks
	 */

	"use strict";

	var CSS_VARS = {
	  'scrollbar-face-active-color': '#7d7d7d',
	  'scrollbar-face-color': '#c2c2c2',
	  'scrollbar-face-margin': '4px',
	  'scrollbar-face-radius': '6px',
	  'scrollbar-size': '15px',
	  'scrollbar-size-large': '17px',
	  'scrollbar-track-color': 'rgba(255, 255, 255, 0.8)',
	};

	/**
	 * @param {string} name
	 */
	function cssVar(name) {
	  if (CSS_VARS.hasOwnProperty(name)) {
	    return CSS_VARS[name];
	  }

	  throw new Error(
	    'cssVar' + '("' + name + '"): Unexpected class transformation.'
	  );
	}

	cssVar.CSS_VARS = CSS_VARS;

	module.exports = cssVar;


/***/ },
/* 167 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule PrefixIntervalTree
	 * @typechecks
	 */

	"use strict";

	/**
	 * An interval tree that allows to set a number at index and given the value
	 * find the largest index for which prefix sum is greater than or equal to value
	 * (lower bound) or greater than value (upper bound)
	 * Complexity:
	 *   construct: O(n)
	 *   query: O(log(n))
	 *   memory: O(log(n)),
	 * where n is leafCount from the constructor
	 */

	  function PrefixIntervalTree(leafCount, /*?number*/ initialLeafValue) {
	    var internalLeafCount = this.getInternalLeafCount(leafCount);
	    this.$PrefixIntervalTree_leafCount = leafCount;
	    this.$PrefixIntervalTree_internalLeafCount = internalLeafCount;
	    var nodeCount = 2 * internalLeafCount;
	    var Int32Array = global.Int32Array || Array;
	    this.$PrefixIntervalTree_value = new Int32Array(nodeCount);
	    this.$PrefixIntervalTree_initTables(initialLeafValue || 0);

	    this.get = this.get.bind(this);
	    this.set = this.set.bind(this);
	    this.lowerBound = this.lowerBound.bind(this);
	    this.upperBound = this.upperBound.bind(this);
	  }

	  PrefixIntervalTree.prototype.getInternalLeafCount=function(leafCount)  {
	    var internalLeafCount = 1;
	    while (internalLeafCount < leafCount) {
	      internalLeafCount *= 2;
	    }
	    return internalLeafCount;
	  };

	  PrefixIntervalTree.prototype.$PrefixIntervalTree_initTables=function(initialLeafValue) {
	    var firstLeaf = this.$PrefixIntervalTree_internalLeafCount;
	    var lastLeaf = this.$PrefixIntervalTree_internalLeafCount + this.$PrefixIntervalTree_leafCount - 1;
	    var i;
	    for (i = firstLeaf; i <= lastLeaf; ++i) {
	      this.$PrefixIntervalTree_value[i] = initialLeafValue;
	    }
	    var lastInternalNode = this.$PrefixIntervalTree_internalLeafCount - 1;
	    for (i = lastInternalNode; i > 0; --i) {
	      this.$PrefixIntervalTree_value[i] =  this.$PrefixIntervalTree_value[2 * i] + this.$PrefixIntervalTree_value[2 * i + 1];
	    }
	  };

	  PrefixIntervalTree.prototype.set=function(position, /*number*/ value) {
	    var nodeIndex = position + this.$PrefixIntervalTree_internalLeafCount;
	    this.$PrefixIntervalTree_value[nodeIndex] = value;
	    nodeIndex = Math.floor(nodeIndex / 2);
	    while (nodeIndex !== 0) {
	      this.$PrefixIntervalTree_value[nodeIndex] =
	        this.$PrefixIntervalTree_value[2 * nodeIndex] + this.$PrefixIntervalTree_value[2 * nodeIndex + 1];
	      nodeIndex = Math.floor(nodeIndex / 2);
	    }
	  };

	  /**
	   * Returns an object {index, value} for given position (including value at
	   * specified position), or the same for last position if provided position
	   * is out of range
	   */
	  PrefixIntervalTree.prototype.get=function(position)  {
	    position = Math.min(position, this.$PrefixIntervalTree_leafCount);
	    var nodeIndex = position + this.$PrefixIntervalTree_internalLeafCount;
	    var result = this.$PrefixIntervalTree_value[nodeIndex];
	    while (nodeIndex > 1) {
	      if (nodeIndex % 2 === 1) {
	        result = this.$PrefixIntervalTree_value[nodeIndex - 1] + result;
	      }
	      nodeIndex = Math.floor(nodeIndex / 2);
	    }
	    return {index: position, value: result};
	  };

	  /**
	   * Returns an object {index, value} where index is index of leaf that was
	   * found by upper bound algorithm. Upper bound finds first element for which
	   * value is greater than argument
	   */
	  PrefixIntervalTree.prototype.upperBound=function(value)  {
	    var result = this.$PrefixIntervalTree_upperBoundImpl(1, 0, this.$PrefixIntervalTree_internalLeafCount - 1, value);
	    if (result.index > this.$PrefixIntervalTree_leafCount - 1) {
	      result.index = this.$PrefixIntervalTree_leafCount - 1;
	    }
	    return result;
	  };

	  /**
	   * Returns result in the same format as upperBound, but finds first element
	   * for which value is greater than or equal to argument
	   */
	  PrefixIntervalTree.prototype.lowerBound=function(value)  {
	    var result = this.upperBound(value);
	    if (result.value > value && result.index > 0) {
	      var previousValue =
	        result.value - this.$PrefixIntervalTree_value[this.$PrefixIntervalTree_internalLeafCount + result.index];
	      if (previousValue === value) {
	        result.value = previousValue;
	        result.index--;
	      }
	    }
	    return result;
	  };

	  PrefixIntervalTree.prototype.$PrefixIntervalTree_upperBoundImpl=function(
	nodeIndex,
	    /*number*/ nodeIntervalBegin,
	    /*number*/ nodeIntervalEnd,
	    /*number*/ value)
	    {
	    if (nodeIntervalBegin === nodeIntervalEnd) {
	      return {
	        index: nodeIndex - this.$PrefixIntervalTree_internalLeafCount,
	        value: this.$PrefixIntervalTree_value[nodeIndex],
	      };
	    }

	    var nodeIntervalMidpoint =
	      Math.floor((nodeIntervalBegin + nodeIntervalEnd + 1) / 2);
	    if (value < this.$PrefixIntervalTree_value[nodeIndex * 2]) {
	      return this.$PrefixIntervalTree_upperBoundImpl(
	        2 * nodeIndex,
	        nodeIntervalBegin,
	        nodeIntervalMidpoint - 1,
	        value
	      );
	    } else {
	      var result = this.$PrefixIntervalTree_upperBoundImpl(
	        2 * nodeIndex + 1,
	        nodeIntervalMidpoint,
	        nodeIntervalEnd,
	        value - this.$PrefixIntervalTree_value[2 * nodeIndex]
	      );
	      result.value += this.$PrefixIntervalTree_value[2 * nodeIndex];
	      return result;
	    }
	  };


	module.exports = PrefixIntervalTree;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 168 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule clamp
	 * @typechecks
	 */

	 /**
	  * @param {number} min
	  * @param {number} value
	  * @param {number} max
	  * @return {number}
	  */
	function clamp(min, value, max) {
	  if (value < min) {
	    return min;
	  }
	  if (value > max) {
	    return max;
	  }
	  return value;
	}

	module.exports = clamp;


/***/ },
/* 169 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableRowBuffer
	 * @typechecks
	 */
	'use strict';

	var IntegerBufferSet = __webpack_require__(185);

	var clamp = __webpack_require__(168);
	var invariant = __webpack_require__(149);
	var MIN_BUFFER_ROWS = 5;
	var MAX_BUFFER_ROWS = 15;

	// FixedDataTableRowBuffer is a helper class that executes row buffering
	// logic for FixedDataTable. It figures out which rows should be rendered
	// and in which positions.

	  function FixedDataTableRowBuffer(
	rowsCount,
	    /*number*/  defaultRowHeight,
	    /*number*/ viewportHeight,
	    /*?function*/ rowHeightGetter)
	   {
	    invariant(
	      defaultRowHeight !== 0,
	      "defaultRowHeight musn't be equal 0 in FixedDataTableRowBuffer"
	    );

	    this.$FixedDataTableRowBuffer_bufferSet = new IntegerBufferSet();
	    this.$FixedDataTableRowBuffer_defaultRowHeight = defaultRowHeight;
	    this.$FixedDataTableRowBuffer_viewportRowsBegin = 0;
	    this.$FixedDataTableRowBuffer_viewportRowsEnd = 0;
	    this.$FixedDataTableRowBuffer_maxVisibleRowCount = Math.ceil(viewportHeight / defaultRowHeight) + 1;
	    this.$FixedDataTableRowBuffer_bufferRowsCount = clamp(
	      MIN_BUFFER_ROWS,
	      Math.floor(this.$FixedDataTableRowBuffer_maxVisibleRowCount/2),
	      MAX_BUFFER_ROWS
	    );
	    this.$FixedDataTableRowBuffer_rowsCount = rowsCount;
	    this.$FixedDataTableRowBuffer_rowHeightGetter = rowHeightGetter;
	    this.$FixedDataTableRowBuffer_rows = [];
	    this.$FixedDataTableRowBuffer_viewportHeight = viewportHeight;

	    this.getRows = this.getRows.bind(this);
	    this.getRowsWithUpdatedBuffer = this.getRowsWithUpdatedBuffer.bind(this);
	  }

	  FixedDataTableRowBuffer.prototype.getRowsWithUpdatedBuffer=function()  {
	    var remainingBufferRows = 2 * this.$FixedDataTableRowBuffer_bufferRowsCount;
	    var bufferRowIndex =
	      Math.max(this.$FixedDataTableRowBuffer_viewportRowsBegin - this.$FixedDataTableRowBuffer_bufferRowsCount, 0);
	    while (bufferRowIndex < this.$FixedDataTableRowBuffer_viewportRowsBegin) {
	      this.$FixedDataTableRowBuffer_addRowToBuffer(
	        bufferRowIndex,
	        this.$FixedDataTableRowBuffer_viewportHeight,
	        this.$FixedDataTableRowBuffer_viewportRowsBegin,
	        this.$FixedDataTableRowBuffer_viewportRowsEnd -1
	      );
	      bufferRowIndex++;
	      remainingBufferRows--;
	    }
	    bufferRowIndex = this.$FixedDataTableRowBuffer_viewportRowsEnd;
	    while (bufferRowIndex < this.$FixedDataTableRowBuffer_rowsCount && remainingBufferRows > 0) {
	      this.$FixedDataTableRowBuffer_addRowToBuffer(
	        bufferRowIndex,
	        this.$FixedDataTableRowBuffer_viewportHeight,
	        this.$FixedDataTableRowBuffer_viewportRowsBegin,
	        this.$FixedDataTableRowBuffer_viewportRowsEnd -1
	      );
	      bufferRowIndex++;
	      remainingBufferRows--;
	    }
	    return this.$FixedDataTableRowBuffer_rows;
	  };

	  FixedDataTableRowBuffer.prototype.getRows=function(
	firstRowIndex,
	    /*number*/ firstRowOffset)
	    {
	    // Update offsets of all rows to move them outside of viewport. Later we
	    // will bring rows that we should show to their right offsets.
	    this.$FixedDataTableRowBuffer_hideAllRows();

	    var top = firstRowOffset;
	    var totalHeight = top;
	    var rowIndex = firstRowIndex;
	    var endIndex =
	      Math.min(firstRowIndex + this.$FixedDataTableRowBuffer_maxVisibleRowCount, this.$FixedDataTableRowBuffer_rowsCount);

	    this.$FixedDataTableRowBuffer_viewportRowsBegin = firstRowIndex;
	    while (rowIndex < endIndex ||
	        (totalHeight < this.$FixedDataTableRowBuffer_viewportHeight && rowIndex < this.$FixedDataTableRowBuffer_rowsCount)) {
	      this.$FixedDataTableRowBuffer_addRowToBuffer(
	        rowIndex,
	        totalHeight,
	        firstRowIndex,
	        endIndex - 1
	      );
	      totalHeight += this.$FixedDataTableRowBuffer_rowHeightGetter(rowIndex);
	      ++rowIndex;
	      // Store index after the last viewport row as end, to be able to
	      // distinguish when there are no rows rendered in viewport
	      this.$FixedDataTableRowBuffer_viewportRowsEnd = rowIndex;
	    }

	    return this.$FixedDataTableRowBuffer_rows;
	  };

	  FixedDataTableRowBuffer.prototype.$FixedDataTableRowBuffer_addRowToBuffer=function(
	rowIndex,
	    /*number*/ offsetTop,
	    /*number*/ firstViewportRowIndex,
	    /*number*/ lastViewportRowIndex)
	   {
	      var rowPosition = this.$FixedDataTableRowBuffer_bufferSet.getValuePosition(rowIndex);
	      var viewportRowsCount = lastViewportRowIndex - firstViewportRowIndex + 1;
	      var allowedRowsCount = viewportRowsCount + this.$FixedDataTableRowBuffer_bufferRowsCount * 2;
	      if (rowPosition === null &&
	          this.$FixedDataTableRowBuffer_bufferSet.getSize() >= allowedRowsCount) {
	        rowPosition =
	          this.$FixedDataTableRowBuffer_bufferSet.replaceFurthestValuePosition(
	            firstViewportRowIndex,
	            lastViewportRowIndex,
	            rowIndex
	          );
	      }
	      if (rowPosition === null) {
	        // We can't reuse any of existing positions for this row. We have to
	        // create new position
	        rowPosition = this.$FixedDataTableRowBuffer_bufferSet.getNewPositionForValue(rowIndex);
	        this.$FixedDataTableRowBuffer_rows[rowPosition] = {
	          rowIndex:rowIndex,
	          offsetTop:offsetTop,
	        };
	      } else {
	        // This row already is in the table with rowPosition position or it
	        // can replace row that is in that position
	        this.$FixedDataTableRowBuffer_rows[rowPosition].rowIndex = rowIndex;
	        this.$FixedDataTableRowBuffer_rows[rowPosition].offsetTop = offsetTop;
	      }
	  };

	  FixedDataTableRowBuffer.prototype.$FixedDataTableRowBuffer_hideAllRows=function() {
	    var i = this.$FixedDataTableRowBuffer_rows.length - 1;
	    while (i > -1) {
	      this.$FixedDataTableRowBuffer_rows[i].offsetTop = this.$FixedDataTableRowBuffer_viewportHeight;
	      i--;
	    }
	  };


	module.exports = FixedDataTableRowBuffer;


/***/ },
/* 170 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule joinClasses
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Combines multiple className strings into one.
	 * http://jsperf.com/joinclasses-args-vs-array
	 *
	 * @param {...?string} classes
	 * @return {string}
	 */
	function joinClasses(className/*, ... */) {
	  if (!className) {
	    className = '';
	  }
	  var nextClass;
	  var argLength = arguments.length;
	  if (argLength > 1) {
	    for (var ii = 1; ii < argLength; ii++) {
	      nextClass = arguments[ii];
	      if (nextClass) {
	        className = (className ? className + ' ' : '') + nextClass;
	      }
	    }
	  }
	  return className;
	}

	module.exports = joinClasses;


/***/ },
/* 171 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableCellGroup.react
	 * @typechecks
	 */

	"use strict";

	var FixedDataTableHelper = __webpack_require__(135);
	var ImmutableObject = __webpack_require__(186);
	var React = __webpack_require__(134);
	var ReactComponentWithPureRenderMixin = __webpack_require__(137);
	var FixedDataTableCell = __webpack_require__(187);

	var cx = __webpack_require__(146);
	var renderToString = FixedDataTableHelper.renderToString;
	var translateDOMPositionXY = __webpack_require__(151);

	var PropTypes = React.PropTypes;

	var EMPTY_OBJECT = new ImmutableObject({});

	var FixedDataTableCellGroupImpl = React.createClass({displayName: "FixedDataTableCellGroupImpl",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {

	    /**
	     * Array of <FixedDataTableColumn />.
	     */
	    columns: PropTypes.array.isRequired,

	    /**
	     * The row data to render. The data format can be a simple Map object
	     * or an Array of data.
	     */
	    data: PropTypes.oneOfType([
	      PropTypes.object,
	      PropTypes.array
	    ]),

	    onColumnResize: PropTypes.func,

	    rowHeight: PropTypes.number.isRequired,

	    rowIndex: PropTypes.number.isRequired,

	    zIndex: PropTypes.number.isRequired,
	  },

	  render:function() /*object*/ {
	    var props = this.props;
	    var columns = props.columns;
	    var cells = [];
	    var width = 0;

	    for (var i = 0, j = columns.length; i < j; i++) {
	      var columnProps = columns[i].props;
	      width += columnProps.width;
	      var key = 'cell_' + i;
	      cells.push(
	        this._renderCell(
	          props.data,
	          props.rowIndex,
	          props.rowHeight,
	          columnProps,
	          width,
	          key
	        )
	      );
	    }

	    var style = {
	      width: width,
	      height: props.height,
	      zIndex: props.zIndex
	    };

	    return (
	      React.createElement("div", {className: cx('fixedDataTableCellGroup/cellGroup'), style: style}, 
	        cells
	      )
	    );
	  },

	  _renderCell:function(
	    /*object|array*/ rowData,
	    /*number*/ rowIndex,
	    /*number*/ height,
	    /*object*/ columnProps,
	    /*?number*/ widthOffset,
	    /*string*/ key
	  ) /*object*/ {
	    var cellRenderer = columnProps.cellRenderer || renderToString;
	    var columnData = columnProps.columnData || EMPTY_OBJECT;
	    var cellDataKey = columnProps.dataKey;
	    var isFooterCell = columnProps.isFooterCell;
	    var isHeaderCell = columnProps.isHeaderCell;
	    var cellData;

	    if (isHeaderCell || isFooterCell) {
	      cellData = rowData[cellDataKey];
	    } else {
	      var cellDataGetter = columnProps.cellDataGetter;
	      cellData = cellDataGetter ?
	        cellDataGetter(cellDataKey, rowData) :
	        rowData[cellDataKey];
	    }

	    var cellIsResizable = columnProps.isResizable &&
	      this.props.onColumnResize;
	    var onColumnResize = cellIsResizable ? this.props.onColumnResize : null;

	    return (
	      React.createElement(FixedDataTableCell, {
	        align: columnProps.align, 
	        cellData: cellData, 
	        cellDataKey: cellDataKey, 
	        cellRenderer: cellRenderer, 
	        className: columnProps.cellClassName, 
	        columnData: columnData, 
	        height: height, 
	        isFooterCell: isFooterCell, 
	        isHeaderCell: isHeaderCell, 
	        key: key, 
	        maxWidth: columnProps.maxWidth, 
	        minWidth: columnProps.minWidth, 
	        onColumnResize: onColumnResize, 
	        rowData: rowData, 
	        rowIndex: rowIndex, 
	        width: columnProps.width, 
	        widthOffset: widthOffset}
	      )
	    );
	  },
	});

	var FixedDataTableCellGroup = React.createClass({displayName: "FixedDataTableCellGroup",
	  mixins: [ReactComponentWithPureRenderMixin],

	  propTypes: {
	    /**
	     * Height of the row.
	     */
	    height: PropTypes.number.isRequired,

	    left: PropTypes.number,

	    /**
	     * Z-index on which the row will be displayed. Used e.g. for keeping
	     * header and footer in front of other rows.
	     */
	    zIndex: PropTypes.number.isRequired,
	  },

	  render:function() /*object*/ {
	    var $__0=   this.props,left=$__0.left,props=(function(source, exclusion) {var rest = {};var hasOwn = Object.prototype.hasOwnProperty;if (source == null) {throw new TypeError();}for (var key in source) {if (hasOwn.call(source, key) && !hasOwn.call(exclusion, key)) {rest[key] = source[key];}}return rest;})($__0,{left:1});

	    var style = {
	      height: props.height,
	    };

	    if (left) {
	      translateDOMPositionXY(style, left, 0);
	    }

	    var onColumnResize = props.onColumnResize ? this._onColumnResize : null;

	    return (
	      React.createElement("div", {
	        style: style, 
	        className: cx('fixedDataTableCellGroup/cellGroupWrapper')}, 
	        React.createElement(FixedDataTableCellGroupImpl, React.__spread({}, 
	          props, 
	          {onColumnResize: onColumnResize})
	        )
	      )
	    );
	  },

	  _onColumnResize:function(
	    /*number*/ widthOffset,
	    /*number*/ width,
	    /*?number*/ minWidth,
	    /*?number*/ maxWidth,
	    /*string|number*/ cellDataKey,
	    /*object*/ event
	  ) {
	    this.props.onColumnResize && this.props.onColumnResize(
	      widthOffset,
	      this.props.left,
	      width,
	      minWidth,
	      maxWidth,
	      cellDataKey,
	      event
	    );
	  },
	});


	module.exports = FixedDataTableCellGroup;


/***/ },
/* 172 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule BrowserSupportCore
	 */


	var getVendorPrefixedName = __webpack_require__(173);

	var BrowserSupportCore = {
	  /**
	   * @return {bool} True if browser supports css animations.
	   */
	  hasCSSAnimations: function() {
	    return !!getVendorPrefixedName('animationName');
	  },

	  /**
	   * @return {bool} True if browser supports css transforms.
	   */
	  hasCSSTransforms: function() {
	    return !!getVendorPrefixedName('transform');
	  },

	  /**
	   * @return {bool} True if browser supports css 3d transforms.
	   */
	  hasCSS3DTransforms: function() {
	    return !!getVendorPrefixedName('perspective');
	  },

	  /**
	   * @return {bool} True if browser supports css transitions.
	   */
	  hasCSSTransitions: function() {
	    return !!getVendorPrefixedName('transition');
	  },
	};

	module.exports = BrowserSupportCore;


/***/ },
/* 173 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule getVendorPrefixedName
	 * @typechecks
	 */

	var ExecutionEnvironment = __webpack_require__(125);

	var camelize = __webpack_require__(188);
	var invariant = __webpack_require__(149);

	var memoized = {};
	var prefixes = ['Webkit', 'ms', 'Moz', 'O'];
	var prefixRegex = new RegExp('^(' + prefixes.join('|') + ')');
	var testStyle =
	  ExecutionEnvironment.canUseDOM ? document.createElement('div').style : {};

	function getWithPrefix(name) {
	  for (var i = 0; i < prefixes.length; i++) {
	    var prefixedName = prefixes[i] + name;
	    if (prefixedName in testStyle) {
	      return prefixedName;
	    }
	  }
	  return null;
	}

	/**
	 * @param {string} property Name of a css property to check for.
	 * @return {?string} property name supported in the browser, or null if not
	 * supported.
	 */
	function getVendorPrefixedName(property) {
	  var name = camelize(property);
	  if (memoized[name] === undefined) {
	    var capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
	    if (prefixRegex.test(capitalizedName)) {
	      invariant(
	        false,
	        'getVendorPrefixedName must only be called with unprefixed' +
	        'CSS property names. It was called with %s', property
	      );
	    }
	    memoized[name] =
	      (name in testStyle) ? name : getWithPrefix(capitalizedName);
	  }
	  return memoized[name];
	}

	module.exports = getVendorPrefixedName;


/***/ },
/* 174 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule emptyFunction
	 */

	function makeEmptyFunction(arg) {
	  return function() {
	    return arg;
	  };
	}

	/**
	 * This function accepts and discards inputs; it has no side effects. This is
	 * primarily useful idiomatically for overridable function endpoints which
	 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
	 */
	function emptyFunction() {}

	emptyFunction.thatReturns = makeEmptyFunction;
	emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
	emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
	emptyFunction.thatReturnsNull = makeEmptyFunction(null);
	emptyFunction.thatReturnsThis = function() { return this; };
	emptyFunction.thatReturnsArgument = function(arg) { return arg; };

	module.exports = emptyFunction;


/***/ },
/* 175 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2014-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Object.assign
	 */

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign

	'use strict';

	function assign(target, sources) {
	  if (target == null) {
	    throw new TypeError('Object.assign target cannot be null or undefined');
	  }

	  var to = Object(target);
	  var hasOwnProperty = Object.prototype.hasOwnProperty;

	  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
	    var nextSource = arguments[nextIndex];
	    if (nextSource == null) {
	      continue;
	    }

	    var from = Object(nextSource);

	    // We don't currently support accessors nor proxies. Therefore this
	    // copy cannot throw. If we ever supported this then we must handle
	    // exceptions and side-effects. We don't support symbols so they won't
	    // be transferred.

	    for (var key in from) {
	      if (hasOwnProperty.call(from, key)) {
	        to[key] = from[key];
	      }
	    }
	  }

	  return to;
	}

	module.exports = assign;


/***/ },
/* 176 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule joinClasses
	 * @typechecks static-only
	 */

	'use strict';

	/**
	 * Combines multiple className strings into one.
	 * http://jsperf.com/joinclasses-args-vs-array
	 *
	 * @param {...?string} classes
	 * @return {string}
	 */
	function joinClasses(className/*, ... */) {
	  if (!className) {
	    className = '';
	  }
	  var nextClass;
	  var argLength = arguments.length;
	  if (argLength > 1) {
	    for (var ii = 1; ii < argLength; ii++) {
	      nextClass = arguments[ii];
	      if (nextClass) {
	        className = (className ? className + ' ' : '') + nextClass;
	      }
	    }
	  }
	  return className;
	}

	module.exports = joinClasses;


/***/ },
/* 177 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactContext
	 */

	'use strict';

	var assign = __webpack_require__(175);
	var emptyObject = __webpack_require__(189);
	var warning = __webpack_require__(160);

	var didWarn = false;

	/**
	 * Keeps track of the current context.
	 *
	 * The context is automatically passed down the component ownership hierarchy
	 * and is accessible via `this.context` on ReactCompositeComponents.
	 */
	var ReactContext = {

	  /**
	   * @internal
	   * @type {object}
	   */
	  current: emptyObject,

	  /**
	   * Temporarily extends the current context while executing scopedCallback.
	   *
	   * A typical use case might look like
	   *
	   *  render: function() {
	   *    var children = ReactContext.withContext({foo: 'foo'}, () => (
	   *
	   *    ));
	   *    return <div>{children}</div>;
	   *  }
	   *
	   * @param {object} newContext New context to merge into the existing context
	   * @param {function} scopedCallback Callback to run with the new context
	   * @return {ReactComponent|array<ReactComponent>}
	   */
	  withContext: function(newContext, scopedCallback) {
	    if ("production" !== process.env.NODE_ENV) {
	      ("production" !== process.env.NODE_ENV ? warning(
	        didWarn,
	        'withContext is deprecated and will be removed in a future version. ' +
	        'Use a wrapper component with getChildContext instead.'
	      ) : null);

	      didWarn = true;
	    }

	    var result;
	    var previousContext = ReactContext.current;
	    ReactContext.current = assign({}, previousContext, newContext);
	    try {
	      result = scopedCallback();
	    } finally {
	      ReactContext.current = previousContext;
	    }
	    return result;
	  }

	};

	module.exports = ReactContext;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 178 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ReactCurrentOwner
	 */

	'use strict';

	/**
	 * Keeps track of the current owner.
	 *
	 * The current owner is the component who should own any components that are
	 * currently being constructed.
	 *
	 * The depth indicate how many composite components are above this render level.
	 */
	var ReactCurrentOwner = {

	  /**
	   * @internal
	   * @type {ReactComponent}
	   */
	  current: null

	};

	module.exports = ReactCurrentOwner;


/***/ },
/* 179 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule shallowEqual
	 */

	'use strict';

	/**
	 * Performs equality by iterating through keys on an object and returning
	 * false when any key has values which are not strictly equal between
	 * objA and objB. Returns true when the values of all keys are strictly equal.
	 *
	 * @return {boolean}
	 */
	function shallowEqual(objA, objB) {
	  if (objA === objB) {
	    return true;
	  }
	  var key;
	  // Test for A's keys different from B.
	  for (key in objA) {
	    if (objA.hasOwnProperty(key) &&
	        (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
	      return false;
	    }
	  }
	  // Test for B's keys missing from A.
	  for (key in objB) {
	    if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
	      return false;
	    }
	  }
	  return true;
	}

	module.exports = shallowEqual;


/***/ },
/* 180 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule nativeRequestAnimationFrame
	 */

	var nativeRequestAnimationFrame =
	  global.requestAnimationFrame       ||
	  global.webkitRequestAnimationFrame ||
	  global.mozRequestAnimationFrame    ||
	  global.oRequestAnimationFrame      ||
	  global.msRequestAnimationFrame;

	module.exports = nativeRequestAnimationFrame;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 181 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule EventListener
	 * @typechecks
	 */

	var emptyFunction = __webpack_require__(148);

	/**
	 * Upstream version of event listener. Does not take into account specific
	 * nature of platform.
	 */
	var EventListener = {
	  /**
	   * Listen to DOM events during the bubble phase.
	   *
	   * @param {DOMEventTarget} target DOM element to register listener on.
	   * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
	   * @param {function} callback Callback function.
	   * @return {object} Object with a `remove` method.
	   */
	  listen: function(target, eventType, callback) {
	    if (target.addEventListener) {
	      target.addEventListener(eventType, callback, false);
	      return {
	        remove: function() {
	          target.removeEventListener(eventType, callback, false);
	        }
	      };
	    } else if (target.attachEvent) {
	      target.attachEvent('on' + eventType, callback);
	      return {
	        remove: function() {
	          target.detachEvent('on' + eventType, callback);
	        }
	      };
	    }
	  },

	  /**
	   * Listen to DOM events during the capture phase.
	   *
	   * @param {DOMEventTarget} target DOM element to register listener on.
	   * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
	   * @param {function} callback Callback function.
	   * @return {object} Object with a `remove` method.
	   */
	  capture: function(target, eventType, callback) {
	    if (!target.addEventListener) {
	      if (process.env.NODE_ENV !== 'production') {
	        console.error(
	          'Attempted to listen to events during the capture phase on a ' +
	          'browser that does not support the capture phase. Your application ' +
	          'will not receive some events.'
	        );
	      }
	      return {
	        remove: emptyFunction
	      };
	    } else {
	      target.addEventListener(eventType, callback, true);
	      return {
	        remove: function() {
	          target.removeEventListener(eventType, callback, true);
	        }
	      };
	    }
	  },

	  registerDefault: function() {}
	};

	module.exports = EventListener;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 182 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule cancelAnimationFramePolyfill
	 */

	/**
	 * Here is the native and polyfill version of cancelAnimationFrame.
	 * Please don't use it directly and use cancelAnimationFrame module instead.
	 */
	var cancelAnimationFrame =
	  global.cancelAnimationFrame       ||
	  global.webkitCancelAnimationFrame ||
	  global.mozCancelAnimationFrame    ||
	  global.oCancelAnimationFrame      ||
	  global.msCancelAnimationFrame     ||
	  global.clearTimeout;

	module.exports = cancelAnimationFrame;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 183 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule UserAgent_DEPRECATED
	 */

	/**
	 *  Provides entirely client-side User Agent and OS detection. You should prefer
	 *  the non-deprecated UserAgent module when possible, which exposes our
	 *  authoritative server-side PHP-based detection to the client.
	 *
	 *  Usage is straightforward:
	 *
	 *    if (UserAgent_DEPRECATED.ie()) {
	 *      //  IE
	 *    }
	 *
	 *  You can also do version checks:
	 *
	 *    if (UserAgent_DEPRECATED.ie() >= 7) {
	 *      //  IE7 or better
	 *    }
	 *
	 *  The browser functions will return NaN if the browser does not match, so
	 *  you can also do version compares the other way:
	 *
	 *    if (UserAgent_DEPRECATED.ie() < 7) {
	 *      //  IE6 or worse
	 *    }
	 *
	 *  Note that the version is a float and may include a minor version number,
	 *  so you should always use range operators to perform comparisons, not
	 *  strict equality.
	 *
	 *  **Note:** You should **strongly** prefer capability detection to browser
	 *  version detection where it's reasonable:
	 *
	 *    http://www.quirksmode.org/js/support.html
	 *
	 *  Further, we have a large number of mature wrapper functions and classes
	 *  which abstract away many browser irregularities. Check the documentation,
	 *  grep for things, or ask on javascript@lists.facebook.com before writing yet
	 *  another copy of "event || window.event".
	 *
	 */

	var _populated = false;

	// Browsers
	var _ie, _firefox, _opera, _webkit, _chrome;

	// Actual IE browser for compatibility mode
	var _ie_real_version;

	// Platforms
	var _osx, _windows, _linux, _android;

	// Architectures
	var _win64;

	// Devices
	var _iphone, _ipad, _native;

	var _mobile;

	function _populate() {
	  if (_populated) {
	    return;
	  }

	  _populated = true;

	  // To work around buggy JS libraries that can't handle multi-digit
	  // version numbers, Opera 10's user agent string claims it's Opera
	  // 9, then later includes a Version/X.Y field:
	  //
	  // Opera/9.80 (foo) Presto/2.2.15 Version/10.10
	  var uas = navigator.userAgent;
	  var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/.exec(uas);
	  var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(uas);

	  _iphone = /\b(iPhone|iP[ao]d)/.exec(uas);
	  _ipad = /\b(iP[ao]d)/.exec(uas);
	  _android = /Android/i.exec(uas);
	  _native = /FBAN\/\w+;/i.exec(uas);
	  _mobile = /Mobile/i.exec(uas);

	  // Note that the IE team blog would have you believe you should be checking
	  // for 'Win64; x64'.  But MSDN then reveals that you can actually be coming
	  // from either x64 or ia64;  so ultimately, you should just check for Win64
	  // as in indicator of whether you're in 64-bit IE.  32-bit IE on 64-bit
	  // Windows will send 'WOW64' instead.
	  _win64 = !!(/Win64/.exec(uas));

	  if (agent) {
	    _ie = agent[1] ? parseFloat(agent[1]) : (
	          agent[5] ? parseFloat(agent[5]) : NaN);
	    // IE compatibility mode
	    if (_ie && document && document.documentMode) {
	      _ie = document.documentMode;
	    }
	    // grab the "true" ie version from the trident token if available
	    var trident = /(?:Trident\/(\d+.\d+))/.exec(uas);
	    _ie_real_version = trident ? parseFloat(trident[1]) + 4 : _ie;

	    _firefox = agent[2] ? parseFloat(agent[2]) : NaN;
	    _opera   = agent[3] ? parseFloat(agent[3]) : NaN;
	    _webkit  = agent[4] ? parseFloat(agent[4]) : NaN;
	    if (_webkit) {
	      // We do not add the regexp to the above test, because it will always
	      // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
	      // the userAgent string.
	      agent = /(?:Chrome\/(\d+\.\d+))/.exec(uas);
	      _chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
	    } else {
	      _chrome = NaN;
	    }
	  } else {
	    _ie = _firefox = _opera = _chrome = _webkit = NaN;
	  }

	  if (os) {
	    if (os[1]) {
	      // Detect OS X version.  If no version number matches, set _osx to true.
	      // Version examples:  10, 10_6_1, 10.7
	      // Parses version number as a float, taking only first two sets of
	      // digits.  If only one set of digits is found, returns just the major
	      // version number.
	      var ver = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(uas);

	      _osx = ver ? parseFloat(ver[1].replace('_', '.')) : true;
	    } else {
	      _osx = false;
	    }
	    _windows = !!os[2];
	    _linux   = !!os[3];
	  } else {
	    _osx = _windows = _linux = false;
	  }
	}

	var UserAgent_DEPRECATED = {

	  /**
	   *  Check if the UA is Internet Explorer.
	   *
	   *
	   *  @return float|NaN Version number (if match) or NaN.
	   */
	  ie: function() {
	    return _populate() || _ie;
	  },

	  /**
	   * Check if we're in Internet Explorer compatibility mode.
	   *
	   * @return bool true if in compatibility mode, false if
	   * not compatibility mode or not ie
	   */
	  ieCompatibilityMode: function() {
	    return _populate() || (_ie_real_version > _ie);
	  },


	  /**
	   * Whether the browser is 64-bit IE.  Really, this is kind of weak sauce;  we
	   * only need this because Skype can't handle 64-bit IE yet.  We need to remove
	   * this when we don't need it -- tracked by #601957.
	   */
	  ie64: function() {
	    return UserAgent_DEPRECATED.ie() && _win64;
	  },

	  /**
	   *  Check if the UA is Firefox.
	   *
	   *
	   *  @return float|NaN Version number (if match) or NaN.
	   */
	  firefox: function() {
	    return _populate() || _firefox;
	  },


	  /**
	   *  Check if the UA is Opera.
	   *
	   *
	   *  @return float|NaN Version number (if match) or NaN.
	   */
	  opera: function() {
	    return _populate() || _opera;
	  },


	  /**
	   *  Check if the UA is WebKit.
	   *
	   *
	   *  @return float|NaN Version number (if match) or NaN.
	   */
	  webkit: function() {
	    return _populate() || _webkit;
	  },

	  /**
	   *  For Push
	   *  WILL BE REMOVED VERY SOON. Use UserAgent_DEPRECATED.webkit
	   */
	  safari: function() {
	    return UserAgent_DEPRECATED.webkit();
	  },

	  /**
	   *  Check if the UA is a Chrome browser.
	   *
	   *
	   *  @return float|NaN Version number (if match) or NaN.
	   */
	  chrome : function() {
	    return _populate() || _chrome;
	  },


	  /**
	   *  Check if the user is running Windows.
	   *
	   *  @return bool `true' if the user's OS is Windows.
	   */
	  windows: function() {
	    return _populate() || _windows;
	  },


	  /**
	   *  Check if the user is running Mac OS X.
	   *
	   *  @return float|bool   Returns a float if a version number is detected,
	   *                       otherwise true/false.
	   */
	  osx: function() {
	    return _populate() || _osx;
	  },

	  /**
	   * Check if the user is running Linux.
	   *
	   * @return bool `true' if the user's OS is some flavor of Linux.
	   */
	  linux: function() {
	    return _populate() || _linux;
	  },

	  /**
	   * Check if the user is running on an iPhone or iPod platform.
	   *
	   * @return bool `true' if the user is running some flavor of the
	   *    iPhone OS.
	   */
	  iphone: function() {
	    return _populate() || _iphone;
	  },

	  mobile: function() {
	    return _populate() || (_iphone || _ipad || _android || _mobile);
	  },

	  nativeApp: function() {
	    // webviews inside of the native apps
	    return _populate() || _native;
	  },

	  android: function() {
	    return _populate() || _android;
	  },

	  ipad: function() {
	    return _populate() || _ipad;
	  }
	};

	module.exports = UserAgent_DEPRECATED;


/***/ },
/* 184 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isEventSupported
	 */

	'use strict';

	var ExecutionEnvironment = __webpack_require__(125);

	var useHasFeature;
	if (ExecutionEnvironment.canUseDOM) {
	  useHasFeature =
	    document.implementation &&
	    document.implementation.hasFeature &&
	    // always returns true in newer browsers as per the standard.
	    // @see http://dom.spec.whatwg.org/#dom-domimplementation-hasfeature
	    document.implementation.hasFeature('', '') !== true;
	}

	/**
	 * Checks if an event is supported in the current execution environment.
	 *
	 * NOTE: This will not work correctly for non-generic events such as `change`,
	 * `reset`, `load`, `error`, and `select`.
	 *
	 * Borrows from Modernizr.
	 *
	 * @param {string} eventNameSuffix Event name, e.g. "click".
	 * @param {?boolean} capture Check if the capture phase is supported.
	 * @return {boolean} True if the event is supported.
	 * @internal
	 * @license Modernizr 3.0.0pre (Custom Build) | MIT
	 */
	function isEventSupported(eventNameSuffix, capture) {
	  if (!ExecutionEnvironment.canUseDOM ||
	      capture && !('addEventListener' in document)) {
	    return false;
	  }

	  var eventName = 'on' + eventNameSuffix;
	  var isSupported = eventName in document;

	  if (!isSupported) {
	    var element = document.createElement('div');
	    element.setAttribute(eventName, 'return;');
	    isSupported = typeof element[eventName] === 'function';
	  }

	  if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
	    // This is the only way to test support for the `wheel` event in IE9+.
	    isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
	  }

	  return isSupported;
	}

	module.exports = isEventSupported;


/***/ },
/* 185 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule IntegerBufferSet
	 * @typechecks
	 */

	"use strict";

	var Heap = __webpack_require__(190);

	var invariant = __webpack_require__(149);

	// Data structure that allows to store values and assign positions to them
	// in a way to minimize changing positions of stored values when new ones are
	// added or when some values are replaced. Stored elements are alwasy assigned
	// a consecutive set of positoins startin from 0 up to count of elements less 1
	// Following actions can be executed
	// * get position assigned to given value (null if value is not stored)
	// * create new entry for new value and get assigned position back
	// * replace value that is furthest from specified value range with new value
	//   and get it's position back
	// All operations take amortized log(n) time where n is number of elements in
	// the set.

	  function IntegerBufferSet() {
	    this.$IntegerBufferSet_valueToPositionMap = {};
	    this.$IntegerBufferSet_size = 0;
	    this.$IntegerBufferSet_smallValues = new Heap(
	      [], // Initial data in the heap
	      this.$IntegerBufferSet_smallerComparator
	    );
	    this.$IntegerBufferSet_largeValues = new Heap(
	      [], // Initial data in the heap
	      this.$IntegerBufferSet_greaterComparator
	    );

	    this.getNewPositionForValue = this.getNewPositionForValue.bind(this);
	    this.getValuePosition = this.getValuePosition.bind(this);
	    this.getSize = this.getSize.bind(this);
	    this.replaceFurthestValuePosition =
	      this.replaceFurthestValuePosition.bind(this);
	  }

	  IntegerBufferSet.prototype.getSize=function()  {
	    return this.$IntegerBufferSet_size;
	  };

	  IntegerBufferSet.prototype.getValuePosition=function(value)  {
	    if (this.$IntegerBufferSet_valueToPositionMap[value] === undefined) {
	      return null;
	    }
	    return this.$IntegerBufferSet_valueToPositionMap[value];
	  };

	  IntegerBufferSet.prototype.getNewPositionForValue=function(value)  {
	    invariant(
	      this.$IntegerBufferSet_valueToPositionMap[value] === undefined,
	      "Shouldn't try to find new position for value already stored in BufferSet"
	    );
	    var newPosition = this.$IntegerBufferSet_size;
	    this.$IntegerBufferSet_size++;
	    this.$IntegerBufferSet_pushToHeaps(newPosition, value);
	    this.$IntegerBufferSet_valueToPositionMap[value] = newPosition;
	    return newPosition;
	  };

	  IntegerBufferSet.prototype.replaceFurthestValuePosition=function(
	lowValue,
	    /*number*/ highValue,
	    /*number*/ newValue)
	    {
	    invariant(
	      this.$IntegerBufferSet_valueToPositionMap[newValue] === undefined,
	      "Shouldn't try to replace values with value already stored value in " +
	      "BufferSet"
	    );

	    this.$IntegerBufferSet_cleanHeaps();
	    if (this.$IntegerBufferSet_smallValues.empty() || this.$IntegerBufferSet_largeValues.empty()) {
	      // Threre are currently no values stored. We will have to create new
	      // position for this value.
	      return null;
	    }

	    var minValue = this.$IntegerBufferSet_smallValues.peek().value;
	    var maxValue = this.$IntegerBufferSet_largeValues.peek().value;
	    if (minValue >= lowValue && maxValue <= highValue) {
	      // All values currently stored are necessary, we can't reuse any of them.
	      return null;
	    }

	    var valueToReplace;
	    if (lowValue - minValue > maxValue - highValue) {
	      // minValue is further from provided range. We will reuse it's position.
	      valueToReplace = minValue;
	      this.$IntegerBufferSet_smallValues.pop();
	    } else {
	      valueToReplace = maxValue;
	      this.$IntegerBufferSet_largeValues.pop();
	    }
	    var position = this.$IntegerBufferSet_valueToPositionMap[valueToReplace];
	    delete this.$IntegerBufferSet_valueToPositionMap[valueToReplace];
	    this.$IntegerBufferSet_valueToPositionMap[newValue] = position;
	    this.$IntegerBufferSet_pushToHeaps(position, newValue);

	    return position;
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_pushToHeaps=function(position, /*number*/ value) {
	    var element = {
	      position:position,
	      value:value,
	    };
	    // We can reuse the same object in both heaps, because we don't mutate them
	    this.$IntegerBufferSet_smallValues.push(element);
	    this.$IntegerBufferSet_largeValues.push(element);
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_cleanHeaps=function() {
	    // We not usually only remove object from one heap while moving value.
	    // Here we make sure that there is no stale data on top of heaps.
	    this.$IntegerBufferSet_cleanHeap(this.$IntegerBufferSet_smallValues);
	    this.$IntegerBufferSet_cleanHeap(this.$IntegerBufferSet_largeValues);
	    var minHeapSize =
	      Math.min(this.$IntegerBufferSet_smallValues.size(), this.$IntegerBufferSet_largeValues.size());
	    var maxHeapSize =
	      Math.max(this.$IntegerBufferSet_smallValues.size(), this.$IntegerBufferSet_largeValues.size());
	    if (maxHeapSize > 10 * minHeapSize) {
	      // There are many old values in one of heaps. We nned to get rid of them
	      // to not use too avoid memory leaks
	      this.$IntegerBufferSet_recreateHeaps();
	    }
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_recreateHeaps=function() {
	    var sourceHeap = this.$IntegerBufferSet_smallValues.size() < this.$IntegerBufferSet_largeValues.size() ?
	      this.$IntegerBufferSet_smallValues :
	      this.$IntegerBufferSet_largeValues;
	    var newSmallValues = new Heap(
	      [], // Initial data in the heap
	      this.$IntegerBufferSet_smallerComparator
	    );
	    var newLargeValues = new Heap(
	      [], // Initial datat in the heap
	      this.$IntegerBufferSet_greaterComparator
	    );
	    while (!sourceHeap.empty()) {
	      var element = sourceHeap.pop();
	      // Push all stil valid elements to new heaps
	      if (this.$IntegerBufferSet_valueToPositionMap[element.value] !== undefined) {
	        newSmallValues.push(element);
	        newLargeValues.push(element);
	      }
	    }
	    this.$IntegerBufferSet_smallValues = newSmallValues;
	    this.$IntegerBufferSet_largeValues = newLargeValues;
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_cleanHeap=function(heap) {
	    while (!heap.empty() &&
	        this.$IntegerBufferSet_valueToPositionMap[heap.peek().value] === undefined) {
	      heap.pop();
	    }
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_smallerComparator=function(lhs, /*object*/ rhs)  {
	    return lhs.value < rhs.value;
	  };

	  IntegerBufferSet.prototype.$IntegerBufferSet_greaterComparator=function(lhs, /*object*/ rhs)  {
	    return lhs.value > rhs.value;
	  };



	module.exports = IntegerBufferSet;


/***/ },
/* 186 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ImmutableObject
	 * @typechecks
	 */

	"use strict";

	var ImmutableValue = __webpack_require__(191);

	var invariant = __webpack_require__(149);
	var keyOf = __webpack_require__(192);
	var mergeHelpers = __webpack_require__(193);

	var checkMergeObjectArgs = mergeHelpers.checkMergeObjectArgs;
	var isTerminal = mergeHelpers.isTerminal;

	var SECRET_KEY = keyOf({_DONT_EVER_TYPE_THIS_SECRET_KEY: null});

	/**
	 * Static methods creating and operating on instances of `ImmutableValue`.
	 */
	function assertImmutable(immutable) {
	  invariant(
	    immutable instanceof ImmutableValue,
	    'ImmutableObject: Attempted to set fields on an object that is not an ' +
	    'instance of ImmutableValue.'
	  );
	}

	/**
	 * Static methods for reasoning about instances of `ImmutableObject`. Execute
	 * the freeze commands in `process.env.NODE_ENV !== 'production'` mode to alert the programmer that something
	 * is attempting to mutate. Since freezing is very expensive, we avoid doing it
	 * at all in production.
	 */
	for(var ImmutableValue____Key in ImmutableValue){if(ImmutableValue.hasOwnProperty(ImmutableValue____Key)){ImmutableObject[ImmutableValue____Key]=ImmutableValue[ImmutableValue____Key];}}var ____SuperProtoOfImmutableValue=ImmutableValue===null?null:ImmutableValue.prototype;ImmutableObject.prototype=Object.create(____SuperProtoOfImmutableValue);ImmutableObject.prototype.constructor=ImmutableObject;ImmutableObject.__superConstructor__=ImmutableValue;
	  /**
	   * @arguments {array<object>} The arguments is an array of objects that, when
	   * merged together, will form the immutable objects.
	   */
	  function ImmutableObject() {
	    ImmutableValue.call(this,ImmutableValue[SECRET_KEY]);
	    ImmutableValue.mergeAllPropertiesInto(this, arguments);
	    if (process.env.NODE_ENV !== 'production') {
	      ImmutableValue.deepFreezeRootNode(this);
	    }
	  }

	  /**
	   * DEPRECATED - prefer to instantiate with new ImmutableObject().
	   *
	   * @arguments {array<object>} The arguments is an array of objects that, when
	   * merged together, will form the immutable objects.
	   */
	  ImmutableObject.create=function() {
	    var obj = Object.create(ImmutableObject.prototype);
	    ImmutableObject.apply(obj, arguments);
	    return obj;
	  };

	  /**
	   * Returns a new `ImmutableValue` that is identical to the supplied
	   * `ImmutableValue` but with the specified changes, `put`. Any keys that are
	   * in the intersection of `immutable` and `put` retain the ordering of
	   * `immutable`. New keys are placed after keys that exist in `immutable`.
	   *
	   * @param {ImmutableValue} immutable Starting object.
	   * @param {?object} put Fields to merge into the object.
	   * @return {ImmutableValue} The result of merging in `put` fields.
	   */
	  ImmutableObject.set=function(immutable, put) {
	    assertImmutable(immutable);
	    invariant(
	      typeof put === 'object' && put !== undefined && !Array.isArray(put),
	      'Invalid ImmutableMap.set argument `put`'
	    );
	    return new ImmutableObject(immutable, put);
	  };

	  /**
	   * Sugar for `ImmutableObject.set(ImmutableObject, {fieldName: putField})`.
	   * Look out for key crushing: Use `keyOf()` to guard against it.
	   *
	   * @param {ImmutableValue} immutableObject Object on which to set properties.
	   * @param {string} fieldName Name of the field to set.
	   * @param {*} putField Value of the field to set.
	   * @return {ImmutableValue} new ImmutableValue as described in `set`.
	   */
	  ImmutableObject.setProperty=function(immutableObject, fieldName, putField) {
	    var put = {};
	    put[fieldName] = putField;
	    return ImmutableObject.set(immutableObject, put);
	  };

	  /**
	   * Returns a new immutable object with the given field name removed.
	   * Look out for key crushing: Use `keyOf()` to guard against it.
	   *
	   * @param {ImmutableObject} immutableObject from which to delete the key.
	   * @param {string} droppedField Name of the field to delete.
	   * @return {ImmutableObject} new ImmutableObject without the key
	   */
	  ImmutableObject.deleteProperty=function(immutableObject, droppedField) {
	    var copy = {};
	    for (var key in immutableObject) {
	      if (key !== droppedField && immutableObject.hasOwnProperty(key)) {
	        copy[key] = immutableObject[key];
	      }
	    }
	    return new ImmutableObject(copy);
	  };

	  /**
	   * Returns a new `ImmutableValue` that is identical to the supplied object but
	   * with the supplied changes recursively applied.
	   *
	   * Experimental. Likely does not handle `Arrays` correctly.
	   *
	   * @param {ImmutableValue} immutable Object on which to set fields.
	   * @param {object} put Fields to merge into the object.
	   * @return {ImmutableValue} The result of merging in `put` fields.
	   */
	  ImmutableObject.setDeep=function(immutable, put) {
	    assertImmutable(immutable);
	    return _setDeep(immutable, put);
	  };

	  /**
	   * Retrieves an ImmutableObject's values as an array.
	   *
	   * @param {ImmutableValue} immutable
	   * @return {array}
	   */
	  ImmutableObject.values=function(immutable) {
	    return Object.keys(immutable).map(function(key)  {return immutable[key];});
	  };


	function _setDeep(obj, put) {
	  checkMergeObjectArgs(obj, put);
	  var totalNewFields = {};

	  // To maintain the order of the keys, copy the base object's entries first.
	  var keys = Object.keys(obj);
	  for (var ii = 0; ii < keys.length; ii++) {
	    var key = keys[ii];
	    if (!put.hasOwnProperty(key)) {
	      totalNewFields[key] = obj[key];
	    } else if (isTerminal(obj[key]) || isTerminal(put[key])) {
	      totalNewFields[key] = put[key];
	    } else {
	      totalNewFields[key] = _setDeep(obj[key], put[key]);
	    }
	  }

	  // Apply any new keys that the base obj didn't have.
	  var newKeys = Object.keys(put);
	  for (ii = 0; ii < newKeys.length; ii++) {
	    var newKey = newKeys[ii];
	    if (obj.hasOwnProperty(newKey)) {
	      continue;
	    }
	    totalNewFields[newKey] = put[newKey];
	  }

	  return (
	    obj instanceof ImmutableValue ? new ImmutableObject(totalNewFields) :
	    put instanceof ImmutableValue ? new ImmutableObject(totalNewFields) :
	    totalNewFields
	  );
	}

	module.exports = ImmutableObject;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 187 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule FixedDataTableCell.react
	 * @typechecks
	 */

	var ImmutableObject = __webpack_require__(186);
	var React = __webpack_require__(134);

	var cloneWithProps = __webpack_require__(145);
	var cx = __webpack_require__(146);
	var joinClasses = __webpack_require__(170);

	var PropTypes = React.PropTypes;

	var DEFAULT_PROPS = new ImmutableObject({
	  align: 'left',
	  highlighted: false,
	  isFooterCell: false,
	  isHeaderCell: false,
	});

	var FixedDataTableCell = React.createClass({displayName: "FixedDataTableCell",

	  propTypes: {
	    align: PropTypes.oneOf(['left', 'center', 'right']),
	    className: PropTypes.string,
	    highlighted: PropTypes.bool,
	    isFooterCell: PropTypes.bool,
	    isHeaderCell: PropTypes.bool,
	    width: PropTypes.number.isRequired,
	    minWidth: PropTypes.number,
	    maxWidth: PropTypes.number,
	    height: PropTypes.number.isRequired,

	    /**
	     * The cell data that will be passed to `cellRenderer` to render.
	     */
	    cellData: PropTypes.any,

	    /**
	     * The key to retrieve the cell data from the `rowData`.
	     */
	    cellDataKey: PropTypes.oneOfType([
	      PropTypes.string.isRequired,
	      PropTypes.number.isRequired,
	    ]),

	    /**
	     * The function to render the `cellData`.
	     */
	    cellRenderer: PropTypes.func.isRequired,

	    /**
	     * The column data that will be passed to `cellRenderer` to render.
	     */
	    columnData: PropTypes.any,

	    /**
	     * The row data that will be passed to `cellRenderer` to render.
	     */
	    rowData: PropTypes.oneOfType([
	      PropTypes.object.isRequired,
	      PropTypes.array.isRequired,
	    ]),

	    /**
	     * The row index that will be passed to `cellRenderer` to render.
	     */
	    rowIndex: PropTypes.number.isRequired,

	    /**
	     * Callback for when resizer knob (in FixedDataTableCell) is clicked
	     * to initialize resizing. Please note this is only on the cells
	     * in the header.
	     * @param number combinedWidth
	     * @param number leftOffset
	     * @param number width
	     * @param number minWidth
	     * @param number maxWidth
	     * @param number|string columnKey
	     * @param object event
	     */
	    onColumnResize: PropTypes.func,

	    /**
	     * Width of the all the cells preceding this cell that
	     * are in its column group.
	     */
	    widthOffset: PropTypes.number,

	    /**
	     * The left offset in pixels of the cell.
	     */
	    left: PropTypes.number,
	  },

	  shouldComponentUpdate:function(/*object*/ nextProps) /*boolean*/ {
	    var props = this.props;
	    var key;
	    for (key in props) {
	      if (props[key] !== nextProps[key] &&
	          key !== 'left') {
	        return true;
	      }
	    }
	    for (key in nextProps) {
	      if (props[key] !== nextProps[key] &&
	          key !== 'left') {
	        return true;
	      }
	    }

	    return false;
	  },

	  getDefaultProps:function() /*object*/ {
	    return DEFAULT_PROPS;
	  },

	  render:function() /*object*/ {
	    var props = this.props;

	    var style = {
	      width: props.width,
	      height: props.height
	    };

	    var className = joinClasses(
	      cx({
	        'public/fixedDataTableCell/main': true,
	        'public/fixedDataTableCell/highlighted': props.highlighted,
	        'public/fixedDataTableCell/lastChild': props.lastChild,
	        'public/fixedDataTableCell/alignRight': props.align === 'right',
	        'public/fixedDataTableCell/alignCenter': props.align === 'center'
	      }),
	      props.className
	    );

	    var content;
	    if (props.isHeaderCell || props.isFooterCell) {
	      content = props.cellRenderer(
	        props.cellData,
	        props.cellDataKey,
	        props.columnData,
	        props.rowData,
	        props.width
	      );
	    } else {
	      content = props.cellRenderer(
	        props.cellData,
	        props.cellDataKey,
	        props.rowData,
	        props.rowIndex,
	        props.columnData,
	        props.width
	      );
	    }

	    var contentClass = cx('public/fixedDataTableCell/cellContent');
	    if (React.isValidElement(content)) {
	      content = cloneWithProps(content, {className: contentClass});
	    } else {
	      content = React.createElement("div", {className: contentClass}, content);
	    }

	    var columnResizerComponent;
	    if (props.onColumnResize) {
	      var columnResizerStyle = {
	        height: props.height
	      };
	      columnResizerComponent = (
	        React.createElement("div", {
	          className: cx('fixedDataTableCell/columnResizerContainer'), 
	          style: columnResizerStyle, 
	          onMouseDown: this._onColumnResizerMouseDown}, 
	          React.createElement("div", {
	            className: cx('fixedDataTableCell/columnResizerKnob'), 
	            style: columnResizerStyle}
	          )
	        )
	      );
	    }
	    return (
	      React.createElement("div", {className: className, style: style}, 
	        columnResizerComponent, 
	        React.createElement("div", {className: cx('public/fixedDataTableCell/wrap1'), style: style}, 
	          React.createElement("div", {className: cx('public/fixedDataTableCell/wrap2')}, 
	            React.createElement("div", {className: cx('public/fixedDataTableCell/wrap3')}, 
	              content
	            )
	          )
	        )
	      )
	    );
	  },

	  _onColumnResizerMouseDown:function(/*object*/ event) {
	    this.props.onColumnResize(
	      this.props.widthOffset,
	      this.props.width,
	      this.props.minWidth,
	      this.props.maxWidth,
	      this.props.cellDataKey,
	      event
	    );
	  },
	});

	module.exports = FixedDataTableCell;


/***/ },
/* 188 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule camelize
	 * @typechecks
	 */

	var _hyphenPattern = /-(.)/g;

	/**
	 * Camelcases a hyphenated string, for example:
	 *
	 *   > camelize('background-color')
	 *   < "backgroundColor"
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function camelize(string) {
	  return string.replace(_hyphenPattern, function(_, character) {
	    return character.toUpperCase();
	  });
	}

	module.exports = camelize;


/***/ },
/* 189 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright 2013-2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule emptyObject
	 */

	"use strict";

	var emptyObject = {};

	if ("production" !== process.env.NODE_ENV) {
	  Object.freeze(emptyObject);
	}

	module.exports = emptyObject;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(123)))

/***/ },
/* 190 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule Heap
	 * @typechecks
	 * @preventMunge
	 */

	"use strict";

	/*
	 * @param {*} a
	 * @param {*} b
	 * @return {boolean}
	 */
	function defaultComparator(a, b) {
	  return a < b;
	}


	  function Heap(items, comparator) {
	    this._items = items || [];
	    this._size = this._items.length;
	    this._comparator = comparator || defaultComparator;
	    this._heapify();
	  }

	  /*
	   * @return {boolean}
	   */
	  Heap.prototype.empty=function() {
	    return this._size === 0;
	  };

	  /*
	   * @return {*}
	   */
	  Heap.prototype.pop=function() {
	    if (this._size === 0){
	      return;
	    }

	    var elt = this._items[0];

	    var lastElt = this._items.pop();
	    this._size--;

	    if (this._size > 0) {
	      this._items[0] = lastElt;
	      this._sinkDown(0);
	    }

	    return elt;
	  };

	  /*
	   * @param {*} item
	   */
	  Heap.prototype.push=function(item) {
	    this._items[this._size++] = item;
	    this._bubbleUp(this._size - 1);
	  };

	  /*
	   * @return {number}
	   */
	  Heap.prototype.size=function() {
	    return this._size;
	  };

	  /*
	   * @return {*}
	   */
	  Heap.prototype.peek=function() {
	    if (this._size === 0) {
	      return;
	    }

	    return this._items[0];
	  };

	  Heap.prototype._heapify=function() {
	    for (var index = Math.floor((this._size + 1)/ 2); index >= 0; index--) {
	      this._sinkDown(index);
	    }
	  };

	  /*
	   * @parent {number} index
	   */
	  Heap.prototype._bubbleUp=function(index) {
	    var elt = this._items[index];
	    while (index > 0) {
	      var parentIndex = Math.floor((index + 1) / 2) - 1;
	      var parentElt = this._items[parentIndex];

	      // if parentElt < elt, stop
	      if (this._comparator(parentElt, elt)) {
	        return;
	      }

	      // swap
	      this._items[parentIndex] = elt;
	      this._items[index] = parentElt;
	      index = parentIndex;
	    }
	  };

	  /*
	   * @parent {number} index
	   */
	  Heap.prototype._sinkDown=function(index) {
	    var elt = this._items[index];

	    while (true) {
	      var leftChildIndex = 2 * (index + 1) - 1;
	      var rightChildIndex = 2 * (index + 1);
	      var swapIndex = -1;

	      if (leftChildIndex < this._size) {
	        var leftChild = this._items[leftChildIndex];
	        if (this._comparator(leftChild, elt)) {
	          swapIndex = leftChildIndex;
	        }
	      }

	      if (rightChildIndex < this._size) {
	        var rightChild = this._items[rightChildIndex];
	        if (this._comparator(rightChild, elt)) {
	          if (swapIndex === -1 ||
	              this._comparator(rightChild, this._items[swapIndex])) {
	            swapIndex = rightChildIndex;
	          }
	        }
	      }

	      // if we don't have a swap, stop
	      if (swapIndex === -1) {
	        return;
	      }

	      this._items[index] = this._items[swapIndex];
	      this._items[swapIndex] = elt;
	      index = swapIndex;
	    }
	  };


	module.exports = Heap;


/***/ },
/* 191 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule ImmutableValue
	 * @typechecks
	 */

	"use strict";

	var invariant = __webpack_require__(149);
	var isNode = __webpack_require__(194);
	var keyOf = __webpack_require__(192);

	var SECRET_KEY = keyOf({_DONT_EVER_TYPE_THIS_SECRET_KEY: null});

	/**
	 * `ImmutableValue` provides a guarantee of immutability at developer time when
	 * strict mode is used. The extra computations required to enforce immutability
	 * are stripped out in production for performance reasons. `ImmutableValue`
	 * guarantees to enforce immutability for enumerable, own properties. This
	 * allows easy wrapping of `ImmutableValue` with the ability to store
	 * non-enumerable properties on the instance that only your static methods
	 * reason about. In order to achieve IE8 compatibility (which doesn't have the
	 * ability to define non-enumerable properties), modules that want to build
	 * their own reasoning of `ImmutableValue`s and store computations can define
	 * their non-enumerable properties under the name `toString`, and in IE8 only
	 * define a standard property called `toString` which will mistakenly be
	 * considered not enumerable due to its name (but only in IE8). The only
	 * limitation is that no one can store their own `toString` property.
	 * https://developer.mozilla.org/en-US/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
	 */

	  /**
	   * An instance of `ImmutableValue` appears to be a plain JavaScript object,
	   * except `instanceof ImmutableValue` evaluates to `true`, and it is deeply
	   * frozen in development mode.
	   *
	   * @param {number} secret Ensures this isn't accidentally constructed outside
	   * of convenience constructors. If created outside of a convenience
	   * constructor, may not be frozen. Forbidding that use case for now until we
	   * have a better API.
	   */
	  function ImmutableValue(secret) {
	    invariant(
	      secret === ImmutableValue[SECRET_KEY],
	      'Only certain classes should create instances of `ImmutableValue`.' +
	      'You probably want something like ImmutableValueObject.create.'
	    );
	  }

	  /**
	   * Helper method for classes that make use of `ImmutableValue`.
	   * @param {ImmutableValue} destination Object to merge properties into.
	   * @param {object} propertyObjects List of objects to merge into
	   * `destination`.
	   */
	  ImmutableValue.mergeAllPropertiesInto=function(destination, propertyObjects) {
	    var argLength = propertyObjects.length;
	    for (var i = 0; i < argLength; i++) {
	      Object.assign(destination, propertyObjects[i]);
	    }
	  };


	  /**
	   * Freezes the supplied object deeply. Other classes may implement their own
	   * version based on this.
	   *
	   * @param {*} object The object to freeze.
	   */
	  ImmutableValue.deepFreezeRootNode=function(object) {
	    if (isNode(object)) {
	      return; // Don't try to freeze DOM nodes.
	    }
	    Object.freeze(object); // First freeze the object.
	    for (var prop in object) {
	      if (object.hasOwnProperty(prop)) {
	        ImmutableValue.recurseDeepFreeze(object[prop]);
	      }
	    }
	    Object.seal(object);
	  };

	  /**
	   * Differs from `deepFreezeRootNode`, in that we first check if this is a
	   * necessary recursion. If the object is already an `ImmutableValue`, then the
	   * recursion is unnecessary as it is already frozen. That check obviously
	   * wouldn't work for the root node version `deepFreezeRootNode`!
	   */
	  ImmutableValue.recurseDeepFreeze=function(object) {
	    if (isNode(object) || !ImmutableValue.shouldRecurseFreeze(object)) {
	      return; // Don't try to freeze DOM nodes.
	    }
	    Object.freeze(object); // First freeze the object.
	    for (var prop in object) {
	      if (object.hasOwnProperty(prop)) {
	        ImmutableValue.recurseDeepFreeze(object[prop]);
	      }
	    }
	    Object.seal(object);
	  };

	  /**
	   * Checks if an object should be deep frozen. Instances of `ImmutableValue`
	   * are assumed to have already been deep frozen, so we can have large
	   * `process.env.NODE_ENV !== 'production'` time savings by skipping freezing of them.
	   *
	   * @param {*} object The object to check.
	   * @return {boolean} Whether or not deep freeze is needed.
	   */
	  ImmutableValue.shouldRecurseFreeze=function(object) {
	    return (
	      typeof object === 'object' &&
	      !(object instanceof ImmutableValue) &&
	      object !== null
	    );
	  };


	ImmutableValue._DONT_EVER_TYPE_THIS_SECRET_KEY = Math.random();

	module.exports = ImmutableValue;


/***/ },
/* 192 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule keyOf
	 */

	/**
	 * Allows extraction of a minified key. Let's the build system minify keys
	 * without losing the ability to dynamically use key strings as values
	 * themselves. Pass in an object with a single key/val pair and it will return
	 * you the string key of that single record. Suppose you want to grab the
	 * value for a key 'className' inside of an object. Key/val minification may
	 * have aliased that key to be 'xa12'. keyOf({className: null}) will return
	 * 'xa12' in that case. Resolve keys you want to use once at startup time, then
	 * reuse those resolutions.
	 */
	var keyOf = function(oneKeyObj) {
	  var key;
	  for (key in oneKeyObj) {
	    if (!oneKeyObj.hasOwnProperty(key)) {
	      continue;
	    }
	    return key;
	  }
	  return null;
	};


	module.exports = keyOf;


/***/ },
/* 193 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule mergeHelpers
	 *
	 * requiresPolyfills: Array.isArray
	 */

	"use strict";

	var invariant = __webpack_require__(149);
	var keyMirror = __webpack_require__(195);

	/**
	 * Maximum number of levels to traverse. Will catch circular structures.
	 * @const
	 */
	var MAX_MERGE_DEPTH = 36;

	/**
	 * We won't worry about edge cases like new String('x') or new Boolean(true).
	 * Functions and Dates are considered terminals, and arrays are not.
	 * @param {*} o The item/object/value to test.
	 * @return {boolean} true iff the argument is a terminal.
	 */
	var isTerminal = function(o) {
	  return typeof o !== 'object' || o instanceof Date || o === null;
	};

	var mergeHelpers = {

	  MAX_MERGE_DEPTH: MAX_MERGE_DEPTH,

	  isTerminal: isTerminal,

	  /**
	   * Converts null/undefined values into empty object.
	   *
	   * @param {?Object=} arg Argument to be normalized (nullable optional)
	   * @return {!Object}
	   */
	  normalizeMergeArg: function(arg) {
	    return arg === undefined || arg === null ? {} : arg;
	  },

	  /**
	   * If merging Arrays, a merge strategy *must* be supplied. If not, it is
	   * likely the caller's fault. If this function is ever called with anything
	   * but `one` and `two` being `Array`s, it is the fault of the merge utilities.
	   *
	   * @param {*} one Array to merge into.
	   * @param {*} two Array to merge from.
	   */
	  checkMergeArrayArgs: function(one, two) {
	    invariant(
	      Array.isArray(one) && Array.isArray(two),
	      'Tried to merge arrays, instead got %s and %s.',
	      one,
	      two
	    );
	  },

	  /**
	   * @param {*} one Object to merge into.
	   * @param {*} two Object to merge from.
	   */
	  checkMergeObjectArgs: function(one, two) {
	    mergeHelpers.checkMergeObjectArg(one);
	    mergeHelpers.checkMergeObjectArg(two);
	  },

	  /**
	   * @param {*} arg
	   */
	  checkMergeObjectArg: function(arg) {
	    invariant(
	      !isTerminal(arg) && !Array.isArray(arg),
	      'Tried to merge an object, instead got %s.',
	      arg
	    );
	  },

	  /**
	   * @param {*} arg
	   */
	  checkMergeIntoObjectArg: function(arg) {
	    invariant(
	      (!isTerminal(arg) || typeof arg === 'function') && !Array.isArray(arg),
	      'Tried to merge into an object, instead got %s.',
	      arg
	    );
	  },

	  /**
	   * Checks that a merge was not given a circular object or an object that had
	   * too great of depth.
	   *
	   * @param {number} Level of recursion to validate against maximum.
	   */
	  checkMergeLevel: function(level) {
	    invariant(
	      level < MAX_MERGE_DEPTH,
	      'Maximum deep merge depth exceeded. You may be attempting to merge ' +
	      'circular structures in an unsupported way.'
	    );
	  },

	  /**
	   * Checks that the supplied merge strategy is valid.
	   *
	   * @param {string} Array merge strategy.
	   */
	  checkArrayStrategy: function(strategy) {
	    invariant(
	      strategy === undefined || strategy in mergeHelpers.ArrayStrategies,
	      'You must provide an array strategy to deep merge functions to ' +
	      'instruct the deep merge how to resolve merging two arrays.'
	    );
	  },

	  /**
	   * Set of possible behaviors of merge algorithms when encountering two Arrays
	   * that must be merged together.
	   * - `clobber`: The left `Array` is ignored.
	   * - `indexByIndex`: The result is achieved by recursively deep merging at
	   *   each index. (not yet supported.)
	   */
	  ArrayStrategies: keyMirror({
	    Clobber: true,
	    IndexByIndex: true
	  })

	};

	module.exports = mergeHelpers;


/***/ },
/* 194 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule isNode
	 * @typechecks
	 */

	/**
	 * @param {*} object The object to check.
	 * @return {boolean} Whether or not the object is a DOM node.
	 */
	function isNode(object) {
	  return !!(object && (
	    typeof Node === 'function' ? object instanceof Node :
	      typeof object === 'object' &&
	      typeof object.nodeType === 'number' &&
	      typeof object.nodeName === 'string'
	  ));
	}

	module.exports = isNode;


/***/ },
/* 195 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2015, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 *
	 * @providesModule keyMirror
	 * @typechecks static-only
	 */

	'use strict';

	var invariant = __webpack_require__(149);

	/**
	 * Constructs an enumeration with keys equal to their value.
	 *
	 * For example:
	 *
	 *   var COLORS = keyMirror({blue: null, red: null});
	 *   var myColor = COLORS.blue;
	 *   var isColorValid = !!COLORS[myColor];
	 *
	 * The last line could not be performed if the values of the generated enum were
	 * not equal to their keys.
	 *
	 *   Input:  {key1: val1, key2: val2}
	 *   Output: {key1: key1, key2: key2}
	 *
	 * @param {object} obj
	 * @return {object}
	 */
	var keyMirror = function(obj) {
	  var ret = {};
	  var key;
	  invariant(
	    obj instanceof Object && !Array.isArray(obj),
	    'keyMirror(...): Argument must be an object.'
	  );
	  for (key in obj) {
	    if (!obj.hasOwnProperty(key)) {
	      continue;
	    }
	    ret[key] = key;
	  }
	  return ret;
	};

	module.exports = keyMirror;


/***/ }
/******/ ]);