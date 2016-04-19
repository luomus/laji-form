import React, { Component } from "react";

class ErrorBox extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="error-box">
				<span>ERROR{": " + this.props.errorMsg}</span>
			</div>
		)
	}
}
