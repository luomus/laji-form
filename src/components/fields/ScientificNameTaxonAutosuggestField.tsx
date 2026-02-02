import * as React from "react";
import * as PropTypes from "prop-types";
import {
	getUiOptions,
	isEmptyString,
	parseJSONPointer,
	getInnerUiSchema,
	updateSafelyWithJSONPointer,
	schemaJSONPointer,
	uiSchemaJSONPointer,
	updateFormDataWithJSONPointer,
	getFieldUUID,
} from "../../utils";
import { FieldProps, JSONSchemaObject, JSONSchemaEnumOneOf } from "../../types";
import ReactContext from "../../ReactContext";
import { renderTaxonIcons } from "../widgets/AutosuggestWidget";
import BaseComponent from "../BaseComponent";
import { OverlayTrigger } from "../components";
import { FormContext } from "../LajiForm";

interface State extends Pick<FieldProps<JSONSchemaObject>, "schema" | "uiSchema"> {
	suggestion?: any;
}

interface ValueContext {
	taxonRank?: string;
	author?: string;
}

interface TaxonWrapperProps {
	id?: string;
	formContext: FormContext;
	suggestion?: any;
	overlayRef: any;
	placement?: string;
	inputValue?: string;
	isSuggested?: boolean;
	options?: any;
}

function addBold(original: string, substring: string) {
	const newOriginal = original.toLowerCase();
	const newString = substring.toLowerCase();
	const index = newOriginal.indexOf(newString);

	return index > -1 ?
		<>{original.slice(0, index)}<b>{original.slice(index, index + substring.length)}</b>{original.slice(index + substring.length)}</>
		: original;
}

@BaseComponent
export default class ScientificNameTaxonAutosuggestField extends React.Component<FieldProps<JSONSchemaObject>, State> {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				taxonField: PropTypes.string.isRequired,
				taxonRankField: PropTypes.string.isRequired,
				authorField: PropTypes.string.isRequired,
				allowNonsuggestedValue: PropTypes.bool
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	};

	getStateFromProps = (props: FieldProps<JSONSchemaObject>): State => {
		let {schema, uiSchema, formData = {}} = props;
		const uiOptions = getUiOptions(uiSchema);
		const {taxonField, taxonRankField, authorField} = uiOptions;

		const scientificName = parseJSONPointer(formData, taxonField, true);
		const taxonRank = parseJSONPointer(formData, taxonRankField, true);
		const author = parseJSONPointer(formData, authorField, true);

		let taxonRankLabel = undefined;
		if (taxonRank) {
			taxonRankLabel = (this.getTaxonRankOptions() || []).find(option => option.const === taxonRank)?.title;
		}

		let options = {
			...uiOptions,
			autosuggestField: "taxon",
			onSuggestionSelected: this.onSuggestionSelected,
			onUnsuggestedSelected: this.onUnsuggestionSelected,
			isValueSuggested: this.isValueSuggested,
			getSuggestionFromValue: this.getSuggestionFromValue,
			getSuggestionValue: this.getSuggestionValue,
			renderSuggestion: this.renderSuggestion,
			valueContext: {taxonRank, author},
			taxonRankLabel,
			Wrapper: TaxonWrapper
		};

		if (!isEmptyString(scientificName)) {
			options.value = scientificName;
		}

		const innerUiSchema = getInnerUiSchema(uiSchema);
		const _uiSchemaJSONPointer = uiSchemaJSONPointer(schema, taxonField);

		if (!_uiSchemaJSONPointer) {
			throw new Error("Invalid taxon field");
		}

		const taxonExistingUiSchema = parseJSONPointer(innerUiSchema, _uiSchemaJSONPointer);
		let widgetProps = taxonExistingUiSchema || {};

		let _uiSchema = updateSafelyWithJSONPointer(innerUiSchema, {
			"ui:widget": "AutosuggestWidget",
			...widgetProps,
			"ui:options": {
				...getUiOptions((taxonExistingUiSchema || {})[taxonField]),
				...options
			},
		}, _uiSchemaJSONPointer);

		return {schema, uiSchema: _uiSchema};
	};

	getSuggestionValue = (suggestion: any): string => {
		return suggestion.scientificName;
	};

	onSuggestionSelected = (suggestion: any, mounted: boolean) => {
		if (suggestion === null) suggestion = undefined;

		let {formData, uiSchema, formContext, registry, schema} = this.props;
		const {taxonField, taxonRankField, authorField} = getUiOptions(uiSchema);

		if (typeof suggestion === "object") {
			this.setState({suggestion});

			const scientificName = suggestion.scientificName;
			formData = updateFormDataWithJSONPointer({formData, registry, schema}, scientificName, taxonField);

			let taxonRank = suggestion.taxonRank;
			const taxonRankOptions = this.getTaxonRankOptions();
			if (taxonRankOptions && !taxonRankOptions.some(option => option.const === taxonRank)) {
				taxonRank = undefined;
			}
			formData = updateFormDataWithJSONPointer({formData, registry, schema}, taxonRank, taxonRankField);

			const author = suggestion.scientificNameAuthorship;
			formData = updateFormDataWithJSONPointer({formData, registry, schema}, author, authorField);
		}

		if (mounted) {
			this.props.onChange(formData);
		} else {
			if (formContext.formDataTransformers) {
				formData = formContext.formDataTransformers.reduce((unit, {"ui:field": uiField, props: fieldProps}) => {
					let changed;
					const getChanged = (_changed: any) => {
						changed = _changed;
					};

					const field = new (fieldProps.registry.fields[uiField] as any)({
						...fieldProps,
						formData: formData,
						onChange: getChanged
					});
					field.onChange(field.state && field.state.formData ? field.state.formData : formData);
					return changed;
				}, formData);
			}
			const lajiFormInstance = formContext.services.rootInstance;
			const pointer = this.props.formContext.services.ids.getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(this.props.idSchema.$id, getFieldUUID(this.props));
			const newFormData = {...parseJSONPointer(lajiFormInstance.getFormData(), pointer), ...formData};
			lajiFormInstance.onChange(updateSafelyWithJSONPointer(lajiFormInstance.getFormData(), newFormData, pointer));
		}
	};

	onUnsuggestionSelected = (value: any) => {
		this.setState({suggestion: undefined});
		let {formData, uiSchema, registry, schema} = this.props;
		const {taxonField} = getUiOptions(uiSchema);
		formData = updateFormDataWithJSONPointer({formData, registry, schema}, value, taxonField);
		this.props.onChange(formData);
	};

	isValueSuggested = (value?: string, valueContext?: ValueContext): boolean|undefined => {
		const {suggestion} = this.state;
		if (!suggestion) {
			return false;
		}

		return this.suggestionMatchesData(suggestion, value, valueContext);
	};

	getSuggestionFromValue = async (value?: string, valueContext?: ValueContext): Promise<any> => {
		if (this.isValueSuggested(value, valueContext)) {
			return this.state.suggestion;
		}

		if (!value) {
			throw new Error("Missing scientific name");
		}
		if (!valueContext?.taxonRank) {
			throw new Error("Missing taxon rank");
		}

		const query = {query: value, limit: 100, nameTypes: "MX.scientificName", matchType: "exact"};
		const result = await this.props.formContext.apiClient.get("/autocomplete/taxa", {query});

		for (const suggestion of result.results) {
			if (this.suggestionMatchesData(suggestion, value, valueContext)) {
				this.setState({suggestion});
				return suggestion;
			}
		}

		throw new Error("Unknown scientific name");
	};

	suggestionMatchesData = (suggestion: any, value?: string, valueContext?: ValueContext): boolean => {
		const normalizedValue = value?.replace(/\s+/g, " ").trim().toLowerCase();
		const normalizedAuthor = valueContext?.author?.replace(/\s/g, "").trim().toLowerCase();

		return normalizedValue === suggestion.scientificName?.toLowerCase() &&
			valueContext?.taxonRank === suggestion.taxonRank &&
			normalizedAuthor === suggestion.scientificNameAuthorship?.replace(/\s/g, "").toLowerCase();
	};

	getTaxonRankOptions = (): JSONSchemaEnumOneOf[]|undefined => {
		let {uiSchema} = this.props;
		const {taxonRankField} = getUiOptions(uiSchema);

		const taxonRankSchemaPointer = schemaJSONPointer(this.props.schema, taxonRankField);
		if (taxonRankSchemaPointer === undefined) {
			throw new Error("Invalid taxon rank field");
		}

		return parseJSONPointer(this.props.schema, taxonRankSchemaPointer).oneOf;
	};

	renderSuggestion(suggestion: any, inputValue?: string) {
		let value = suggestion.scientificName;
		if (suggestion.nameType === "MX.scientificName" && inputValue) {
			value = addBold(value, inputValue);
		}

		return (
			<span className="simple-option">
				<>{value}{renderTaxonIcons(suggestion)}</>
			</span>
		);
	}

	render() {
		const {SchemaField} = this.props.registry.fields as any;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema}/>;
	}
}

