import React, { Component } from "react";
import { Button } from "react-bootstrap";

export default class LajiButton extends Component {
	render() {
		let buttonProps = {};
		buttonProps.bsStyle = "info";

		["disabled", "bsStyle", "onClick"].forEach(prop => {
			if (this.props.hasOwnProperty(prop)) buttonProps[prop] = this.props[prop];
		});

		buttonProps.bsClass = "btn";
		buttonProps.bsClass += ` btn-${buttonProps.bsStyle}`;
		if (this.props.className) buttonProps.bsClass += ` ${this.props.className}`;

		return (
			<Button
				{...this.props}
				{...buttonProps}>{this.props.children}</Button>);
	}
}
