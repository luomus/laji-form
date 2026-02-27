import * as React from "react";
import * as PropTypes from "prop-types";
import { getInnerUiSchema, getUiOptions } from "../../utils";
import { FieldProps, JSONSchemaObject } from "../../types";

interface State {
	sum: number;
}

export default class ArrayPropertySumField extends React.Component<FieldProps<JSONSchemaObject[], JSONSchemaObject>, State>{

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


	render() {
		const SchemaField = this.props.registry.fields.SchemaField as any;
		const sum = getSum(this.props);

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

const getSum = (props: FieldProps<JSONSchemaObject[], JSONSchemaObject>): number => {
	const formData: any[] = props.formData || [];
	const propertyField = getUiOptions(props.uiSchema).propertyField as string;
	return formData.reduce<number>((acc: number, item: any) => acc + (Number(item[propertyField]) || 0), 0);
};
