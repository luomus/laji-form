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
				buttonVariant: PropTypes.string,
				contextFieldForDefaultValue: PropTypes.string,
				apiQueryForDefaultValue: PropTypes.shape({
					path: PropTypes.string.isRequired,
					query: PropTypes.object,
					resultKey: PropTypes.string.isRequired,
					cache: PropTypes.bool
				}),
				onClick: PropTypes.func
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string", "number", "integer"]),
		}).isRequired,
		value: PropTypes.string
	};

	constructor(props) {
		super(props);
		this.state = {fetching: false};
	}

	render() {
		const {InputGroup, Button} = this.context.theme;
		const {buttonLabel, buttonVariant} = getUiOptions(this.props);
		const {disabled, readonly} = this.props;

		return (
			<InputGroup>
				<BaseInputTemplate {...this.props} />
				<InputGroup.Button className={"input-group-button"}>
					<Button onClick={this.onClick} disabled={disabled || readonly || this.state.fetching} variant={buttonVariant}>
						{buttonLabel}
					</Button>
				</InputGroup.Button>
			</InputGroup>
		);
	}

	onClick = () => {
		const {contextFieldForDefaultValue, apiQueryForDefaultValue, onClick} = getUiOptions(this.props);

		if (contextFieldForDefaultValue) {
			const uiSchemaContext = this.props.formContext.uiSchemaContext || {};
			const defaultValue = uiSchemaContext[contextFieldForDefaultValue];
			this.props.onChange(defaultValue);
		} else if (apiQueryForDefaultValue) {
			const {path, query = {}, resultKey, cache = false} = apiQueryForDefaultValue;
			const apiClient = this.props.formContext.apiClient;

			this.setState({fetching: true});
			return apiClient.get(path, { query }, cache).then(result => {
				if (result[resultKey]) {
					this.props.onChange(result[resultKey]);
				}
				this.setState({fetching: false});
			}).catch(() => {
				this.setState({fetching: false});
			});
		}

		if (onClick) {
			onClick();
		}
	};
}
