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

	var quantitative_attrs = null;
	var totalItems = null;

	rpc.call('init', [])
	    .then(function(names){
		var props = {
		    morphoTable: names["main_table"]
		};
		React.render( React.createElement(App, React.__spread({},  props)), document.getElementById('content'));

	    })
	    .catch(function(e){console.error(e);});


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
	var ReactGridLayout = __webpack_require__(14);

	var Context = __webpack_require__(4);

	var reactify = __webpack_require__(6);
	var DataTable = __webpack_require__(7);
	var BrainRegions = __webpack_require__(8);
	var SimpleVis = __webpack_require__(9);

	var PCPChart = reactify(__webpack_require__(10));

	module.exports = React.createClass({displayName: "exports",
	    getInitialState: function() {
		return {
		    "schema": {attributes:{}},
		    "morphoTable": this.props.morphoTable,
		    "measuresData": []
		};
	    },
	    componentDidMount: function() {
		var rpc = Context.instance().rpc;
		var self = this;

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

	    },
	    render: function(){

		var columnNames = _.keys(this.state.schema.attributes);

		console.log("******", columnNames);
		var contentWidth = document.getElementById('content').offsetWidth - 20;

		var layout = [{x: 0, y: 0, w: 6, h: 6, i:1}, 
		    {x: 6, y: 0, w: 6, h: 6, i:2}, 
		    {x: 0, y: 1, w: 12, h: 6, i:3}, 
		    {x: 0, y: 2, w: 12, h: 10, i:"table"}
		];

		return (
		    React.createElement(ReactGridLayout, {className: "layout", layout: layout, cols: 12, rowHeight: 50}, 
		      React.createElement("div", {key: 1}, React.createElement(SimpleVis, {table: this.props.morphoTable})), 
		      React.createElement("div", {key: 2}, 
			React.createElement(BrainRegions, {width: "60%"})
		      ), 
		      React.createElement("div", {key: 3}, 
			React.createElement(PCPChart, {
				width: 600, height: 500, 
				attributes: _.values(this.state.schema.attributes), 
				data: this.state.measuresData
				}
			)
		      ), 
		      React.createElement("div", {key: "table"}, 
			React.createElement(DataTable, {			  
				rows: this.state.measuresData, 
				tableWidth: contentWidth, 
				tableHeight: 500, 
				columnNames: columnNames
				}
			)
		      )
		    ) 
		);
	    }
	});


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5), __webpack_require__(11), __webpack_require__(12), __webpack_require__(13)], __WEBPACK_AMD_DEFINE_RESULT__ = function(when, ReconnectingWebSocket, WsRpc, Hub) {

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

		var timed = __webpack_require__(28);
		var array = __webpack_require__(17);
		var flow = __webpack_require__(18);
		var fold = __webpack_require__(19);
		var inspect = __webpack_require__(20);
		var generate = __webpack_require__(21);
		var progress = __webpack_require__(22);
		var withThis = __webpack_require__(23);
		var unhandledRejection = __webpack_require__(24);
		var TimeoutError = __webpack_require__(25);

		var Promise = [array, flow, fold, generate, progress,
			inspect, withThis, timed, unhandledRejection]
			.reduce(function(Promise, feature) {
				return feature(Promise);
			}, __webpack_require__(26));

		var apply = __webpack_require__(27)(Promise);

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
	})(__webpack_require__(31));


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var ChartContainerMixin = __webpack_require__(16);

	module.exports = function(chart){
	    return React.createClass({mixins : [ChartContainerMixin, chart]});
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var React = __webpack_require__(1);
	var FixedDataTable = __webpack_require__(33);
	var _ = __webpack_require__(2);

	var Table = FixedDataTable.Table;
	var Column = FixedDataTable.Column;


	module.exports = React.createClass({displayName: "exports",
	    getInitialState: function() {
		
		var initialColumnWith = (this.props.columnNames.length) ?
					Math.round(this.props.tableWidth / this.props.columnNames.length)
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
					Math.round(this.props.tableWidth / this.props.columnNames.length)
		                        : 0;
		var columnWidths = {};
		_.map(this.props.columnNames, function(n){columnWidths[n] = initialColumnWith;})

		if (this.props.rows.length == 0) return (React.createElement("div", null));

		return (
		    React.createElement(Table, {
			    rowHeight: 50, 
			    rowGetter: this._rowGetter, 
			    rowsCount: this.props.rows.length, 
			    width: this.props.tableWidth, 
			    height: this.props.tableHeight, 
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

	module.exports = React.createClass({displayName: "exports",
	    render: function(){
		return (
	            React.createElement("div", null, 
		      React.createElement("object", {id: "svgobject", 
			      type: "image/svg+xml", 
			      width: this.props.width, 
			      height: this.props.heght, 
			      data: "assets/hipo_map.svg"}
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
	var BarChart = __webpack_require__(32).BarChart;

	var Context = __webpack_require__(4);

	// Data is like: [{value:25, label:"P1"},{value:45, label:"P2"}]
	module.exports = React.createClass({displayName: "exports",
	    getInitialState: function() {
		return {
		    "data": []
		};
	    },
	    componentDidMount: function() {
		var rpc = Context.instance().rpc;
		var self = this;
		var pipeline = [
		    {$match : {"tint": "NISSL"}},
		    {$group : {_id: "$patient", value: {$sum: "$cells/volume (mm3)"} } },
		    {$project : { label: "$_id", value:1 , _id: 0}},
		    {$sort : { value: -1 } }
		];
		rpc.call('TableSrv.aggregate', [this.props.table, pipeline])
		    .then(function(view) {
			return rpc.call("TableSrv.get_data", [view, "rows"])
		    })
		    .then(function(rows){
			self.setState({"data": rows});
		    })
		    .catch(function(e){console.error(e);});
	    },
	    render: function(){
		return (
		    React.createElement(BarChart, {
			    data: this.state.data, 
			    width: 600, 
			    height: 200, 
			    margins: {top: 20, right: 30, bottom: 30, left: 60}, 
			    fill: '#3182bd', 
			    title: "Cells/Vol - NISSL"}
		    )	
		);
	    }
	});


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var d3 = __webpack_require__(15);
	var _ = __webpack_require__(2);

	module.exports = {
	    createChart: function(container, props, state){
		var margin = this.props.margin;
		var width = this.props.width - margin.left - margin.right;
		var height = this.props.height - margin.top - margin.bottom;

		var svg = d3.select(container).append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		this.update(container, props, state);
	    },

	    cleanChart: function(container, props, state){
		// unsubscribe things 
	    },

	    update: function(container, props, state) {
		var margin = props.margin;
		var width = props.width - margin.left - margin.right;
		var height = props.height - margin.top - margin.bottom;

		var scales = this._scales(width, height, props.data, props.attributes);

	    },

	    _scales: function(width, height, data, attributes) {
		var self = this;

		var x = d3.scale.ordinal().domain(_.pluck(attributes, "name")).rangePoints([0, width], 0.5);
		var y = {};

		attributes.forEach(function(d) {
		    var name = d.name;
		    if (d.attribute_type === 'QUANTITATIVE') {
			y[name] = d3.scale.linear()
			    .domain(d3.extent(data, function(p) { return p[name]; }))
			    .range([height, 0]);
		    }
		    else if (d.attribute_type === 'CATEGORICAL') {
			y[name] = d3.scale.ordinal()
			    .domain(d3.set(_.pluck(data, name)).values())
			    .rangePoints([height, 0]);
		    }
		    y[name].brush = d3.svg.brush()
			.y(y[name])
			.on("brush", self._brush);
		});

		return {x: x, y: y};
	    },
	    _brush: function(){}
	};


/***/ },
/* 11 */
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
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5), __webpack_require__(11)], __WEBPACK_AMD_DEFINE_RESULT__ = function(when, ReconnectingWebSocket) {

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
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(11)], __WEBPACK_AMD_DEFINE_RESULT__ = function(ReconnectingWebSocket) {

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
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(29);
	module.exports.Responsive = __webpack_require__(30);


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = d3;

/***/ },
/* 16 */
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
	    },

	    componentWillUnmount: function() {
		var container = this.refs.container.getDOMNode();
		this.cleanChart(container, this.props, this.state);
	    },

	    shouldComponentUpdate: function(nextProps, nextState) {
		var container = this.refs.container.getDOMNode();
		this.update(container, nextProps, nextState);
		// render is not called again so he container is ther until
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
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var state = __webpack_require__(34);
		var applier = __webpack_require__(27);

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
	}(__webpack_require__(31)));


/***/ },
/* 18 */
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
	}(__webpack_require__(31)));


/***/ },
/* 19 */
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
	}(__webpack_require__(31)));


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var inspect = __webpack_require__(34).inspect;

		return function inspection(Promise) {

			Promise.prototype.inspect = function() {
				return inspect(Promise._handler(this));
			};

			return Promise;
		};

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}(__webpack_require__(31)));


