import React, { Component, PropTypes } from "react";
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
import MapArrayField from "./fields/MapArrayField";
import AutosuggestField, {AutosuggestInputField, AutosuggestWidget} from "./fields/AutosuggestField";
import TaxonField, {TaxonWidgetField} from "./fields/TaxonField";
import HiddenField from "./fields/HiddenField";
import DateTimeWidget from "./widgets/DateTimeWidget";
import DateWidget from "./widgets/DateWidget";
import TimeWidget from "./widgets/TimeWidget";
import SeparatedDateTimeWidget from "./widgets/SeparatedDateTimeWidget";
import ApiClient from "../ApiClient";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {
	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
	}

	render() {
		return  (
			<Form
				{...this.props}
				fields={{
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
					autosuggestInput: AutosuggestInputField,
					autosuggestWidget: AutosuggestWidget,
					taxon: TaxonField,
					taxonWidget: TaxonWidgetField,
					hidden: HiddenField
				}}
				widgets={{
					dateTime: DateTimeWidget,
					date: DateWidget,
					time: TimeWidget,
					separatedDateTime: SeparatedDateTimeWidget
				}}
				onError={log("errors")} />
		)
	}
}
