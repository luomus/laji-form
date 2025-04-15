import * as React from "react";
import * as PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { getInnerUiSchema, getUiOptions } from "../../utils";
import { FieldProps, JSONSchemaObject } from "../../types";

interface State {
	sum: number;
}

@BaseComponent
export default class ArrayPropertySumField extends React.Component<FieldProps<JSONSchemaObject>, State>{

	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				propertyField: PropTypes.string.isRequired
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.object.isRequired,
		formData: PropTypes.array.isRequired
	};

	static getName() { return "ArrayPropertySumField"; }

	getStateFromProps(props: FieldProps) {
		const { formData = [] } = props;
		const state: State = { sum: 0 };
		const propertyField = getUiOptions(this.props.uiSchema).propertyField;

		state.sum = formData.reduce((acc: number, item: any) => acc + (Number(item[propertyField]) || 0), 0);

		return state;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		const { sum } = this.state;

		return (
			<>
				<SchemaField
					{...this.props}
					uiSchema={getInnerUiSchema(this.props.uiSchema)}
				/>
				<h4>
					{this.props.uiSchema["ui:title"]}: { sum }
				</h4>
			</>
		);
	}
}
