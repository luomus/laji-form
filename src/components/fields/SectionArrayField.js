import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import { getUiOptions, updateSafelyWithJSONPointer, uiSchemaJSONPointer, parseSchemaFromFormDataPointer, parseUiSchemaFromFormDataPointer, parseJSONPointer, filterItemIdsDeeply, addLajiFormIds, getRelativeTmpIdTree, updateFormDataWithJSONPointer, isEmptyString, idSchemaIdToJSONPointer, getUUID } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import TitleField from "./TitleField";
import { DeleteButton, Button } from "../components";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { Overlay, Popover, Glyphicon, Row, Col } from "react-bootstrap";
import Context from "../../Context";
import { handlesArrayKeys, arrayKeyFunctions } from "../ArrayFieldTemplate";

const getOptions = (options) => {
	const {
		sectionField = "/section",
		rowDefinerField = "/units/%{row}/identifications/0/taxonVerbatim",
		rowDefinerFields = [
			 "/units/%{row}/identifications/0/taxonID",
			 "/units/%{row}/informalTaxonGroups"
		],
		rowValueField = "/units/%{row}/individualCount",
	} = options;
	return {...options, sectionField, rowDefinerField, rowDefinerFields, rowValueField};
};

const hideFields = (schema, uiSchema, fields) => fields.reduce((_uiSchema, field) => (
	updateSafelyWithJSONPointer(_uiSchema, {"ui:field": "HiddenField"}, uiSchemaJSONPointer(schema, field.replace("%{row}", "0")))
), uiSchema);

const walkUiOrder = (schema, uiSchema, pathToShouldBeLast) => {
	let [prop, ...next] = pathToShouldBeLast.split("/").filter(s => !isEmptyString(s));

	if (!prop) {
		return uiSchema;
	}
	const nextPath = `/${next.join("/")}`;
	const nextSchema = parseSchemaFromFormDataPointer(schema, prop);
	const nextUiSchema = parseUiSchemaFromFormDataPointer(uiSchema, prop);
	if (!isNaN(prop)) {
		return {...uiSchema, items: walkUiOrder(nextSchema, nextUiSchema, nextPath)};
	}
	if (schema.items && schema.items.properties) {
		return {...uiSchema, items: {...(uiSchema.items || {}), [prop]: walkUiOrder(nextSchema, nextUiSchema, nextPath), "ui:order": ["*", prop]}};
	}
	if (schema.properties) {
		return {...uiSchema, [prop]: walkUiOrder(nextSchema, nextUiSchema, nextPath), "ui:order": ["*", prop]};
	}
};

const walkFieldTemplate = (schema, uiSchema = {}, template) => {
	if (schema.items && schema.items.properties) {
		return {...uiSchema, items: walkFieldTemplate(schema.items, uiSchema.items, template)};
	}
	if (schema.properties) {
		return {
			...uiSchema,
			"ui:ObjectFieldTemplate": template,
			...Object.keys(schema.properties).reduce((props, prop) => ({
				...props,
				[prop]: walkFieldTemplate(schema.properties[prop], uiSchema[prop], template)
			}), uiSchema.properties)
		};
	}
	return uiSchema;
};

const InvisibleTitle = (props) => {
	return <TitleField {...props} className="hidden-title-text" />;
};

