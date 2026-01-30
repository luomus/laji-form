import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import { FieldProps, JSONSchemaArray, JSONSchemaString } from "../../types";
import { useCallback } from "react";
import SelectWidget from "../widgets/SelectWidget";

const options = {};
const schema = { type: "array", items: { type: "string" }};

export default function EnumRangeArrayField(props: FieldProps<JSONSchemaArray<JSONSchemaString>>): JSX.Element | null {
	const { onChange: propsOnChange } = props;
	const { range } = getUiOptions(props.uiSchema);
	const onChange = useCallback((value) => {
		propsOnChange(value);
	}, [propsOnChange]);
	const getEnumOptionsAsync = useCallback(
		async () => {
			const enums = (await props.formContext.apiClient.get(`/metadata/alts/{alt}`, { path: { alt: range } })).results;
			return enums.map(({value}) => ({value, label: value}));
		},
		[props.formContext.apiClient, range]
	);
	const { Label } = props.formContext;
	return <>
		<Label label={props.schema.title} id={props.idSchema.$id} />
		<SelectWidget
			getEnumOptionsAsync={getEnumOptionsAsync}
			schema={schema}
			onChange={onChange}
			value={props.formData}
			options={options} />
	</>;
}
EnumRangeArrayField.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			range: PropTypes.string
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["array"])
	}).isRequired,
	formData: PropTypes.array
};
