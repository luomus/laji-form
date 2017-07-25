import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { Accordion, Panel, OverlayTrigger, Tooltip, Pager, Table } from "react-bootstrap";
import { getUiOptions, hasData, focusById, getReactComponentName, isNullOrUndefined, getNestedTailUiSchema, isHidden, isEmptyString, bsSizeToPixels } from "../../utils";
import { isSelect, isMultiSelect, orderProperties } from "react-jsonschema-form/lib/utils";
import { DeleteButton } from "../components";
import _ArrayFieldTemplate, { getButtons, arrayKeyFunctions, arrayItemKeyFunctions } from "../ArrayFieldTemplate";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";

const headerFormatters = {
	units: {
		render: (that, idx) => {
			const {props: {formContext: {translations}, formData}} = that;
			const item = formData[idx];
			const unitsLength = (item && item.units && item.units.hasOwnProperty("length")) ?
				item.units.filter(unit =>
					unit &&
					unit.identifications &&
					unit.identifications[0] &&
					unit.identifications[0].taxon).length
				: 0;

			return (
				<span className="text-muted">
					{` (${unitsLength} ${translations.unitsPartitive})`}
				</span>
			);
		},
		onClick: (that, idx) => {
			if (that.state.activeIdx === idx) {
				headerFormatters.units.onMouseEnter(that, idx, !!"use the force");
			} else {
				headerFormatters.units.onMouseLeave(that);
			}
		},
		onMouseEnter: (that, idx, force) => {
			const {props: {formData}} = that;
			const item = formData[idx];

			that.hoveredIdx = idx;
			if (!force && idx === that.state.activeIdx) return;
			const map = new Context(`${that.props.formContext.contextId}_MAP`).map;
			const gatheringGeometries = (item && item.geometry && item.geometry.geometries) ? item.geometry.geometries : [];

			const unitGeometries = [...(item && item.units ? item.units : [])]
				.filter(unit => unit.unitGathering && hasData(unit.unitGathering.geometry))
				.map(unit => unit.unitGathering.geometry);

			const geometries = [...gatheringGeometries, ...unitGeometries]
				.map(geometry => {
					return {type: "Feature", properties: {}, geometry};
				});

			map.setData({
				featureCollection: {type: "featureCollection", features: geometries},
				getFeatureStyle: () => {
					return {opacity: 0.6, color: "#888888"};
				}
			});
		},
		onMouseLeave: (that) => {
			const map = new Context(`${that.props.formContext.contextId}_MAP`).map;
			map.setData();
			that.hoveredIdx = undefined;
		}
	}
};

const popupMappers = {
	units: (schema, units, fieldName) => {
		const identifications = units
			.map(item =>
				(item && item.identifications && item.identifications[0]) ?
				item.identifications[0] : undefined)
			.filter(item => item);

		return Promise.all(
			identifications.map(identification =>
				identification.taxonID ?
				new ApiClient().fetchCached(`/taxa/${identification.taxonID}`).then(({vernacularName, scientificName}) => {
					return vernacularName || scientificName || identification.taxon;
				}) : new Promise(resolve => resolve(identification.taxon))
			)
		).then(result => {
			return new Promise(resolve => {
				resolve({[(schema.units ? schema.units.title : undefined) || fieldName]: result});
			});
		});
	}
};

