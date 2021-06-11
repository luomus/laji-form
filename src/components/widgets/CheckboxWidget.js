import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { isEmptyString, getUiOptions, classNames, keyboardClick } from "../../utils";
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

	constructor(props) {
		super(props);
		this.trueRef = React.createRef();
		this.falseRef = React.createRef();
		this.undefinedRef = React.createRef();
	}

	componentDidMount() {
		this.rmInputTabIndices();
	}

	componentDidUpdate() {
		this.rmInputTabIndices();
	}

	rmInputTabIndices = () => {
		[this.trueRef, this.falseRef, this.undefinedRef].forEach(node => {
			const domNode = findDOMNode(node.current);
			if (!domNode) {
				return;
			}
			const input = domNode.getElementsByTagName("input")[0];
			if (!input) {
				return;
			}
			input.setAttribute("tabindex", -1);
		});
	}

	onChange = (value) => {
		if (value !== undefined && this.getOptions(this.props).invert) {
			value = !value;
		}
		this.props.onChange(value);
	}

	onButtonGroupChange = (value) => {
		if (value === "undefined") {
			value = undefined;
		}
		this.onChange(value);
	}

	getOptions = (props) => {
		const {Yes, No, Unknown} = props.registry.formContext.translations;
		return {
			allowUndefined: true,
			showUndefined: true,
			invert: false,
			trueLabel: Yes,
			falseLabel: No,
			unknownLabel: Unknown,
			required: this.props.required,
			...getUiOptions(props)
		};
	}

	render() {
		const {
			value,
			disabled,
			readonly,
			label
		} = this.props;

		const options = this.getOptions(this.props);
		const {
			allowUndefined,
			showUndefined,
			invert,
			trueLabel,
			falseLabel,
			unknownLabel,
			required,
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
		const toggleMode = this.getToggleMode(this.props);

		const commonProps = {
			disabled: disabled || readonly,
			tabIndex: toggleMode ? undefined : 0
		};

		const tabTargetClass = "laji-form-checkbox-widget-tab-target";

		const checkbox = (
			<ButtonToolbar className={classNames(toggleMode && "desktop-layout")}>
				<ToggleButtonGroup type="radio" value={[_value]} tabIndex={toggleMode ? 0 : undefined} name={this.props.id} onChange={this.onButtonGroupChange} onKeyDown={this.onGroupKeyDown} className={classNames(toggleMode && tabTargetClass)}>
					<ToggleButton ref={this.trueRef} value={true} onClick={toggleMode ? this.toggle : undefined} className={classNames(toggleMode && _value === false && "laji-form-hide-btn-label", !toggleMode && tabTargetClass)} onKeyDown={this.onTrueKeyDown} {...commonProps}>{trueLabel}</ToggleButton>
					<ToggleButton ref={this.falseRef} value={false} onClick={toggleMode ? this.toggle : undefined} className={classNames(toggleMode && _value === true && "laji-form-hide-btn-label")} onKeyDown={this.onFalseKeyDown} {...commonProps}>{falseLabel}</ToggleButton>
					{(displayUndefined ? <ToggleButton ref={this.undefinedRef} value={"undefined"} {...commonProps} onKeyDown={this.onUndefinedKeyDown}>{unknownLabel}</ToggleButton> : null)}
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

	getToggleMode = (props) => {
		const {allowUndefined, showUndefined, falseLabel, trueLabel} = this.getOptions(props);
		const displayUndefined = (allowUndefined && showUndefined);
		const {Yes, No} = props.registry.formContext.translations;
		return !displayUndefined && (trueLabel === Yes && falseLabel === No);
	}

	onGroupKeyDown = keyboardClick((e) => {
		this.getToggleMode(this.props) && this.toggle(e);
	}, this.props.formContext)

	onTrueKeyDown = keyboardClick(() => {
		this.onChange(true);
	}, this.props.formContext)

	onFalseKeyDown = keyboardClick(() => {
		this.onChange(false);
	}, this.props.formContext)

	onUndefinedKeyDown = keyboardClick(() => {
		this.onChange(undefined);
	}, this.props.formContext)

	toggleTo = (e, value) => {
		this.props.onChange(value);
	}

	toggle = (e) => {
		this.toggleTo(e, !this.props.value);
	}

	formatValue(value, options, props) {
		return value === undefined
			? ""
			: value === true
				? props.formContext.translations.Yes
				: props.formContext.translations.No;
	}
}
