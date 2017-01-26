import React, { PropTypes } from "react";
import { Label } from "../components";
import { isNullOrUndefined } from "../../utils";
import Switch from "react-bootstrap-switch";

function CheckboxWidget(props) {
	const {
		schema,
		id,
		value,
		required,
		disabled,
		onChange,
		help,
		label,
		registry,
		readonly,
		options
	} = props;

	function getNextVal() {
		let nextVal = true;
		if (value === true) nextVal = false;
		else if (tristate && value === false) nextVal = undefined;
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

	const {tristate, invert} = {allowUndefined: true, invert: false, ...(options || {})};

	return (
		<Label {...props}>
			<div onClick={onClick} onKeyDown={onKeyDown}>
				<Switch
					value={tristate && isNullOrUndefined(value) ? null : invert ? !value : value}
					defaultValue={tristate ? null : false}
					disabled={disabled}
					readonly={readonly}
					onText={registry.formContext.translations.Yes}
					offText={registry.formContext.translations.No}
					bsSize="mini"
					tristate={tristate}
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
			allowUndefined: PropTypes.boolean
		})
	};
}

export default CheckboxWidget;

