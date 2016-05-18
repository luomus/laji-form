import React, { Component } from "react";
import Form from "react-jsonschema-form";
import NestField from "./fields/NestField";
import UnitsField from "./fields/UnitsField";
import ScopeField from "./fields/ScopeField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import InjectField from "./fields/InjectField";
import ArrayCombinerField from "./fields/ArrayCombinerField";
import DependentBooleanField from "./fields/DependentBooleanField";
import MapArrayField from "./fields/MapArrayField";
import DateTimeWidget from "./widgets/DateTimeWidget";
import AutosuggestWidget from "./widgets/AutosuggestWidget";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {

	render() {
		return  (
			<Form
				{...this.props}
				fields={{
					nested: NestField,
					unitTripreport: UnitsField,
					scoped: ScopeField,
					horizontal: TableField,
					table: TableField,
					inject: InjectField,
					expandable: AdditionalsExpanderField,
					arrayCombiner: ArrayCombinerField,
					dependentBoolean: DependentBooleanField,
					mapArray: MapArrayField
				}}
				widgets={{
				dateTime: DateTimeWidget,
				autosuggest: AutosuggestWidget
				}}
				onError={log("errors")} />
		)
	}
}
