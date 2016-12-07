import React, { PropTypes } from "react";
import CheckboxWidget from "./CheckboxWidget";
import { getUiOptions } from "../../utils";

export default function AnyToBooleanWidget(props) {
	const {trueValue, falseValue} = getUiOptions(props);
	const schema = {...props.schema, type: "boolean"};
	const value = props.value === trueValue;

	const onChange = (value) => {
		props.onChange(value === true ? trueValue : falseValue)
	}

	return CheckboxWidget({...props, schema, value, onChange, label: ""});
}

