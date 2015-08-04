'use strict'

var React = require('react');
var _ = require('lodash');

/**
 *  Bootstrap requires
 */
var BS = require('react-bootstrap');
var Button = BS.Button;
var Modal = BS.Modal;
var TabbedArea = BS.TabbedArea;
var TabPane = BS.TabPane;
var Input = BS.Input;
var Col = BS.Col;

var CardCreationMenu = React.createClass({
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
		card.title = _.capitalize(config.column); // + " - " + config.table;
		card.kind = (config.attribute_type === "QUANTITATIVE") ? "rangeFilter" : "categoricalFilter";
		break;
	    case "parset":
		card.title = _.capitalize(config.value);
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
	    <Modal {...this.props} bsSize="large" title="Add new card" animation={true}>
	      <div className='modal-body'>
		
		<TabbedArea activeKey={this.state.activeTab} onSelect={this.handleSelectTab}>
		  {
		      tabs.map(function(tab) {
			  var tabNode = null;
			  switch (tab.kind) {
			      case "table":
			      case "pcp":
				  tabNode = <DataTableMenu ref={tab.kind} options={tab.options}/>;
				  break;
			      case "scatter":
				  tabNode = <ScatterMenu ref={tab.kind} options={tab.options}/>;
				  break;
			      case "parset":
				  tabNode = <ParSetMenu ref={tab.kind} options={tab.options}/>;
				  break;
			      case "regions":
				  tabNode = <RegionsMenu ref={tab.kind} options={tab.options}/>;
				  break;
			      case "columnFilter":
				  tabNode = <ColumnFilterMenu ref={tab.kind} options={tab.options}/>;
				  break;
			      case "box":
				  tabNode = <BoxMenu ref={tab.kind} options={tab.options}/>;
				  break;
			  }
			  return (
			      <TabPane eventKey={tab.kind} tab={tab.title}>
				{tabNode}
			      </TabPane>			  
			  );
		      })
		  }
		</TabbedArea>
		
	      </div>
	      <div className='modal-footer'>
		<Button onClick={this.props.onRequestHide}>Close</Button>
		<Button onClick={this.handleCreateCard}  bsStyle="primary">Create Card</Button>
	      </div>
	    </Modal>
	);
    }
});

module.exports = CardCreationMenu;

/**
 * Shows a table selection only when props.tables has more than one item
 */
var TableMenuItem = React.createClass({
    render: function() {
	if (this.props.tables.length > 1) {
	    return (
		<Input type="select" label="Data Table" ref="table" valueLink={this.props.tableLink}>
	        {
		    this.props.tables.map(function(table, i){
			return (<option  key={"table" + i} value={table}> {table} </option>);
		    })
		 }
              </Input>
	    )
	}
	else {
	    return (<div></div>);
	}
    }
});


var CheckboxColumnsMenuItem = React.createClass({

    getInitialState: function() {
	return { columns: this.props.columns };
    },

    handleCheck: function(column_i, checked) {
	var state = _.set(this.state, ["columns", column_i, "included"], checked);
	this.setState(state);
	this.props.onChange && this.props.onChange(state.columns);
    },

    handleMultiCheck: function(checked) {
	var columns = this.state.columns;
	columns = _.map(columns, function(column) {column.included = checked; return column;});
	var state = _.set(this.state, ["columns"], columns);
	this.setState(state);
	this.props.onChange && this.props.onChange(state.columns);
    },

    render: function() {
	var columns = this.state.columns;
	var handleCheck = this.handleCheck;
	var handleMultiCheck = this.handleMultiCheck;
	return (
            <div style={ {position: "relative"} }>
	      <label> {this.props.label} </label>
	      <BS.ButtonGroup style={ {position: "absolute", right: "0px", top: "-5px"} }>
                <Button onClick={function(){handleMultiCheck(true)}}> Select All </Button>
                <Button onClick={function(){handleMultiCheck(false)}}> Unselect All </Button>
	      </BS.ButtonGroup>
              <div className="row">
		{
		    columns.map(function(column, i){
			return (
                            <div className="col-md-4">
			    <Input type='checkbox' ref={"col" + i}  key={"col" + column.name}
			    label={column.name} onChange={function(ev) {handleCheck(i, ev.target.checked)}} checked={column.included}/>
                            </div>
			);
		    })
		 }
              </div>
	    </div>
	);

    }
});




