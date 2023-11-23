import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { FieldProps } from "../LajiForm";

@VirtualSchemaField
export default class AsArrayField extends React.Component<FieldProps> {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object", "string", "integer", "number", "boolean"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string, PropTypes.number, PropTypes.bool])
	}

	static getName() {return "AsArrayField";}

	getStateFromProps(props: FieldProps) {
		return {
			...props,
			formData: props.formData !== undefined ? [props.formData] : [],
			schema: {
				title: props.schema.title,
				type: "array",
				items: {
					...props.schema,
					title: undefined
				},
				maxItems: 1
			},
			onChange: this.onChange
		};
	}

	onChange = (formData: any[]) => {
		this.props.onChange(formData?.[0]);
	}
}
