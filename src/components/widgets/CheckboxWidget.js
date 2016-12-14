import React, { PropTypes } from "react";
import { Label } from "../components";
import Switch from "rc-switch";

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
		registry
	} = props;

	function onKeyDown(e) {
		if (!disabled && e.key === " ") {
			e.preventDefault();
			onChange(!value);
		}
		if (e.key == "Escape") {
			e.preventDefault();
			document.activeElement.blur();
		}
	}

	return (<div className={disabled ? "disabled" : ""} onKeyDown={onKeyDown}><Label {...props}>
		<Switch
		       id={id}
		       className={"rc-switch-toggled-" + !!value}
		       checked={typeof value === "undefined" ? false : value}
		       required={required}
		       disabled={disabled}
		       onChange={value => onChange(value)}
		       checkedChildren={registry.formContext.translations.Yes}
		       unCheckedChildren={registry.formContext.translations.No}	/>
	</Label></div>);
}

if (process.env.NODE_ENV !== "production") {
	CheckboxWidget.propTypes = {
		schema: PropTypes.object.isRequired,
		id: PropTypes.string.isRequired,
		onChange: PropTypes.func,
		value: PropTypes.bool,
		required: PropTypes.bool,
	};
}

export default CheckboxWidget;

