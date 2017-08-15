import React, { Component } from "react";
import PropTypes from "prop-types";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { getInnerUiSchema, getUiOptions, isEmptyString, getNestedTailUiSchema, updateTailUiSchema, focusById } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";
import { GlyphButton, FetcherInput } from "../components";
import { FormGroup, HelpBlock } from "react-bootstrap";

@BaseComponent
export default class UnitShorthandField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				shorthandField: PropTypes.string.isRequired,
				formID: PropTypes.string.isRequired,
			}).isRequired,
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
		const onClick = () => {
			this.setState({showSchema: !this.state.showSchema}, () => {
				focusById(this.props.formContext.contextId, this.props.idSchema.$id);
			});
		};

		return (
			<GlyphButton
				key={`${this.props.idSchema.$id}-toggle-code-reader-schema`}
				bsStyle={this.state.showSchema ? "default" : "primary"}
				onClick={onClick}
				glyph="resize-small"
			/>
		);
	}

	onCodeChange = (formData = {}) => {
		this.getContext().idToFocus = this.props.idSchema.$id;
		this.props.onChange(getDefaultFormState(this.props.schema, formData, this.props.registry.definitions));
		this.setState({showSchema: true});
	}

	render() {
		const {uiSchema} = this.props;
		const {SchemaField} = this.props.registry.fields;
		const shorthandFieldName = getUiOptions(this.props.uiSchema).shorthandField;
		const toggleButton = this.getToggleButton();

		const tailUiSchema = getNestedTailUiSchema(uiSchema);
		let help = tailUiSchema && tailUiSchema[shorthandFieldName] && tailUiSchema[shorthandFieldName]["ui:belowHelp"];
		const uiSchemaWithoutHelp = isEmptyString(help) ? uiSchema : updateTailUiSchema(uiSchema, {[shorthandFieldName]: {"ui:belowHelp": {$set: undefined}}});

		return !this.state.showSchema ? (
				<div className="laji-form-field-template-item">
					<CodeReader translations={this.props.formContext.translations}
					            onChange={this.onCodeChange} 
					            value={this.props.formData[shorthandFieldName]} 
					            formID={getUiOptions(this.props.uiSchema).formID} 
					            help={help} 
											id={`_laji-form_${this.props.idSchema[shorthandFieldName].$id}`}
					            className="laji-form-field-template-schema" />
					<div className="laji-form-field-template-buttons">{toggleButton}</div>
				</div>
			) : (
				<div>
					<SchemaField 
						{...this.props} 
						uiSchema={getInnerUiSchema({...uiSchemaWithoutHelp, "ui:buttons": [toggleButton]})} />
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
	}

	componentWillUnmount() {
		this.mounted = false;
	}
	
	render() {
		const {translations} = this.props;

		let validationState = "default";
		if (this.state.failed === true) validationState = "warning";
		else if (!isEmptyString(this.props.value) && this.props.value === this.state.value) validationState = "success";

		const onChange = ({target: {value}}) => {
			if (this.mounted) this.setState({value});
		};

		const onKeyDown = e => {
			if (e.key === "Enter") {
				this.getCode();
			}
		};

		return (
			<FormGroup validationState={this.state.failed ? "error" : undefined}>
				<FetcherInput
					id={this.props.id}
					loading={this.state.loading}
					value={this.state.value}
					validationState={validationState}
					onChange={onChange}
					onBlur={this.getCode}
					onKeyDown={onKeyDown}
				/>
				{this.state.failed ? (
					<HelpBlock>
						{translations.InvalidUnitCode}
					</HelpBlock>
					) : null
				}
			<div className="small text-muted" dangerouslySetInnerHTML={{__html: this.props.help}} />
			</FormGroup>
		);
	}

	getCode = () => {
		const {value} = this.state;
		if (!isEmptyString(this.props.value) && isEmptyString(value) && (!this.value || this.value.length < 3)) {
			this.mounted && this.setState({loading: true});
			this.mounted && this.setState({failed: false, loading: false}, () => {
				isEmptyString(this.value) && this.props.onChange(undefined);
			});
		} else if (value.length >= 3) {
			this.mounted && this.setState({loading: true});
			this.apiClient.fetchCached("/autocomplete/unit", {q: value, formID: this.props.formID}).then(response => {
				this.props.onChange(response.payload.unit);
			}).catch(() => {
				this.mounted && this.setState({failed: true, loading: false});
			});
		}
	}
}
