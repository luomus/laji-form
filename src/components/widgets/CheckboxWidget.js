import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { isEmptyString, getUiOptions, classNames } from "../../utils";
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
		this.groupRef = React.createRef();
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
			label,
			id
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

		const _disabled = disabled || readonly;
		const commonProps = {
			disabled: _disabled,
			tabIndex: (toggleMode || _disabled) ? undefined : 0
		};

		const tabTargetClass = "laji-form-checkbox-widget-tab-target";

		const selectedValueGlyph = <span className="laji-form-checkbox-selected-value-glyph"></span>;
		const unselectedValueGlyph = <span className="laji-form-checkbox-unselected-value-glyph"></span>;
		const checkbox = (
			<ButtonToolbar className={classNames("laji-form-checkbox-buttons", toggleMode && "desktop-layout")}>
				<ToggleButtonGroup ref={this.groupRef}
				                   type="radio"
				                   value={[_value]}
				                   name={this.props.id}
				                   onChange={this.onButtonGroupChange}
				                   onKeyDown={this.onGroupKeyDown}
				                   className={classNames(toggleMode && tabTargetClass)}
				                   {...commonProps}
				                   tabIndex={(toggleMode && !_disabled) ? 0 : undefined} >
					<ToggleButton id={`${id}-true`}
				                ref={this.trueRef}
				                value={true}
				                onClick={toggleMode ? this.toggle : undefined}
				                className={classNames(_value === true && tabTargetClass)}
				                onKeyDown={this.onTrueKeyDown}
				                {...commonProps} >{_value === true ? selectedValueGlyph : unselectedValueGlyph}{trueLabel}</ToggleButton>
					<ToggleButton id={`${id}-false`}
					              ref={this.falseRef}
					              value={false}
					              onClick={toggleMode ? this.toggle : undefined}
					              className={classNames(_value === false && tabTargetClass)}
					              onKeyDown={this.onFalseKeyDown}
					              {...commonProps}>{_value === false ? selectedValueGlyph : unselectedValueGlyph}{falseLabel}</ToggleButton>
					{(displayUndefined ?
						<ToggleButton id={`${id}-undefined`}
						              ref={this.undefinedRef}
						              value={"undefined"}
						              className={classNames(value === undefined && tabTargetClass)}
						              {...commonProps}
						              onKeyDown={this.onUndefinedKeyDown}>{_value === "undefined" ? selectedValueGlyph : unselectedValueGlyph}{unknownLabel}</ToggleButton> : null)}
				</ToggleButtonGroup>
			</ButtonToolbar>
		);

		const {Label} = this.props.formContext;
		return !hasLabel ? checkbox : <>
			<Label label={label} required={required} uiSchema={this.props.uiSchema} registry={this.props.registry} id={this.props.id} />
			{checkbox}
		</>;
	}

	getToggleMode = (props) => {
		const {allowUndefined, showUndefined} = this.getOptions(props);
		const displayUndefined = (allowUndefined && showUndefined);
		return !displayUndefined;
	}

	onGroupKeyDown = this.props.formContext.utils.keyboardClick((e) => {
		this.getToggleMode(this.props) && this.toggle(e);
	});

	onTrueKeyDown = this.props.formContext.utils.keyboardClick((e) => {
		this.onChange(true);
		e.preventDefault();
		e.stopPropagation();
	})

	onFalseKeyDown = this.props.formContext.utils.keyboardClick((e) => {
		this.onChange(false);
		e.preventDefault();
		e.stopPropagation();
	})

	onUndefinedKeyDown = this.props.formContext.utils.keyboardClick((e) => {
		this.onChange(undefined);
		e.preventDefault();
		e.stopPropagation();
	})

	toggle = (e) => {
		if (this.props.disabled || this.props.readonly) {
			return;
		}
		const nodes = [this.trueRef, this.falseRef, this.groupRef].map(r => findDOMNode(r.current));
		if (!nodes.includes(e.target)) {
			return;
		}
		e.preventDefault();
		this.props.onChange(!this.props.value);
	}

	formatValue(value, options, props) {
		return value === undefined
			? ""
			: value === true
				? props.formContext.translations.Yes
				: props.formContext.translations.No;
	}
}
