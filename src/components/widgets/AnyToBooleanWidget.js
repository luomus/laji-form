import React from "react";
import CheckboxWidget from "./CheckboxWidget";
import { getUiOptions } from "../../utils";
import equals from "deep-equal";

export const anyToBoolean = (widget) => (props) => {
	const options = getUiOptions(widget ? props : props.uiSchema);
	const {trueValue, falseValue} = options;
	const schema = {...props.schema, type: "boolean"};
	const value = equals(props[widget ? "value": "formData"], trueValue)
		? true
		: equals(props[widget ? "value": "formData"], falseValue)
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

export default anyToBoolean(!!"widget");
