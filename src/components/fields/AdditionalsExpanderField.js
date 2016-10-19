import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { Row, Col, Glyphicon } from "react-bootstrap";
import Button from "../Button";

/**
 * Additionals to hide by default and shown on demand are defined in uiSchema:
 * uiSchema = {ui:options: {
 *  additionalFields: [<string>]
 *  expanderButtonText: <string>
 *  expanderGlyph: <string> or <boolean> (If boolean and true, default glyph is used, otherwise a bootstrap glyph name must be provided"
 *  uiSchema: <uiSchema> (used for inner schema)
 * }
 *
 * Additional buttons are given as children.
 */
export default class AdditionalsExpanderField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				additionalFields: PropTypes.arrayOf(PropTypes.string).isRequired,
				expanderButtonText: PropTypes.string,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {showAdditional: undefined};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let {schema, uiSchema} = props;

		let dictionarifiedAdditionals = {};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields && uiSchema["ui:options"].additionalFields.length) {
			uiSchema["ui:options"].additionalFields.forEach((option) => {
				dictionarifiedAdditionals[option] = true;
			});
			let showAdditional = this.shouldShowAdditionals(props, dictionarifiedAdditionals);
			if (!showAdditional && uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields) {
				let filteredSchema = {};
				Object.keys(schema.properties).forEach((prop) => {
					if (!dictionarifiedAdditionals[prop]) filteredSchema[prop] = schema.properties[prop];
				});
				schema = update(schema, {properties: {$set: filteredSchema}, "ui:field": {$set: undefined}});
			}
		}
		schema = update(schema, {title: {$set: undefined}});

		uiSchema = (props.uiSchema && props.uiSchema["ui:options"] && props.uiSchema["ui:options"].uiSchema) ?
			props.uiSchema["ui:options"].uiSchema : {};

		return {schema, uiSchema, name: undefined, dictionarifiedAdditionals}
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const shouldShowButton = this.shouldShowAdditionalsButton(this.props);
		const title = this.props.schema.title !== undefined ? this.props.schema.title : this.props.name;
		return (
			<div>
				{title ? <TitleField title={title} /> : null}
				<Row className="expandable-field-container">
					<Col sm={shouldShowButton ? 10 : 12}>
						{this.renderSchema()}
					</Col>
					{shouldShowButton ?
						<Col sm={2} className="expandable-field-container-buttons">
								{this.renderButton()}
						</Col> : null
					}
				</Row>
			</div>);
	}

	renderSchema = () => {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
				<SchemaField
					{...this.props}
					{...this.state}
				/>
		)
	}

	shouldShowAdditionals = (props, dictionarifiedAdditionals) => {
		if (this.state.showAdditional) return true;
		if (!dictionarifiedAdditionals) return false;

		let keys = Object.keys(dictionarifiedAdditionals);
		if (!keys.length) return false;

		if (props.formData) for (let property in props.formData) {
			if (props.formData[property] !== null && props.formData[property] !== undefined && dictionarifiedAdditionals[property]) return true;
		}
		return false;
	}

	shouldShowAdditionalsButton = (props) => {
		if (this.shouldShowAdditionals(props, this.state.dictionarifiedAdditionals)) return false;
		if (props.formData) for (let property in props.formData) {
			if (this.state.dictionarifiedAdditionals[property] && (props.formData[property] === undefined || props.formData[property] === null)) return true;
		}
		return false;
	}

	renderButton = () => {
		const options = this.props.uiSchema["ui:options"] ? this.props.uiSchema["ui:options"] : undefined;
		if (!options || !options.additionalFields || !options.additionalFields.length) return null;

		const text = (options && options.expanderButtonText) ? options.expanderButtonText : this.props.formContext.translations.More;

		return <Button onClick={this.showAdditional} className="button-right">{text + " ▸" }</Button>;
	}

	showAdditional = () => {
		this.setState({showAdditional: true}, () => {this.componentWillReceiveProps(this.props)});
	}
}
