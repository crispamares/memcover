'use strict'
var React = require('react');
var _ = require('lodash');
var when = require('when'); 

var App = require('./mainApp'); 

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

rpc.call('init', [])
    .then(function(names){
	var props = {
	    morphoTable: names["morpho_table"],
	    morphoSelection: names["morpho_selection"],
	    clinicTable: names["clinic_table"],
	    clinicSelection: names["clinic_selection"]
 	};
	React.render( <App {...props}></App>, document.getElementById('content'));

    })
    .catch(function(e){console.error(e);});
