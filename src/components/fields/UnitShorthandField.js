import * as React from "react";
import * as PropTypes from "prop-types";
import { getDefaultFormState } from "@rjsf/core/dist/cjs/utils";
import { getInnerUiSchema, getUiOptions, isEmptyString, getNestedTailUiSchema, updateTailUiSchema, focusById, bringRemoteFormData, formDataIsEmpty } from "../../utils";
import BaseComponent from "../BaseComponent";
import Context from "../../Context";
import ReactContext from "../../ReactContext";
import { FetcherInput } from "../components";
import { HelpBlock } from "react-bootstrap";
import { Autosuggest } from "../widgets/AutosuggestWidget";
import { getButton } from "../ArrayFieldTemplate";

const LINE_TRANSECT_IDS = ["MHL.1", "MHL.27", "MHL.28"];

@BaseComponent
export default class UnitShorthandField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				shorthandField: PropTypes.string,
				formID: PropTypes.string,
				showSchema: PropTypes.bool,
				persistenceKey: PropTypes.string
			}).isRequired,
			uiSchema: PropTypes.object
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {showSchema: getUiOptions(props.uiSchema).showSchema};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	getStateFromProps = (props) => {
		const {persistenceKey} = getUiOptions(props.uiSchema);
		let showSchema = undefined;
		if (persistenceKey) {
			const persistingContainer = new Context(`${this.props.formContext.contextId}_UNIT_SHORTHAND_FIELD_PERSISTENCE_${persistenceKey}`);
			if (persistingContainer && "value" in persistingContainer) {
				showSchema = persistingContainer.value;
			} else {
				showSchema = this.shouldShowSchema(props);
			}
		} else {
			showSchema = this.shouldShowSchema(props);
		}

		return {showSchema};
	}

	componentWillReceiveProps = (props) => {
		this.setState(this.getStateFromProps(props));
	}

	componentDidUpdate() {
		if (this.onNextTick) {
			this.onNextTick();
			this.onNextTick = undefined;
		}
	}

	shouldShowSchema = (props) => {
		let {showSchema} = this.state;

		if (this.state.showSchema === undefined && !formDataIsEmpty(props)) {
			showSchema = true;
		}
		return showSchema;
	}

	onToggleButtonClick = () => () => {
		const {persistenceKey} = getUiOptions(this.props.uiSchema);
		this.setState({showSchema: !this.state.showSchema}, () => {
			focusById(this.props.formContext, this.props.idSchema.$id);
			new Context(`${this.props.formContext.contextId}_UNIT_SHORTHAND_FIELD_PERSISTENCE_${persistenceKey}`).value = this.state.showSchema;
		});
	}

	getToggleButton = () => {
		return {
			glyph: "resize-small",
			fn: this.onToggleButtonClick,
			tooltip: this.props.formContext.translations[this.state.showSchema ? "OpenShorthand" :  "CloseShorthand"],
			tooltipPlacement: "left",
			themeRole: this.state.showSchema ? "default" : "primary"
		};
	}

	onCodeChange = (formData = {}) => {
		const {autocopy, autofocus} = getUiOptions(this.props.uiSchema);
		if   (!autofocus) this.getContext().idToFocus = this.props.idSchema.$id;
		this.onNextTick = () => {
			if (autocopy) {
				new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "copy");
			} else if (autofocus) {
				new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "focus", "last");
			}
			this.setState({showSchema: true});
		};
		this.props.onChange(getDefaultFormState(this.props.schema, {...this.props.formData, ...formData}, this.props.registry.definitions));
	}

	render() {
		const {uiSchema, formContext, disabled, readonly} = this.props;
		const {SchemaField} = this.props.registry.fields;
		const shorthandFieldName = getUiOptions(this.props.uiSchema).shorthandField;
		const toggleButton = this.getToggleButton();

		const tailUiSchema = getNestedTailUiSchema(uiSchema);
		let help = tailUiSchema && tailUiSchema[shorthandFieldName] && tailUiSchema[shorthandFieldName]["ui:belowHelp"];
		const uiSchemaWithoutHelp = isEmptyString(help) ? uiSchema : updateTailUiSchema(uiSchema, {[shorthandFieldName]: {"ui:belowHelp": {$set: undefined}}});

		const id = (shorthandFieldName && this.props.idSchema[shorthandFieldName]) ?
			this.props.idSchema[shorthandFieldName].$id :
			`${this.props.idSchema.$id}_shortHandField`;

		let innerUiSchema = undefined;
		if (this.state.showSchema) {
			innerUiSchema = getInnerUiSchema({...uiSchemaWithoutHelp});
			const innerOptions = getUiOptions(innerUiSchema);
			innerUiSchema = {...innerUiSchema, "ui:options": {...innerOptions, buttons: [...(innerOptions.buttons || []), toggleButton]}};
		}

		return !this.state.showSchema ? (
			<div className="laji-form-field-template-item" id={`_laji-form_${id}`}>
				<CodeReader translations={this.props.formContext.translations}
				            onChange={this.onCodeChange}
				            value={this.props.formData[shorthandFieldName]}
				            formID={getUiOptions(this.props.uiSchema).formID || formContext.formID || formContext.uiSchemaContext.formID}
				            help={help} 
				            id={id}
				            formContext={formContext}
				            disabled={disabled}
				            readonly={readonly}
				            className="laji-form-field-template-schema" />
				<div className="laji-form-field-template-buttons">{getButton(toggleButton)}</div>
			</div>
		) : (
			<SchemaField {...this.props} uiSchema={innerUiSchema} />
		);
	}
}

