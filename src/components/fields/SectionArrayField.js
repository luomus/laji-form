import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { getUiOptions, updateSafelyWithJSONPointer, uiSchemaJSONPointer, parseSchemaFromFormDataPointer, parseUiSchemaFromFormDataPointer, parseJSONPointer, addLajiFormIds, updateFormDataWithJSONPointer, isEmptyString, idSchemaIdToJSONPointer, getUUID, getTabbableFields, JSONPointerToId, getAllLajiFormIdsDeeply, getDefaultFormState } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import TitleFieldTemplate from "../templates/TitleField";
import { DeleteButton, Button, Affix } from "../components";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import { handlesArrayKeys, arrayKeyFunctions } from "../templates/ArrayFieldTemplate";

const getOptions = (options) => {
	const {
		sectionField = "/section",
		rowDefinerField = "/units/%{row}/identifications/0/taxonVerbatim",
		rowDefinerFields = [
			 "/units/%{row}/identifications/0/taxonID"
		],
		rowValueField = "/units/%{row}/individualCount",
	} = options;
	return {...options, sectionField, rowDefinerField, rowDefinerFields, rowValueField};
};

const hideFields = (schema, uiSchema, fields) => fields.reduce((_uiSchema, field) => 
	updateSafelyWithJSONPointer(_uiSchema, {"ui:field": "HiddenField"}, uiSchemaJSONPointer(schema, field.replace("%{row}", "0")))
, uiSchema);

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
	const uiSchema = {...(props.uiSchema || {}), "ui:options": {...getUiOptions(props.uiSchema), titleClassName: "hidden-title-text"}};
	return <TitleFieldTemplate {...props} uiSchema={uiSchema} />;
};

const NoLineBreakTitle = (props) => {
	const uiSchema = {...(props.uiSchema || {}), "ui:options": {...getUiOptions(props.uiSchema), titleClassName: "no-line-break"}};
	return <TitleFieldTemplate {...props} uiSchema={uiSchema} />;
};

const invisibleStyle = {visibility: "hidden"};

@VirtualSchemaField
export default class SectionArrayField extends React.Component {
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

	constructor(props) {
		super(props);
		// Assume that options don't change.
		this.arrayKeyFunctions = _arrayKeyFunctions(getOptions(this.getUiOptions()));
	}

	static getName() {return  "SectionArrayField";}

	getStateFromProps(props) {
		const {uiSchema, schema, registry} = props;
		const {sectionField, rowDefinerField} = getOptions(this.getUiOptions());
		const formContext = {
			...props.formContext,
			Label: () => null,
			this: this,
			originalUiSchema: uiSchema,
			errorSchema: props.errorSchema,
			errorsAsPopup: true
		};
		let _uiSchema = hideFields(schema, {
			...uiSchema,
			"ui:ArrayFieldTemplate": SectionArrayFieldTemplate,
		}, [sectionField, rowDefinerField]);

		const [containerPointer] = rowDefinerField.split("%{row}");
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, false, `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/removable`);

		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, [{fn: "add", className: "invisible"}], `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/buttons`);
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, containerArrayKeyFunctions, `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/arrayKeyFunctions`);
		_uiSchema = walkFieldTemplate(schema, _uiSchema, NoLabelsObjectFieldTemplate);
		//_uiSchema = updateSafelyWithJSONPointer(_uiSchema, {"ui:functions": [{"ui:field": "SingleItemArrayField"}, ...currentUiFunctions], ...contentUiSchema }, uiSchemaJSONPointer(schema, containerPointer));

		_uiSchema = walkUiOrder(schema, _uiSchema, rowDefinerField.replace("%{row}", 0));

		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, this.arrayKeyFunctions, "/ui:options/arrayKeyFunctions");
		_uiSchema = updateSafelyWithJSONPointer(_uiSchema, true, "/ui:options/keepPropFocusOnNavigate");

		return {
			uiSchema: _uiSchema,
			formContext,
			registry: {...registry, formContext, templates: {...registry.templates, TitleFieldTemplate: InvisibleTitle}}
		};
	}
}

