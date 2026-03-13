import * as React from "react";
import * as PropTypes from "prop-types";
import { getInnerUiSchema, getUiOptions } from "../../utils";
import { FieldProps, JSONSchemaObject } from "../../types";

interface State {
	count: number;
}

export default class ArrayPropertyCountField extends React.Component<FieldProps<JSONSchemaObject[], JSONSchemaObject>, State> {

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

	static getName() { return "ArrayPropertyCountField"; }


	render() {
		const SchemaField = this.props.registry.fields.SchemaField as any;
		const count = getCount(this.props);

		return (
			<>
				<SchemaField
					{...this.props}
					uiSchema={getInnerUiSchema(this.props.uiSchema)}
				/>
				<h4>
					{this.props.uiSchema["ui:title"]}: {count}
				</h4>
			</>
		);
	}
}

const getCount = (props: FieldProps<JSONSchemaObject[], JSONSchemaObject>): number => {
	const formData: any[] = props.formData || [];
	const propertyField = getUiOptions(props.uiSchema).propertyField as string;
	return formData.filter(item => item?.[propertyField]).length;
};
