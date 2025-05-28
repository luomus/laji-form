import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";
import ReactContext from "../../ReactContext";
import { classNames, getUiOptions } from "../../utils";
import TextareaWidget from "./TextareaWidget";

export default class InputGroupWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				inputGroupText: PropTypes.string,
				inputType: PropTypes.oneOf(["basic", "textarea"]),
				className: PropTypes.string
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string", "number", "integer"]),
		}).isRequired,
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		required: PropTypes.bool
	}

	render() {
		const {InputGroup} = this.context.theme;
		const {inputGroupText = "", inputType = "basic", className = ""} = getUiOptions(this.props);

		const input = inputType === "textarea" ? <TextareaWidget {...this.props} /> : <BaseInputTemplate {...this.props} />;

		return (
			<InputGroup key={inputGroupText} className={classNames("input-group-widget", `input-group-${inputType}`, className)}>
				<InputGroup.Addon className={"input-group-text"}>
					{inputGroupText}{this.props.required && <span className={"text-danger"}>*</span>}
				</InputGroup.Addon>
				{input}
			</InputGroup>
		);
	}
}