@BaseComponent
export default class SingleActiveArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				renderer: PropTypes.oneOf(["accordion", "pager", "uncontrolled", "table"]),
				activeIdx: PropTypes.integer,
				addTxt: PropTypes.string
			})
		})
	}

	constructor(props) {
		super(props);
		this.deleteButtonRefs = {};
		const options = getUiOptions(props.uiSchema);
		this.state = {
			activeIdx: (props.formData && props.formData.length) ? 
				("initialActiveIdx" in options) ? options.initialActiveIdx : 0
				: undefined, 
			...this.getStateFromProps(props), popups: {}
		};
		const id = `${this.props.idSchema.$id}`;
		this.getContext()[`${id}.activeIdx`] = this.state.activeIdx;
	}

	componentWillReceiveProps(props) {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		if (popupFields) props.formData.forEach((item, idx) => {
			this.getPopupDataPromise(idx, item).then(popupData => {
				this.setState({popups: {...this.state.popups, [idx]: popupData}});
			});
		});
	}

	getStateFromProps(props) {
		const state = {};
		const options = getUiOptions(props.uiSchema);
		if (options.hasOwnProperty("activeIdx")) state.activeIdx = options.activeIdx;
		return state;
	}

	render() {
		const renderer = getUiOptions(this.props.uiSchema).renderer || "accordion";
		let ArrayFieldTemplate = undefined;
		if (renderer === "accordion") {
			ArrayFieldTemplate = AccordionArrayFieldTemplate;
		} else if (renderer === "pager") {
			ArrayFieldTemplate = PagerArrayFieldTemplate;
		} else if (renderer === "uncontrolled") {
			ArrayFieldTemplate = UncontrolledArrayFieldTemplate;
		} else if (renderer === "table") {
			ArrayFieldTemplate = TableArrayFieldTemplate;
		} else {
			throw new Error(`Unknown renderer '${renderer}' for SingleActiveArrayField`);
		}

		const options = getUiOptions(this.props.uiSchema);
		const addLabel = options.hasOwnProperty("addTxt") ? 
			options.addTxt : this.props.formContext.translations.Add;

		const formContext = {...this.props.formContext, this: this};

		const {registry: {fields: {ArrayField}}} = this.props;

		const addButton = {
			fn: "add",
			callbacker: (callback) => {this.onActiveChange(this.props.formData.length, callback);},
			label: addLabel
		};

		let buttons = this.props.uiSchema["ui:options"] ? (this.props.uiSchema["ui:options"].buttons || []) : [];

		let foundAdd = false;
		buttons.forEach(button => {
			if (button.fn === "add") {
				foundAdd = true;
				button.callbacker = addButton.callbacker;
			}
		});

		if (!foundAdd) {
			buttons = [addButton, ...buttons];
		}

		let uiSchema = {
			...this.props.uiSchema,
			"ui:field": undefined,
			classNames: undefined,
			"ui:options": {
				...this.props.uiSchema["ui:options"],
				renderDelete: false,
				buttons
			}
		};

		if (renderer === "table" && uiSchema.items.classNames  && !this.state.normalRenderingTreshold) {
			const {classNames: itemsClassNames, ...uiSchemaItems} = uiSchema.items;
			uiSchema = {
				...uiSchema,
				"ui:options": {
					...(uiSchema["ui:options"] || {}),
					itemsClassNames
				},
				items: uiSchemaItems
			};
		}

		if (renderer === "accordion") addButton.className = "col-xs-12 laji-form-accordion-header";
		return (
				<ArrayField
					{...this.props}
					formContext={formContext}
					registry={{
						...this.props.registry,
						ArrayFieldTemplate
					}}
					uiSchema={uiSchema}
				/>
		);
	}

	updateDimensions = () => {
		const {normalRenderingTreshold} = getUiOptions(this.props.uiSchema);
		if (!normalRenderingTreshold) return;
		let treshold = bsSizeToPixels(normalRenderingTreshold);

		if (window.innerWidth <= treshold && !this.state.normalRenderingTreshold) {
			this.setState({normalRenderingTreshold: true});
		} else if (window.innerWidth > treshold && this.state.normalRenderingTreshold) {
			this.setState({normalRenderingTreshold: false});
		}
	}

	getPopupDataPromise = (idx, itemFormData) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);

		if (!this.props.formData) return new Promise(resolve => resolve({}));

		return Promise.all(popupFields.map(field => {
			const fieldName = field.field;
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			let fieldSchema = this.props.schema.items.properties;

			if (field.mapper && fieldData) {
				return popupMappers[field.mapper](fieldSchema, fieldData, fieldName);
			} else if (fieldData) {
				return new Promise(resolve => resolve({[fieldSchema[fieldName].title || fieldName]: fieldData}));
			}
		})).then(fields => {
			const popupData = fields.reduce((popup, item) => {
				if (item) Object.keys(item).forEach(label => {
					popup[label] = item[label];
				});
				return popup;
			}, {});
			return new Promise(resolve => resolve(popupData));
		});
	}

	onActiveChange = (idx, callback) => {
		if (idx !== undefined)  {
			idx = parseInt(idx);
		}

		if (this.state.activeIdx === idx) {
			idx = undefined;
		}

		const that = this;
		function _callback() {
			const id = that.props.idSchema.$id;
			focusById(that.props.formContext.contextId, `${id}_${idx}`);
			that.getContext()[`${id}.activeIdx`] = idx;
			callback && callback();
		}

		const {onActiveChange} = getUiOptions(this.props.uiSchema);
		onActiveChange ? onActiveChange(idx, _callback) : this.setState({activeIdx: idx}, _callback);
	}

	onDelete = (idx) => () => {
		const formData = update(this.props.formData, {$splice: [[idx, 1]]});
		if (!formData.length) this.onActiveChange(undefined);
		if (this.state.activeIdx >= formData.length) this.onActiveChange(formData.length - 1);
		this.props.onChange(formData);
	}
}

