import React, { Component } from "react";
import { Modal } from "react-bootstrap";
import Button from "./Button";

export default class Alert extends Component {
	render() {
		return (
			<Modal show={true}>
				<Modal.Body>
					{this.props.children}
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={this.props.onOk}>Ok</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}
