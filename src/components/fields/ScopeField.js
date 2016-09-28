import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, Modal, Glyphicon, Row, Col, Dropdown, MenuItem, OverlayTrigger, Tooltip } from "react-bootstrap";
import Spinner from "react-spinner";
import Masonry from "react-masonry-component";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import Button from "../Button";
import { isHidden, getFieldsFinalUiSchema, propertyHasData } from "../../utils";

const scopeFieldSettings = {
	taxonGroups: {
		translate: taxonGroup => {
			return new ApiClient().fetchCached("/informal-taxon-groups/" + taxonGroup).then((response) => {
				return response.name;
			})
		},
	}
}

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fields: [<string>] (fields that are always shown)
 *  fieldScopes: {
 *   fieldName: {
 *     fieldValue: {
 *       fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *       refs: [<string>] (root definitions that are merged recursively to this fieldScope)
 *       uiSchema: <uiSchema> (merged recursively to inner uiSchema
 *       fieldScopes: {fieldName: <fieldScope>, fieldName2 ...}
 *     },
 *     fieldValue2, ...
 *   }
 *  },
 *  definitions: {
 *    defName: <fieldScope>,
 *    defname2: ...
 *  },
 *  strictFields: [<string>] (array of field names that should not be shown even if
 *                            they have value, if they are not in a field scope)
 * }
 *
 * Field scope values accept asterisk (*) and plus (+) as field scope selector.
 */