/***/ },
/* 21 */
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
	}(__webpack_require__(31)));


/***/ },
/* 22 */
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
	}(__webpack_require__(31)));


/***/ },
/* 23 */
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
	}(__webpack_require__(31)));



/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var setTimer = __webpack_require__(35).setTimer;
		var format = __webpack_require__(36);

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
	}(__webpack_require__(31)));


/***/ },
/* 25 */
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
	}(__webpack_require__(31)));

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function (require) {

		var makePromise = __webpack_require__(37);
		var Scheduler = __webpack_require__(38);
		var async = __webpack_require__(35).asap;

		return makePromise({
			scheduler: new Scheduler(async)
		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	})(__webpack_require__(31));


/***/ },
/* 27 */
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
	}(__webpack_require__(31)));




/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/** @license MIT License (c) copyright 2010-2014 original author or authors */
	/** @author Brian Cavalier */
	/** @author John Hann */

	(function(define) { 'use strict';
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require) {

		var env = __webpack_require__(35);
		var TimeoutError = __webpack_require__(25);

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
	}(__webpack_require__(31)));


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _objectWithoutProperties = function (obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(1);
	var GridItem = __webpack_require__(39);
	var utils = __webpack_require__(40);
	var PureDeepRenderMixin = __webpack_require__(41);
	var WidthListeningMixin = __webpack_require__(42);

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
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _objectWithoutProperties = function (obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var React = __webpack_require__(1);
	var utils = __webpack_require__(40);
	var responsiveUtils = __webpack_require__(44);
	var PureDeepRenderMixin = __webpack_require__(41);
	var WidthListeningMixin = __webpack_require__(42);
	var ReactGridLayout = __webpack_require__(29);

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
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	
	exports.BarChart = __webpack_require__(45);


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(46);


/***/ },
/* 34 */
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
	}(__webpack_require__(31)));


