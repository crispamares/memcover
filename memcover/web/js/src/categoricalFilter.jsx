'use strict'

var React = require('react');
var d3 = require('d3');
var _ = require('lodash');

module.exports = React.createClass({


    getDefaultProps: function() {
	return {
	    categories: []  // {name: "cat1", included: false}
	};
    },

    render: function() {
	var onClickedCategoriy = this.props.onClickedCategoriy;
	return (
	    <form>
	      {
		  this.props.categories.map(function(category, i){
		      return (<Input type='checkbox' ref={"cat" + i}  key={"cat" + category.name}
			  label={category.name} valueChecked={category.included} 
				      onCLick={onClickedCategoriy.bind(this, category.name)}/>
		      );
		  })
	       }
            </form>
	)
    }

});
