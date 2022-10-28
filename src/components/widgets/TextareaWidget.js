import * as React from "react";
import * as PropTypes from "prop-types";
import { stringifyKeyCombo } from "../../utils";
import { TooltipComponent } from "../components";
import Context from "../../Context";
import ReactContext from "../../ReactContext";
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
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
		this.textareaRef = React.createRef();

		this._context = new Context(props.formContext.contextId);
		const {shortcuts} = this._context;
		Object.keys(shortcuts || {}).some(keyCombo => {
			if (keyCombo === "Enter") {
			//	// Direct mutation should be ok in constructor.
				this.state.enterReserved = true; // eslint-disable-line react/no-direct-mutation-state
			}
		});
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {value: props.value};
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

	onChange = (value) => {
		this.setState({value}, () => {
			if (!this.focused) {
				this.props.onChange(value);
			} else {
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = this.props.formContext.setTimeout(() => {
					this.props.onChange(value === "" ? getUiOptions(this.props).emptyValue : value);
				}, 1000);
			}
		});
	}

	_onChange = ({target: {value}}) => {
		this.onChange(value);
	}

	onKeyDown = (e) => {
		const inputAllowed = !this.props.disabled && !this.props.readonly;
		const isCtrlEnter = e.ctrlKey && e.key === "Enter";
		if (this.state.enterReserved && inputAllowed && isCtrlEnter) {
			this.onChange(this.state.value + "\n");
			e.preventDefault();
			e.stopPropagation();
		}
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
			onChange={this._onChange}
			onKeyDown={this.onKeyDown}
		/>;

		return this.state.enterReserved ? (
			<TooltipComponent tooltip={`${stringifyKeyCombo("ctrl+Enter")} ${this.props.formContext.translations.textareaHint}`} placement="bottom">
				{textarea}
			</TooltipComponent>
		) : textarea;
	}

}
