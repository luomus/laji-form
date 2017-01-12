import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import validate from "../validation";
import { Button, Label, Help } from "./components";

import Form from "react-jsonschema-form";

import NestField from "./fields/NestField";
import ArrayBulkField from "./fields/ArrayBulkField";
import AutoArrayField from "./fields/AutoArrayField";
import CopyValuesArrayField from "./fields/CopyValuesArrayField";
import ScopeField from "./fields/ScopeField";
import SelectTreeField from "./fields/SelectTreeField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import GridLayoutField from "./fields/GridLayoutField";
import InjectField from "./fields/InjectField";
import InjectDefaultValueField from "./fields/InjectDefaultValueField";
import ArrayCombinerField from "./fields/ArrayCombinerField";
import DependentBooleanField from "./fields/DependentBooleanField";
import DependentDisableField from "./fields/DependentDisableField";
import AltMapArrayField from "./fields/AltMapArrayField";
import AutosuggestField from "./fields/AutosuggestField";
import InputTransformerField from "./fields/InputTransformerField";
import HiddenField from "./fields/HiddenField";
import InitiallyHiddenField from "./fields/InitiallyHiddenField";
import ContextInjectionField from "./fields/ContextInjectionField";
import ImageArrayField from "./fields/ImageArrayField";
import FilteredEnumStringField from "./fields/FilteredEnumStringField";
import SplitField from "./fields/SplitField";
import FlatField from "./fields/FlatField";
import AccordionArrayField from "./fields/AccordionArrayField";
import CustomButtonArrayField from "./fields/CustomButtonArrayField";
import SingleItemArrayField from "./fields/SingleItemArrayField";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayField from "./fields/ArrayField";
import StringField from "./fields/StringField";

import CheckboxWidget from "./widgets/CheckboxWidget";
import SelectWidget from "./widgets/SelectWidget";
import AutosuggestWidget from "./widgets/AutosuggestWidget";
import DateTimeWidget from "./widgets/DateTimeWidget";
import DateWidget from "./widgets/DateWidget";
import TimeWidget from "./widgets/TimeWidget";
import SeparatedDateTimeWidget from "./widgets/SeparatedDateTimeWidget";
import HiddenWidget from "./widgets/HiddenWidget";
import ImageSelectWidget from "./widgets/ImageSelectWidget";
import AnyToBooleanWidget from "./widgets/AnyToBooleanWidget";

import ApiClient from "../ApiClient";
import Context, {clear as clearContext} from "../Context";
import translations from "../translations.js";

const RC_SWITCH_CLASS = "rc-switch";
const FOCUS_SINK_CLASS = "focus-sink";

const inputTypes = ["input", "select", "textarea"];
let tabbableSelectors = inputTypes.slice(0);
tabbableSelectors.push(`.${RC_SWITCH_CLASS}:not(.${RC_SWITCH_CLASS}-disabled)`);
tabbableSelectors.push(`.${FOCUS_SINK_CLASS}`);
tabbableSelectors = tabbableSelectors.map(type => { return `${type}:not(:disabled)` });

class FieldTemplate extends Component {
	render() {
		const {
			id,
			classNames,
			label,
			children,
			errors,
			rawHelp,
			description,
			hidden,
			required,
			displayLabel,
			uiSchema,
			} = this.props;

		if (hidden) {
			return children;
		}
		const inlineHelp = uiSchema["ui:inlineHelp"];
		const ids = new Context("IDS");
		const htmlId = `_laji-form_${id}`;
		let elemId = undefined;
		if (!ids[htmlId]  || ids[htmlId] === this) {
			ids[htmlId] = this;
			elemId = htmlId;
		}

		const buttons = uiSchema["ui:buttons"] || undefined;
		const vertical = uiSchema["ui:buttonsVertical"];
		return (
			<div className={classNames} id={elemId}>
				{label && displayLabel ? <Label label={label} help={rawHelp} required={required} id={id} /> : null}
				{displayLabel && description ? description : null}
				<div className={"laji-form-field-template-item" + (vertical ? " keep-vertical" : "")}>
					<div className={"laji-form-field-template-schema"}>
						{inlineHelp ? <div className="pull-left">{children}</div> : children}
						{inlineHelp ? (
							<div className="pull-left"><Help help={inlineHelp} id={`${elemId}-inline-help`} /></div>
							) : null
						}
					</div>
					{buttons ?
						<div className="laji-form-field-template-buttons">{buttons}</div> :
						null
					}
				</div>
				{errors}
			</div>
		);
	}
}

