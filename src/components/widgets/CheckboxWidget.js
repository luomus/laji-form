import React from "react";
import PropTypes from "prop-types";
import { Label } from "../components";
import { isNullOrUndefined, isEmptyString } from "../../utils";
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
		if (!disabled  && !readonly && e.key === " " && ["shift", "alt", "ctrl"].every(special => !e[`${special}Key`])) {
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

	const {allowUndefined, invert} = {allowUndefined: true, invert: false, ...(options || {})};

	const checkbox = (
		<div onClick={onClick} onKeyDown={onKeyDown}>
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

	return isEmptyString(props.label) ? checkbox :(
		<Label {...props}>
			{checkbox}
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
			allowUndefined: PropTypes.boolean
		})
	};
}

export default CheckboxWidget;