class Popup extends Component {
	render() {
		const { data } = this.props;
		return (data && Object.keys(data).length) ? (
			<ul className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.filter(hasData).join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

function handlesButtons(ComposedComponent) {
	return class SingleActiveArrayTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent);

		componentDidMount() {
			const that = this.props.formContext.this;
			new Context(this.props.formContext.contextId).addKeyHandler(this.props.idSchema.$id, arrayKeyFunctions, {
				getProps: () => this.props,
				insertCallforward: callback => that.onActiveChange(that.props.formData.length, callback),
				navigateCallforward: (callback, idx) => that.onActiveChange(idx, callback)
			});
			this.addChildKeyHandler();
			if (super.componentDidMount) super.componentDidMount();
		}

		componentDidUpdate() {
			this.addChildKeyHandler();
		}

		addChildKeyHandler() {
			const that = this.props.formContext.this;
			if (this.childKeyHandlerId) new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			if (that.state.activeIdx !== undefined) {
				const id = `${this.props.idSchema.$id}_${that.state.activeIdx}`;
				this.childKeyHandlerId = id;
				new Context(this.props.formContext.contextId).addKeyHandler(id, arrayItemKeyFunctions, {id, getProps: () => this.props, getDeleteButton: () => that.deleteButtonRefs[that.state.activeIdx]});
			}
		}

		componentWillUnmount() {
			new Context(this.props.formContext.contextId).removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

// Swallow unknown prop warnings.
const ButtonsWrapper = ({props}) => {
	const buttons = getUiOptions(props.uiSchema).buttons;
	return <div>{getButtons(buttons, props)}</div>;
};

@handlesButtons
class AccordionArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const arrayFieldTemplateProps = this.props;

		const activeIdx = that.state.activeIdx;
		const title = that.props.schema.title;

		const onSelect = key => that.onActiveChange(key);
		const header = idx => renderAccordionHeader(that, idx, title, that.props.idSchema.$id);

		return (
				<div className="laji-form-single-active-array">
					<Accordion onSelect={onSelect} activeKey={activeIdx === undefined ? -1 : activeIdx}>
						{arrayFieldTemplateProps.items.map((item, idx) => (
							<Panel key={idx}
										 eventKey={idx}
										 header={header(idx)}
										 bsStyle={that.props.errorSchema[idx] ? "danger" : "default"}>
								{item.children}
							</Panel>
						))}
						<ButtonsWrapper props={arrayFieldTemplateProps} />
					</Accordion>
				</div>
		);
	}
}

@handlesButtons
class PagerArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const {translations} = that.props.formContext;
		const buttons = getUiOptions(arrayTemplateFieldProps.uiSchema).buttons;
		const activeIdx = that.state.activeIdx;
		const title = that.props.schema.title || "";

		const navigatePrev = () => that.onActiveChange(activeIdx - 1);
		const navigateNext = () => that.onActiveChange(activeIdx + 1);

		return (
			<div className="laji-form-single-active-array">
				<Panel header={
					<div className="laji-form-accordion-header">
						<Pager>
							<Pager.Item previous href="#"
													disabled={activeIdx <= 0 || activeIdx === undefined}
													onClick={navigatePrev}>
								&larr; {translations.Previous}</Pager.Item>
							{activeIdx !== undefined ? <div className="panel-title">{`${activeIdx + 1}. ${title}`}</div> : null}
							<Pager.Item next href="#"
													disabled={activeIdx >= that.props.formData.length - 1 || activeIdx === undefined}
													onClick={navigateNext}>
								{translations.Next}  &rarr;</Pager.Item>
						</Pager>
					</div>
				}>
				<div key={activeIdx}>
					{activeIdx !== undefined && arrayTemplateFieldProps.items && arrayTemplateFieldProps.items[activeIdx] ? arrayTemplateFieldProps.items[activeIdx].children : null}
				</div>
					{getButtons(buttons, arrayTemplateFieldProps)}
				</Panel>
			</div>
		);
	}
}

