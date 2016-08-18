import React, { Component, PropTypes } from "react";
import Button from "./Button";
import validate from "../validation";

import Form from "./../overriddenComponents/Form";
import SchemaField from "./../overriddenComponents/fields/SchemaField";
import ArrayField from "./../overriddenComponents/fields/ArrayField";
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
import AutosuggestWidget from "./widgets/AutosuggestWidget";
import DateTimeWidget from "./widgets/DateTimeWidget";
import DateWidget from "./widgets/DateWidget";
import TimeWidget from "./widgets/TimeWidget";
import SeparatedDateTimeWidget from "./widgets/SeparatedDateTimeWidget";
import HiddenWidget from "./widgets/HiddenWidget";

import ApiClient from "../ApiClient";
import translations from "../translations.js";

const enterPreventTypes = {
	text: true,
	undefined: true
};

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
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {translations: this.translations[props.lang]};
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

	onKeyDown = (event) => {
		const type = event.target.type;
		if (event.key === "Enter" && enterPreventTypes[type]) event.preventDefault();
	}

	onChange = ({formData}) => {
		if (this.props.onChange) this.props.onChange(formData);
	}

	render() {
		const {translations} = this.state;
		return  (
			<div onKeyDown={this.onKeyDown}>
				<Form
					{...this.props}
					onChange={this.onChange}
					registry={{
						fields: {
							SchemaField: SchemaField,
							ArrayField: ArrayField,
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
							injectFromContext: ContextInjectionField
						},
						widgets: {
							CheckboxWidget: CheckboxWidget,
							dateTime: DateTimeWidget, date: DateWidget,
							time: TimeWidget,
							separatedDateTime: SeparatedDateTimeWidget,
							autosuggest: AutosuggestWidget,
							hidden: HiddenWidget
						},
						translations,
						lang: this.props.lang,
						uiSchemaContext: this.props.uiSchemaContext
					}}
					validate={validate(this.props.validators)} >
					<Button type="submit" classList={["btn-info"]}>{translations.Submit}</Button>
					</Form>
				</div>
		)
	}
}
