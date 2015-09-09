'use strict'

var React = require('react');
var _ = require('lodash');
var LifecycleMixin = require('./lifecycleMixin');
var BS = require('react-bootstrap');

function isFloatBiggerThan(n, ref){
    return n === Number(n) && n % 1 !== 0 && n > ref;
}

module.exports = React.createClass({
    displayName: "DescriptionStats", 
    mixins : [LifecycleMixin],

    getDefaultProps: function(){
	return {
	    description: {},
	    decimals: 2,
	};
    },

    render: function() {
	var description = this.props.description;
	var decimals = this.props.decimals;
	var result = <BS.Alert bsStyle="link">There is no data to show</BS.Alert>;
	if (!_.isEmpty(description)) {
	    result = (
		<div className="col-sm-12"  >
		  <BS.Table  striped bordered condensed hover style={{"background-color": "#fff"}}>
		    <tbody>
		      {_.map(description, function(v, k){
			  var value = v;
			  if (isFloatBiggerThan(v, 0)) { value = isFloatBiggerThan(v, 1) ? v.toFixed(decimals) :  v.toFixed(4);}
			  return (
			      <tr>  
		              <td> <strong> {k}  </strong> </td> 
		              <td> {value} </td>
			      </tr>
			  );})}
		    </tbody>
		  </BS.Table>
		</div>
	    );
	}
	return result;
    }

});
