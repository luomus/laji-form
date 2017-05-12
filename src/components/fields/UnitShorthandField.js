import React, { Component } from "react";
import PropTypes from "prop-types";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { getInnerUiSchema, getUiOptions, isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import { Button, GlyphButton, FetcherInput } from "../components";
import { Tooltip, OverlayTrigger, Glyphicon, FormGroup, HelpBlock } from "react-bootstrap";

@BaseComponent
export default class UnitShorthandField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			uiSchema: PropTypes.object
		})
	}

	constructor(props) {
		super(props);
		this.state = {showSchema: false};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	getStateFromProps = (props) => {
		let {showSchema} = this.state;
		if (!this.state.showSchema && !isEmptyString(props.formData[getUiOptions(props.uiSchema).shorthandField])) {
			showSchema = true;
		}
		return {showSchema};
	}

	getToggleButton = () => {
		return (
			<GlyphButton
				key={`${this.props.idSchema.$id}-toggle-code-reader-schema`}
				bsStyle={this.state.showSchema ? "default" : "primary"}
				onClick={() => {
					new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
					this.setState({showSchema: !this.state.showSchema});
				}}
				glyph="resize-small"
			/>
		);
	}

	onCodeChange = (formData) => {
		new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
		this.props.onChange(getDefaultFormState(this.props.schema, formData, this.props.registry.definitions));
		this.setState({showSchema: true});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		const shorthandFieldName = getUiOptions(this.props.uiSchema).shorthandField;
		const toggleButton = this.getToggleButton();
		return !this.state.showSchema ? (
				<div className="laji-form-field-template-item">
					<CodeReader translations={this.props.formContext.translations}
					            onChange={this.onCodeChange} 
					            value={this.props.formData[shorthandFieldName]} 
					            formID={getUiOptions(this.props.uiSchema).formID} 
					            className="laji-form-field-template-schema" />
					<div className="laji-form-field-template-buttons">{toggleButton}</div>
				</div>
			) : (
				<div>
					<SchemaField 
						{...this.props} 
						uiSchema={getInnerUiSchema({...this.props.uiSchema, "ui:buttons": [toggleButton]})} />
				</div>
			);
	}
}

@BaseComponent
class CodeReader extends Component {
	constructor(props) {
		super(props);
		this.state = {value: ""};
		this.state = this.getStateFromProps(props);
		this.apiClient = new ApiClient();
	}

	getStateFromProps = (props) => {
		let state = this.state;
		if (this.state.value === "" && !isEmptyString(props.value)) {
			state.value = props.value;
		}
		return state;
	}

	componentDidMount() {
		this.mounted = true;
		if (this.inputRef) this.inputRef.focus();
	}

	componentWillUnmount() {
		this.mounted = false;
	}
	
	render() {
		const {translations} = this.props;

		let validationState = "default";
		if (this.state.failed === true) validationState = "warning";
		else if (!isEmptyString(this.props.value) && this.props.value === this.state.value) validationState = "success";

		return (
			<FormGroup validationState={this.state.failed ? "error" : undefined}>
				<FetcherInput
					getRef={n => {this.inputRef = n;}}
					loading={this.state.loading}
					value={this.state.value}
					validationState={validationState}
					onChange={({target: {value}}) => {if (this.mounted) this.setState({value})}}
					onBlur={this.getCode}
					onKeyDown={e => {
						if (e.key === "Enter") {
							this.getCode();
						}
					}}
				/>
				{this.state.failed ? (
					<HelpBlock>
						{translations.InvalidUnitCode}
					</HelpBlock>
					) : null
				}
			</FormGroup>
		);
	}

	getCode = () => {
		const {value} = this.state;
		if (this.mounted) this.setState({loading: true});
		if (!isEmptyString(this.props.value) && (!this.value || this.value.length < 3)) {
			if (this.mounted) this.setState({failed: false, loading: false}, this.props.onChange(undefined));
		} else if (value.length >= 3) {
			this.apiClient.fetchCached("/autocomplete/unit", {q: value, formID: this.props.formID}).then(response => {
					this.props.onChange(response.payload.unit)
			}).catch(e => {
					if (this.mounted) this.setState({failed: true, loading: false});
			});
		}
	}
}