@handlesButtons
class UncontrolledArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const activeIdx = that.state.activeIdx;

		return activeIdx !== undefined && arrayTemplateFieldProps.items && arrayTemplateFieldProps.items[activeIdx] ? arrayTemplateFieldProps.items[activeIdx].children : null;
	}
}

@handlesButtons
class TableArrayFieldTemplate extends Component {

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		if (!getUiOptions(this.props.uiSchema).normalRenderingTreshold) return;
		window.addEventListener("resize", this.updateDimensions);
		this.updateDimensions();
	}

	componentWillUnmount() {
		if (!getUiOptions(this.props.uiSchema).normalRenderingTreshold) return;
		window.removeEventListener("resize", this.updateDimensions);
	}

	updateDimensions = () => {
		requestAnimationFrame(() => {
			const that = this.props.formContext.this;
			const {normalRenderingTreshold} = getUiOptions(this.props.uiSchema);
			if (!normalRenderingTreshold) return;
			let treshold = bsSizeToPixels(normalRenderingTreshold);

			if (window.innerWidth <= treshold  && !this.state.normalRenderingTreshold) {
				this.setState({normalRenderingTreshold: true});
				that.updateDimensions();
			} else if (window.innerWidth > treshold && this.state.normalRenderingTreshold) {
				this.setState({normalRenderingTreshold: false});
				that.updateDimensions();
			}
		});
	}

	render() {
		if (this.state.normalRenderingTreshold) {
			return <_ArrayFieldTemplate {...this.props} />;
		}

		const {schema, uiSchema, formData, items, TitleField, DescriptionField} = this.props;
		const foundProps = {};
		let cols = Object.keys(schema.items.properties).reduce((_cols, prop) => {
			if (formData.some(item => {
				const found = foundProps[prop] || (
					item.hasOwnProperty(prop) && 
					!isNullOrUndefined(item[prop]) && 
					(!Array.isArray(item[prop]) || Array.isArray(item[prop]) && !item[prop].every(isNullOrUndefined)) &&
					!isHidden(getNestedTailUiSchema(uiSchema.items), prop)
				);
				if (found) foundProps[prop] = true;
				return found;
			})) {
				_cols.push(prop);
			}
			return _cols;
		}, []);

		const {"ui:order": order = []} = (uiSchema.items || {});
		cols = orderProperties(cols, order.filter(field => field === "*" || foundProps[field]));

		const that = this.props.formContext.this;
		const activeIdx = that.state.activeIdx;

		const changeActive = idx => () => idx !== that.state.activeIdx && that.onActiveChange(idx);

		const formatValue = (item, col) => {
			const val = item[col];
			const _schema = schema.items.properties[col];
			const {registry} = that.props;
			const _uiSchema = getNestedTailUiSchema(uiSchema.items)[col] || {};

			let widget = undefined;
			if (_uiSchema["ui:widget"]) widget = registry.widgets[_uiSchema["ui:widget"]];
			else if (_schema.type === "boolean") widget = registry.widgets.CheckboxWidget;

			let formatter = undefined;
			if (widget && widget.prototype && widget.prototype.formatValue) formatter = widget.prototype.formatValue;
			else if (widget && widget.prototype && widget.prototype.__proto__) formatter = widget.prototype.__proto__.formatValue;

			if (formatter) {
				return formatter(val, getUiOptions(_uiSchema), that.props);
			} else if (isEmptyString(val)) {
				return "";
			} else if (isMultiSelect(_schema)) {
				return val.map(_val => _schema.items.enumNames[_schema.items.enum.indexOf(_val)]).join(", ");
			} else if (isSelect(_schema)) {
				return isEmptyString(val) ? val : _schema.enumNames[_schema.enum.indexOf(val)];
			} else if (_schema.type === "boolean") {
				return this.props.formContext.translations[val ? "yes" : "no"];
			}
			return val;
		};

		const {itemsClassNames} = getUiOptions(uiSchema);

		return (
			<div>
				<TitleField title={this.props.title}/>
				<DescriptionField description={this.props.description}/>
				<Table hover={true} bordered={true} condensed={true}> 
					{items.length !== 1 || that.state.activeIdx !== 0 ? (
						<thead>
							<tr className="darker">
								{cols.map(col => <th key={col}>{schema.items.properties[col].title}</th>)}
							</tr>
						</thead>
					) : null}
					<tbody>
						{items.map((item, idx) => {
							const trStyle = (idx === activeIdx) ?
								{visibility: "collapse"} : // We hide the active row from table, but render it to keep table layout steady.
								undefined;
							const tdStyle = (idx === activeIdx) ?
								{lineHeight: 0, paddingBottom: 0, paddingTop: 0} : // Set hidden row height to 0.
								undefined;
							return [
								<tr key={idx} onClick={changeActive(idx)} style={trStyle}>{
									cols.map(col => <td key={col} style={tdStyle}>{formatValue(formData[idx], col)}</td>)
								}</tr>,
								(idx === activeIdx) ? <tr key="active" onClick={changeActive(idx)}><td className={itemsClassNames} colSpan={cols.length}>{item.children}</td></tr> : null
							];
						})
						}
					</tbody>
				</Table>
				<ButtonsWrapper props={this.props} />
			</div>
		);
	}
}