export default class ScopeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				includeAdditionalFieldsChooserButton: PropTypes.boolean,
				additionalsGroupingPath: PropTypes.string,
				additionalsGroupsTranslator: PropTypes.oneOf(Object.keys(scopeFieldSettings)),
				fieldScopes: PropTypes.object,
				fields: PropTypes.arrayOf(PropTypes.string),
				definitions: PropTypes.object,
				strictFields: PropTypes.arrayOf(PropTypes.string),
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {
			additionalFields: {},
			additionalsOpen: false,
			searchTerm: "",
			...this.getStateFromProps(props)
		};
		this.mainContext = new Context().get("MAIN");
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		const options = props.uiSchema["ui:options"];

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		const schemas = this.getSchemas(props);
		const state = {
			...schemas,
			includeAdditionalFieldsChooserButton
		};

		if (options.additionalsGroupsTranslator) {
			const prevOptions = (this.props && this.props.uiSchema && this.props.uiSchema["ui:options"]) ?
				this.props.uiSchema["ui:options"] : {};
			state.additionalsGroupsTranslations =
				(prevOptions.additionalsGroupsTranslator === options.additionalsGroupsTranslator && this.state) ?
				this.state.additionalsGroupsTranslations : {};
			state.additionalsGroupsTranslator = options.additionalsGroupsTranslator;
		}

		if (this.state && Object.keys(this.state.schema.properties).length < Object.keys(schemas.schema.properties).length) {
			const lastField = this.getVisibleFields(props, this.state.schema.properties).pop();
			if (document.activeElement.id === this.props.idSchema[lastField].$id) {
				this.shouldFocusNextAfterRender = this.props.idSchema[lastField].$id;
			}
		}

		return state;
	}

	componentDidUpdate() {
		const id = this.shouldFocusNextAfterRender;
		if (id && document.activeElement &&  id === document.activeElement.id) {
			this.mainContext.focusNextInput(document.getElementById(id));
		}
		this.shouldFocusNextAfterRender = undefined;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<div className="scope-field">
				<div className="scope-field-schema">
				<SchemaField {...this.props} {...this.state} />
				</div>
				<div className="scope-field-buttons">
					{this.renderAdditionalsButtons()}
				</div>
			</div>
		);
	}

	getVisibleFields = (props, properties) => {
		const {uiSchema} = props;
		let fields = Object.keys(properties)
			.filter(field => { return !isHidden(getFieldsFinalUiSchema(uiSchema, field), field) });
		return fields;
	}

	getSchemas = (props) => {
		let {schema, uiSchema, formData} = props;

		let options = uiSchema["ui:options"];
		let generatedUiSchema = options.uiSchema || {};

		let fieldsToShow = {};

		if (options.fields) options.fields.forEach(field => {
			fieldsToShow[field] = schema.properties[field];
		});

		const definitions = options.definitions;

		function isEmpty(val) { return val === undefined || val === null || val === "" }

		function addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue) {
			let fieldScope = scopes[fieldSelector][fieldSelectorValue];
			if (!fieldScope) return;

			while (fieldScope.refs) {
				let refs = fieldScope.refs;
				fieldScope = update(fieldScope, {$merge: {refs: undefined}});
				refs.forEach(ref => {
					fieldScope = merge(fieldScope, definitions[ref]);
				});
			}

			if (fieldScope.fields) fieldScope.fields.forEach((fieldName) => {
				fieldsToShow[fieldName] = schema.properties[fieldName];
			});

			if (fieldScope.uiSchema) {
				generatedUiSchema = merge(generatedUiSchema, fieldScope.uiSchema);
			}

			if (fieldScope.fieldScopes) {
				addFieldScopeFieldsToFieldsToShow(fieldScope)
			}
		}
		
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;

			if (scopes) Object.keys(scopes).forEach((fieldSelector) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!Array.isArray(fieldSelectorValues))  fieldSelectorValues = [fieldSelectorValues];
				if (fieldSelectorValues.length > 0 && !isEmpty(fieldSelectorValues[0])) {
					fieldSelectorValues = update(fieldSelectorValues, {$push: ["+"]});
				}
				fieldSelectorValues = update(fieldSelectorValues, {$push: ["*"]});
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (!isEmpty(fieldSelectorValue)) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		addFieldScopeFieldsToFieldsToShow(options);

		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) {
			uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;
		}

		let additionalFields = (this.state && this.state.additionalFields) ? this.state.additionalFields : [];
		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				if (this.props.schema.properties[property].type === "boolean") fieldsToShow[property].default = true;
			});
		}

		if (props.formData) {
			let dictionarifiedStrictFields = {};
			if (options.strictFields) options.strictFields.forEach(field => { dictionarifiedStrictFields[field] = true });

			Object.keys(formData).forEach((property) => {
				if (dictionarifiedStrictFields[property] ||
				    isEmpty(formData[property]) ||
				    (formData.hasOwnProperty(property) &&
				     schema.properties.hasOwnProperty(property) &&
				     formData[property] === schema.properties[property].default)) return;
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				}
			})
		}

		schema = update(schema, {$merge: {properties: fieldsToShow}});

		return {
			schema: schema,
			uiSchema: generatedUiSchema
		}
	}

	onChange = (data) => {
		this.props.onChange(data);
	}

	onSearchChange = ({target: {value}}) => {
		this.setState({searchTerm: value});
	}

	onToggleAdditionals = () => {
		this.setState({additionalsOpen: !this.state.additionalsOpen});
	}

	renderAdditionalsButtons = () => {
		if (!this.state.includeAdditionalFieldsChooserButton || Object.keys(this.props.formData).length === 0) return null;

		const options = this.props.uiSchema["ui:options"];
		let list = [];
		if (this.state.additionalsOpen) {
			let translations = (this.state.additionalsGroupsTranslator) ? this.state.additionalsGroupsTranslations : {};
			let translationsToKeys = (this.state.additionalsGroupsTranslationsToKeys) ?
				this.state.additionalsGroupsTranslationsToKeys :
				{};

			if (this.state.additionalsGroupsTranslations) {
				if (!Object.keys(this.state.additionalsGroupsTranslations).length) this.translateAdditionalsGroups();
			}

			let additionalProperties = {};
			Object.keys(this.props.schema.properties).forEach(property => {
				if (!this.state.schema.properties ||
				    !this.state.schema.properties[property] ||
				    this.state.schema.properties[property].additional)
					additionalProperties[property] = this.props.schema.properties[property];
			});

			if (options.additionalsGroupingPath) {
				var groups = options.additionalsGroupingPath.split('.').reduce((o, i)=>o[i], options);
			}

			let filteredGroups = groups ? Object.keys(groups) : undefined;
			if (this.state.searchTerm !== "" && Object.keys(translations).length && groups) {
				filteredGroups = Object.keys(translationsToKeys)
					.filter(translation => translation.toLowerCase().includes(this.state.searchTerm.toLowerCase()))
					.map(translation => translationsToKeys[translation]);
			}

			if (filteredGroups) filteredGroups.forEach(groupName => {
				let group = groups[groupName];
				let groupFields = {};
				group.fields.forEach(field => {
					if (additionalProperties[field]) groupFields[field] = additionalProperties[field];
				});
				let groupsList = this.addAdditionalPropertiesToList(groupFields, [], ListGroupItem);
				if (groupsList.length) {
					list.push(
						<div key={groupName} className="scope-field-modal-item">
							{translations[groupName] !== undefined ? <span>{translations[groupName]}</span> : <Spinner />}
							<ListGroup key={groupName + "-list"}>{groupsList}</ListGroup>
						</div>
					);
				}
			}); else {
				list = this.addAdditionalPropertiesToList(additionalProperties, list, MenuItem);
			}
		}

		return (
			<div>
				{options.additionalsGroupingPath ? this.renderFieldsModal(list) : this.renderFieldsDropdown(list)}
				{this.renderGlyphFields()}
			</div>
		);
	}

	renderFieldsDropdown(list) {
		return (
			<Dropdown id={this.props.idSchema.$id + "-scope-field-dropdown"}
			          bsStyle="info"
			          pullRight
			          onSelect={(eventKey, event) => {
									this.preventCloseDropdown = true;
			          }}
			          open={this.state.additionalsOpen}
			          onToggle={(isOpen) => {
									if (!this.preventCloseDropdown) this.onToggleAdditionals(isOpen);
									this.preventCloseDropdown = false;
			           }}>
				{this.renderFieldsButton()}
				<Dropdown.Menu>
					{list}
				</Dropdown.Menu>
			</Dropdown>
		);
	}

	renderFieldsModal = (list) => {
		const {translations} = this.props.registry;

		return (
			<div>
				{this.renderFieldsButton()}
				{this.state.additionalsOpen ?  (
					<Modal show={true} onHide={this.onToggleAdditionals} dialogClassName="laji-form scope-field-modal">
						<Modal.Header closeButton={true} ><Modal.Title>{translations.SelectMoreFields}</Modal.Title></Modal.Header>
						<Modal.Body>
								<div className="scope-field-search form-group has-feedback">
									<input className="form-control" onChange={this.onSearchChange}
												 value={this.state.searchTerm} placeholder={translations.Filter} />
									<i className="glyphicon glyphicon-search form-control-feedback" />
								</div>
							<Masonry>{list}</Masonry>
						</Modal.Body>
					</Modal>
				) : null}
			</div>
		);
	}

	renderFieldsButton = () => {
		const glyph = <Glyphicon glyph="cog" />;
		const tooltip = <Tooltip id={`${this.props.idSchema.$id}-additionals-tooltip`}>{this.props.registry.translations.SelectMoreFields}</Tooltip>;

		return (
			<OverlayTrigger overlay={tooltip} placement="left">
				<Button className="laji-form-scope-field-glyph" onClick={this.onToggleAdditionals}>
					{glyph}
				</Button>
			</OverlayTrigger>
		);
	}

	renderGlyphFields = () => {
		const {glyphFields} = this.props.uiSchema["ui:options"];

		return glyphFields ?
			Object.keys(glyphFields).map(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData);
				return (
					<Button key={property} disabled={hasData} className="laji-form-scope-field-glyph" bsStyle={isIncluded ? "primary" : "default"}
					        onClick={ () => this.toggleAdditionalProperty(property)}>
						<Glyphicon glyph={glyphFields[property]} />
					</Button>
				);
		}) : null;
	}

	propertyIsIncluded = (property) => {
		const strictFields = this.props.uiSchema["ui:options"].strictFields || [];
		const {additionalFields} = this.state;

		const isStrict = strictFields.includes(property);
		const isIncluded = ((additionalFields[property] && !isStrict) ||
		additionalFields[property] === true || (this.state.schema.properties[property] && !isStrict));

		return isIncluded;
	}


	toggleAdditionalProperty = (field) => {
		const isIncluded = this.propertyIsIncluded(field);
		if (propertyHasData(field, this.props.formData))	return;
		this.setState({additionalFields: update(this.state.additionalFields, {$merge: {[field]: !isIncluded}})},
			() => {this.setState(this.getStateFromProps(this.props))});
	}

	addAdditionalPropertiesToList = (properties, list, ElemType) => {
		Object.keys(properties)
			.sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1})
			.forEach(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData);
				list.push(<ElemType
					key={property}
					disabled={hasData}
					active={isIncluded}
					onClick={() => this.toggleAdditionalProperty(property)}>
					{properties[property].title || property}
				</ElemType>)
			});
		return list;
	}

	translateAdditionalsGroups = () => {
		let options = this.props.uiSchema["ui:options"];
		if (options.additionalsGroupingPath) {
			var groups = Object.keys(options.additionalsGroupingPath.split('.').reduce((o,i)=>o[i], options));
		}

		let translations = {};
		let translationsToKeys = {};
		let translationCount = 0;
		groups.forEach(groupName => {
			scopeFieldSettings[this.state.additionalsGroupsTranslator].translate(groupName).then(translation => {
				translations[groupName] = translation;
				translationsToKeys[translation] = groupName;
				translationCount++;
				if (translationCount == groups.length) this.setState({
					additionalsGroupsTranslations: translations,
					additionalsGroupsTranslationsToKeys: translationsToKeys
				});
			});
		});
	}
}
