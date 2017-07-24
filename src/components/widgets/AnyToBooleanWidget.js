import React from "react";
import CheckboxWidget from "./CheckboxWidget";
import { getUiOptions } from "../../utils";

export default function AnyToBooleanWidget(props) {
	const {trueValue, falseValue} = getUiOptions(props);
	const schema = {...props.schema, type: "boolean"};
	const value = props.value === trueValue;

	const onChange = (value) => {
		let newValue = undefined;
		if (value !== undefined) newValue = (value === true) ? trueValue : falseValue;
		props.onChange(newValue);
	};

	return <CheckboxWidget 
		{...props}
		schema={schema}
		value={value}
		onChange={onChange}
		label={""}
	/>;
}
