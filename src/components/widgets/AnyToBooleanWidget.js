import React from "react";
import PropTypes from "prop-types";
import { getUiOptions, formDataEquals, getInnerUiSchema } from "../../utils";

export const anyToBoolean = (widget) => (props) => {
	const options = getUiOptions(widget ? props : props.uiSchema);
	const {trueValue, falseValue, allowUndefined = true} = options;
	const schema = {...props.schema, type: "boolean", title: allowUndefined ? "" : props.schema.title};
	const id = widget ? props.id : props.idSchema.$id;
	const value = formDataEquals(props[widget ? "value": "formData"], trueValue, props.formContext, id)
		? true
		: formDataEquals(props[widget ? "value": "formData"], falseValue, props.formContext, id)
			? false
			: undefined;

	const onChange = (value) => {
		const newValue = value === undefined
			? undefined
			: value === true
				? trueValue
				: falseValue;
		props.onChange(newValue);
	};

	const { CheckboxWidget } = props.registry.widgets; 
	const { SchemaField } = props.registry.fields; 

	return widget
		? (
			<CheckboxWidget
					{...props}
					id={props.id}
					schema={schema}
					value={value}
					onChange={onChange}
					label={""}
					options={options}
			/>
		) : (
			<SchemaField
					{...props}
					schema={schema}
					uiSchema={getInnerUiSchema(props.uiSchema)}
					formData={value}
					onChange={onChange}
					label={""}
					options={options}
			/>
		);
};

const _anyToBoolean = anyToBoolean(!!"widget");
const valuePropType = PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]);
_anyToBoolean.propTypes =  {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			trueValue: valuePropType.isRequired,
			falseValue: valuePropType.isRequired,
			allowUndefined: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string", "number", "boolean"])
	}).isRequired,
	formData: valuePropType
};
export default _anyToBoolean;
