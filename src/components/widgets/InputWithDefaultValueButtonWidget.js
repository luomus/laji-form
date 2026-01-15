import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";
import ReactContext from "../../ReactContext";
import { getUiOptions } from "../../utils";
import Spinner from "react-spinner";
import { ConfirmButton } from "../components/ConfirmButton";

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
					resultKey: PropTypes.string,
					cache: PropTypes.bool
				}),
				disableButtonAfterUse: PropTypes.bool,
				confirmClick: PropTypes.bool,
				confirmMessage: PropTypes.string,
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
		this.fetching = false;
		this.disabled = false;
		this.state = {fetching: false, disabled: false};
	}

	render() {
		const {InputGroup} = this.context.theme;
		const {buttonLabel, buttonVariant, confirmClick, confirmMessage} = getUiOptions(this.props);
		const {disabled, readonly, id} = this.props;
		const {translations} = this.props.formContext;

		return (
			<InputGroup>
				<BaseInputTemplate {...this.props} />
				<InputGroup.Button className={"input-group-button"}>
					<ConfirmButton
						id={`${id}-default-value-button`}
						translations={translations}
						confirm={confirmClick}
						onClick={this.onClick}
						disabled={disabled || readonly || this.state.fetching || this.state.disabled}
						variant={buttonVariant}
						prompt={confirmMessage}>
						{this.state.fetching && <Spinner />}
						{buttonLabel}
					</ConfirmButton>
				</InputGroup.Button>
			</InputGroup>
		);
	}

	onClick = () => {
		if (this.fetching || this.disabled) {
			return;
		}

		const {contextFieldForDefaultValue, apiQueryForDefaultValue, onClick} = getUiOptions(this.props);

		if (contextFieldForDefaultValue) {
			const uiSchemaContext = this.props.formContext.uiSchemaContext || {};
			const defaultValue = uiSchemaContext[contextFieldForDefaultValue];
			this.changeValue(defaultValue);
		} else if (apiQueryForDefaultValue) {
			const {path, query = {}, resultKey, cache = false} = apiQueryForDefaultValue;
			const apiClient = this.props.formContext.apiClient;

			this.fetching = true;
			this.setState({fetching: true});

			return apiClient.get(path, { query: { value: this.props.value ?? "", ...query } }, cache).then(result => {
				result = resultKey ? result?.[resultKey] : result;
				this.changeValue(result);
			}).catch(() => {
			}).finally(() => {
				this.fetching = false;
				this.setState({fetching: false});
			});
		}

		if (onClick) {
			onClick();
		}
	};

	changeValue = (value) => {
		const {disableButtonAfterUse = false} = getUiOptions(this.props);
		this.props.onChange(value);
		if (disableButtonAfterUse) {
			this.disabled = true;
			this.setState({disabled: true});
		}
	};
}
