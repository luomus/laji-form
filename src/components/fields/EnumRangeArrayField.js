import React, { Component } from "react";
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
		this.state = {focused: false, value: ""};
	}

	onRemove = (idx) => () => {
		const formData = [...this.props.formData];
		formData.splice(idx, 1);
		this.props.onChange(formData);
	}
	render() {
		const {range} = getUiOptions(this.props.uiSchema);
		const autosuggestOptions = {
			autosuggestField: range,
			onSuggestionSelected: this.onSuggestionSelected,
			minFetchLength: 0,
			inputProps: {
				value: this.state.value,
				that: this,
				InputComponent: EnumRangeInputInjection,
				onChange: this.onInputChange,
				tags: this.props.formData,
				id: this.props.idSchema.$id
			}
		};

		return (
			<React.Fragment>
				<Label label={this.props.schema.title} id={this.props.idSchema.$id} />
				<Autosuggest {...this.props} {...autosuggestOptions} />
			</React.Fragment>
		);
	}

	onInputChange = (e, {newValue: value}) => {
		this.setState({value});
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
			new Context(this.props.that.props.formContext.contextId).sendCustomEvent(this.props.id, "resize");
			this.props.that.props.onChange(tags);
		});
	}
}
