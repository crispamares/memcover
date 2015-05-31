'use strict'

var React = require('react');
var d3 = require('d3');
var _ = require('lodash');

var LifecycleMixin = require('./lifecycleMixin');
var BS = require('react-bootstrap');
var Input = BS.Input;


module.exports = React.createClass({
    mixins: [LifecycleMixin],

    getDefaultProps: function() {
	return {
	    categories: []  // {name: "cat1", included: false}
	};
    },

    render: function() {
	var onClickedCategory = this.props.onClickedCategory;

	return (
	    <form className="form-inline">
	      {
		  this.props.categories.map(function(category, i){
		      return (<Input style={ {"margin-left": 20} } type='checkbox' ref={"cat" + i}  key={"cat" + category.name}
			  label={category.name} checked={category.included} 
				      onChange={onClickedCategory.bind(this, category.name)}/>
		      );
		  })
	       }
            </form>
	)
    }

});