/***/ },
/* 35 */
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
			var vertx = __webpack_require__(43);
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
	}(__webpack_require__(31)));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 36 */
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
	}(__webpack_require__(31)));


/***/ },
/* 37 */
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
	}(__webpack_require__(31)));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 38 */
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
	}(__webpack_require__(31)));


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var React = __webpack_require__(1);
	var cloneWithProps = __webpack_require__(58);
	var utils = __webpack_require__(40);
	var Draggable = __webpack_require__(57);
	var Resizable = __webpack_require__(54).Resizable;
	var PureDeepRenderMixin = __webpack_require__(41);

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
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var assign = __webpack_require__(55);

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
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var deepEqual = __webpack_require__(56);

	// Like PureRenderMixin, but with deep comparisons.
	var PureDeepRenderMixin = {
	  shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
	    return !deepEqual(this.props, nextProps) || !deepEqual(this.state, nextState);
	  }
	};

	module.exports = PureDeepRenderMixin;

/***/ },
/* 42 */
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
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(40);

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
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);
	var DataSeries = __webpack_require__(48);
	var common = __webpack_require__(49);
	var Chart = common.Chart;
	var XAxis = common.XAxis;
	var YAxis = common.YAxis;

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    data: React.PropTypes.array,
	    yAxisTickCount: React.PropTypes.number,
	    width: React.PropTypes.number,
	    margins: React.PropTypes.object,
	    height: React.PropTypes.number,
	    fill: React.PropTypes.string,
	    title: React.PropTypes.string
	  },

	  getDefaultProps:function() {
	    return {
	      data: [],
	      yAxisTickCount: 4,
	      width: 500,
	      height: 200,
	      margins: {top: 20, right: 30, bottom: 30, left: 30},
	      fill: "#3182bd",
	      title: ''
	    };
	  },

	  render:function() {

	    var props = this.props;

	    var values = props.data.map( function(item)  {return item.value;} );

	    var labels = props.data.map( function(item)  {return item.label;} );

	    var margins = props.margins;

	    var sideMargins = margins.left + margins.right;
	    var topBottomMargins = margins.top + margins.bottom;

	    var yScale = d3.scale.linear()
	      .domain([d3.min([d3.min(values), 0]), d3.max(values)])
	      .range([props.height - topBottomMargins, 0]);

	    var xScale = d3.scale.ordinal()
	        .domain(labels)
	        .rangeRoundBands([0, props.width - sideMargins], 0.1);

	    var trans = ("translate(" +  margins.left + "," +  margins.top + ")");

	    return (
	      React.createElement(Chart, {width: props.width, height: props.height, title: props.title}, 
	        React.createElement("g", {transform: trans, className: "rd3-barchart"}, 
	          React.createElement(DataSeries, {
	            values: values, 
	            yScale: yScale, 
	            xScale: yScale, 
	            margins: margins, 
	            data: props.data, 
	            width: props.width - sideMargins, 
	            height: props.height - topBottomMargins, 
	            fill: props.fill}
	          ), 
	          React.createElement(YAxis, {
	            yAxisClassName: "rd3-barchart-yaxis", 
	            yScale: yScale, 
	            margins: margins, 
	            yAxisTickCount: props.yAxisTickCount, 
	            width: props.width - sideMargins, 
	            height: props.height - topBottomMargins}
	          ), 
	          React.createElement(XAxis, {
	            xAxisClassName: "rd3-barchart-xaxis", 
	            xScale: xScale, 
	            data: props.data, 
	            margins: margins, 
	            width: props.width - sideMargins, 
	            height: props.height - topBottomMargins}
	          )
	        )
	      )
	    );
	  }

	});


/***/ },
/* 46 */
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
	  var ExecutionEnvironment = __webpack_require__(50);
	  if (ExecutionEnvironment.canUseDOM && window.top === window.self) {

	    if (!Object.assign) {
	      console.error(
	        'FixedDataTable expected an ES6 compatible `Object.assign` polyfill.'
	      );
	    }
	  }
	}

	var FixedDataTable = __webpack_require__(51);
	var FixedDataTableColumn = __webpack_require__(52);
	var FixedDataTableColumnGroup = __webpack_require__(53);

	var FixedDataTableRoot = {
	  Column: FixedDataTableColumn,
	  ColumnGroup: FixedDataTableColumnGroup,
	  Table: FixedDataTable,
	};

	FixedDataTableRoot.version = '0.1.2';

	module.exports = FixedDataTableRoot;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 47 */
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
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);
	var Bar = __webpack_require__(59);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    fill: React.PropTypes.string,
	    title: React.PropTypes.string,
	    padding: React.PropTypes.number,
	    width: React.PropTypes.number,
	    height: React.PropTypes.number,
	    offset: React.PropTypes.number
	  },

	  getDefaultProps:function() {
	    return {
	      padding: 0.1,
	      data: []
	    };
	  },

	  render:function() {

	    var props = this.props;

	    var xScale = d3.scale.ordinal()
	      .domain(d3.range(props.values.length))
	      .rangeRoundBands([0, props.width], props.padding);

	    var bars = props.values.map(function(point, i) {
	      return (
	        React.createElement(Bar, {
	          height: props.yScale(0) - props.yScale(point), 
	          width: xScale.rangeBand(), 
	          offset: xScale(i), 
	          availableHeight: props.height, 
	          fill: props.fill, key: i}
	        )
	      );
	    });

	    return (
	      React.createElement("g", null, bars)
	    );
	  }
	});


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	
	exports.XAxis = __webpack_require__(62).XAxis;
	exports.YAxis = __webpack_require__(62).YAxis;
	exports.Chart = __webpack_require__(63).Chart;
	exports.LegendChart = __webpack_require__(63).LegendChart;
	exports.Legend = __webpack_require__(60);
	exports.Voronoi = __webpack_require__(61);


