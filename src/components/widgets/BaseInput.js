import * as React from "react";
import BaseInput from "@rjsf/core/dist/cjs/components/widgets/BaseInput";
import Context from "../../Context";
import { getUiOptions } from "../../utils";

export default class _BaseInput extends React.Component {
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
		if (this.props.formatValue) value = this.props.formatValue(value);

		const type = this.props.schema.type;
		// Accept only integers
		if (type === "integer") {
			value = value ? value.replace(/[^0-9-]/g, "") : value;
			value = value ? value.replace(/(.+)-/g, "$1") : value;
		}
		// Accept integers or floats
		if (type === "number") {
			value = value ? value.replace(/[^0-9.-]/g, "") : value;
			value = value ? value.replace(/(\..*)\./g, "$1") : value;
			value = value ? value.replace(/(.+)-/g, "$1") : value;
		}

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

	onFocus = (e) => {
		this.focused = true;
		this.props.onFocus && this.props.onFocus(e);
	}

	onBlur = (e) => {
		this.focused = false;
		if (this.state.value !== this.props.value) {
			this.props.onChange(this.state.value);
		}
		if (this.timeout) clearTimeout(this.timeout);
		this.props.onBlur && this.props.onBlur(e);
	}

	render() {
		const {
			formatValue, // eslint-disable-line @typescript-eslint/no-unused-vars
			...props
		} = this.props;
		const options = props.schema.type === "number" || props.schema.type === "integer"
			? {...props.options, inputType: "text"}
			: props.options;
		return <BaseInput {...props} {...this.state} onChange={this.onChange} onFocus={this.onFocus} onBlur={this.onBlur}  options={options} />;
	}
}