//TODO remove once resolving pull request is merged.
function _SchemaField(props) {
	let {schema} = props;
	if (props.schema.type === "array" && props.uiSchema && props.uiSchema.items && props.uiSchema.items["ui:field"]) {
		schema = {...schema, uniqueItems: false};
	}
	return <SchemaField
		{...props}
		schema={schema}
	/>
}


export default class LajiForm extends Component {
	static propTypes = {
		lang: PropTypes.oneOf(["fi", "en", "sv"]),
		uiSchemaContext: PropTypes.object,
		validators: PropTypes.object
	}

	static defaultProps = {
		lang: "en"
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
		this.translations = this.constructTranslations();
		this._context = new Context(this.props.contextId);
		this._context.blockingLoaderCounter = 0;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;
		this._context.focusNextInput = this.focusNextInput;
		this._context.stateClearListeners = [];
		this._context.addStateClearListener = (fn) => this._context.stateClearListeners.push(fn);
		this._context.clearState = () => this._context.stateClearListeners.forEach(stateClearFn => stateClearFn());
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		if (props.hasOwnProperty("lang") && this.props.lang !== props.lang) this.apiClient.flushCache();
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		this._context.staticImgPath = props.staticImgPath;
		this._context.formData = props.formData;
		return {translations: this.translations[props.lang]};
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	constructTranslations = () => {
		function capitalizeFirstLetter(string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
		function decapitalizeFirstLetter(string) {
			return string.charAt(0).toLowerCase() + string.slice(1);
		}

		let dictionaries = {};
		for (let word in translations) {
			for (let lang in translations[word]) {
				const translation = translations[word][lang];
				if (!dictionaries.hasOwnProperty(lang)) dictionaries[lang] = {};
				dictionaries[lang][word] = decapitalizeFirstLetter(translation);
				dictionaries[lang][capitalizeFirstLetter(word)] = capitalizeFirstLetter(translation);
			}
		}
		return dictionaries;
	}

	onChange = ({formData}) => {
		if (this.props.onChange) this.props.onChange(formData);
		this._context.formData = formData;
	}

	render() {
		const {translations} = this.state;
		return (
			<div onKeyDown={this.onKeyDown} className="laji-form">
				<Form
					{...this.props}
					ref="form"
					onChange={this.onChange}
					fields={{
						SchemaField: _SchemaField,
						StringField,
						ArrayField,
						nested: NestField,
						unitTripreport: ArrayBulkField,
						bulkArray: ArrayBulkField,
						scoped: ScopeField,
						tree: SelectTreeField,
						horizontal: GridLayoutField,
						grid: GridLayoutField,
						table: TableField,
						inject: InjectField,
						injectDefaultValue: InjectDefaultValueField,
						expandable: AdditionalsExpanderField,
						arrayCombiner: ArrayCombinerField,
						dependentBoolean: DependentBooleanField,
						dependentDisable: DependentDisableField,
						mapArray: AltMapArrayField,
						altMapArray: AltMapArrayField,
						autoArray: AutoArrayField,
						copyValuesArray: CopyValuesArrayField,
						autosuggest: AutosuggestField,
						hidden: HiddenField,
						initiallyHidden: InitiallyHiddenField,
						inputTransform: InputTransformerField,
						injectFromContext: ContextInjectionField,
						imageArray: ImageArrayField,
						filteredEnum: FilteredEnumStringField,
						split: SplitField,
						flat: FlatField,
						accordionArray: AccordionArrayField,
						customButtonArray: CustomButtonArrayField,
						singleItemArray: SingleItemArrayField
					}}
					widgets={{
						CheckboxWidget,
						SelectWidget,
						dateTime: DateTimeWidget,
						date: DateWidget,
						time: TimeWidget,
						separatedDateTime: SeparatedDateTimeWidget,
						autosuggest: AutosuggestWidget,
						hidden: HiddenWidget,
						imageSelect: ImageSelectWidget,
						anyToBoolean: AnyToBooleanWidget
					}}
					FieldTemplate={FieldTemplate}
					formContext={{
						translations,
						lang: this.props.lang,
						uiSchemaContext: this.props.uiSchemaContext
					}}
				  validate={validate(this.props.validators)}
				>
				<div>
					{this.props.children}
					{(!this.props.hasOwnProperty("renderSubmit") || this.props.renderSubmit) ?
						(<Button type="submit">{translations.Submit}</Button>) :
						null}
					</div>
			</Form>
			<ReactCSSTransitionGroup
					transitionName="blocking-loader-transition"
					transitionEnterTimeout={200}
					transitionLeaveTimeout={200}
				>{this.state.blocking ? <div className="blocking-loader" /> : null}
			</ReactCSSTransitionGroup>
		</div>
		)
	}

	submit = () => {
		this.refs.form.onSubmit({preventDefault: () => {;}});
	}

	canFocusNextInput = (inputElem) => {
		function isTabbableInput(elem) {
			return (inputTypes.includes(elem.tagName.toLowerCase()) ||
			elem.className.includes(RC_SWITCH_CLASS) ||
			elem.className.includes(FOCUS_SINK_CLASS));
		}

		const formElem = findDOMNode(this.refs.form);

		return (formElem.querySelectorAll && isTabbableInput(inputElem));
	}

	getTabbableFields = (reverse) => {
		const formElem = findDOMNode(this.refs.form);

		const fieldsNodeList = formElem.querySelectorAll(tabbableSelectors.join(", "));
		let fields = [...fieldsNodeList];

		if (reverse) fields = fields.reverse();
		return fields;
	}

	focusNextInput = (inputElem, reverseDirection) => {
		if (!inputElem) inputElem = document.activeElement;
		if (!this.canFocusNextInput(inputElem)) return;

		const fields = this.getTabbableFields(reverseDirection);

		let doFocus = false;
		for (let field of fields) {
			if (field === inputElem) {
				doFocus = true;
				continue;
			}

			if (doFocus) {
				field.focus();
				if (document.activeElement !== inputElem) break;
			}
		}
	}

	onKeyDown = (e) => {
		function isDescendant(parent, child) {
			var node = child.parentNode;
			while (node != null) {
				if (node == parent) {
					return true;
				}
				node = node.parentNode;
			}
			return false;
		}

		if (this._context.blockingLoaderCounter > 0 &&
			  !isDescendant(document.querySelector(".pass-block"), document.activeElement)) {
			e.preventDefault();
			return;
		}

		if (isDescendant(document.querySelector(".laji-map"), document.activeElement)) return;

		if (e.key == "Enter" && this.canFocusNextInput(e.target)) {
			e.preventDefault();
			this.focusNextInput(e.target, e.shiftKey);
		}
	}

	pushBlockingLoader = () => {
		this._context.blockingLoaderCounter++;
		if (this.mounted) this.setState({blocking: this._context.blockingLoaderCounter > 0});
	}

	popBlockingLoader = () => {
		this._context.blockingLoaderCounter--;
		if (this._context.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		}
		this.setState({blocking: this._context.blockingLoaderCounter > 0})
	}

	clearState = () => {
		this._context.clearState();
	}
}
