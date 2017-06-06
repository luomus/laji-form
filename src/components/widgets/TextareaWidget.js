import React, { Component } from "react";
import TextareaWidget from "react-jsonschema-form/lib/components/widgets/TextareaWidget";
import { Tooltip } from "react-bootstrap";

export default class _TextareaWidget extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div onBlur={this.onBlur} onFocus={this.onFocus} onKeyDown={this.onKeyDown}>
				<TextareaWidget {...this.props} />
				<Tooltip className={this.state.focused ? "in" : ""} id={`${this.props.id}_hint`} placement="bottom">{this.props.formContext.translations.TextareaHint}</Tooltip>
			</div>
		);
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