/***/ },
/* 50 */
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
/* 51 */
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

	var FixedDataTableHelper = __webpack_require__(64);
	var Locale = __webpack_require__(65);
	var React = __webpack_require__(66);
	var ReactComponentWithPureRenderMixin = __webpack_require__(67);
	var ReactWheelHandler = __webpack_require__(68);
	var Scrollbar = __webpack_require__(69);
	var FixedDataTableBufferedRows = __webpack_require__(70);
	var FixedDataTableColumnResizeHandle = __webpack_require__(71);
	var FixedDataTableRow = __webpack_require__(72);
	var FixedDataTableScrollHelper = __webpack_require__(73);
	var FixedDataTableWidthHelper = __webpack_require__(74);

	var cloneWithProps = __webpack_require__(75);
	var cx = __webpack_require__(76);
	var debounceCore = __webpack_require__(77);
	var emptyFunction = __webpack_require__(78);
	var invariant = __webpack_require__(79);
	var shallowEqual = __webpack_require__(80);
	var translateDOMPositionXY = __webpack_require__(81);

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
/* 52 */
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

	var React = __webpack_require__(66);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 53 */
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

	var React = __webpack_require__(66);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function() {
	  throw new Error("Don't instantiate Resizable directly! Use require('react-resizable').Resizable");
	};

	module.exports.Resizable = __webpack_require__(82);
	module.exports.ResizableBox = __webpack_require__(83);


/***/ },
/* 55 */
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
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(84);
	var isArguments = __webpack_require__(85);

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
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(86);


/***/ },
/* 58 */
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

	var ReactElement = __webpack_require__(87);
	var ReactPropTransferer = __webpack_require__(88);

	var keyOf = __webpack_require__(89);
	var warning = __webpack_require__(90);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    fill: React.PropTypes.string,
	    width: React.PropTypes.number,
	    height: React.PropTypes.number,
	    offset: React.PropTypes.number
	  },

	  getDefaultProps:function() {
	    return {
	      offset: 0
	    };
	  },

	  render:function() {
	    return (
	      React.createElement("rect", {
	        fill: this.props.fill, 
	        width: this.props.width, 
	        height: this.props.height, 
	        x: this.props.offset, 
	        y: this.props.availableHeight  - this.props.height, 
	        className: "rd3-barchart-bar"}
	      )
	    );
	  }
	});


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    width: React.PropTypes.number,
	    height: React.PropTypes.number,
	    margins: React.PropTypes.object,
	    text: React.PropTypes.string,
	    colors: React.PropTypes.func
	  },

	  getDefaultProps: function() {
	    return {
	      text: "#000",
	      colors: d3.scale.category20c()
	    };
	  },

	  render: function() {

	    var props = this.props;

	    var textStyle = {
	      'color': 'black',
	      'fontSize': '50%',
	      'verticalAlign': 'top'
	    };

	    var legendItems = [];

	    props.data.forEach( function(series, idx)  {

	      var itemStyle = {
	        'color': props.colors(idx),
	        'lineHeight': '60%',
	        'fontSize': '200%'
	      };

	      legendItems.push(
	            React.createElement("li", {style: itemStyle, key: idx}, 
	              React.createElement("span", {style: textStyle}, series.name)
	            )
	          );

	    });

	    // In preparation for legend positioning
	    var legendFloat = 'right';

	    var topMargin = props.margins.top;

	    var legendBlockStyle = {
	      'wordWrap': 'break-word',
	      'width': props.sideOffset,
	      'paddingLeft': '0',
	      'marginBottom': '0',
	      'marginTop': topMargin,
	      'float': legendFloat
	    };

	    return React.createElement("ul", {style: legendBlockStyle}, legendItems);
	  }

	});



