import React, { Component } from "react";

export default class Button extends Component {
	render() {
		let classList = ["btn"];
		if (this.props.classList) classList = classList.concat(this.props.classList);
		classList.push(this.props.type ? "btn-" + this.props.type : "btn-info");
		return (<button type="button" className={classList.join(" ").trim()}
		                tabIndex="-1" {...this.props}>{this.props.children}</button>);
	}
}
