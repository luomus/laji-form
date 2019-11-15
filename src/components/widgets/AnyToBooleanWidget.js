import React from "react";
import PropTypes from "prop-types";
import CheckboxWidget from "./CheckboxWidget";
import { getUiOptions, formDataEquals } from "../../utils";
import equals from "deep-equal";

export const anyToBoolean = (widget) => (props) => {
	const options = getUiOptions(widget ? props : props.uiSchema);
	const {trueValue, falseValue, allowUndefined = true} = options;
	const schema = {...props.schema, type: "boolean", title: allowUndefined ? "" : props.schema.title};
	const value = equals(props[widget ? "value": "formData"], trueValue)
		? true
		: formDataEquals(props[widget ? "value": "formData"], falseValue, props)
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

	return <CheckboxWidget 
		{...props}
		id={widget ? props.id : props.idSchema.$id}
		schema={schema}
		value={value}
		onChange={onChange}
		label={widget ? "" : props.schema.title}
		options={options}
	/>;
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
