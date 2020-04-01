import React, { Component } from "react";
import PropTypes from "prop-types";
import {
	getUiOptions,
	parseJSONPointer,
	updateSafelyWithJSONPointer
} from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import BaseComponent from "../BaseComponent";
import {FetcherInput} from "../components";
import { FormGroup, HelpBlock } from "react-bootstrap";

@VirtualSchemaField
export default class UnitCountShorthandField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				shorthandField: PropTypes.string.isRequired,
				pairCountField: PropTypes.string.isRequired,
				taxonIDField: PropTypes.string.isRequired
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.parseCode = this.parseCode.bind(this);
	}

	static getName() {return "UnitCountShorthandField";}

	getStateFromProps(props) {
		const {uiSchema, formData} = props;
		const {shorthandField, taxonIDField} = getUiOptions(props.uiSchema);

		const shortHandUiSchema = {
			"ui:widget": CodeReader,
			"ui:options": {
				parseCode: this.parseCode,
				taxonID: parseJSONPointer(formData, taxonIDField)
			}
		};

		const _uiSchema = updateSafelyWithJSONPointer(uiSchema, shortHandUiSchema, shorthandField);

		return {...props, uiSchema: _uiSchema};
	}

	parseCode(value, taxonId) {
		const {apiClient} = this.props.formContext;
		let formData = this.props.formData;
		const {shorthandField, pairCountField} = getUiOptions(this.props.uiSchema);

		let timestamp = Date.now();
		this.promiseTimestamp = timestamp;

		return new Promise((resolve) => {
			if (!value || !taxonId) {
				formData = updateSafelyWithJSONPointer(formData, undefined, pairCountField);
				this.props.onChange(formData);
				resolve({success: undefined});
			}

			apiClient.fetchCached("/autocomplete/pairCount", {q: value, taxonID: taxonId}).then(suggestion => {
				if (timestamp !== this.promiseTimestamp) {
					return;
				}
				formData = updateSafelyWithJSONPointer(formData, suggestion.key, shorthandField);
				formData = updateSafelyWithJSONPointer(formData, suggestion.value, pairCountField);
				this.props.onChange(formData);
				resolve({success: true});
			}).catch(() => {
				if (timestamp !== this.promiseTimestamp) {
					return;
				}
				formData = updateSafelyWithJSONPointer(formData, undefined, pairCountField);
				this.props.onChange(formData);
				resolve({success: false});
			});
		});
	}
}

@BaseComponent
class CodeReader extends Component {
	static propTypes = {
		options: PropTypes.shape({
			parseCode: PropTypes.func.isRequired,
			taxonID: PropTypes.string
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}),
		value: PropTypes.string
	};

	constructor(props) {
		super(props);
		this.state = {loading: false};

		this.onBlur = this.onBlur.bind(this);
	}

	onChange = ({target: {value}}) => {
		this.props.onChange(value);
	};

	componentDidUpdate(prevProps) {
		if (prevProps.options.taxonID !== this.props.options.taxonID) {
			this.onBlur();
		}
	}

	render() {
		let validationState = "default";
		if (this.state.success === false) {
			validationState = "error";
		} else if (this.state.success) {
			validationState = "success";
		}

		const {formContext} = this.props;
		const {translations} = formContext;

		const inputElem = (
			<FetcherInput
				id={this.props.id}
				loading={this.state.loading}
				value={this.props.value || ""}
				validationState={validationState}
				onBlur={this.onBlur}
				onKeyDown={this.onKeyDown}
				onChange={this.onChange}
			/>
		);

		return (
			<FormGroup validationState={this.state.success === false ? "error" : undefined}>
				{inputElem}
				{this.state.success === false ? (
					<HelpBlock>
						{translations.InvalidUnitCode}
					</HelpBlock>
				) : null
				}
				<div className="small text-muted" dangerouslySetInnerHTML={{__html: this.props.help}}/>
			</FormGroup>
		);
	}

	onKeyDown = (e) => {
		if (e.key === "Enter") {
			this.onBlur();
		}
	}

	onBlur() {
		const {value, options} = this.props;
		const {parseCode, taxonID} = options;

		if (!(value === this.state.value && taxonID === this.state.taxonID)) {
			this.setState({value, taxonID, loading: true, success: undefined});
			parseCode(value, taxonID).then((result) => {
				this.setState({loading: false, success: result.success});
			});
		}
	}
}
