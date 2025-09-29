import * as React from "react";
import * as PropTypes from "prop-types";
import { FieldProps, JSONSchemaArray, UiSchema } from "../../types";
import SelectWidget from "../widgets/SelectWidget";
import { getUiOptions } from "../../utils";
import { DeleteButton } from "../components";
import memoize from "memoizee";
import update from "immutability-helper";
import BaseComponent from "../BaseComponent";

interface FieldValue {
	prefix: string;
	value: string;
}

interface State {
	fieldValues: FieldValue[];
}

@BaseComponent
export default class PrefixArrayField extends React.Component<FieldProps<JSONSchemaArray>, State> {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				prefixValues: PropTypes.arrayOf(PropTypes.string).isRequired,
				separator: PropTypes.string,
				addFieldPlaceholder: PropTypes.string
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	};

	static getName() {return "PrefixArrayField";}
    
	getSeparator(uiSchema: UiSchema): string {
		const {separator = ":"} = getUiOptions(uiSchema);
		return separator;
	}

	getStateFromProps(props: FieldProps<JSONSchemaArray>): State {
		const {formData = [], uiSchema} = props;
		const separator = this.getSeparator(uiSchema);

		return {
			fieldValues: formData.map((value: string) => {
				const sepIdx = value.indexOf(separator);
				return {
					prefix: value.substring(0, sepIdx),
					value: value.substring(sepIdx + 1)
				};
			})
		};
	}

	onSelectFieldChange = (prefix: string) => {
		const separator = this.getSeparator(this.props.uiSchema);
		const newFormData = [...(this.props.formData || []), prefix + separator];
		this.props.onChange(newFormData);
	};

	onFieldChange = memoize((idx: number) => (value: any) => {
		const separator = this.getSeparator(this.props.uiSchema);
		const newValue = this.state.fieldValues[idx].prefix + separator + value;
		const newFormData = update(this.props.formData, {[idx]: {$set: newValue}});
		this.props.onChange(newFormData);
	});

	onFieldDelete = memoize((idx: number) => () => {
		const newFormData = update(this.props.formData, {$splice: [[idx, 1]]});
		this.props.onChange(newFormData);
	});

	render() {
		const SchemaField = this.props.registry.fields.SchemaField as any;

		const {schema, uiSchema, idSchema, errorSchema, required, formContext: {Label, translations}} = this.props;
		const {prefixValues = [], addFieldPlaceholder} = getUiOptions(uiSchema);

		const childProps: Pick<FieldProps<any, any>, "schema"|"uiSchema"|"idSchema"|"errorSchema"|"formData">[] = this.state.fieldValues.map((value: FieldValue, idx: number) => {
			return {
				schema: schema.items,
				uiSchema: {
					"ui:title": "",
					"ui:widget": "InputGroupWidget",
					"ui:options": {
						"inputGroupText": value.prefix,
						"className": "condensed-object-field-input-group",
						...(uiSchema["ui:options"] || {})
					},
				},
				idSchema: {$id: `${idSchema.$id}_${idx}`},
				errorSchema: (errorSchema as any)[idx] || {},
				formData: value.value
			};
		});

		const selectableFieldEnums = prefixValues.map((value: string) => ({
			value,
			label: value
		}));

		return (
			<>
				<Label label={this.props.schema.title} required={required || uiSchema["ui:required"]} id={this.props.idSchema.$id} uiSchema={this.props.uiSchema} />
				{childProps.map((props, idx) =>
					<div key={idx} className="laji-form-field-template-item condensed-object-field-item">
						<div className="laji-form-field-template-schema">
							<SchemaField
								{...this.props}
								{...props}
								key={idx}
								onChange={this.onFieldChange(idx)}
							/>
						</div>
						<div className="laji-form-field-template-buttons">
							<DeleteButton
								id={props.idSchema.$id}
								onClick={this.onFieldDelete(idx)}
								translations={translations}
							/>
						</div>
					</div>
				)}
				<SelectWidget key={childProps.length}
					options={{enumOptions: selectableFieldEnums, placeholder: addFieldPlaceholder ?? `${translations.AddField}`}}
					onChange={this.onSelectFieldChange}
					includeEmpty={true}
					schema={{}}
					id={`${idSchema.$id}_field_select`}
					formContext={this.props.formContext}
					disabled={this.props.disabled}
					readonly={this.props.readonly}
				/>
			</>
		);
	}
}
