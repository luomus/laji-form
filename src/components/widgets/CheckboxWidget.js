import React, { Component } from "react";
import PropTypes from "prop-types";
import { Label } from "../components";
import { isNullOrUndefined, isEmptyString, getUiOptions } from "../../utils";
import Switch from "react-bootstrap-switch";

export default class CheckboxWidget extends Component {
	static propTypes = {
		options: PropTypes.shape({
			allowUndefined: PropTypes.bool,
			invert:  PropTypes.bool
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["boolean"])
		}),
		value: PropTypes.bool
	}

	getNextVal = () => {
		const {value} = this.props;
		const {allowUndefined = true} = getUiOptions(this.props);
		let nextVal = true;
		if (value === true) nextVal = false;
		else if (allowUndefined && value === false) nextVal = undefined;
		return nextVal;
	}

	onKeyDown = (e) => {
		const {
			disabled,
			onChange,
			readonly
		} = this.props;

		if (!disabled  && !readonly && e.key === " " && ["shift", "alt", "ctrl"].every(special => !e[`${special}Key`])) {
			e.preventDefault();
			onChange(this.getNextVal());
		}
	}

	onClick = (e) => {
		const {
			disabled,
			onChange,
			readonly
		} = this.props;

		e.preventDefault();
		if (disabled || readonly) return;
		onChange(this.getNextVal());
	}

	onSelectChange = (value) => {
		const _value =
			value === "true"
			? true
			: value === "false"
				? false
				: undefined;
		this.props.onChange(_value);
	}

	render() {
		const {
			value,
			disabled,
			registry,
			readonly,
			label,
			required
		} = this.props;

		const options = getUiOptions(this.props);
		const {allowUndefined = true, invert = false, help, label: uiOptionsLabel} = options;
		const hasLabel = !isEmptyString(label)  && uiOptionsLabel !== false;

		if (allowUndefined || value === undefined) {
			const schema = {
				...this.props.schema,
				type: "string",
				enum: [
					"undefined",
					"true",
					"false"
				],
				enumNames: [
					" ",
					registry.formContext.translations.Yes,
					registry.formContext.translations.No,
				]
			};

			const formData =
				value === true
				? "true"
				: value === false
					? "false"
					: undefined;

			const uiSchema = {"ui:options": options};
			const {SchemaField} = registry.fields;
			return <SchemaField
				{...this.props}
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				onChange={this.onSelectChange}
				idSchema={{$id: this.props.id}}
			/>;
		}

		const checkbox = (
			<div onClick={this.onClick} onKeyDown={this.onKeyDown} className="checkbox-container">
				<Switch
					value={allowUndefined && isNullOrUndefined(value) ? null : invert ? !value : value}
					defaultValue={allowUndefined ? null : false}
					disabled={disabled}
					readonly={readonly}
					onText={registry.formContext.translations.Yes}
					offText={registry.formContext.translations.No}
					bsSize="mini"
					tristate={allowUndefined}
				/>
			</div>
		);

		return !hasLabel ? checkbox : (
			<Label label={label} required={required} help={help}>
				{checkbox}
			</Label>
		);
	}

	formatValue(value, options, props) {
		return value === undefined
			? ""
			: value === true
				? props.formContext.translations.Yes
				: props.formContext.translations.No;
	}
}
