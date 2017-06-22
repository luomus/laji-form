import React, { Component } from "react";
import TextareaWidget from "react-jsonschema-form/lib/components/widgets/TextareaWidget";
import { Tooltip } from "react-bootstrap";
import { stringifyKeyCombo } from "../../utils";
import Context from "../../Context";

export default class _TextareaWidget extends Component {
	constructor(props) {
		super(props);
		this.state = {};

		this._context = new Context(props.formContext.contextId);
		const {shortcuts} = this._context;
		Object.keys(shortcuts).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "textareaRowInsert") {
				this.state.keyCombo = keyCombo; // eslint-disable-line react/no-direct-mutation-state
				return true;
			}
		});
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

	render() {
		const textarea = <TextareaWidget {...this.props} />;
		return this.state.keyCombo ? (
			<div onBlur={this.onBlur} onFocus={this.onFocus}>
				{textarea}
				<Tooltip className={this.state.focused ? "in" : ""} id={`${this.props.id}_hint`} placement="bottom">{`${stringifyKeyCombo(this.state.keyCombo)} ${this.props.formContext.translations.textareaHint}`}</Tooltip>
			</div>
		) : textarea;
	}

	onKeyDown = (e) => {
		if (e.ctrlKey && e.key === "Enter") {
			const {value} = this.props;
			this.props.onChange((value !== undefined ? value : "") + "\n");
			e.stopPropagation();
			e.preventDefault();
		}
	}

	onFocus = () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false});
	}
}

