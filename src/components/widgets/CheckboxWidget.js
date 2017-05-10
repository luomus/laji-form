import React from "react";
import PropTypes from "prop-types";
import { Label } from "../components";
import { isNullOrUndefined } from "../../utils";
import Switch from "react-bootstrap-switch";

function CheckboxWidget(props) {
	const {
		value,
		disabled,
		onChange,
		registry,
		readonly,
		options
	} = props;

	function getNextVal() {
		let nextVal = true;
		if (value === true) nextVal = false;
		else if (allowUndefined && value === false) nextVal = undefined;
		return nextVal;
	}

	function onKeyDown(e) {
		if (!disabled  && !readonly && e.key === " ") {
			e.preventDefault();
			onChange(getNextVal());
		}
		if (e.key == "Escape") {
			e.preventDefault();
			document.activeElement.blur();
		}
	}

	function onClick(e) {
		e.preventDefault();
		if (disabled || readonly) return;
		onChange(getNextVal());
	}

	const {allowUndefined, invert, undefinedValue} = {allowUndefined: true, invert: false, undefinedValue: null, ...(options || {})};

	return (
		<Label {...props}>
			<div onClick={onClick} onKeyDown={onKeyDown}>
				<Switch
					value={allowUndefined && isNullOrUndefined(value) ? undefinedValue : invert ? !value : value}
					defaultValue={allowUndefined ? undefinedValue : false}
					disabled={disabled}
					readonly={readonly}
					onText={registry.formContext.translations.Yes}
					offText={registry.formContext.translations.No}
					bsSize="mini"
					tristate={allowUndefined}
				/>
			</div>
		</Label>
	);
}

if (process.env.NODE_ENV !== "production") {
	CheckboxWidget.propTypes = {
		schema: PropTypes.object.isRequired,
		id: PropTypes.string.isRequired,
		onChange: PropTypes.func,
		value: PropTypes.bool,
		required: PropTypes.bool,
		options: PropTypes.shape({
			allowUndefined: PropTypes.boolean,
      invert: PropTypes.boolean,
      undefinedValue: PropTypes.any
		})
	};
}

export default CheckboxWidget;