@VirtualSchemaField
export default class SectionArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	static getName() {return  "SectionArrayField";}

	constructor(props) {
		super(props);
		this.arrayKeyFunctions = getArrayKeyFunctions(this);
	}

	getStateFromProps(props) {
		const {uiSchema, schema, registry} = props;
		const {sectionField, rowDefinerField} = getOptions(this.getUiOptions());
		const formContext = {...props.formContext, Label: () => null, this: this, originalUiSchema: uiSchema};
		let _uiSchema = hideFields(schema, {
			...uiSchema,
			"ui:ArrayFieldTemplate": SectionArrayFieldTemplate,
		}, [sectionField, rowDefinerField]);

		const [containerPointer] = rowDefinerField.split("%{row}");
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, false, `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/removable`);

		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, [{fn: "add", className: "invisible"}],  `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/buttons`);
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, containerArrayKeyFunctions, `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/arrayKeyFunctions`);
		_uiSchema = walkFieldTemplate(schema, _uiSchema, NoLabelsObjectFieldTemplate);
		//_uiSchema = updateSafelyWithJSONPointer(_uiSchema, {"ui:functions": [{"ui:field": "SingleItemArrayField"}, ...currentUiFunctions], ...contentUiSchema }, uiSchemaJSONPointer(schema, containerPointer));

		_uiSchema = walkUiOrder(schema, _uiSchema, rowDefinerField.replace("%{row}", 0));

		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, this.arrayKeyFunctions, "/ui:options/arrayKeyFunctions");
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, true, "/ui:options/keepPropFocusOnNavigate");

		return {uiSchema: _uiSchema, formContext, registry: {...registry, formContext, fields: {...registry.fields, TitleField: InvisibleTitle}}};
	}
}

// Päiväperhoset MVL.181
// Suurperhoset MVL.237

const Section = ({children, width = 100, ...rest}) => <div style={{width, float: "left"}} {...rest}>{children}</div>;

@handlesArrayKeys
class SectionArrayFieldTemplate extends Component {
	constructor(props) {
		super(props);
		this.addButtonRef = React.createRef();
		this.sectionInputRef = React.createRef();
	}
	onFocuses = []
	getOnFocus = (i) => () => {
		this.props.formContext.this.getContext()[`${this.props.idSchema.$id}.activeIdx`] = i + (getUiOptions(this.props.uiSchema).startIdx || 0);
	}

	render() {
		const {sectionField} = getOptions(getUiOptions(this.props.uiSchema));
		return [
			<Section key="definer" width={200}>{this.renderRowDefinerColumn()}</Section>,
			...(this.props.formData || []).map((item, idx) => {
				if (!this.props.items[idx]) {
					return null;
				}
				const {children, hasRemove, index, disabled, readonly, onDropIndexClick} = this.props.items[idx];
				return (
					<Section onFocus={this.getOnFocus(idx)} key={getUUID(item)} className={index % 2 ? undefined : "gray nonbordered"}>
						{hasRemove && <DeleteButton
							id={`${this.props.idSchema.$id}_${index}`}
							disabled={disabled || readonly}
							translations={this.props.formContext.translations}
							onClick={onDropIndexClick(index)}
							className="horizontally-centered"
						/>}
							<label className="horizontally-centered">{this.props.formContext.translations.Section} {parseJSONPointer(this.props.formData[index], sectionField)}</label>
						{children}
					</Section>
				);
			}),
			<Section key="sums" width={50} className="bg-info">{this.renderRowDefinerSumColumn()}</Section>,
			<Section key="deletes" width={30}>{this.renderRowDefinerDeleteColumn()}</Section>,
		];
	}

	renderRowDefinerColumn() {
		const {formData, uiSchema, schema, registry} = this.props;
		const {rowDefinerField, rowValueField, sectionField} = getOptions(getUiOptions(uiSchema));
		const [containerPointer] = rowDefinerField.split("/%{row}");
		const {SchemaField} = this.props.registry.fields;
		const {originalUiSchema} = this.props.formContext;
		const _schema = schema.items;
		const _formData = formData[0];
		let __uiSchema = hideFields(schema, originalUiSchema, [rowValueField, sectionField]);
		__uiSchema = updateSafelyWithJSONPointer(__uiSchema.items, false, `${containerPointer}/ui:options/removable`);
		__uiSchema = walkUiOrder(schema.items, __uiSchema, rowDefinerField.replace("%{row}", 0));
		__uiSchema = walkFieldTemplate(schema.items, __uiSchema, RowDefinerObjectFieldTemplate);
		__uiSchema = walkUiOrder(schema.items, __uiSchema, `${containerPointer}/0/identifications`);
		const formContext = {
			...this.props.formContext,
			rowDefinerField,
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id)
		};

