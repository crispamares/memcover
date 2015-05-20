'use strict'

var React = require('react');
var classNames = require('classnames');

/**
 *  Bootstrap requires
 */
var BS = require('react-bootstrap');
var Button = BS.Button;
var Modal = BS.Modal;
var TabbedArea = BS.TabbedArea;
var TabPane = BS.TabPane;


module.exports = React.createClass({

    handleCreateCard: function() {
	this.props.onRequestHide();
	this.props.onCreateCard();
    },

    render: function(){
	return (
	    <Modal {...this.props} bsSize="large" title='Select a card to be added' animation={true}>
	      <div className='modal-body'>

		<TabbedArea defaultActiveKey={2}>
		  <TabPane eventKey={1} tab='Tab 1'>TabPane 1 content</TabPane>
		  <TabPane eventKey={2} tab='Tab 2'>TabPane 2 content</TabPane>
		  <TabPane eventKey={3} tab='Tab 3' disabled={true}>TabPane 3 content</TabPane>
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
