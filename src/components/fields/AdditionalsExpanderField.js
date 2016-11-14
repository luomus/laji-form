import React, { Component, PropTypes } from "react";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema, isNullOrUndefined } from "../../utils";
import { Row, Col, Glyphicon } from "react-bootstrap";
import Button from "../Button";

/**
 * Additionals to hide by default and shown on demand are defined in uiSchema:
 * uiSchema = {ui:options: {
 *  additionalFields: [<string>]
 *  expanderButtonText: <string>
 *  expanderGlyph: <string> or <boolean> (If boolean and true, default glyph is used, otherwise
 *                                        a bootstrap glyph name must be provided)
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

		const {additionalFields} = getUiOptions(uiSchema);
		if (additionalFields && additionalFields.length) {
			additionalFields.forEach((option) => {
				dictionarifiedAdditionals[option] = true;
			});
			let showAdditional = this.shouldShowAdditionals(props, dictionarifiedAdditionals);
			if (!showAdditional && additionalFields) {
				let filteredSchema = {};
				Object.keys(schema.properties).forEach((prop) => {
					if (!dictionarifiedAdditionals[prop]) filteredSchema[prop] = schema.properties[prop];
				});
				schema = {...schema, properties: {filteredSchema, "ui:field": undefined}};
			}
		}
		schema = {...schema, title: undefined};

		uiSchema = getInnerUiSchema(props.uiSchema);

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
			if (this.state.dictionarifiedAdditionals[property] && (isNullOrUndefined(props.formData[property]))) return true;
		}
		return false;
	}

	renderButton = () => {
		const options = getUiOptions(this.props.uiSchema);
		if (!options.additionalFields || !options.additionalFields.length) return null;

		const text = options.expanderButtonText ? options.expanderButtonText : this.props.formContext.translations.More;

		return <Button onClick={this.showAdditional} className="button-right">{text + " ▸" }</Button>;
	}

	showAdditional = () => {
		this.setState({showAdditional: true}, () => {this.componentWillReceiveProps(this.props)});
	}
}