		return (
			<React.Fragment>
				<DeleteButton style={{visibility: "hidden"}} className="horizontally-centered" translations={this.props.formContext.translations} onClick={this.doNothing}/>
				<label style={{visibility: "hidden"}}>{"hidden"}</label>
				<SchemaField
					{...this.props}
					schema={_schema}
					uiSchema={__uiSchema}
					formData={_formData}
					onChange={this.onRowDefinerChange}
					registry={{...registry, formContext, fields: {...registry.fields, TitleField}}}
					formContext={formContext}
				/>
		</React.Fragment>
		);
	}

	renderRowDefinerDeleteColumn() {
		const {schema, registry, formData} = this.props;
		const {rowDefinerField, rowValueField, sectionField} = getOptions(getUiOptions(this.props.uiSchema));
		const [containerPointer] = rowDefinerField.split("/%{row}");
		const {SchemaField} = this.props.registry.fields;
		const {originalUiSchema} = this.props.formContext;
		let _schema = schema.items;
		const _formData = formData[0];
		let __uiSchema = hideFields(schema, originalUiSchema, [rowValueField, sectionField]);
		__uiSchema = updateSafelyWithJSONPointer(__uiSchema, [{fn: "add", className: "invisible"}],  `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/buttons`);
		__uiSchema = walkUiOrder(schema.items, __uiSchema.items, rowDefinerField.replace("%{row}", 0));
		__uiSchema = walkFieldTemplate(schema.items, __uiSchema, InvisibleLabelObjectFieldTemplate);
		const formContext = {
			...this.props.formContext,
			containerPointer,
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id)
		};
		return (
			<React.Fragment>
				<Button id={`${this.props.idSchema.$id}-add`} onClick={this.showAddSection} style={{whiteSpace: "nowrap", position: "absolute"}} ref={this.addButtonRef}><Glyphicon glyph="plus"/> {this.props.formContext.translations.AddSection}</Button>
				{(this.state || {}).showAddSection &&
						<Overlay show={true} placement="left" rootClose={true} onHide={this.hideAddSection} target={this.getAddButtonElem}>
							<Popover id={`${this.props.id}-show-add-section`}>
								{this.getAddSectionPopup()}
							</Popover>
						</Overlay>
				}
				<DeleteButton style={{visibility: "hidden"}} className="horizontally-centered" translations={this.props.formContext.translations} onClick={this.doNothing}/>
				<label style={{visibility: "hidden"}}>{"hidden"}</label>
				<SchemaField
					{...this.props}
					schema={_schema}
					uiSchema={__uiSchema}
					formData={_formData}
					onChange={this.onRowDefinerChange}
					registry={{...registry, formContext, fields: {...registry.fields, TitleField: InvisibleTitle}}}
					formContext={formContext}
				/>
			</React.Fragment>
		);
	}

	getAddButtonElem = () => {
		return findDOMNode(this.addButtonRef.current);
	}

	showAddSection = () => {
		this.setState({showAddSection: true}, () => {
			setImmediate(() => {
				findDOMNode(this.sectionInputRef.current).focus();
			});
		});
	}

	hideAddSection = () => {
		this.setState({showAddSection: false, newSection: undefined});
	}

	getAddSectionPopup = () => {
		const {translations} = this.props.formContext;
		const {newSection = ""} = this.state;
		return (
			<div className="laji-form">
				<div><strong>{translations.AddNewSection}</strong></div>
				<Row>
					<Col xs={3}><label className="row-height not-strong" htmlFor={`${this.props.idSchema.$id}-section-input`}>{translations.Number}:</label></Col>
					<Col xs={9}><input className="form-control" id={`${this.props.idSchema.$id}-section-input`} type="text" value={newSection} onChange={this.onNewSectionChange} onKeyDown={this.onNewSectionKeyDown} ref={this.sectionInputRef}/></Col>
			</Row>
				<div>{translations.EnterNewSectionNumber}</div>
				<Button disabled={!this.sectorIsValid(newSection)} onClick={this.addSection}>{translations.Add}</Button>
				<Button onClick={this.hideAddSection} bsStyle="default">{translations.Cancel}</Button>
			</div>
		);
	}

	sectorIsValid = (newSection) => {
		const {sectionField} = getOptions(getUiOptions(this.props.uiSchema));
		const existingNumbers = this.props.formData.map(item => "" + parseJSONPointer(item, sectionField));
		return !(isNaN(parseInt(newSection)) || parseInt(newSection) < 0 || parseInt(newSection) > 50 || existingNumbers.includes(newSection));
	}

	onNewSectionChange = (e) => {
		this.setState({newSection: e.target.value.replace(/[^0-9/-]/g, "")});
	}

	onNewSectionKeyDown = (e) => {
		if (e.key === "Enter") {
			this.sectorIsValid(this.state.newSection) && this.addSection();
			this.hideAddSection();
		}
	}

	addSection = () => {
		const {registry, formContext, uiSchema, schema} = this.props;
		const {newSection} = this.state;

		const {rowDefinerField, rowDefinerFields, sectionField} = getOptions(getUiOptions(uiSchema));
		const [containerPointer] = rowDefinerField.split("/%{row}");
		const copiedRowDefinerData = parseJSONPointer(this.props.formData[0], containerPointer).reduce((result, item, idx) => {
			return [rowDefinerField, ...rowDefinerFields].reduce((_result, field) => {
				const [_, parsedField] = field.split("/%{row}"); // eslint-disable-line no-unused-vars
				return updateFormDataWithJSONPointer(
					{
						schema: schema.items,
						formData: _result,
						registry
					},
					parseJSONPointer(item, parsedField),
					field.replace(/%{row}/g, idx)
				);
			}, result);
		}, getDefaultFormState(schema.items, undefined, registry));
		const tmpIdTree = getRelativeTmpIdTree(formContext.contextId, this.props.idSchema.$id);
		const _item = copiedRowDefinerData;
		let [item] = addLajiFormIds(_item, tmpIdTree, this.props.idSchema.$id);
		//let item = _item;
		item = updateFormDataWithJSONPointer({schema: schema.items, formData: item, registry}, parseInt(newSection), sectionField);
		const items = [...this.props.formData, item].sort((a, b) => parseJSONPointer(a, sectionField) - parseJSONPointer(b, sectionField));
		const idx = items.findIndex(i => i === item);

		const idToFocus =  `${this.props.idSchema.$id}_${idx}`;
		let {idToScrollAfterAdd = `${this.props.idSchema.$id}-add-section`} = getUiOptions(uiSchema || {});
		new Context(formContext.contextId).idToFocus = idToFocus;
		new Context(formContext.contextId).idToScroll = idToScrollAfterAdd;

		formContext.this.props.onChange(items);
		this.hideAddSection();
	}

	renderRowDefinerSumColumn() {
		const {schema, registry, formData} = this.props;
		const {rowDefinerField, rowDefinerFields, rowValueField, sectionField} = getOptions(getUiOptions(this.props.uiSchema));
		const [containerPointer, valueField] = rowValueField.split("/%{row}");
		const {SchemaField} = this.props.registry.fields;
		const {originalUiSchema} = this.props.formContext;
		let _schema = updateSafelyWithJSONPointer(schema.items, {type: "integer"}, `/properties/${containerPointer}/items/properties/sum`);

		let _formData = formData[0];
		const sums = formData.reduce((sums, item) => {
			parseJSONPointer(item, containerPointer).forEach((definerItem, idx) => {
				sums[idx] = (sums[idx] || 0) + (parseJSONPointer(definerItem, valueField) || 0);
			});
			return sums;
		}, []);
		sums.forEach((sum, idx) => {
			_formData = updateSafelyWithJSONPointer(_formData || {}, sum, `${containerPointer}/${idx}/sum`);
		});

		let containerUiSchema = Object.keys(parseSchemaFromFormDataPointer(_schema, containerPointer).items.properties).reduce((uiSchema, field) => {
			if (field === "sum") {
				return uiSchema;
			}
			return {
				...uiSchema,
				[field]: {"ui:field": "HiddenField"}
			};
		}, parseUiSchemaFromFormDataPointer(originalUiSchema, containerPointer).items);
		let __uiSchema = updateSafelyWithJSONPointer(originalUiSchema, containerUiSchema, `/items/${containerPointer}/items`);
		__uiSchema = hideFields(schema, __uiSchema, [rowValueField, sectionField, rowDefinerField, ...rowDefinerFields]);

		__uiSchema = updateSafelyWithJSONPointer(
			__uiSchema.items, 
			{...parseJSONPointer(__uiSchema.items, `${containerPointer}/ui:options`), removable: false, buttons: [{fn: "add", className: "invisible"}]},
			`${containerPointer}/ui:options`
		);

		__uiSchema = updateSafelyWithJSONPointer(__uiSchema,
			{
				"ui:widget": "PlainTextWidget",
				"ui:options": {strong: true, centered: true}
			}, `${containerPointer}/items/sum`);

		__uiSchema = walkFieldTemplate(schema.items, __uiSchema, SumObjectFieldTemplate);
		const formContext = {
			...this.props.formContext,
			containerPointer,
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id),
			rowValueField,
			rowDefinerField,
		};

		return (
			<React.Fragment>
				<DeleteButton style={{visibility: "hidden"}} className="horizontally-centered" translations={this.props.formContext.translations} onClick={this.doNothing}/>
				<label>{this.props.formContext.translations.Sum}</label>
				<SchemaField
					{...this.props}
					schema={_schema}
					uiSchema={__uiSchema}
					formData={_formData}
					onChange={this.onRowDefinerChange}
					registry={{...registry, formContext, fields: {...registry.fields, TitleField: InvisibleTitle}}}
					formContext={formContext}
				/>
			</React.Fragment>
		);
	}

	doNothing = () => {
	}

	onRowDefinerChange = formData => {
		const {rowDefinerField, rowDefinerFields} = getOptions(getUiOptions(this.props.uiSchema));
		const [containerPointer] = rowDefinerField.split("%{row}");

		const rowDefinerItemIdsToContainerIdxs = parseJSONPointer(this.props.formData[0], containerPointer).reduce((map, item, idx) => {
			map[getUUID(item)] = idx;
			return map;
		}, {});

		const _formData = this.props.formData.map((item) => {
			const items = parseJSONPointer(formData, containerPointer).map((unit, idx) => {
				let rowDefinerItem = parseJSONPointer(item, `${containerPointer}/${rowDefinerItemIdsToContainerIdxs[getUUID(unit)]}`);
				if (!rowDefinerItem) {
					const unitWithoutIds = filterItemIdsDeeply(unit, this.props.formContext.contextId, this.props.idSchema.$id);
					const tmpIdTree = getRelativeTmpIdTree(this.props.formContext.contextId, this.props.idSchema.$id);
					rowDefinerItem = addLajiFormIds(unitWithoutIds, tmpIdTree, false)[0];
				}
				return [rowDefinerField, ...rowDefinerFields].reduce((updatedNewUnit, field) => {
					const [_, contentPointer] = field.split("%{row}"); // eslint-disable-line no-unused-vars
					const pointer = field.replace("%{row}", idx);
					const value = parseJSONPointer(formData, pointer);
					return updateFormDataWithJSONPointer(
						{
							schema: parseSchemaFromFormDataPointer(this.props.schema.items, containerPointer).items,
							formData: updatedNewUnit,
							registry: this.props.registry
						},
						value,
						contentPointer
					);
				}, rowDefinerItem);
			});
			return updateFormDataWithJSONPointer(
				{
					schema: parseSchemaFromFormDataPointer(this.props.schema.items, containerPointer),
					formData: item,
					registry: this.props.registry
				},
				items,
				containerPointer
			);
		});
		this.props.formContext.this.props.onChange(_formData);
	}
}

