import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";
import ReactContext from "../../ReactContext";
import { FieldProps } from "../LajiForm";

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
	}

	render() {
		const { TitleField: _TitleField, DescriptionField: _DescriptionField } = this.props.registry.fields;
		const TitleField = _TitleField as any; // TODO TS fix after TitleField removal
		const DescriptionField = _DescriptionField as any; // TODO TS fix after DescriptionField removal
		const {"ui:title": _title} = this.props.uiSchema;
		const {Row, Col} = this.context.theme;
		return (
			<div>
				<TitleField 
					id={`${this.props.idSchema.$id}__title`}
					title={_title !== undefined ? _title : this.props.title}
					required={this.props.required || this.props.uiSchema["ui:required"]}
					formContext={this.props.formContext}
					className={getUiOptions(this.props.uiSchema).titleClassName}
					help={this.props.uiSchema["ui:help"]}
				/>
				<DescriptionField
					id={`${this.props.idSchema.$id}__description`}
					description={this.props.description}
					formContext={this.props.formContext}
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
		const _props: FieldProps = getPropsForFields(this.props, fields) as FieldProps;
		return (
			<SchemaField
				{...this.props}
				{..._props}
			  onChange={this.onChange(fields)}
				name=""
			/>
		);
	}

	onChange = (fields: string[]) => (formData: any) => {
		this.props.onChange(fields.reduce((updatedFormData, field) => {
			return {...updatedFormData, [field]: formData[field]};
		}, this.props.formData));
	}
}
