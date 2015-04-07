'use strict'

var React = require('react');

module.exports = React.createClass({
    render: function(){
	return (
            <div>
	      <object id="svgobject" 
		      type="image/svg+xml"
		      width={this.props.width} 
		      height={this.props.heght}
		      data="assets/hipo_map.svg">
	      </object>
            </div>
	);
    }
});
