import React, { Component } from 'react';
import StringField from "react-jsonschema-form/lib/components/fields/StringField";

export default class _StringField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {formData: props.formData};
	}

	onChange = (formData, force) => {
		this.setState({formData}, () =>  {
			if (!this.focused || force) {
				this.props.onChange(formData);
			}
		});
	}

	onFocus = () => {
		this.focused = true;
	}

	onBlur = () => {
		this.focused = false;
		this.props.onChange(this.state.formData);
	}

	render() {
		return (
			<div onFocus={this.onFocus} onBlur={this.onBlur}>
				<StringField {...this.props} {...this.state} onChange={this.onChange} />
			</div>
		);
	}
}
