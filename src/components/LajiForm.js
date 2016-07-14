import React, { Component, PropTypes } from "react";
//import Form from "react-jsonschema-form";
import Button from "./Button";

import Form from "./../overriddenComponents/Form";
import SchemaField from "./../overriddenComponents/fields/SchemaField";
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
import TaxonField, {TaxonWidgetField} from "./fields/TaxonField";
import InputTransformerField from "./fields/InputTransformerField";
import HiddenField from "./fields/HiddenField";
import InitiallyHiddenField from "./fields/InitiallyHiddenField";
import AutosuggestWidget from "./widgets/AutosuggestWidget";
import DateTimeWidget from "./widgets/DateTimeWidget";
import DateWidget from "./widgets/DateWidget";
import TimeWidget from "./widgets/TimeWidget";
import SeparatedDateTimeWidget from "./widgets/SeparatedDateTimeWidget";
import HiddenWidget from "./widgets/HiddenWidget";

import ApiClient from "../ApiClient";

import translations from "../translations.json";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {
	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
		this.translations = this.constructTranslations();
	}

	constructTranslations = () => {
		let dictionaries = {}
		for (let word in translations) {
			for (let lang in translations[word]) {
				const translation = translations[word][lang];
				if (!dictionaries.hasOwnProperty(lang)) dictionaries[lang] = {};
				dictionaries[lang][word] = translation;
			}
		}
		return dictionaries;
	}



	render() {
		return  (
			<Form
				{...this.props}
				registry={{
					fields: {
						SchemaField: SchemaField,
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
						taxon: TaxonField,
						taxonWidget: TaxonWidgetField,
						hidden: HiddenField,
						initiallyHidden: InitiallyHiddenField,
						inputTransform: InputTransformerField
					},
					widgets: {
						CheckboxWidget: CheckboxWidget,
						dateTime: DateTimeWidget, date: DateWidget,
						time: TimeWidget,
						separatedDateTime: SeparatedDateTimeWidget,
						autosuggest: AutosuggestWidget,
						hidden: HiddenWidget
					},
					translations: this.translations[this.props.lang],
					lang: this.props.lang
				}}
				onError={log("errors")} >
				<Button classList={["btn-info"]} type="submit">{this.translations[this.props.lang].submit}</Button>
				</Form>
		)
	}
}