const withoutItemPointers = pointer => pointer.replace(/\/([0-9]+|%{row})/g, "");

const InvisibleLabelObjectFieldTemplate = (props) => {
	const {containerPointer} = props.formContext;
	const pointer = idSchemaIdToJSONPointer(props.idSchema.$id);
	const containerPointerWithoutItemPointers = withoutItemPointers(containerPointer);
	const pointerWithoutItemPointers = withoutItemPointers(pointer);
	return props.properties.map(prop => {
		const propUiSchema = props.uiSchema[prop.name] || {};
		if (propUiSchema["ui:field"] === "HiddenField" || propUiSchema["ui:widget"] === "HiddenWidget") {
			return null;
		}
		if (containerPointerWithoutItemPointers.startsWith(pointerWithoutItemPointers.replace(props.formContext.sectionPointer, "") + "/" + prop.name)) {
			return <React.Fragment key={prop.name}>{prop.content}</React.Fragment>;
		}
		return <div key={prop.name} className="form-group row-height"><label></label></div>;
	});
};

const SumObjectFieldTemplate = (props) => {
	const {containerPointer} = props.formContext;
	const pointer = idSchemaIdToJSONPointer(props.idSchema.$id);
	const containerPointerWithoutItemPointers = withoutItemPointers(containerPointer);
	const pointerWithoutItemPointers = withoutItemPointers(pointer);
	return props.properties.map(prop => {
		const propUiSchema = props.uiSchema[prop.name] || {};
		if (propUiSchema["ui:field"] === "HiddenField" || propUiSchema["ui:widget"] === "HiddenWidget") {
			return null;
		}
		if (
			(containerPointerWithoutItemPointers.startsWith(pointerWithoutItemPointers.replace(props.formContext.sectionPointer, "") + "/" + prop.name))
			|| prop.name === "sum"
		) {
			return <React.Fragment key={prop.name}>{prop.content}</React.Fragment>;
		}
		return <div key={prop.name} className={"form-group row-height " + prop.name}><label></label></div>;
	});
};

