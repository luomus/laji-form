import React, { Component } from "react";
import BaseComponent from "../BaseComponent";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { getUiOptions, getInnerUiSchema, isEmptyString, bringRemoteFormData } from "../../utils";
import { Button } from "../components";
import { Modal } from "react-bootstrap";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import { TagInputComponent } from "./TagArrayField";

/**
 * Compatible only with unit array.
 */
@BaseComponent
export default class NamedPlaceChooserField extends Component {
	getStateFromProps() {
		const buttonDefinition = {
			fn: this.onButtonClick,
			fnName: "addUnitList",
			glyph: "align-justify",
			label: this.props.formContext.translations.AddUnitList,
			id: this.props.idSchema.$id
		};

		const innerUiSchema = getInnerUiSchema(this.props.uiSchema);
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
		const {translations, contextId, notifier} = this.props.formContext;
		const context = new Context(contextId);
		context.pushBlockingLoader();
		new ApiClient().fetch("/autocomplete/unit", {q: value, list: true, includePayload: true}).then(({payload: {units, nonMatchingCount}}) => {
			units = units.map(unit => {
				unit = getDefaultFormState(this.props.schema.items, unit, this.props.registry.definitions);
				unit = bringRemoteFormData(unit, this.props.formContext);
				return unit;
			});
			this.props.onChange([...this.props.formData, ...units]);

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