@BaseComponent
class CodeReader extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {value: ""};
		this.state = this.getStateFromProps(props);
		this.apiClient = props.formContext.apiClient;
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

	onKeyDown = (e) => {
		if (e.key === "Enter") {
			this.getCode();
		}
	}

	onFetcherInputChange = ({target: {value}}) => {
		if (this.mounted) this.setState({value});
	}

	onAutosuggestChange = (formData) => {
		this.props.onChange(formData);
	}

	onSuggestionSelected = ({payload: {unit}}) => {
		const {formContext} = this.props;
		unit = bringRemoteFormData(unit, formContext);
		this.props.onChange(unit);
	}

	renderSuggestion = (suggestion) => {
		const {translations} = this.props;
		return suggestion.payload.isNonMatching
			? <span className="text-muted">{suggestion.value} <i>({translations.unknownSpeciesName})</i></span>
			: suggestion.value;
	}

	render() {
		const {translations, readonly, disabled} = this.props;

		let validationState = "default";
		if (this.state.failed === true) validationState = "warning";
		else if (!isEmptyString(this.props.value) && this.props.value === this.state.value) validationState = "success";

		const {formID, formContext} = this.props;

		const inputElem = LINE_TRANSECT_IDS.includes(formID) ? (
			<FetcherInput
				id={this.props.id}
				loading={this.state.loading}
				value={this.state.value}
				validationState={validationState}
				onChange={this.onFetcherInputChange}
				onBlur={this.getCode}
				onKeyDown={this.onKeyDown}
				readonly={readonly}
				disabled={disabled}
			/>
		) : (
			<div className="unit-shorthand">
				<Autosuggest
					autosuggestField="unit"
					query={{
						formID,
						includeNonMatching: true
					}}
					onSuggestionSelected={this.onSuggestionSelected}
					renderSuggestion={this.renderSuggestion}
					onChange={this.onAutosuggestChange}
					formContext={formContext}
					allowNonsuggestedValue={false}
				/>
			</div>
		);

		const {FormGroup} = this.context.theme;
		return (
			<FormGroup validationState={this.state.failed ? "error" : undefined}>
				{inputElem}
				{this.state.failed
					? (
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

			this.apiClient.fetchCached("/autocomplete/unit", {q: value, formID: this.props.formID, includePayload: true}).then(response => {
				this.props.onChange(response.payload.unit);
			}).catch(() => {
				this.mounted && this.setState({failed: true, loading: false});
			});
		}
	}
}