function renderAccordionHeader(that, idx, title) {
	const popupData = that.state.popups[idx];

	const formattedIdx = idx + 1;
	const _title = title ? `${title} ${formattedIdx}` : formattedIdx;

	// try both headerFormatters & headerFormatter for backward compatibility. TODO: Remove in future.
	const options = getUiOptions(that.props.uiSchema);
	let _headerFormatters = options.headerFormatters || options.headerFormatter || [];
	if (_headerFormatters && !Array.isArray(_headerFormatters)) _headerFormatters = [_headerFormatters];

	const formatters = _headerFormatters.map(formatter => {
		if (headerFormatters[formatter]) return headerFormatters[formatter];
		else return {
			render: (that, idx) => {
				return <span className="text-muted">{that.props.formData[idx][formatter]}</span>;
			}
		};
	});

	const headerText = <span>{_title}{formatters.map((formatter, i) => <span key={i}> {formatter.render(that, idx)}</span>)}</span>;

	const onHeaderClick = () => {
		that.onActiveChange(idx);
		formatters.forEach(formatter => {formatter.onClick && formatter.onClick(that, idx);});
	};

	const onMouseEnter = () => {
		formatters.forEach(formatter => {
			formatter.onMouseEnter && formatter.onMouseEnter(that, idx);
		});
	};

	const onMouseLeave = () => {
		formatters.forEach(formatter => {
			formatter.onMouseLeave && formatter.onMouseLeave(that, idx);
		});
	};

	const getDeleteButtonRef = elem => {that.deleteButtonRefs[idx] = elem;};

	const header = (
		<div className="laji-form-accordion-header" onClick={onHeaderClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave} >
			<div className="panel-title">
				{headerText}
				<DeleteButton ref={getDeleteButtonRef}
											className="pull-right"
											confirm={options.confirmDelete}
											translations={that.props.formContext.translations}
											onClick={that.onDelete(idx)} />
				</div>
		</div>
	);

	return hasData(popupData) ? (
		<OverlayTrigger placement="left"
										overlay={<Tooltip id={"nav-tooltip-" + idx}><Popup data={popupData} /></Tooltip>}>
			{header}
		</OverlayTrigger>
	) : (
		header
	);
}