const Section = ({children, style, ...rest}) => <div style={style || {flexGrow: 1, width: 0, flexBasis: 0, minWidth: 1}} {...rest}>{children}</div>;
const emptyObj = {};
const doNothing = () => { };
const columnStyle = {display: "flex", flexDirection: "column"};
const SectionContent = ({
	delete: _delete = <DeleteButton style={invisibleStyle} className="horizontally-centered" translations={emptyObj} onClick={doNothing}/>,
	sectionSum = <strong style={invisibleStyle}>{"hidden"}</strong>,
	sectionLabel = <legend style={invisibleStyle}>{"hidden"}</legend>,
	content
}) => (
	<div style={columnStyle}>
		{_delete}
		{sectionSum}
		{sectionLabel}
		{content}
	</div>
);

@handlesArrayKeys
class SectionArrayFieldTemplate extends React.Component {
	static contextType = ReactContext;


	constructor(props) {
		super(props);
		this.addButtonRef = React.createRef();
		this.sectionInputRef = React.createRef();
	}

	containerRef = React.createRef();

	onFocuses = []
	getOnFocus = (i) => () => {
		this.props.formContext.globals[`${this.props.idSchema.$id}.activeIdx`] = i + (getUiOptions(this.props.uiSchema).startIdx || 0);
	}

	getElemsForRowIdx = (rowIdx) => {
		const {rowValueField, rowDefinerField} = getOptions(getUiOptions(this.props.uiSchema));
		return [
			`${this.props.idSchema.$id}_0_${JSONPointerToId(rowDefinerField.replace("%{row}", rowIdx))}`,
			...this.props.formData.map((_, idx) => `${this.props.idSchema.$id}_${idx}_${JSONPointerToId(rowValueField.replace("%{row}", rowIdx))}`)
		].map(id => document.getElementById(id));
	}

	onContainerFocus = (e) => {
		const {id} = e.target;
		const [rowIdx] = getIdxsFromId(this.props.idSchema, getOptions(getUiOptions(this.props.uiSchema)), id);
		if (rowIdx !== undefined) {
			this.focusedRowIdx = rowIdx;
			this.getElemsForRowIdx(rowIdx).forEach(elem => {
				if (elem) {
					elem.className += " input-highlight";
				}
			});
		}
	}

	onContainerBlur = () => {
		if (this.focusedRowIdx !== undefined) {
			this.getElemsForRowIdx(this.focusedRowIdx).forEach(elem => {
				if (elem) {
					elem.className = elem.className.replace(" input-highlight", "");
				}
			});
		}
	}

