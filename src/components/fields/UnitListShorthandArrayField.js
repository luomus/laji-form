import * as React from "react";
import * as PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { getUiOptions, getInnerUiSchema, isEmptyString, bringRemoteFormData, isDefaultData, getDefaultFormState } from "../../utils";
import { Button } from "../components";
import Context from "../../Context";
import ReactContext from "../../ReactContext";
import { TagInputComponent } from "./TagArrayField";


/**
 * Compatible only with unit array.
 */
@BaseComponent
export default class UnitListShorthandArrayField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	getStateFromProps(props) {
		const buttonDefinition = {
			fn: this.onButtonClick,
			fnName: "addUnitList",
			glyph: "align-justify",
			label: this.props.formContext.translations.AddUnitList,
			id: this.props.idSchema.$id,
			changesFormData: true,
			rules: {
				canAdd: true
			}
		};

		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		const options = getUiOptions(innerUiSchema);
		const uiSchema = {
			...innerUiSchema,
			"ui:options": {
				...options,
				buttons: [
					...(options.buttons || []),
					buttonDefinition
				]
			}
		};

		return {uiSchema};
	}

	onButtonClick = () => () => {
		this.setState({show: !this.state.show});
	}

	onHide = () => {
		this.setState({show: false, value: ""});
	}

	onTagFieldChange = (tags) => {
		this.setState({value: tags.join(",")});
	}

	onSubmit = () => {
		const value = this.state.value + (isEmptyString(this.tagRef.state.value) ? "" : `,${this.tagRef.state.value}`);

		this.onHide();
		const {translations, contextId, notifier, apiClient} = this.props.formContext;
		const context = new Context(contextId);
		context.pushBlockingLoader();
		apiClient.fetch("/autocomplete/unit", {q: value, list: true, includePayload: true}).then(({payload: {units, nonMatchingCount}}) => {
			units = units.map(unit => {
				unit = getDefaultFormState(this.props.schema.items, unit);
				unit = bringRemoteFormData(unit, this.props.formContext);
				return unit;
			});
			const formData = this.props.formData;
			const last = formData[formData.length - 1];
			if (isDefaultData(last, this.props.schema.items)) {
				formData.pop();
			}
			this.props.onChange([...formData, ...units]);

			nonMatchingCount
				? notifier.warning(`${translations.UnitListShorthandWarning} ${nonMatchingCount}`)
				: notifier.success(translations.UnitListShorthandSuccess);
			context.popBlockingLoader();
		});
	}

	onKeyDown = (e) => {
		if (e.key === "Enter") {
			this.onSubmit(e);
		}
	}

	setTagArrayRef = (ref) => {
		this.tagRef = ref;
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		const {Modal} = this.context.theme;

		return (
			<React.Fragment>
				<SchemaField {...this.props} uiSchema={this.state.uiSchema} />
				{this.state.show && (
					<Modal show={true} onHide={this.onHide}>
						<Modal.Body>
							<TagInputComponent 
								tags={isEmptyString(this.state.value) ? [] : this.state.value.split(",").filter(s => !isEmptyString(s))}
								onChange={this.onTagFieldChange}
								schema={{}}
								idSchema={{}}
								uiSchema={{"ui:options": {separatorKeys: [","]}}}
								inputProps={{autoFocus: true}}
								onKeyDown={this.onKeyDown}
								ref={this.setTagArrayRef}
								formContext={this.props.formContext}
							/>
							<span className="text-muted"><i>{this.props.formContext.translations.UnitListShorthandHelp}</i></span><br />
							<Button type="submit" disabled={isEmptyString(this.state.value)} onClick={this.onSubmit}>{this.props.formContext.translations.Add}</Button>
						</Modal.Body>

					</Modal>
				)}
			</React.Fragment>
		);
	}
}
