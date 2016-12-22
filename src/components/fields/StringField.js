import React, { Component } from "react";
import StringField from "react-jsonschema-form/lib/components/fields/StringField";

export default class _StringField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps({formData}) {
		return {formData};
	}

	render() {
		return (
			<div onBlur={() => this.props.onChange(this.state.formData)}>
				<StringField
					{...this.props}
					formData={this.state.formData}
					onChange={formData => this.setState({formData})}
				/>
			</div>
		);
	}
}
