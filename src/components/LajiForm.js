import React, { Component, PropTypes } from "react";
import Form from "react-jsonschema-form";
import NestField from "./fields/NestField";
import UnitsField from "./fields/UnitsField";
import ScopeField from "./fields/ScopeField";
import SelectTreeField from "./fields/SelectTreeField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import HorizontalField from "./fields/HorizontalField";
import InjectField from "./fields/InjectField";
import ArrayCombinerField from "./fields/ArrayCombinerField";
import DependentBooleanField from "./fields/DependentBooleanField";
import DependentDisableField from "./fields/DependentDisableField";
import MapArrayField from "./fields/MapArrayField";
import AutosuggestField, {AutosuggestInputField, AutosuggestWidget} from "./fields/AutosuggestField";
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
					unitTripreport: UnitsField,
					scoped: ScopeField,
					tree: SelectTreeField,
					horizontal: HorizontalField,
					table: TableField,
					inject: InjectField,
					expandable: AdditionalsExpanderField,
					arrayCombiner: ArrayCombinerField,
					dependentBoolean: DependentBooleanField,
					dependentDisable: DependentDisableField,
					mapArray: MapArrayField,
					autosuggest: AutosuggestField,
					autosuggestInput: AutosuggestInputField,
					autosuggestWidget: AutosuggestWidget
				}}
				widgets={{
					dateTime: DateTimeWidget
				}}
				onError={log("errors")} />
		)
	}
}
