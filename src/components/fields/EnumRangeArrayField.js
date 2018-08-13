import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import BaseComponent from "../BaseComponent";
import { getUiOptions } from "../../utils";
import { Autosuggest } from "../widgets/AutosuggestWidget";
import { TagInputComponent } from "./TagArrayField";
import { Label } from "../components";
import Context from "../../Context";

@BaseComponent
export default class EnumRangeArrayField extends Component {
	static getName() {return "EnumRangeArrayField";}

	constructor(props) {
		super(props);
		this.state = {value: ""};
	}

	setRef = (elem) => {
		this.autosuggestRef = elem;
	}

	render() {
		const {range} = getUiOptions(this.props.uiSchema);
		const autosuggestOptions = {
			autosuggestField: range,
			onSuggestionSelected: this.onSuggestionSelected,
			id: this.props.idSchema.$id,
			minFetchLength: 0,
			inputProps: {
				value: this.state.value,
				that: this,
				InputComponent: EnumRangeInputInjection,
				onChange: this.onInputChange,
				tags: this.props.formData,
				id: this.props.idSchema.$id
			},
		};

		return (
			<React.Fragment>
				<Label label={this.props.schema.title} id={this.props.idSchema.$id} />
				<Autosuggest {...this.props} {...autosuggestOptions} ref={this.setRef} />
			</React.Fragment>
		);
	}

	onInputChange = (e, autosuggestEvent) => {
		const {newValue: value} = autosuggestEvent;
		if (autosuggestEvent.method !== "click") {
			this.setState({value});
		} else {
			const tagComponent = this.autosuggestRef.inputElem;
			const tagComponentElem = findDOMNode(tagComponent);
			const input = tagComponentElem.querySelector("input");
			if (input) {
				input.focus();
			}
		}
	}

	onSuggestionSelected = (suggestion) => {
		this.onChange([...this.props.formData, suggestion.value]);
	}

	onChange = (formData) => {
		this.props.onChange(formData);
		new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "resize");
	}
}

class EnumRangeInputInjection extends Component {
	render() {
		return <TagInputComponent {...this.props} onChange={this.onChange} onInputChange={this.onInputChange} />;
	}

	onInputChange = e => {
		this.props.onChange(e, {newValue: e.target.value});
	}

	onChange = (tags) => {
		this.props.that.setState({value: ""}, () => {
			this.props.that.onChange(tags);
		});
	}
}
