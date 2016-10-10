import React, { Component, PropTypes } from "react";
import ReactDOM from "react-dom";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import Button from "./Button";

import Form from "./../overriddenComponents/Form";
import SchemaField from "./../overriddenComponents/fields/SchemaField";
import ArrayField from "./../overriddenComponents/fields/ArrayField";
import ObjectField from "./../overriddenComponents/fields/ObjectField";
import BooleanField from "./../overriddenComponents/fields/BooleanField";
import StringField from "./../overriddenComponents/fields/StringField";
import CheckboxWidget from "./../overriddenComponents/widgets/CheckboxWidget";

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
import MapArrayField from "./fields/MapArrayField";
import AutosuggestField from "./fields/AutosuggestField";
import InputTransformerField from "./fields/InputTransformerField";
import HiddenField from "./fields/HiddenField";
import InitiallyHiddenField from "./fields/InitiallyHiddenField";
import ContextInjectionField from "./fields/ContextInjectionField";
import ImageArrayField from "./fields/ImageArrayField";
import FilteredEnumStringField from "./fields/FilteredEnumStringField";

import AutosuggestWidget from "./widgets/AutosuggestWidget";
import DateTimeWidget from "./widgets/DateTimeWidget";
import DateWidget from "./widgets/DateWidget";
import TimeWidget from "./widgets/TimeWidget";
import SeparatedDateTimeWidget from "./widgets/SeparatedDateTimeWidget";
import HiddenWidget from "./widgets/HiddenWidget";
import ImageSelectWidget from "./widgets/ImageSelectWidget";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

const RC_SWITCH_CLASS = "rc-switch";
const FOCUS_SINK_CLASS = "focus-sink";

const inputTypes = ["input", "select", "textarea"];
let tabbableSelectors = inputTypes.slice(0);
tabbableSelectors.push(`.${RC_SWITCH_CLASS}:not(.${RC_SWITCH_CLASS}-disabled)`);
tabbableSelectors.push(`.${FOCUS_SINK_CLASS}`);
tabbableSelectors = tabbableSelectors.map(type => { return `${type}:not(:disabled)` });

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
		this._context = new Context();
		this._context.blockingLoaderCounter = 0;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;
		this._context.focusNextInput = this.focusNextInput;
		this._context.stateClearListeners = [];
		this._context.addStateClearListener = (fn) => this._context.stateClearListeners.push(fn);
		this._context.clearState = (fn) => this._context.stateClearListeners.forEach(stateClearFn => stateClearFn());
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
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
		let dictionaries = {}
		for (let word in translations) {
			for (let lang in translations[word]) {
				const translation = translations[word][lang];
				if (!dictionaries.hasOwnProperty(lang)) dictionaries[lang] = {};
				dictionaries[lang][word] = translation;
				dictionaries[lang][capitalizeFirstLetter(word)] = capitalizeFirstLetter(translation);
			}
		}
		return dictionaries;
	}

	onChange = ({formData}) => {
		if (this.props.onChange) this.props.onChange(formData);
	}

	render() {
		const {translations} = this.state;
		return  (
			<div onKeyDown={this.onKeyDown} className="laji-form">
				<Form
					{...this.props}
					ref="form"
					onChange={this.onChange}
					registry={{
						fields: {
							SchemaField: SchemaField,
							ArrayField: ArrayField,
							ObjectField: ObjectField,
							BooleanField: BooleanField,
							StringField: StringField,
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
							mapArray: MapArrayField,
							autoArray: AutoArrayField,
							copyValuesArray: CopyValuesArrayField,
							autosuggest: AutosuggestField,
							hidden: HiddenField,
							initiallyHidden: InitiallyHiddenField,
							inputTransform: InputTransformerField,
							injectFromContext: ContextInjectionField,
							imageArray: ImageArrayField,
							filteredEnum: FilteredEnumStringField,
						},
						widgets: {
							CheckboxWidget: CheckboxWidget,
							dateTime: DateTimeWidget, date: DateWidget,
							time: TimeWidget,
							separatedDateTime: SeparatedDateTimeWidget,
							autosuggest: AutosuggestWidget,
							hidden: HiddenWidget,
							imageSelect: ImageSelectWidget
						},
						translations,
						lang: this.props.lang,
						uiSchemaContext: this.props.uiSchemaContext
					}} >
					<Button type="submit">{translations.Submit}</Button>
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

	canFocusNextInput = (inputElem) => {
		function isTabbableInput(elem) {
			return (inputTypes.includes(elem.tagName.toLowerCase()) ||
			elem.className.includes(RC_SWITCH_CLASS) ||
			elem.className.includes(FOCUS_SINK_CLASS));
		}

		const formElem = ReactDOM.findDOMNode(this.refs.form);

		return (formElem.querySelectorAll && isTabbableInput(inputElem));
	}

	getTabbableFields = (reverse) => {
		const formElem = ReactDOM.findDOMNode(this.refs.form);

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
		if (this._context.blockingLoaderCounter > 0) {
			e.preventDefault();
			return;
		}

		if (e.key == "Enter" && this.canFocusNextInput(e.target)) {
			e.preventDefault();
			this.focusNextInput(e.target, e.shiftKey);
		}
	}

	pushBlockingLoader = (instantly = false) => {
		this._context.blockingLoaderCounter++;

		const that = this;
		function block() {
			if (that.mounted) that.setState({blocking: that._context.blockingLoaderCounter > 0});
		}

		instantly ? block() :	setTimeout(block, 500);
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