/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);

	var Polygon = React.createClass({displayName: "Polygon",

	  _animateCircle: function() {
	    this.props.structure.cursor('voronoi').cursor(this.props.id).update(function(){return 'active';});
	    // this.props.pubsub.emit('animate', this.props.id);
	  },

	  _restoreCircle: function() {
	    this.props.structure.cursor('voronoi').cursor(this.props.id).update(function(){return 'inactive';});
	    // this.props.pubsub.emit('restore', this.props.id);
	  },

	  _drawPath: function(d) {
	    if(d === undefined) {
	      return; 
	    }  
	    return 'M' + d.join(',') + 'Z';
	  },

	  render: function() {
	    return React.createElement("path", {
	      onMouseOver: this._animateCircle, 
	      onMouseOut: this._restoreCircle, 
	      fill: "white", 
	      opacity: "0", 
	      d: this._drawPath(this.props.vnode)});
	  }

	});


	module.exports = React.createClass({displayName: "exports",

	  render: function() {
	    var xScale = this.props.xScale;
	    var yScale = this.props.yScale;

	    var voronoi = d3.geom.voronoi()
	      .x(function(d){ return xScale(d.coord.x); })
	      .y(function(d){ return yScale(d.coord.y); })
	      .clipExtent([[0, 0], [ this.props.width , this.props.height]]);

	    var regions = voronoi(this.props.data).map(function(vnode, idx) {
	      return React.createElement(Polygon, {structure: this.props.structure, key: idx, id: vnode.point.id, vnode: vnode});
	    }.bind(this));

	    return (
	      React.createElement("g", null, 
	        regions
	      )
	    );
	  }

	});


/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	
	exports.XAxis = __webpack_require__(91);
	exports.YAxis = __webpack_require__(92);


/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	
	exports.BasicChart = __webpack_require__(93);
	exports.Chart = __webpack_require__(94);
	exports.LegendChart = __webpack_require__(95);


/***/ },
/* 64 */
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

	var Locale = __webpack_require__(65);
	var React = __webpack_require__(66);
	var FixedDataTableColumnGroup = __webpack_require__(53);
	var FixedDataTableColumn = __webpack_require__(52);

	var cloneWithProps = __webpack_require__(75);

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
/* 65 */
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
/* 66 */
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
/* 67 */
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

	module.exports = __webpack_require__(98);


/***/ },
/* 68 */
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

	var normalizeWheel = __webpack_require__(96);
	var requestAnimationFramePolyfill = __webpack_require__(97);


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
/* 69 */
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

	var DOMMouseMoveTracker = __webpack_require__(99);
	var Keys = __webpack_require__(100);
	var React = __webpack_require__(66);
	var ReactComponentWithPureRenderMixin = __webpack_require__(67);
	var ReactWheelHandler = __webpack_require__(68);

	var cssVar = __webpack_require__(101);
	var cx = __webpack_require__(76);
	var emptyFunction = __webpack_require__(78);
	var translateDOMPositionXY = __webpack_require__(81);

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
/* 70 */
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

	var React = __webpack_require__(66);
	var FixedDataTableRowBuffer = __webpack_require__(102);
	var FixedDataTableRow = __webpack_require__(72);

	var cx = __webpack_require__(76);
	var emptyFunction = __webpack_require__(78);
	var joinClasses = __webpack_require__(103);

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
/* 71 */
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

	var DOMMouseMoveTracker = __webpack_require__(99);
	var Locale = __webpack_require__(65);
	var React = __webpack_require__(66);
	var ReactComponentWithPureRenderMixin = __webpack_require__(67);

	var clamp = __webpack_require__(104);
	var cx = __webpack_require__(76);

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
/* 72 */
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

	var FixedDataTableHelper = __webpack_require__(64);
	var React = __webpack_require__(66);
	var ReactComponentWithPureRenderMixin = __webpack_require__(67);
	var FixedDataTableCellGroup = __webpack_require__(105);

	var cx = __webpack_require__(76);
	var joinClasses = __webpack_require__(103);
	var translateDOMPositionXY = __webpack_require__(81);

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
/* 73 */
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

	var PrefixIntervalTree = __webpack_require__(106);
	var clamp = __webpack_require__(104);

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
/* 74 */
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

	var React = __webpack_require__(66);

	var cloneWithProps = __webpack_require__(75);

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
/* 75 */
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

	module.exports = __webpack_require__(58);


