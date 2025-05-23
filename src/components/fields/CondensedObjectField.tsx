import * as React from "react";
import * as PropTypes from "prop-types";
import { FieldProps, JSONSchemaObject } from "../../types";
import SelectWidget from "../widgets/SelectWidget";
import { getUiOptions } from "../../utils";
import { DeleteButton } from "../components";
import update from "immutability-helper";
import { IdSchema } from "@rjsf/utils";
import * as memoize from "memoizee";
const equals = require("deep-equal");

interface ArrayPropField {
	type: "array";
	name: string;
	value?: string|number|boolean;
	idx: number;
}

interface BasicPropField {
	type: "string"|"number"|"boolean"|"object"|"integer";
	name: string;
	value?: string|number|boolean;
}

type SelectedField = ArrayPropField | BasicPropField;

interface State {
	selectedFields: SelectedField[];
	formData: any;
}

export default class CondensedObjectField extends React.Component<FieldProps<JSONSchemaObject>, State> {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	}

	static getName() {return "CondensedObjectField";}

	constructor(props: FieldProps<JSONSchemaObject>) {
		super(props);
		this.state = { selectedFields: this.getSelectedFieldsFromProps(props), formData: props.formData };
	}

	componentDidUpdate() {
		if (!equals(this.props.formData, this.state.formData)) {
			this.setState({ selectedFields: this.getSelectedFieldsFromProps(this.props), formData: this.props.formData });
		}
	}

	getSelectedFieldsFromProps(props: FieldProps<JSONSchemaObject>): SelectedField[] {
		const { formData, schema } = props;

		const selectedFields: SelectedField[] = [];

		Object.keys(formData || {}).forEach(key => {
			const type = schema.properties[key].type;

			if (type !== "array") {
				selectedFields.push({ type, name: key, value: formData[key] });
			} else {
				formData[key].forEach((data: any, idx: number) => {
					selectedFields.push({ type, name: key, idx, value: data });
				});
			}
		});

		return selectedFields;
	}

	onSelectFieldChange = (name: string) => {
		if (!name) {
			return;
		}

		const selectedFields = this.state.selectedFields;
		const type = this.props.schema.properties[name].type;

		let field: SelectedField;
		let fieldFormData: any;

		if (type !== "array") {
			field = { type, name, value: undefined };
			fieldFormData = undefined;
		} else {
			field = { type, name, idx: this.getArrayFieldNextIdx(selectedFields, name), value: undefined };
			fieldFormData = [...(this.props.formData?.[name] || []), undefined];
		}

		const newSelectedFields = [...selectedFields, field];
		const newFormData = {...(this.props.formData || {}), [name]: fieldFormData};

		this.setState({selectedFields: newSelectedFields, formData: newFormData});
		this.props.onChange(newFormData);
	}

	onFieldChange = memoize((idx: number) => (formData: any) => {
		const selectedFields = this.state.selectedFields;
		const field = selectedFields[idx];

		let newSelectedFields = update(selectedFields, {[idx]: {["value"]: {$set: formData}}});
		let newFormData: any;

		if (field.type !== "array") {
			newFormData = {...this.props.formData, [field.name]: formData};
		} else {
			newFormData = update(this.props.formData, {[field.name]: {[field.idx]: {$set: formData}}});
		}

		this.setState({selectedFields: newSelectedFields, formData: newFormData});
		this.props.onChange(newFormData);
	});

	onFieldDelete = memoize((idx: number) => () => {
		const selectedFields = this.state.selectedFields;
		const field = selectedFields[idx];

		let newSelectedFields = update(selectedFields, {$splice: [[idx, 1]]});
		let newFormData: any;

		if (field.type !== "array" || this.props.formData[field.name].length === 1) {
			newFormData = update(this.props.formData, {$unset: [field.name]});
		} else {
			newSelectedFields.forEach((f, idx) => {
				if (f.type === "array" && f.name === field.name && f.idx > field.idx) {
					newSelectedFields = update(newSelectedFields, {[idx]: {["idx"]: {$set: f.idx - 1}}});
				}
			});
			newFormData = update(this.props.formData, {[field.name]: {$splice: [[field.idx, 1]]}});
		}

		if (Object.keys(newFormData).length === 0) {
			newFormData = undefined;
		}

		this.setState({selectedFields: newSelectedFields, formData: newFormData});
		this.props.onChange(newFormData);
	});

	getArrayFieldNextIdx(fields: SelectedField[], name: string): number {
		const oldIndexes = fields.filter(f => f.name === name).map(f => (f.type === "array" ? f.idx : -1));
		return Math.max(...oldIndexes, -1) + 1;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

		const {schema, uiSchema, idSchema, errorSchema, formData = {}, required, formContext: {Label, translations}} = this.props;
		const uiOptions = getUiOptions(uiSchema);

		const childProps: Pick<FieldProps<any>, "schema"|"uiSchema"|"idSchema"|"errorSchema"|"formData">[] = this.state.selectedFields.map(field => {
			let childSchema = schema.properties[field.name];
			let childUiSchema = uiSchema[field.name] || {};
			let childIdSchema: IdSchema<unknown> = idSchema[field.name] || {$id: `${idSchema.$id}_${field.name}`};
			let childErrorSchema = errorSchema[field.name] || {};
			let childFormData = formData[field.name];

			if (field.type === "array" && childSchema.type === "array") {
				childSchema = childSchema.items;
				childIdSchema = {...childIdSchema, $id: `${childIdSchema.$id}_${field.idx}`};
				childErrorSchema = childErrorSchema[field.idx] || {};
				childFormData = childFormData?.[field.idx];
			}

			return {
				schema: childSchema,
				uiSchema: {
					...childUiSchema,
					"ui:title": "",
					"ui:widget": "InputGroupWidget",
					"ui:options": {
						"inputGroupText": schema.properties[field.name].title || field.name,
						"className": "condensed-object-field-input-group",
						...(childUiSchema["ui:options"] || {})
					},
				},
				idSchema: childIdSchema,
				errorSchema: childErrorSchema,
				formData: childFormData
			};
		});

		const selectableFieldEnums = Object.keys(schema.properties).filter(
			prop => schema.properties[prop].type === "array" || !this.state.selectedFields.some(field => field.name === prop)
		).map(prop => ({
			value: prop,
			label: schema.properties[prop].title || prop,
		}));

		const addFieldPlaceholder = uiOptions.addFieldPlaceholder ?? `${translations.AddField}`;

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
				<SelectWidget
					options={{enumOptions: selectableFieldEnums, placeholder: addFieldPlaceholder}}
					onChange={this.onSelectFieldChange}
					includeEmpty={true}
					resetActiveItemOnSelect={true}
					schema={{}}
					id={`${idSchema.$id}_field_select`}
					formContext={this.props.formContext} />
			</>
		);
	}
}
