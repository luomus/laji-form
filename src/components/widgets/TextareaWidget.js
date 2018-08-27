import React, { Component } from "react";
import TextareaWidget from "react-jsonschema-form/lib/components/widgets/TextareaWidget";
import { stringifyKeyCombo } from "../../utils";
import { TooltipComponent } from "../components";
import Context from "../../Context";

export default class _TextareaWidget extends Component {
	constructor(props) {
		super(props);
		this.state = {};

		this._context = new Context(props.formContext.contextId);
		const {shortcuts} = this._context;
		Object.keys(shortcuts).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "textareaRowInsert") {
				// Direct mutation should be ok in constructor.
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
			<TooltipComponent tooltip={`${stringifyKeyCombo(this.state.keyCombo)} ${this.props.formContext.translations.textareaHint}`} placement="bottom">
				{textarea}
			</TooltipComponent>
		) : textarea;
	}

	onFocus = () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false});
	}
}

