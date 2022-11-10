import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";
import ReactContext from "../../ReactContext";
import {getUiOptions} from "../../utils";

export default class InputGroupWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				inputGroupText: PropTypes.string,
				className: PropTypes.string
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"]),
		}).isRequired,
		value: PropTypes.string,
		required: PropTypes.bool
	}

	render() {
		const {InputGroup} = this.context.theme;
		const {inputGroupText, className} = getUiOptions(this.props);

		return (
			<InputGroup key={inputGroupText || ""} className={"input-group-widget " + (className || "")}>
				<InputGroup.Addon className={"input-group-text"}>
					{(inputGroupText || "") + (this.props.required ? "*" : "")}
				</InputGroup.Addon>
				<BaseInputTemplate {...this.props} />
			</InputGroup>
		);
	}
}
