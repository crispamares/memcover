'use strict'
var React = require('react');
var when = require('when'); 
var d3 = require('d3'); 
var FixedDataTable = require('fixed-data-table');

var Hello = require('./hello');
// ----------------------------------------------------------
//  Setup indyva's conection 
// ----------------------------------------------------------
var Context = require('context');
var context = new Context(window.location.hostname, 'ws', 19000);
context.install();
var session = 's'+String(Math.round((Math.random()*100000)));
context.openSession(session);

window.onbeforeunload = function() {return "The session will be lost";};
window.onunload = function() {context.closeSession();};

var rpc = context.rpc;
var hub = context.hub;

var table = null;
var schema = null;
var quantitative_attrs = null;
var totalItems = null;

rpc.call('init', [])
    .then(function(names){
	table = names["table"];
	var promise = rpc.call("TableSrv.row_count", [table])
	    .then(function(rowCount){totalItems = rowCount;})
	    .then(function() {return rpc.call("TableSrv.schema", [table]);});

	return promise;
    }) 
    .then(function(_schema){
	schema = _schema;
	schema.attributes = _.mapValues(schema.attributes, function(v,k){v.name = k; return v;});
	quantitative_attrs = getQuantitativeAttrs(schema);

	function getQuantitativeAttrs(schema) {
	    var attrs = _.pick(schema.attributes, function(value, key) {
		return value.attribute_type === "QUANTITATIVE" && ! value.shape.length;
	    });
	    return _(attrs).keys().sort().value();
	}

    })
    .then(function() {

	var Table = FixedDataTable.Table;
//	var Column = FixedDataTable.Column;


	React.render(
	    <div>
              <div className="row">
                <div className="col-sm-6 well">
		  Clinical data
                </div>
                <div className="col-sm-6 well">
		  RegionsSSS
                </div>
              </div>
              <div className="row">
                <div className="col-sm-12 well">
		  PDOPWED
                </div>
              </div>
	    </div>
	    , document.getElementById('content'));
    });


