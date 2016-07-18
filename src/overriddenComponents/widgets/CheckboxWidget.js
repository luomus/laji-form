import React, { PropTypes } from "react";
import Label from "../../components/Label";
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

	return (<div className={disabled ? "disabled" : ""}><Label {...props}>
		<Switch
		       id={id}
		       className={"rc-switch-toggled-" + !!value}
		       checked={typeof value === "undefined" ? false : value}
		       required={required}
		       disabled={disabled}
		       onChange={value => onChange(value)}
		       checkedChildren={registry.translations.yes}
		       unCheckedChildren={registry.translations.no}	/>
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