/***/ },
/* 76 */
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
/* 77 */
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
/* 78 */
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
/* 79 */
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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 80 */
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
/* 81 */
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

	var BrowserSupportCore = __webpack_require__(107);

	var getVendorPrefixedName = __webpack_require__(108);

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
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var React = __webpack_require__(1);
	var Draggable = __webpack_require__(57);
	var assign = __webpack_require__(55);
	var PureRenderMixin = __webpack_require__(98);
	var cloneWithProps = __webpack_require__(58);

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
/* 83 */
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
	var PureRenderMixin = __webpack_require__(98);
	var Resizable = __webpack_require__(82);

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
/* 84 */
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
/* 85 */
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
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var PureRenderMixin = __webpack_require__(98);
	var emptyFunction = __webpack_require__(109);
	var cloneWithProps = __webpack_require__(58);

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
/* 87 */
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

	var ReactContext = __webpack_require__(110);
	var ReactCurrentOwner = __webpack_require__(111);

	var assign = __webpack_require__(112);
	var warning = __webpack_require__(90);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 88 */
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

	var assign = __webpack_require__(112);
	var emptyFunction = __webpack_require__(109);
	var joinClasses = __webpack_require__(113);

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
/* 89 */
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
/* 90 */
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

	var emptyFunction = __webpack_require__(109);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);
	var AxisTicks = __webpack_require__(114);
	var AxisLine = __webpack_require__(115);
	var Label = __webpack_require__(116);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    xAxisClassName: React.PropTypes.string.isRequired,
	    xOrient: React.PropTypes.oneOf(['top', 'bottom']),
	    xScale: React.PropTypes.func.isRequired,
	    height: React.PropTypes.number.isRequired,
	    fill: React.PropTypes.string,
	    stroke: React.PropTypes.string,
	    tickStroke: React.PropTypes.string,
	    strokeWidth: React.PropTypes.string,
	    xAxisOffset: React.PropTypes.number
	  },

	  getDefaultProps:function() {
	    return {
	      xAxisClassName: 'x axis',
	      xAxisLabelOffset: 10,
	      xOrient: 'bottom',
	      fill: 'none',
	      stroke: 'none',
	      tickStroke: '#000',
	      strokeWidth: 'none',
	      xAxisOffset: 0,
	      label: ''
	    };
	  },

	  render:function() {
	    var props = this.props;

	    var t = ("translate(0," + (props.xAxisOffset + props.height) + ")");

	    var tickArguments;
	    if (typeof props.xAxisTickCount !== 'undefined') {
	      tickArguments = [props.xAxisTickCount];
	    }
	    
	    if (typeof props.xAxisTickInterval !== 'undefined') {
	      tickArguments = [d3.time[props.xAxisTickInterval.unit], props.xAxisTickInterval.interval];
	    }

	    return (
	      React.createElement("g", {
	        className: props.xAxisClassName, 
	        transform: t
	      }, 
	        React.createElement(Label, {
	          label: props.xAxisLabel, 
	          offset: props.xAxisLabelOffset, 
	          orient: props.xOrient, 
	          margins: props.margins, 
	          width: props.width}
	        ), 
	        React.createElement(AxisTicks, {
	          tickFormatting: props.tickFormatting, 
	          tickArguments: tickArguments, 
	          xScale: props.xScale, 
	          orient: props.xOrient}
	        ), 
	        React.createElement(AxisLine, React.__spread({
	          scale: props.xScale, 
	          orient: props.xOrient}, 
	          props)
	        )
	      )
	    );
	  }

	});


/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);
	var AxisTicks = __webpack_require__(114);
	var AxisLine = __webpack_require__(115);
	var Label = __webpack_require__(116);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    yAxisClassName: React.PropTypes.string,
	    yOrient: React.PropTypes.oneOf(['left', 'right']),
	    yScale: React.PropTypes.func.isRequired,
	    fill: React.PropTypes.string,
	    stroke: React.PropTypes.string,
	    tickStroke: React.PropTypes.string,
	    strokeWidth: React.PropTypes.string,
	    yAxisOffset: React.PropTypes.number
	  },

	  getDefaultProps:function() {
	    return {
	      yAxisClassName: 'y axis',
	      yOrient: 'left',
	      fill: 'none',
	      stroke: '#000',
	      tickStroke: '#000',
	      strokeWidth: '1',
	      yAxisOffset: 0
	    };
	  },

	  render:function() {

	    var props = this.props;

	    var t;
	    if (props.yOrient === 'right') {
	       t = ("translate(" + (props.yAxisOffset + props.width) + ",0)");
	    } else {
	       t = ("translate(" + props.yAxisOffset + ",0)");
	    }

	    var tickArguments;
	    if (props.yAxisTickCount) {
	      tickArguments = [props.yAxisTickCount];
	    }
	    
	    if (props.yAxisTickInterval) {
	      tickArguments = [d3.time[props.yAxisTickInterval.unit], props.yAxisTickInterval.interval];
	    }

	    return (
	      React.createElement("g", {
	        className: props.yAxisClassName, 
	        transform: t
	      }, 
	        React.createElement(AxisTicks, {
	          tickFormatting: props.tickFormatting, 
	          tickArguments: tickArguments, 
	          yScale: props.yScale, 
	          orient: props.yOrient, 
	          height: props.height, 
	          width: props.width}
	        ), 
	        React.createElement(AxisLine, React.__spread({
	          scale: props.yScale, 
	          orient: props.yOrient}, 
	          props)
	        ), 
	        React.createElement(Label, {
	          label: props.yAxisLabel, 
	          offset: props.yAxisLabelOffset, 
	          orient: props.yOrient, 
	          margins: props.margins, 
	          height: props.height, 
	          width: props.width}
	        )
	      )
	    );
	  }

	});


/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);

	module.exports = React.createClass({displayName: "exports",
	  render: function() {
	    return (
	      React.createElement("div", null, 
	        React.createElement("h4", null, this.props.title), 
	        React.createElement("svg", {
	          viewBox: this.props.viewBox, 
	          width: this.props.width, 
	          height: this.props.height
	        }, this.props.children)
	      )
	    );
	  }
	});


/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var LegendChart = __webpack_require__(95);
	var BasicChart = __webpack_require__(93);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    legend: React.PropTypes.bool,
	    viewBox: React.PropTypes.string
	  },

	  getDefaultProps: function() {
	    return {
	      legend: false
	    };
	  },

	  render: function() {
	    if (this.props.legend) {
	      return React.createElement(LegendChart, React.__spread({},  this.props));
	    }
	    return React.createElement(BasicChart, React.__spread({},  this.props));
	  }

	});



