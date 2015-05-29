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
	    activeTab: "table"
	};
    },

    handleCreateCard: function() {

	var config = this.refs[this.state.activeTab].getConfig();
	var card = {kind:this.state.activeTab, title: config.table, config: config};

	switch (this.state.activeTab) {
	    // Nothing special for: ["table", "pcp"]
	    case "scatter":
		card.title = _.capitalize(config.xColumn) + " VS " + _.capitalize(config.yColumn);
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
	    <Modal {...this.props} bsSize="large" title='Select a card to be added' animation={true}>
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

var TableMenuItem = React.createClass({
    render: function() {
	return (
	      <Input type="select" label="Data Table" ref="table" valueLink={this.props.tableLink}>
	        {
		    this.props.tables.map(function(table, i){
			return (<option  key={"table" + i} value={table}> {table} </option>);
		    })
		 }
              </Input>
	)}    
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
	return {table: this.props.options.tables[0]};
    },

    getConfig: function() {
	var self = this;
	var columns = this.props.options.columns[ this.state.table ].map(
	    function(column, i){return {name: column.name, included: self.refs["col"+i].getChecked()};})

	return {
	    table: this.state.table,
	    columns: columns
	};
    },

    render: function() {
	var options = this.props.options;
	var columns = options.columns[this.state.table];
	return (
            <form>
	      <TableMenuItem tableLink={this.linkState('table')} tables={options.tables}> </TableMenuItem>
              <label> Columns: </label>
	      {
		  columns.map(function(column, i){
		      return (<Input type='checkbox' ref={"col" + i}  key={"col" + column.name}
			  label={column.name} defaultChecked={column.included}/>);
		  })
	       }
            </form>
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

    render: function() {
	var options = this.props.options;
	var columns = options.columns[this.state.table];
	return (
            <div>
              <form>
 		<TableMenuItem tableLink={this.linkState('table')} tables={options.tables} /> 
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