class _TaxonWrapper extends React.Component<TaxonWrapperProps> {
	static contextType = ReactContext;

	render() {
		const {id, formContext, suggestion, children, placement, inputValue, isSuggested, options} = this.props;

		const {Popover, Tooltip} = this.context.theme;

		const tooltipElem = (
			<Tooltip id={`${id}-popover-tooltip`}>
				{formContext.translations.OpenSpeciedCard}
			</Tooltip>
		);
		const taxonLinkElem = (
			<OverlayTrigger overlay={tooltipElem} style={{display: "inline"}}>
				<a href={`http://tun.fi/${suggestion?.id}`} target="_blank" rel="noopener noreferrer">
					{suggestion?.id}
				</a>
			</OverlayTrigger>
		);

		let popover;
		if (isEmptyString(inputValue)) {
			popover = <React.Fragment />;
		} else {
			popover = (
				<Popover id={`${id}-popover`}>
					{ !isSuggested && this.props.formContext.translations.UnknownName}
					{ isSuggested && (
						<div>
							{options?.taxonRankLabel} {suggestion.cursiveName ? <i>{suggestion.scientificName}</i> : suggestion.scientificName} {suggestion.scientificNameAuthorship} {renderTaxonIcons(suggestion)} ({taxonLinkElem})
						</div>
					)}
				</Popover>
			);
		}

		return (
			<OverlayTrigger
				hoverable={true}
				placement={placement}
				overlay={popover}
				ref={this.props.overlayRef}
				formContext={this.props.formContext}>
				{children}
			</OverlayTrigger>
		);
	}
}

const TaxonWrapper = React.forwardRef((props: TaxonWrapperProps, ref) => <_TaxonWrapper {...props} overlayRef={ref} />);
