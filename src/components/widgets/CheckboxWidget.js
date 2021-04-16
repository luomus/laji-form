import * as React from "react";
import * as PropTypes from "prop-types";
import { isEmptyString, getUiOptions, classNames } from "../../utils";
import Context from "../../Context";
import ReactContext from "../../ReactContext";

export default class CheckboxWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				allowUndefined: PropTypes.bool,
				showUndefined: PropTypes.bool,
				invert:  PropTypes.bool,
				trueLabel: PropTypes.string,
				falseLabel: PropTypes.string,
				unknownLabel: PropTypes.string
			})
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

	onButtonGroupChange = (value) => {
		if (value === "undefined") {
			value = undefined;
		}
		this.props.onChange(value);
	}

	render() {
		const {
			value,
			disabled,
			registry,
			readonly,
			label
		} = this.props;

		const {Yes, No, Unknown} = registry.formContext.translations;

		const options = getUiOptions(this.props);
		const {
			allowUndefined = true,
			showUndefined = true,
			invert = false,
			trueLabel = Yes,
			falseLabel = No,
			unknownLabel = Unknown,
			required = this.props.required,
			help,
			helpHoverable,
			helpPlacement,
			label: uiOptionsLabel
		} = options;
		const hasLabel = !isEmptyString(label)  && uiOptionsLabel !== false;

		// "undefined" for silencing ToggleButton warning.
		const _value = value === undefined
			? "undefined"
			: invert
				? !value
				: value;

		const {ButtonToolbar, ToggleButton, ToggleButtonGroup} = this.context.theme;

		const displayUndefined = (allowUndefined && showUndefined);
		const toggleMode = !displayUndefined
			&& (trueLabel === Yes && falseLabel === No);

		const checkbox = (
			<ButtonToolbar>
				<ToggleButtonGroup type="radio" value={[_value]} name={this.props.id} onChange={this.onButtonGroupChange}>
					<ToggleButton disabled={disabled || readonly} value={true} onClick={toggleMode && _value === true ? this.toFalse : undefined} className={classNames(toggleMode && _value === false && "laji-form-hide-btn-label")}>{trueLabel}</ToggleButton>
					<ToggleButton disabled={disabled || readonly} value={false} onClick={toggleMode && _value === false ? this.toTrue : undefined} className={classNames(toggleMode && _value === true && "laji-form-hide-btn-label")}>{falseLabel}</ToggleButton>
					{(displayUndefined ? <ToggleButton disabled={disabled || readonly} value={"undefined"}>{unknownLabel}</ToggleButton> : null)}
				</ToggleButtonGroup>
			</ButtonToolbar>
		);

		const {Label} = this.props.formContext;
		return !hasLabel ? checkbox : (
			<Label label={label} required={required} help={help} helpHoverable={helpHoverable} helpPlacement={helpPlacement} _context={new Context(this.props.formContext.contextId)}>
				{checkbox}
			</Label>
		);
	}

	toggleTo = (e, value) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.onChange(value);
	}

	toTrue = (e) => {
		this.toggleTo(e, true);
	}

	toFalse = (e) => {
		this.toggleTo(e, false);
	}

	formatValue(value, options, props) {
		return value === undefined
			? ""
			: value === true
				? props.formContext.translations.Yes
				: props.formContext.translations.No;
	}
}
