import React, { Component } from "react";

export default class FormSelect extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const title = this.props.title;
		return (
			<div>
				<h1>{title}</h1>
				<select defaultValue="" onChange={this.onChange}>
					<option value="" disabled hidden />
					{this.renderOptions()}
				</select>
			</div>
		);
	}

	renderOptions = () => {
		let options = [];
		let forms = this.props.forms;
		if (forms) Object.keys(forms).forEach((id) => {
			options.push(<option value={id} key={id}>{this.props.forms[id].title}</option>)
		});
		return options;
	}

	onChange = (e) => {
		if (typeof this.props.onChange === "function") this.props.onChange(this.props.forms[e.target.value]);
	}
}
