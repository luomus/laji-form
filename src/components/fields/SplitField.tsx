import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";
import ReactContext from "../../ReactContext";
import { getTemplate } from "@rjsf/utils";
import { FieldProps } from "../../types";

@BaseComponent
export default class SplitField extends React.Component<FieldProps> {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				splits: PropTypes.arrayOf(PropTypes.shape({
					fields: PropTypes.arrayOf(PropTypes.string).isRequired,
					uiSchema: PropTypes.object,
					name: PropTypes.string,
					lg: PropTypes.number,
					md: PropTypes.number,
					sm: PropTypes.number,
					xs: PropTypes.number
				})).isRequired
			}).isRequired
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	};

	render() {
		const TitleFieldTemplate = getTemplate("TitleFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		const DescriptionFieldTemplate = getTemplate("DescriptionFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		const {"ui:title": _title} = this.props.uiSchema || {};
		const {Row, Col} = this.context.theme;
		return (
			<div>
				<TitleFieldTemplate
					id={`${this.props.idSchema.$id}__title`}
					title={_title !== undefined ? _title : this.props.title as any}
					required={this.props.required || this.props.uiSchema?.["ui:required"]}
					schema={this.props.schema}
					uiSchema={this.props.uiSchema}
					registry={this.props.registry}
				/>
				<DescriptionFieldTemplate
					id={`${this.props.idSchema.$id}__description`}
					schema={this.props.schema}
					description={this.props.description}
					registry={this.props.registry}
				/>
				<Row>
					{getUiOptions(this.props.uiSchema).splits.map((split: any, i: number) =>
						<Col md={split.md} lg={split.lg} xs={split.xs} sm={split.sm} key={i}>
							{this.renderSplitField(split)}
						</Col>
					)}
				</Row>
			</div>
		);
	}

	renderSplitField = ({fields}: any) => {
		const {SchemaField} = this.props.registry.fields;
		// TODO TS fix typing after NestField ts conversion.
		const _props = getPropsForFields(this.props as any, fields) as any;
		return (
			<SchemaField
				{...this.props}
				{..._props}
				onChange={this.onChange(fields)}
				name=""
				onBlur={this.props.onBlur}
				onFocus={this.props.onFocus}
				disabled={this.props.disabled}
				readonly={this.props.readonly}
			/>
		);
	};

	onChange = (fields: string[]) => (formData: any) => {
		this.props.onChange(fields.reduce((updatedFormData, field) => {
			return {...updatedFormData, [field]: formData[field]};
		}, this.props.formData));
	};
}
