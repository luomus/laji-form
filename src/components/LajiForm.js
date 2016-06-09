import React, { Component, PropTypes } from "react";
import Form from "react-jsonschema-form";
import NestField from "./fields/NestField";
import ArrayBulkField from "./fields/ArrayBulkField";
import AutoArrayField from "./fields/AutoArrayField";
import ScopeField from "./fields/ScopeField";
import SelectTreeField from "./fields/SelectTreeField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import HorizontalField from "./fields/HorizontalField";
import InjectField from "./fields/InjectField";
import InjectDefaultValueField from "./fields/InjectDefaultValueField";
import ArrayCombinerField from "./fields/ArrayCombinerField";
import DependentBooleanField from "./fields/DependentBooleanField";
import DependentDisableField from "./fields/DependentDisableField";
import MapArrayField from "./fields/MapArrayField";
import AutosuggestField, {AutosuggestInputField, AutosuggestWidget} from "./fields/AutosuggestField";
import HiddenField from "./fields/HiddenField";
import DateTimeWidget from "./widgets/DateTimeWidget";
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
					horizontal: HorizontalField,
					table: TableField,
					inject: InjectField,
					injectDefaultValue: InjectDefaultValueField,
					expandable: AdditionalsExpanderField,
					arrayCombiner: ArrayCombinerField,
					dependentBoolean: DependentBooleanField,
					dependentDisable: DependentDisableField,
					mapArray: MapArrayField,
					autoArray: AutoArrayField,
					autosuggest: AutosuggestField,
					autosuggestInput: AutosuggestInputField,
					autosuggestWidget: AutosuggestWidget,
					hidden: HiddenField
				}}
				widgets={{
					dateTime: DateTimeWidget
				}}
				onError={log("errors")} />
		)
	}
}
