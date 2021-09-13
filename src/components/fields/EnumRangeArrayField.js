import * as React from "react";
import * as PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import BaseComponent from "../BaseComponent";
import { getUiOptions } from "../../utils";
import { Autosuggest } from "../widgets/AutosuggestWidget";
import { TagInputComponent } from "./TagArrayField";
import Context from "../../Context";
const equals = require("deep-equal");

@BaseComponent
export default class EnumRangeArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				range: PropTypes.string
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	static getName() {return "EnumRangeArrayField";}

	constructor(props) {
		super(props);
		this.state = {value: ""};
	}

	UNSAFE_componentWillReceiveProps(props) {
		if (!equals(props.formData, this.props.formData)) {
			new Context(props.formContext.contextId).sendCustomEvent(props.idSchema.$id, "resize");
		}
	}

	setRef = (elem) => {
		this.autosuggestRef = elem;
	}

	render() {
		const {range} = getUiOptions(this.props.uiSchema);
		const autosuggestOptions = {
			autosuggestField: range,
			onSuggestionSelected: this.onSuggestionSelected,
			onConfirmUnsuggested: this.onConfirmUnsuggested,
			id: this.props.idSchema.$id,
			value: this.state.value,
			controlledValue: true,
			minFetchLength: 0,
			wrapperClassName: "laji-form-enum-range",
			inputProps: {
				value: this.state.value,
				that: this,
				InputComponent: EnumRangeInputInjection,
				onChange: this.onInputChange,
				tags: this.props.formData,
				id: this.props.idSchema.$id
			},
			allowNonsuggestedValue: false
		};

		const {Label} = this.props.formContext;
		return (
			<React.Fragment>
				<Label label={this.props.schema.title} id={this.props.idSchema.$id} />
				<Autosuggest {...this.props} onChange={undefined} {...autosuggestOptions} ref={this.setRef} />
			</React.Fragment>
		);
	}

	onInputChange = ({target: {value}}, reason, callback) => {
		this.setState({value}, callback);
		if (reason === "click") {
			const tagComponent = this.autosuggestRef.autosuggestRef.inputElem;
			const tagComponentElem = findDOMNode(tagComponent);
			const input = tagComponentElem.querySelector("input");
			if (input) {
				input.focus();
			}
		}
		return value;
	}

	onSuggestionSelected = (suggestion) => {
		this.setState({value: ""}, () => {
			this.onChange([...(this.props.formData || []), suggestion.value], "suggestion selected");
		});
	}

	onUnsuggestedSelected = (value) => {
		this.setState({value: ""}, () => {
			this.onChange([...(this.props.formData || []), value], "unsuggested selected");
		});
	}

	onChange = (formData, reason) => {
		function onlyUnique(value, index, self) { 
			return self.indexOf(value) === index;
		}
		formData = formData.filter(onlyUnique);
		if (reason !== "remove" && reason !== "suggestion selected" && reason !== "unsuggested selected") {
			this.setState({value: ""});
			return;
		}
		this.setState({value: ""}, () => {
			this.props.onChange(formData);
		});
	}
}

class EnumRangeInputInjection extends React.Component {
	render() {
		return <TagInputComponent {...this.props} onChange={this.onChange} onInputChange={this.onInputChange}/>;
	}

	onInputChange = e => {
		this.props.onChange(e);
	}

	onChange = (tags, reason) => {
		this.props.that.onChange(tags, reason);
	}
}
