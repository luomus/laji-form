import React, { Component, PropTypes } from "react";

export default class HorizontalWrapper extends Component {
	render() {
		return (<div className="horizontal">{this.props.children}</div>)
	}
}
