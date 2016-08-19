import React, { Component } from "react";

export default class Button extends Component {
	render() {
		let classList = ["btn"];
		if (this.props.classList) classList = classList.concat(this.props.classList);
		classList.push(this.props.buttonType ? "btn-" + this.props.buttonType : "btn-info");

		let buttonProps = {};
		["disabled", "type", "tabIndex", "onClick"].forEach(prop => {
			if (this.props.hasOwnProperty(prop)) buttonProps[prop] = this.props[prop];
		});

		return (
			<button
				type="button"
				className={classList.join(" ").trim()}
		    tabIndex="-1"
				{...buttonProps}
			>{this.props.children}</button>);
	}
}