const NoLabelsObjectFieldTemplate = (props) => {
	return props.properties.map(prop => prop.content);
};

const RowDefinerObjectFieldTemplate = (props) => {
	const pointer = idSchemaIdToJSONPointer(props.idSchema.$id);
	const rowDefinerFieldWithoutItemPointers = withoutItemPointers(props.formContext.rowDefinerField);
	const pointerWithoutItemPointers = withoutItemPointers(pointer);
	return props.properties.map(prop => {
		const propUiSchema = props.uiSchema[prop.name] || {};
		if (propUiSchema["ui:field"] === "HiddenField" || propUiSchema["ui:widget"] === "HiddenWidget") {
			return null;
		}
		if ((rowDefinerFieldWithoutItemPointers.startsWith(pointerWithoutItemPointers.replace(props.formContext.sectionPointer, "") + "/" + prop.name))) {
			return <React.Fragment key={prop.name}>{prop.content}</React.Fragment>;
		}
		return <div key={prop.name} className="form-group row-height"><label>{prop.name}</label></div>;
	});
};

const getArrayKeyFunctions = (that) => ({
	...arrayKeyFunctions,
	insert: (e, props) => {
		document.getElementById(`${props.getProps().idSchema.$id}-add`).click();
	}
});

const containerArrayKeyFunctions = {
	...arrayKeyFunctions,
	// Disable insert, insert should bubble to section adding.
	insert: () => {
		return false;
	}
};
