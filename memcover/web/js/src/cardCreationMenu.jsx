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
	return {
	    table: this.props.options.table,
	    columns: this.props.options.columns
	};
    },

    componentWillReceiveProps: function(nextProps) {
	this.setState({
	    table: nextProps.options.table,
	    columns: nextProps.options.columns
	});
    },

    getConfig: function() {
	var self = this;
	return {
	    table: this.refs.table.getValue(),
	    columns: this.props.options.columns.map(
		function(column, i){return {name: column.name, included: self.refs["col"+i].getChecked()};})
	};
    },

    render: function() {
	var options = this.props.options;
	return (
            <form>
	      <Input type="select" label="Data Table" ref="table">
	        {
		    options.tables.map(function(table){
			return (<option value={table}> {table} </option>);
		    })
		 }
              </Input>
              <label> Columns: </label>
	      {
		  options.columns.map(function(column, i){
		      return (<Input type='checkbox' ref={"col" + i} 
				      label={column.name} defaultChecked={column.included}/>);
		  })
	      }
            </form>
	);

    }
});