	render() {
		return (
			<div style={{display: "flex", width: "100%"}} ref={this.containerRef} onFocus={this.onContainerFocus} onBlur={this.onContainerBlur} tabIndex={0}>
				<Section key="definer" style={{flexGrow: "initial", maxWidth: 200}} id={`${this.props.idSchema.$id}-section-definer`}>{this.renderRowDefinerColumn()}</Section>
				{this.renderSections()}
				<Section key="sums" className="bg-info" style={{maxWidth: 75}}>{this.renderRowDefinerSumColumn()}</Section>
				<Section key="deletes" style={{flexGrow: "initial", maxWidth: 143}}>{this.renderRowDefinerDeleteColumn()}</Section>
			</div>
		);
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
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id),
		};

		const idSchema = this.props.registry.schemaUtils.toIdSchema(this.props.schema.items, `${this.props.idSchema.$id}_0`);

		const sectionLabel = (
			<Affix className="background" containerRef={this.containerRef} topOffset={this.props.formContext.topOffset} bottomOffset={this.props.formContext.bottomOffset}>
				<legend>{this.props.formContext.translations.Section}</legend>
			</Affix>
		);
		const sectionSum = <strong>{this.props.formContext.translations.SectionSum}</strong>;
		const content = (
			<SchemaField
				{...this.props}
				schema={_schema}
				uiSchema={__uiSchema}
				formData={_formData}
				idSchema={idSchema}
				onChange={this.onRowDefinerChange}
				registry={{...registry, formContext, templates: {...registry.templates, TitleFieldTemplate: NoLineBreakTitle}}}
				formContext={formContext}
				errorSchema={this.props.formContext.errorSchema[0] || {}} />
		);
		return <SectionContent content={content}  sectionLabel={sectionLabel} sectionSum={sectionSum} />;
	}

	renderSections() {
		const {sectionField, rowValueField} = getOptions(getUiOptions(this.props.uiSchema));
		return (this.props.formData || []).map((item, idx) => {
			if (!this.props.items[idx]) {
				return null;
			}
			const {children, hasRemove, index, disabled, readonly, onDropIndexClick} = this.props.items[idx];
			const del = hasRemove && (
				<DeleteButton
					id={`${this.props.idSchema.$id}_${index}`}
					disabled={disabled || readonly}
					translations={this.props.formContext.translations}
					onClick={onDropIndexClick(index)}
					className="horizontally-centered" />
			);
			const sectionLabel = (
				<Affix className={index % 2 ? "background" : " darker"} containerRef={this.containerRef} topOffset={this.props.formContext.topOffset} bottomOffset={this.props.formContext.bottomOffset}>
					<legend className="horizontally-centered">{parseJSONPointer(this.props.formData[index], sectionField)}</legend>
				</Affix>
			);
			const [arr, field] = rowValueField.split("/%{row}");
			const sum = (parseJSONPointer(item, arr) || []).reduce((sum, item) => sum + (parseJSONPointer(item, field) || 0), 0);
			const sectionSum = (
				<strong className="horizontally-centered text-muted">{sum}</strong>
			);
			return (
				<Section onFocus={this.getOnFocus(idx)} key={getUUID(item)} className={index % 2 ? undefined : "darker"} id={`${this.props.idSchema.$id}_${idx}-section`}>
					<SectionContent delete={del} sectionLabel={sectionLabel} sectionSum={sectionSum} content={children} />
				</Section>
			);
		});
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
		__uiSchema = updateSafelyWithJSONPointer(__uiSchema, [{fn: "add", className: "invisible"}], `/${uiSchemaJSONPointer(schema, containerPointer)}/ui:options/buttons`);
		__uiSchema = walkUiOrder(schema.items, __uiSchema.items, rowDefinerField.replace("%{row}", 0));
		__uiSchema = walkFieldTemplate(schema.items, __uiSchema, InvisibleLabelObjectFieldTemplate);
		const formContext = {
			...this.props.formContext,
			containerPointer,
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id)
		};
		const {Overlay, Popover, Glyphicon} = this.context.theme;
		const add = (
			<React.Fragment>
				<Affix containerRef={this.containerRef} topOffset={this.props.formContext.topOffset} bottomOffset={this.props.formContext.bottomOffset}>
					<Button id={`${this.props.idSchema.$id}-add`}
					        onClick={this.showAddSection} style={{whiteSpace: "nowrap", padding: "3.5px 12px"}}
					        ref={this.addButtonRef}>
						<Glyphicon glyph="plus"/> {this.props.formContext.translations.AddSection}
					</Button>
				</Affix>
				{(this.state || {}).showAddSection &&
						<Overlay show={true} placement="left" rootClose={true} onHide={this.hideAddSection} target={this.getAddButtonElem}>
							<Popover id={`${this.props.id}-show-add-section`}>
								{this.getAddSectionPopup()}
							</Popover>
						</Overlay>
				}
			</React.Fragment>
		);
		const delButtons = (
			<SchemaField
				{...this.props}
				schema={_schema}
				uiSchema={__uiSchema}
				formData={_formData}
				onChange={this.onRowDefinerChange}
				registry={{...registry, formContext, fields: {...registry.fields, TitleFieldTemplate: InvisibleTitle}}}
				formContext={formContext}
			/>
		);
		return <SectionContent delete={add} content={delButtons} />;
	}

	getAddButtonElem = () => {
		return findDOMNode(this.addButtonRef.current);
	}

	showAddSection = () => {
		this.setState({showAddSection: true}, () => {
			setTimeout(() => {
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
		const {Row, Col} = this.context.theme;
		return (
			<div className="laji-form">
				<div><strong>{translations.AddNewSection}</strong></div>
				<Row>
					<Col xs={3}><label className="row-height not-strong" htmlFor={`${this.props.idSchema.$id}-section-input`}>{translations.Number}:</label></Col>
					<Col xs={9}><input className="form-control" id={`${this.props.idSchema.$id}-section-input`} type="text" value={newSection} onChange={this.onNewSectionChange} onKeyDown={this.onNewSectionKeyDown} ref={this.sectionInputRef}/></Col>
				</Row>
				<div>{translations.EnterNewSectionNumber}</div>
				<Button disabled={!this.sectorIsValid(newSection)} onClick={this.addSection}>{translations.Add}</Button>
				<Button onClick={this.hideAddSection} variant="default">{translations.Cancel}</Button>
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
			if (!this.sectorIsValid(this.state.newSection)) {
				return;
			}
			this.addSection();
			this.hideAddSection();
			e.stopPropagation();
		}
	}

	addSection = () => {
		const {registry, formContext, uiSchema, schema} = this.props;
		const {newSection} = this.state;

		const {rowDefinerField, rowDefinerFields, sectionField} = getOptions(getUiOptions(uiSchema));
		const [containerPointer] = rowDefinerField.split("/%{row}");
		const copiedRowDefinerData = (parseJSONPointer(this.props.formData[0] || {}, containerPointer) || []).reduce((result, item, idx) => {
			return [rowDefinerField, ...rowDefinerFields].reduce((_result, field) => {
				const [_, parsedField] = field.split("/%{row}"); // eslint-disable-line @typescript-eslint/no-unused-vars
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
		}, getDefaultFormState(schema.items));
		const tmpIdTree = formContext.services.ids.getRelativeTmpIdTree(this.props.idSchema.$id);
		const _item = copiedRowDefinerData;
		let [item] = addLajiFormIds(_item, tmpIdTree, this.props.idSchema.$id);
		item = updateFormDataWithJSONPointer({schema: schema.items, formData: item, registry}, parseInt(newSection), sectionField);
		const items = [...this.props.formData, item];
		const idx = items.findIndex(i => i === item);

		const idToFocus =  `${this.props.idSchema.$id}_${idx}`;
		let {idToScrollAfterAdd = `${this.props.idSchema.$id}-add-section`} = getUiOptions(uiSchema || {});
		getContext(formContext.contextId).idToFocus = idToFocus;
		getContext(formContext.contextId).idToScroll = idToScrollAfterAdd;

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
			(parseJSONPointer(item, containerPointer) || []).forEach((definerItem, idx) => {
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
		__uiSchema = walkUiOrder(schema.items, __uiSchema, rowDefinerField.replace("%{row}", 0));
		const formContext = {
			...this.props.formContext,
			containerPointer,
			sectionPointer: idSchemaIdToJSONPointer(this.props.idSchema.$id),
			rowValueField,
			rowDefinerField,
		};

		const sumLabel = (
			<Affix containerRef={this.containerRef} topOffset={this.props.formContext.topOffset} bottomOffset={this.props.formContext.bottomOffset}>
				<legend className="bg-info horizontally-centered">{this.props.formContext.translations.Sum}</legend>
			</Affix>
		);
		const content = (
			<SchemaField
				{...this.props}
				schema={_schema}
				uiSchema={__uiSchema}
				formData={_formData}
				onChange={this.onRowDefinerChange}
				registry={{...registry, formContext, fields: {...registry.fields, TitleFieldTemplate: InvisibleTitle}}}
				formContext={formContext}
			/>
		);
		return <SectionContent sectionLabel={sumLabel} content={content} />;
	}


	onRowDefinerChange = formData => {
		const {rowDefinerField, rowDefinerFields} = getOptions(getUiOptions(this.props.uiSchema));
		const [containerPointer] = rowDefinerField.split("%{row}");

		const rowDefinerItemIdsToContainerIdxs = (parseJSONPointer(this.props.formData[0] || {}, containerPointer) || []).reduce((map, item, idx) => {
			map[getUUID(item)] = idx;
			return map;
		}, {});

		const tmpIdTree = this.props.formContext.services.ids.getRelativeTmpIdTree(`${this.props.idSchema.$id}_${JSONPointerToId(containerPointer.substr(0, containerPointer.length - 1))}`);

		const oldIds = getAllLajiFormIdsDeeply(this.props.formData, tmpIdTree);
		let ids = {};

		const _formData = this.props.formData.map((item, containerIdx) => {
			const items = parseJSONPointer(formData, containerPointer).map((unit, idx) => {
				let rowDefinerItem = parseJSONPointer(item, `${containerPointer}/${rowDefinerItemIdsToContainerIdxs[getUUID(unit)]}`);
				if (!rowDefinerItem) {
					// If container is first and it has UUID, it's an item added to the definer column. It has a UUID already, so 
					// we don't define it again, or else it will be rendered again and won't be autofocused properly.
					const [_rowDefinerItem, _ids] = containerIdx === 0 && getUUID(unit)
						? addLajiFormIds(unit, tmpIdTree)
						: addLajiFormIds(this.props.formContext.utils.filterItemIdsDeeply(unit, this.props.idSchema.$id), tmpIdTree, false);
					rowDefinerItem  = _rowDefinerItem;
					ids = {...ids, ..._ids};
				}
				const updatedUnit = [rowDefinerField, ...rowDefinerFields].reduce((updatedNewUnit, field) => {
					const [_, contentPointer] = field.split("%{row}"); // eslint-disable-line @typescript-eslint/no-unused-vars
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
				return addLajiFormIds(updatedUnit, tmpIdTree, false)[0];
			});
			return updateFormDataWithJSONPointer(
				{
					schema: this.props.schema.items,
					formData: item,
					registry: this.props.registry
				},
				items,
				containerPointer
			);
		});
		this.props.formContext.this.props.onChange(_formData);

		Object.keys(oldIds).forEach(id => {
			if (!ids[id]) {
				this.props.formContext.services.submitHooks.remove(id);
			}
		});
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
		const title = (props.uiSchema[prop.name] || {})["ui:title"] || props.schema.properties[prop.name].title || prop.name;
		return <div key={prop.name} className="form-group row-height"><label>{title}</label></div>;
	});
};

const getIdxsFromId = (idSchema, options, _id) => {
	const {rowDefinerField} = options;
	const id = idSchema.$id;
	const sectionIdx = _id.match(new RegExp(`${id}_(\\d+)`))
		&& !_id.match(new RegExp(`${id}_\\d+_${JSONPointerToId(rowDefinerField.replace("%{row}", "\\d+"))}`))
		? +_id.match(new RegExp(`${id}_(\\d+)`))[1]
		: undefined;
	const [containerPointer] = rowDefinerField.split("%{row}");
	const horizontalIdx = _id.match(new RegExp(`${id}_\\d+_${JSONPointerToId(containerPointer)}`))
		? +_id.match(new RegExp(`${id}_\\d+_${JSONPointerToId(containerPointer)}(\\d+)`))[1]
		: undefined;
	return [horizontalIdx, sectionIdx];
};

const _arrayKeyFunctions = options => {
	const keyFunctions = {
		...arrayKeyFunctions,
		insert: (e, props) => {
			document.getElementById(`${props.getProps().idSchema.$id}-add`).click();
		},
		navigateSection: (e, {getProps, left, right, up, goOverRow}) => {
			const {rowDefinerField, rowValueField} = options;
			const currentId = getProps().formContext.utils.findNearestParentSchemaElemId(document.activeElement);
			const amount = left || up ? -1 : 1;
			const id = getProps().idSchema.$id;
			let nextId;

			const [currentRow, currentSection] = getIdxsFromId(getProps().idSchema, options, currentId);

			if (currentRow === undefined && currentSection === undefined) {
				return false;
			}

			const getNonRowSectionFieldsForSectionIdx = sectionIdx => {
				let tabbable = getTabbableFields(document.getElementById(`${id}_${sectionIdx}-section`));
				return tabbable.filter(elem => {
					return !elem.id.match(new RegExp(JSONPointerToId(rowValueField.replace("%{row}", "\\d+"))));
				});
			};
			const goOverToNonRowLogic = (currentProp, reverse = true, last = true) => {
				let tabbableInSection = getTabbableFields(document.getElementById(`${id}_${last ? getProps().formData.length - 1 : 0}-section`));
				if (reverse) {
					tabbableInSection = tabbableInSection.reverse();
				}
				let currentPropEncountered = false;
				const elem = tabbableInSection.find(elem => {
					if (!elem.id.match(new RegExp(JSONPointerToId(rowValueField.replace("%{row}", "\\d+"))))) {
						if (!currentProp || currentPropEncountered) {
							return elem;
						}
						if (elem.id.match(currentProp)) {
							currentPropEncountered = true;
						}
					}
				});
				nextId = getProps().formContext.utils.findNearestParentSchemaElemId(elem);
			};

			if (left || right) {
				// Horizontal navigation from row definer column to row value column.
				if (right && currentSection === undefined) {
					const idSuffix = JSONPointerToId(rowValueField.replace("%{row}", currentRow));
					nextId = `${id}_0_${idSuffix}`;
					// Horizontal navigation from row value column to row definer column.
				} else if (left && currentSection === 0 && currentRow !== undefined) {
					const idSuffix = JSONPointerToId(rowDefinerField.replace("%{row}", currentRow));
					nextId = `${id}_${currentSection}_${idSuffix}`;
					// Horizontal navigation to next/prev row if goOverRow.
				} else if (right && currentSection === getProps().formData.length - 1) {
					if (!goOverRow) {
						return false;
					}
					// Horizontal navigation inside row matrix.
					if (currentRow !== undefined) {
						const idSuffix = JSONPointerToId(rowDefinerField.replace("%{row}", currentRow + 1));
						nextId = `${id}_${0}_${idSuffix}`;
					} else {
						let tabbableInSection = getNonRowSectionFieldsForSectionIdx(getProps().formData.length - 1);
						// Horizontal navigation inside non row section field.
						if (currentId === getProps().formContext.utils.findNearestParentSchemaElemId(tabbableInSection[tabbableInSection.length - 1])) {
							nextId = `${id}_0_${JSONPointerToId(rowDefinerField.replace("%{row}", 0))}`;
							// Horizontal navigation from non row section to row field.
						} else {
							const currentProp = currentId.match(`${id}_${currentSection}_(.+)`)[1];
							goOverToNonRowLogic(currentProp, false, false);
						}
					}
				} else if (left && currentSection === undefined) {
					if (goOverRow) {
						// Horizontal navigation from row field to non row section field.
						if (currentRow === 0) {
							goOverToNonRowLogic();
							// Horizontal navigation inside row value fields.
						} else  {
							const idSuffix = JSONPointerToId(rowValueField.replace("%{row}", currentRow - 1));
							nextId = `${id}_${getProps().formData.length - 1}_${idSuffix}`;
						}
					}
					// Horizontal navigation inside non row section fields.
				} else if (left && currentRow === undefined && currentSection === 0) {
					if (goOverRow) {
						const currentProp = currentId.match(`${id}_${currentSection}_(.+)`)[1];
						goOverToNonRowLogic(currentProp);
					}
					// Horizontal navigation inside value matrix.
				} else {
					const [idPrefix] = currentId.match(new RegExp(`${id}_(\\d+)`));
					const idSuffix = currentId.replace(`${idPrefix}_`, "");
					nextId = `${id}_${+currentSection + amount}_${idSuffix}`;
				}
			} else {
				// Vertical navigation.
				const containerId = currentSection !== undefined
					? `${id}_${currentSection}-section`
					: `${id}-section-definer`;
				const tabbableOutsideContainer = getTabbableFields(document.getElementById(containerId));
				const tabbableIdx = tabbableOutsideContainer.findIndex(e => e === document.activeElement);
				nextId = getProps().formContext.utils.findNearestParentSchemaElemId(tabbableOutsideContainer[tabbableIdx + amount]);
				if (nextId === "root") {
					return true;
				}
			}
			getProps().formContext.utils.focusAndScroll(nextId);
		}
	};
	keyFunctions.navigate = (e, props) => {
		const {getProps, reverse} = props;
		const id = getProps().idSchema.$id;
		if (!reverse) {
			const lastSectionElems = getTabbableFields(document.getElementById(`${id}_${getProps().formData.length - 1}-section`));
			const lastElem = lastSectionElems[lastSectionElems.length - 1];
			if (document.activeElement === lastElem) {
				return false;
			}
		} else {
			const {rowDefinerField} = options;
			const firstElem = getTabbableFields(document.getElementById(`${id}_0-section`))[0];
			if (document.activeElement === firstElem) {
				const allTabbableFields = getTabbableFields(findDOMNode(getProps().formContext.formRef.current));
				const matcher = new RegExp(JSONPointerToId(rowDefinerField.replace("%{row}", "\\d+")));
				const allTabbableFieldsWithoutRowDefinerInputs = allTabbableFields.filter(f => !f.id.match(matcher));
				const input = getProps().formContext.utils.getNextInputInInputs(undefined, true, allTabbableFieldsWithoutRowDefinerInputs);
				if (input) {
					input.focus();
				}
				return true;
			}
		}
		return keyFunctions.navigateSection(e, {...props, right: !props.reverse, left: props.reverse, goOverRow: true});
	};
	return keyFunctions;
};

const containerArrayKeyFunctions = {
	...arrayKeyFunctions,
	// Disable insert, insert should bubble to section adding.
	insert: () => {
		return false;
	},
};
