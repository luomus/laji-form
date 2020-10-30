import * as React from "react";
import * as PropTypes from "prop-types";
import { stringifyKeyCombo } from "../../utils";
import { TooltipComponent } from "../components";
import Context from "../../Context";
import { getUiOptions } from "../../utils";

export default class TextareaWidget extends React.Component {
	static propTypes = {
		"ui:options": PropTypes.shape({
			emptyValue: PropTypes.string,
			rows: PropTypes.number,
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}),
		value: PropTypes.string
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);

		this._context = new Context(props.formContext.contextId);
		const {shortcuts} = this._context;
		Object.keys(shortcuts || {}).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "textareaRowInsert") {
				// Direct mutation should be ok in constructor.
				this.state.keyCombo = keyCombo; // eslint-disable-line react/no-direct-mutation-state
				return true;
			}
		});
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {value: props.value};
	}

	keyFunctions = {
		textareaRowInsert: () => {
			if (!this.props.disabled && !this.props.readonly) {
				this.props.onChange((this.props.value !== undefined ? this.props.value : "") + "\n");
				return true;
			}
			return false;
		}
	}

	componentDidMount() {
		this._context.addKeyHandler(this.props.id, this.keyFunctions);
	}

	componentWillUnmount() {
		this._context.removeKeyHandler(this.props.id, this.keyFunctions);
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

	onChange = ({target: {value}}) => {
		this.setState({value}, () => {
			if (!this.focused) {
				this.props.onChange(value);
			} else {
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = new Context(this.props.formContext.contextId).setTimeout(() => {
					this.props.onChange(value === "" ? getUiOptions(this.props).emptyValue : value);
				}, 1000);
			}
		});
	}

	render() {
		const {
			id, options, placeholder, disabled, readonly, autofocus
		}  = this.props;
		const {value} = this.state;

		const {
			required = this.props.required
		} = options;

		const textarea = <textarea
			id={id}
			className="form-control"
			value={typeof value === "undefined" ? "" : value}
			placeholder={placeholder}
			required={required}
			disabled={disabled}
			readOnly={readonly}
			autoFocus={autofocus}
			rows={options.rows}
			onFocus={this.onFocus}
			onBlur={this.onBlur}
			onChange={this.onChange}
		/>;

		return this.state.keyCombo ? (
			<TooltipComponent tooltip={`${stringifyKeyCombo(this.state.keyCombo)} ${this.props.formContext.translations.textareaHint}`} placement="bottom">
				{textarea}
			</TooltipComponent>
		) : textarea;
	}

}
