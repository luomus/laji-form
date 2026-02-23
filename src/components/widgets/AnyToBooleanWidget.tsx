import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import { FieldProps, WidgetProps } from "src/types";

export const AnyToBoolean = (props: FieldProps | (WidgetProps & { widget: true })) => <_AnyToBoolean {...props} />;

const isWidgetProps = (props: FieldProps | (WidgetProps & { widget: true })): props is (WidgetProps & { widget: true }) => props.widget;


const _AnyToBoolean = (props: FieldProps | (WidgetProps & { widget: true })) => {
	const {widget} = props;
	const options = getUiOptions(isWidgetProps(props) ? props : props.uiSchema);
	const {trueValue, falseValue} = options;
	const schema = {...props.schema, type: "boolean"};
	const id = widget ? props.id : props.idSchema.$id;
	const value = props.formContext.utils.formDataEquals(props[widget ? "value": "formData"], trueValue, id)
		? true
		: props.formContext.utils.formDataEquals(props[widget ? "value": "formData"], falseValue, id)
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

	return isWidgetProps(props)
		? (
			<CheckboxWidget
				{...props as any}
				id={props.id}
				schema={schema}
				value={value}
				onChange={onChange}
				label={""}
				options={options}
			/>
		) : (
			<SchemaField
				{...props as any}
				schema={schema}
				uiSchema={getInnerUiSchema(props.uiSchema)}
				formData={value}
				onChange={onChange}
				label={""}
				options={options}
			/>
		);
};

const _anyToBoolean = (props: WidgetProps) => <_AnyToBoolean widget={true} {...props} />;
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
