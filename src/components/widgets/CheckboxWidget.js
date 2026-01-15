import * as React from "react";
import * as PropTypes from "prop-types";
import { isEmptyString, getUiOptions } from "../../utils";
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
	};

	containerRef = React.createRef();

	constructor(props) {
		super(props);
	}

	onKeyDown = (e) => {
		if (!e.key.startsWith("Arrow")) {
			return;
		}
		const inputs = this.containerRef.current.querySelectorAll("input");
		if (["ArrowRight", "ArrowDown"].includes(e.key) && document.activeElement === inputs[inputs.length - 1]) {
			e.preventDefault();
		} else if (["ArrowLeft", "ArrowUp"].includes(e.key) && document.activeElement === inputs[0]) {
			e.preventDefault();
		}
	};

	onChange = (value) => {
		if (value !== undefined && this.getOptions(this.props).invert) {
			value = !value;
		}
		this.props.onChange(value);
	};

	onChangeTrue = () => this.onChange(true);
	onChangeFalse = () => this.onChange(false);
	onChangeUndefined = () => this.onChange(undefined);

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
	};

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
			label: uiOptionsLabel
		} = options;
		const hasLabel = !isEmptyString(label)  && uiOptionsLabel !== false;

		const _value = invert
			? !value
			: value;

		const displayUndefined = (allowUndefined && showUndefined);

		const _disabled = disabled || readonly;

		const tabTargetClass = "laji-form-checkbox-widget-tab-target";

		const checkbox = (
			<div ref={this.containerRef} className="checkbox-container">
				<label>
					<input type="radio" value="true" checked={_value === true} onChange={this.onChangeTrue} className={tabTargetClass} onKeyDown={this.onKeyDown} disabled={_disabled}></input>
					{trueLabel}
				</label>
				<label>
					<input type="radio" value="false" checked={_value === false} onChange={this.onChangeFalse} onKeyDown={this.onKeyDown} disabled={_disabled}></input>
					{falseLabel}
				</label>
				{displayUndefined && (<label>
					<input type="radio" value="undefined" checked={_value === undefined} onChange={this.onChangeUndefined} onKeyDown={this.onKeyDown} disabled={_disabled}></input>
					{unknownLabel}
				</label>)}
			</div>
		);
		const {Label} = this.props.formContext;
		return !hasLabel ? checkbox : <>
			<Label label={label} required={required} uiSchema={this.props.uiSchema} registry={this.props.registry} id={this.props.id} />
			{checkbox}
		</>;
	}
}
