import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, formDataEquals, getInnerUiSchema } from "../../utils";

export const AnyToBoolean = (props) => <_AnyToBoolean {...props} />;

const _AnyToBoolean = (props) => {
	const {widget} = props;
	const options = getUiOptions(widget ? props : props.uiSchema);
	const {trueValue, falseValue, allowUndefined = true} = options;
	const schema = {...props.schema, type: "boolean", title: allowUndefined ? "" : props.schema.title};
	const id = widget ? props.id : props.idSchema.$id;
	const value = formDataEquals(props[widget ? "value": "formData"], trueValue, props.formContext, id)
		? true
		: formDataEquals(props[widget ? "value": "formData"], falseValue, props.formContext, id)
			? false
			: undefined;

	const _onChange = props.onChange;

	const onChange = React.useCallback((value) => {
		const newValue = value === undefined
			? undefined
			: value === true
				? trueValue
				: falseValue;
		_onChange(newValue);
	}, [_onChange, trueValue, falseValue]);

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

const _anyToBoolean = (props) => <_AnyToBoolean widget={true} {...props} />;
const valuePropType = PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]);
_anyToBoolean.propTypes =  {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			trueValue: valuePropType.isRequired,
			falseValue: valuePropType,
			allowUndefined: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string", "number", "boolean"])
	}).isRequired,
	formData: valuePropType
};
export default _anyToBoolean;
