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


var CardCreationMenu = React.createClass({
    getInitialState: function() {
	return {
	    activeTab: "table"
	};
    },

    handleCreateCard: function() {
	var card = null;

	var config = this.refs[this.state.activeTab].getConfig();
	switch (this.state.activeTab) {
	    case "table":
		card = {kind:"table", title: config.table, config: config}
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
				  tabNode = <DataTableMenu ref={tab.kind} options={tab.options}/>;
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
	    table: this.refs.table.getValue(),
	    columns: columns
	};
    },

    render: function() {
	var self = this;
	var options = this.props.options;
	console.log("options:", this.props.options);
	var columns = options.columns[this.state.table];
	return (
            <form>
	      <Input type="select" label="Data Table" ref="table" valueLink={self.linkState('table')}>
	        {
		    options.tables.map(function(table, i){
			return (<option  key={"table" + i} value={table}> {table} </option>);
		    })
		 }
              </Input>
              <label> Columns: </label>
	      {
		  columns.map(function(column, i){
		      return (<Input type='checkbox' ref={"col" + i}  key={"col" + i}
				      label={column.name} defaultChecked={column.included}/>);
		  })
	      }
            </form>
	);

    }
});
