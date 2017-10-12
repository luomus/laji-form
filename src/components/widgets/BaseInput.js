import React, { Component } from "react";
import BaseInput from "react-jsonschema-form/lib/components/widgets/BaseInput";
import Context from "../../Context";
import { getUiOptions } from "../../utils";

export default class _BaseInput extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {value: props.value, ...getUiOptions(props).inputOptions};
	}

	onChange = (value) => {
		this.setState({value}, () =>  {
			if (!this.focused) {
				this.props.onChange(value);
			} else {
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = new Context(this.props.formContext.contextId).setTimeout(() => {
					this.props.onChange(value);
				}, 1000);
			}
		});
	}

	onFocus = () => {
		this.focused = true;
	}

	onBlur = () => {
		this.focused = false;
		if (this.state.value !== this.props.value) {
			this.props.onChange(this.state.value);
		}
		if (this.timeout) clearTimeout(this.timeout);
	}

	render() {
		return (
			<div>
				<BaseInput {...this.props} {...this.state} onChange={this.onChange} onFocus={this.onFocus} onBlur={this.onBlur} />
			</div>
		);
	}
}
