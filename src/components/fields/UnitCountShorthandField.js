import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, isEmptyString, parseJSONPointer, updateSafelyWithJSONPointer } from "../../utils";
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

	// TODO
	parseCode() {
		return new Promise((resolve) => {
			setTimeout( () => {
				this.props.onChange({...this.props.formData, pairCount: 2});
				resolve();
			}, 1000);
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
	}

	constructor(props) {
		super(props);
		this.state = {loading: false};

		this.onBlur = this.onBlur.bind(this);
	}

	onChange = ({target: {value}}) => {
		this.props.onChange(value);
	}

	componentDidUpdate(prevProps) {
		if (prevProps.options.taxonID !== this.props.options.taxonID) {
			this.onBlur();
		}
	}

	render() {
		let validationState = "default";
		if (this.state.failed === true) validationState = "warning";
		else if (!isEmptyString(this.props.value) && this.props.value === this.state.value) validationState = "success";

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
			<FormGroup validationState={this.state.failed ? "error" : undefined}>
				{inputElem}
				{this.state.failed ? (
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

		if (value && value.length >= 3) {
			if (!(value === this.state.value && taxonID === this.state.taxonID)) {
				this.setState({value, taxonID, loading: true});
				parseCode(value, taxonID).then(() => {
					this.setState({loading: false});
				}).catch(() => {
					this.setState({loading: false});
				});
			}
		}
	}
}
