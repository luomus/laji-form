import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";
import ReactContext from "../../ReactContext";
import { getUiOptions } from "../../utils";

export default class InputWithDefaultValueButtonWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				buttonLabel: PropTypes.string.isRequired,
				contextFieldForDefaultValue: PropTypes.string.isRequired
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string", "number", "integer"]),
		}).isRequired,
		value: PropTypes.string
	}

	render() {
		const {InputGroup, Button} = this.context.theme;
		const {buttonLabel} = getUiOptions(this.props);

		return (
			<InputGroup>
				<BaseInputTemplate {...this.props} />
				<InputGroup.Button className={"input-group-button"}>
					<Button onClick={this.onClick}>{buttonLabel}</Button>
				</InputGroup.Button>
			</InputGroup>
		);
	}

	onClick = () => {
		const uiSchemaContext = this.props.formContext.uiSchemaContext || {};
		const {contextFieldForDefaultValue} = getUiOptions(this.props);
		const defaultValue = uiSchemaContext[contextFieldForDefaultValue];
		this.props.onChange(defaultValue);
	}
}