/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var Legend = __webpack_require__(60);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    legend: React.PropTypes.bool,
	    legendPosition: React.PropTypes.string,
	    sideOffset: React.PropTypes.number,
	    margins: React.PropTypes.object,
	    data: React.PropTypes.oneOfType([
	      React.PropTypes.object,
	      React.PropTypes.array
	    ])
	  },

	  getDefaultProps:function() {
	    return {
	      data: {},
	      legend: false,
	      legendPosition: 'right',
	      sideOffset: 90
	    };
	  },

	  _renderLegend:function() {
	    if (this.props.legend) {
	      return (
	        React.createElement(Legend, {
	          legendPosition: this.props.legendPosition, 
	          margins: this.props.margins, 
	          colors: this.props.colors, 
	          data: this.props.data, 
	          width: this.props.width, 
	          height: this.props.height, 
	          sideOffset: this.props.sideOffset}
	        ) 
	      );
	    }
	  },

	  render:function() {
	    return (
	      React.createElement("div", {style: {'width': this.props.width, 'height': this.props.height}}, 
	        React.createElement("h4", null, this.props.title), 
	        this._renderLegend(), 
	        React.createElement("svg", {viewBox: this.props.viewBox, width: this.props.width - this.props.sideOffset, height: this.props.height}, this.props.children)
	      )
	    );
	  }
	});


/***/ },
/* 96 */
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

	var UserAgent_DEPRECATED = __webpack_require__(117);

	var isEventSupported = __webpack_require__(118);


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
/* 97 */
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

	var emptyFunction = __webpack_require__(78);
	var nativeRequestAnimationFrame = __webpack_require__(119);

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
/* 98 */
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

	var shallowEqual = __webpack_require__(120);

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
/* 99 */
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

	var EventListener = __webpack_require__(121);

	var cancelAnimationFramePolyfill = __webpack_require__(122);
	var requestAnimationFramePolyfill = __webpack_require__(97);


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
/* 100 */
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
/* 101 */
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
/* 102 */
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

	var IntegerBufferSet = __webpack_require__(123);

	var clamp = __webpack_require__(104);
	var invariant = __webpack_require__(79);
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
/* 103 */
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
/* 104 */
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
/* 105 */
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

	var FixedDataTableHelper = __webpack_require__(64);
	var ImmutableObject = __webpack_require__(124);
	var React = __webpack_require__(66);
	var ReactComponentWithPureRenderMixin = __webpack_require__(67);
	var FixedDataTableCell = __webpack_require__(125);

	var cx = __webpack_require__(76);
	var renderToString = FixedDataTableHelper.renderToString;
	var translateDOMPositionXY = __webpack_require__(81);

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
/* 106 */
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
/* 107 */
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


	var getVendorPrefixedName = __webpack_require__(108);

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
/* 108 */
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

	var ExecutionEnvironment = __webpack_require__(50);

	var camelize = __webpack_require__(126);
	var invariant = __webpack_require__(79);

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
/* 109 */
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
/* 110 */
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

	var assign = __webpack_require__(112);
	var emptyObject = __webpack_require__(127);
	var warning = __webpack_require__(90);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 111 */
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
/* 112 */
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
/* 113 */
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
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);

	module.exports = React.createClass({displayName: "exports",

	  getDefaultProps:function() {
	    return {
	      innerTickSize: 6,
	      outerTickSize: 6,
	      tickPadding: 3,
	      tickArguments: [10],
	      tickValues: null,
	      d3_identity: function(d){return d;},
	      tickFormatting: function(d){return d;},
	      tickFormat: null
	    };
	  },

	  render:function() {
	    var props = this.props;

	    var tr,
	        ticks,
	        scale,
	        adjustedScale,
	        textAnchor,
	        tickFormat,
	        y1, y2, dy, x1, x2, dx;

	    var sign = props.yScale ? -1 : 1;
	    var tickSpacing = Math.max(props.innerTickSize, 0) + props.tickPadding;  

	    scale = props.yScale ? props.yScale : props.xScale;

	    ticks = props.tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, props.tickArguments) : scale.domain()) : props.tickValues;
	    tickFormat = props.tickFormat_ == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, props.tickArguments) : props.d3_identity) : props.tickFormat_;

	    adjustedScale = scale.rangeBand ? function(d)  { return scale(d) + scale.rangeBand() / 2; } : scale;

	    // Still working on this
	    // Ticks and lines are not fully aligned
	    // in some orientations
	    switch (props.orient) {
	      case 'top':
	        tr = function(tick)  {return ("translate(" + adjustedScale(tick) + ",0)");};
	        textAnchor = "middle";
	        y2 = props.innerTickSize * sign;
	        y1 = tickSpacing * sign;
	        dy =  sign < 0 ? "0em" : ".71em";
	        break;
	      case 'bottom':
	        tr = function(tick)  {return ("translate(" + adjustedScale(tick) + ",0)");};
	        textAnchor = "middle";
	        y2 = props.innerTickSize * sign;
	        y1 = tickSpacing * sign;
	        dy =  sign < 0 ? "0em" : ".71em";
	        break;
	      case 'left':
	        tr = function(tick)  {return ("translate(0," + adjustedScale(tick) + ")");};
	        textAnchor = "end";
	        x2 = props.innerTickSize * sign;
	        x1 = tickSpacing * sign;
	        dy = ".32em";
	        break;
	      case 'right':
	        tr = function(tick)  {return ("translate(0," + adjustedScale(tick) + ")");};
	        textAnchor = "end";
	        x2 = props.innerTickSize;
	        x1 = tickSpacing * sign;
	        dy = ".32em";
	        break;
	    }

	    return (
	      React.createElement("g", null, 
	        ticks.map( function(tick, i)  {
	          return (
	            React.createElement("g", {key: i, className: "tick", transform: tr(tick)}, 
	              React.createElement("line", {style: {shapeRendering:'crispEdges',opacity:'1',stroke:'#000'}, x2: x2, y2: y2}
	              ), 
	              React.createElement("text", {
	                strokeWidth: "0.01", 
	                dy: dy, x: x1, y: y1, 
	                stroke: "#000", 
	                textAnchor: textAnchor
	              }, 
	                tickFormat(tick)
	              )
	            )
	          );
	          })
	        
	      )
	    );
	  }

	});