var RadioColumnsMenuItem = React.createClass({
    render: function() {
	
	return (
		  <form>
		    <div>
		      <label> {this.props.label} </label>
		    </div>
		    <div className="radio">
		      {
			  this.props.columns.map(function(column, i){
			      return (
				  <label className="radio"> 
				  <input type='radio' name="columns" ref={"col" + i}  key={"col" + column.name}
				  defaultChecked={column.included} />
				  {column.name}
				  </label>
			      );
			  })
		       }
		    </div>
		  </form>

	)}    
});


var DummyMenu = React.createClass({
    getConfig: function() { return {};},
    render: function() { return (<span></span>);}
});

var RegionsMenu = React.createClass({
    getConfig: function() { return {};},
    render: function() { return ( 
	<div style={{"text-align": "center"}}>
	  <img height="200px" style={{margin: "20px auto 0 auto"}}  src="assets/hipo_foto.svg"/>
	</div>
    );}
});


var DataTableMenu = React.createClass({

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

    handleCheck: function(table, columns) {
	var state = _.set(this.state, ["columns", table], columns);
	this.setState(state);
    },

    render: function() {
	var options = this.props.options;
	var columns = this.state.columns[this.state.table];
	var handleCheck = this.handleCheck.bind(this, this.state.table);
	return (
            <div>
	      <form>
		<TableMenuItem tableLink={this.linkState('table')} tables={options.tables}> </TableMenuItem>

		<CheckboxColumnsMenuItem label={"Columns"} columns={columns} onChange={handleCheck}> </CheckboxColumnsMenuItem>
	      </form>
	    </div>
	);

    }
});



var ScatterMenu = React.createClass({

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
            <div>
              <form>
 		<TableMenuItem tableLink={tableLink} tables={options.tables} /> 
	      </form>

	      <Input type='select' label='X Coordinate' ref="x" valueLink={this.linkState('xColumn')} >
	      {
		  columns.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
	       }
	      </Input>

	      <Input type='select' label='Y Coordinate' ref="y" valueLink={this.linkState('yColumn')}>
	      {
		  columns.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
	       }
	      </Input>

            </div>
	);

    }
});


var ColumnFilterMenu = React.createClass({

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
            <div>
              <form>
 		<TableMenuItem tableLink={tableLink} tables={options.tables} /> 
	      </form>

	      <Input type='select' label='Column' ref="col" valueLink={this.linkState('column')} >
	      {
		  columns.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
	       }
	      </Input>

            </div>
	);

    }
});


var BoxMenu = React.createClass({

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
            <div>
              <form>
 		<TableMenuItem tableLink={tableLink} tables={options.tables} /> 
	      </form>

	      <Input type='select' label='Column' ref="attr" valueLink={this.linkState('attr')} >
	      {
		  attrs.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
	       }
	      </Input>

	      <Input type='select' label='Split By' ref="facetAttr" valueLink={this.linkState('facetAttr')}>
	      {
		  facetAttrs.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
	       }
	      </Input>

            </div>
	);

    }
});







var ParSetMenu = React.createClass({

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
	    value: this.props.value || this.props.options.quantitativeColumns[table][0].name,
	    dimensions: this.props.dimensions || [],
	};
    },

    getConfig: function() {
	return {
	    table: this.state.table,
	    value: this.state.value,
	    dimensions: this.state.dimensions,
	};
    },

    handleTableChange: function(table) {
	this.setState({
	    table: table,
	    value: this.props.options.quantitativeColumns[table][0].name,
	    dimensions: [],
	});
    },

    onDimensionsChange: function(table, columns) {
	console.log("YEAHHHHH", table, columns);
	this.setState({"dimensions": columns});
    },

    render: function() {
	var options = this.props.options;
	var values = options.quantitativeColumns[this.state.table];
	var dimensions = options.categoricalColumns[this.state.table];
	var tableLink = {
	    value: this.state.table,
	    requestChange: this.handleTableChange
	};

	var onDimensionsChange = this.onDimensionsChange.bind(this, this.state.table);
	
	return (
            <div>
              <form>

 		<TableMenuItem tableLink={tableLink} tables={options.tables} /> 

		<Input type='select' label='Value to Show' ref="value" valueLink={this.linkState('value')} >
		{
		    values.map(function(column, i){ return (<option key={column.name} value={column.name}> {column.name} </option>); })
		}
		</Input>
	      
		<CheckboxColumnsMenuItem label={"Columns"} columns={dimensions} onChange={onDimensionsChange}> </CheckboxColumnsMenuItem>

	      </form>
            </div>
	);

    }
});