/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);
	var d3 = __webpack_require__(15);

	module.exports = React.createClass({displayName: "exports",

	  propTypes: {
	    scale: React.PropTypes.func.isRequired,
	    innerTickSize: React.PropTypes.number,
	    outerTickSize: React.PropTypes.number,
	    tickPadding: React.PropTypes.number,
	    tickArguments: React.PropTypes.array,
	    fill: React.PropTypes.string,
	    stroke: React.PropTypes.string
	  },

	  getDefaultProps:function() {
	    return {
	      innerTickSize: 6,
	      outerTickSize: 6,
	      tickPadding: 3,
	      tickArguments: [10],
	      tickValues: null,
	      tickFormat: null 
	    };
	  },


	  _d3_scaleExtent:function(domain) {
	    var start = domain[0], stop = domain[domain.length - 1];
	    return start < stop ? [start, stop] : [stop, start];
	  },

	  _d3_scaleRange:function(scale) {
	    return scale.rangeExtent ? scale.rangeExtent() : this._d3_scaleExtent(scale.range());
	  },

	  render:function() {

	    var props = this.props;
	    var sign = props.orient === "top" || props.orient === "left" ? -1 : 1;

	    var range = this._d3_scaleRange(props.scale);

	    var d;

	    if (props.orient === "bottom" || props.orient === "top") {
	      d = "M" + range[0] + "," + sign * props.outerTickSize + "V0H" + range[1] + "V" + sign * props.outerTickSize;
	    } else {
	      d = "M" + sign * props.outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + sign * props.outerTickSize;
	    }


	    return (
	      React.createElement("path", {
	        className: "domain", 
	        d: d, 
	        style: {'shapeRendering':'crispEdges'}, 
	        fill: "none", 
	        stroke: props.stroke, 
	        strokeWidth: props.strokeWidth
	      }
	      )
	    );
	  }
	});


/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var React = __webpack_require__(1);


	module.exports = React.createClass({displayName: "exports",

	  render:function() {
	    var props = this.props;
	    var strokeWidth = '0.01';
	    if (props.label) {
	      switch (props.orient) {
	        case 'top':
	          return (
	            React.createElement("text", {
	              strokeWidth: strokeWidth, 
	              y: props.offset, x: props.width/2, 
	              textAnchor: "middle"}, 
	              props.label
	            )
	          );
	        case 'bottom':
	          return (
	            React.createElement("text", {
	              strokeWidth: strokeWidth, 
	              y: props.offset, x: props.width/2, 
	              textAnchor: "middle"}, 
	              props.label
	            )
	          );
	        case 'left':
	          return (
	            React.createElement("text", {
	              strokeWidth: strokeWidth, 
	              y: -props.offset, x: -props.height/2, 
	              textAnchor: "middle", 
	              transform: "rotate(270)"}, 
	              props.label
	            )
	          );
	        case 'right':
	          return (
	            React.createElement("text", {
	              strokeWidth: strokeWidth, 
	              y: props.offset, x: -props.height/2, 
	              textAnchor: "middle", 
	              transform: "rotate(270)"}, 
	              props.label
	            )
	          );
	      }
	    }
	    return React.createElement("text", null);
	  }

	});




/***/ },
/* 117 */
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
/* 118 */
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

	var ExecutionEnvironment = __webpack_require__(50);

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
/* 119 */
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
/* 120 */
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
/* 121 */
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

	var emptyFunction = __webpack_require__(78);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 122 */
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
/* 123 */
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

	var Heap = __webpack_require__(128);

	var invariant = __webpack_require__(79);

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
/* 124 */
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

	var ImmutableValue = __webpack_require__(129);

	var invariant = __webpack_require__(79);
	var keyOf = __webpack_require__(130);
	var mergeHelpers = __webpack_require__(131);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

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
	 * @providesModule FixedDataTableCell.react
	 * @typechecks
	 */

	var ImmutableObject = __webpack_require__(124);
	var React = __webpack_require__(66);

	var cloneWithProps = __webpack_require__(75);
	var cx = __webpack_require__(76);
	var joinClasses = __webpack_require__(103);

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
/* 127 */
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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47)))

/***/ },
/* 128 */
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
/* 129 */
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

	var invariant = __webpack_require__(79);
	var isNode = __webpack_require__(132);
	var keyOf = __webpack_require__(130);

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
/* 130 */
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
/* 131 */
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

	var invariant = __webpack_require__(79);
	var keyMirror = __webpack_require__(133);

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
/* 132 */
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
/* 133 */
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

	var invariant = __webpack_require__(79);

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