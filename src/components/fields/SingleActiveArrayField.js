import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import merge from "deepmerge";
import { Accordion, Panel, OverlayTrigger, Tooltip, Pager, Table, Row, Col, Glyphicon } from "react-bootstrap";
import { getUiOptions, hasData, focusById, getReactComponentName, parseJSONPointer, getBootstrapCols,
	getNestedTailUiSchema, isHidden, isEmptyString, bsSizeToPixels, capitalizeFirstLetter, decapitalizeFirstLetter } from "../../utils";
import { isSelect, isMultiSelect, orderProperties } from "react-jsonschema-form/lib/utils";
import { DeleteButton, Label } from "../components";
import _ArrayFieldTemplate, { getButtons, getButton, arrayKeyFunctions, arrayItemKeyFunctions, handlesArrayKeys } from "../ArrayFieldTemplate";
import { copyItemFunction } from "./ArrayField";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";
import { getLineTransectStartEndDistancesForIdx } from "laji-map/lib/utils";

const popupMappers = {
	units: (schema, units, fieldName) => {
		const identifications = units.map(item =>
			(item && item.identifications && item.identifications[0]) ?
				item.identifications[0] :
				undefined
		).filter(item => item);

		return Promise.all(
			identifications.map(identification =>
					new Promise(resolve => resolve(identification.taxon))
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
				renderer: PropTypes.oneOf(["accordion", "pager", "uncontrolled", "table", "split"]),
				activeIdx: PropTypes.integer
			})
		})
	}

	constructor(props) {
		super(props);
		const {formData, uiSchema, schema} = props;
		this.deleteButtonRefs = {};
		const options = getUiOptions(uiSchema);
		const formDataLength = (formData || []).length;
		this.state = {
			activeIdx: (formDataLength === 1 || formDataLength === 0 && schema.minItems) ? 0 : options.initialActiveIdx,
			...this.getStateFromProps(props), popups: {}
		};
		const id = `${this.props.idSchema.$id}`;
		this.getContext()[`${id}.activeIdx`] = this.state.activeIdx;
	}

	componentDidMount() {
		this.updatePopups(this.props);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "activeIdx", idx => {
			this.onActiveChange(idx);
		});
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "activeIdx");
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
		this.updatePopups(props);
	}

	updatePopups = (props) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		if (popupFields) props.formData.forEach((item, idx) => {
			this.getPopupDataPromise(idx, props, item).then(popupData => {
				this.setState({popups: {...this.state.popups, [idx]: popupData}});
			});
		});
	}

	getStateFromProps(props) {
		const state = {};
		const options = getUiOptions(props.uiSchema);
		if (options.hasOwnProperty("activeIdx")) state.activeIdx = options.activeIdx;

		const {titleFormat} = options;

		const title = "ui:title" in props.uiSchema ? props.uiSchema["ui:title" ] : props.schema.title;
		state.getTitle = (idx) => {
			if (!titleFormat) return title;

			const formatters = {
				idx: idx + 1,
				title: props.schema.title
			};
				
			return Object.keys(formatters).reduce((_title, key) => {
				[key, capitalizeFirstLetter(key)].map(key => `%{${key}}`).forEach(replacePattern => {
					while (_title.includes(replacePattern)) {
						const fn = replacePattern[2] === replacePattern[2].toLowerCase() ? 
							decapitalizeFirstLetter : capitalizeFirstLetter;
						_title = _title.replace(replacePattern, fn(`${formatters[key]}`));
					}
				});
				return _title;
			}, titleFormat);
		};

		return state;
	}

	render() {
		const {renderer = "accordion"} = getUiOptions(this.props.uiSchema);
		let ArrayFieldTemplate = undefined;
		switch(renderer) {
		case "accordion":
			ArrayFieldTemplate = AccordionArrayFieldTemplate;
			break;
		case "pager":
			ArrayFieldTemplate = PagerArrayFieldTemplate;
			break;
		case "uncontrolled":
			ArrayFieldTemplate = UncontrolledArrayFieldTemplate;
			break;
		case "table":
			ArrayFieldTemplate = TableArrayFieldTemplate;
			break;
		case "split":
			ArrayFieldTemplate = SplitArrayFieldTemplate;
			break;
		default:
			throw new Error(`Unknown renderer '${renderer}' for SingleActiveArrayField`);
		}

		const formContext = {...this.props.formContext, this: this};

		const {registry: {fields: {ArrayField}}} = this.props;

		let buttons = this.props.uiSchema["ui:options"] ? (this.props.uiSchema["ui:options"].buttons || []) : [];

		let uiSchema = {
			...this.props.uiSchema,
			"ui:field": undefined,
			classNames: undefined,
			"ui:options": {
				...this.props.uiSchema["ui:options"],
				renderDelete: false,
				buttons,
				buttonDefinitions: this.props.uiSchema["ui:options"].buttonDefinitions ? 
					merge(this.buttonDefinitions, getUiOptions(this.props.uiSchema).buttonDefinitions) :
					this.buttonDefinitions
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

	getPopupDataPromise = (idx, props, itemFormData) => {
		const {popupFields} = getUiOptions(props.uiSchema);

		if (!this.props.formData) return new Promise(resolve => resolve({}));

		return Promise.all(popupFields.map(field => {
			const fieldName = field.field;
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			let fieldSchema = props.schema.items.properties;

			if (field.mapper && fieldData) {
				return popupMappers[field.mapper](fieldSchema, fieldData, fieldName);
			} else if (fieldData) {
				return new Promise(resolve => resolve({[fieldSchema  && fieldSchema[fieldName] ? fieldSchema[fieldName].title : fieldName]: fieldData}));
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
			focusById(that.props.formContext, `${id}_${idx}`);
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

	buttonDefinitions = {
		add: {
			callback: () => this.onActiveChange(this.props.formData.length),
		},
		copy: {
			fn: () => (...params) => {
				const idx = this.state.activeIdx !== undefined ?
					this.state.activeIdx :
					this.props.formData.length - 1;
				this.props.onChange([
					...this.props.formData.slice(0, idx + 1),
					copyItemFunction(this, this.props.formData[idx])(...params),
					...this.props.formData.slice(idx + 1)
				]);
			},
			callback: () => {
				const idx = this.state.activeIdx !== undefined ?
					this.state.activeIdx :
					this.props.formData.length - 1;
				this.onActiveChange(idx + 1);
			},
			rules: {
				minLength: 1
			}
		}
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

function handlesButtonsAndFocus(ComposedComponent) {
	return @handlesArrayKeys
	class SingleActiveArrayTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent);

		addKeyHandlers() {
			const that = this.props.formContext.this;
			new Context(this.props.formContext.contextId).addKeyHandler(this.props.idSchema.$id, arrayKeyFunctions, {
				getProps: () => this.props,
				insertCallforward: callback => that.onActiveChange(that.props.formData.length, callback),
				getCurrentIdx: () => that.state.activeIdx,
				focusByIdx: (idx) => idx === that.state.activeIdx ?
					focusById(this.props.formContext, `${this.props.idSchema.$id}_${idx}`) :
					this.props.formContext.this.onActiveChange(idx)
			});
		}

		addChildKeyHandlers() {
			const that = this.props.formContext.this;
			if (this.childKeyHandlerId) new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			if (that.state.activeIdx !== undefined) {
				const id = `${this.props.idSchema.$id}_${that.state.activeIdx}`;
				this.childKeyHandlerId = id;
				new Context(this.props.formContext.contextId).addKeyHandler(id, arrayItemKeyFunctions, {id, getProps: () => this.props, getDeleteButton: () => that.deleteButtonRefs[that.state.activeIdx]});
			}

			this.removeFocusHandlers();
			this.focusHandlers = [];
			for (let i = 0; i < this.props.items.length; i++) {
				this.focusHandlers.push(() => {
					if (that.state.activeIdx !== i) return new Promise(resolve => {
						that.onActiveChange(i, () => resolve());
					});
				});
				new Context(this.props.formContext.contextId).addFocusHandler(`${that.props.idSchema.$id}_${i}`, this.focusHandlers[i]);
			}

			this.prevLength = this.props.items.length;
		}

		removeFocusHandlers() {
			const that = this.props.formContext.this;
			if (this.focusHandlers) {
				this.focusHandlers.forEach((handler, i) => {
					new Context(this.props.formContext.contextId).removeFocusHandler(`${that.props.idSchema.$id}_${i}`, this.focusHandlers[i]);
				});
			}
		}

		componentWillUnmount() {
			new Context(this.props.formContext.contextId).removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			this.removeFocusHandlers();
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

// Swallow unknown prop warnings.
const ButtonsWrapper = ({props}) => {
	const buttons = getUiOptions(props.uiSchema).buttons;
	return <div>{getButtons(buttons, props)}</div>;
};

const AccordionButtonsWrapper = ({props}) => {
	const buttons = getUiOptions(props.uiSchema).buttons;
	if (!buttons) return null;

	const cols = Object.keys(getBootstrapCols()).reduce((cols, colType) => {
		cols[colType] = (colType === "xs") ? 12 : 12 / buttons.length;
		return cols;
	}, {});

	return (
		<Row className="laji-form-accordion-buttons">
			{buttons.map(button => getButton(button, props)).map((button, idx) => 
					<Col {...cols} key={idx}>{button}</Col>
			)}
		</Row>
	);

};

@handlesButtonsAndFocus
class AccordionArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const arrayFieldTemplateProps = this.props;

		const activeIdx = that.state.activeIdx;

		const onSelect = key => that.onActiveChange(key);


		const getHeader = idx => (
			<AccordionHeader 
				that={that}
				idx={idx}
				wrapperClassName="panel-title"
				className="laji-form-clickable-panel-header laji-form-accordion-header">
				<DeleteButton ref={this.setDeleteButtonRef(idx)}
											className="pull-right"
											confirm={getUiOptions(arrayFieldTemplateProps.uiSchema).confirmDelete}
											translations={this.props.formContext.translations}
											onClick={that.onDelete(idx)} />
			</AccordionHeader>
		);

		return (
			<div className="laji-form-single-active-array">
				<Accordion onSelect={onSelect} activeKey={activeIdx === undefined ? -1 : activeIdx}>
					{arrayFieldTemplateProps.items.map((item, idx) => (
						<Panel key={idx}
						       className="laji-form-clickable-panel"
									 eventKey={idx}
									 header={getHeader(idx)}
									 bsStyle={that.props.errorSchema[idx] ? "danger" : "default"}>
							{idx === activeIdx ? item.children : null}
						</Panel>
					))}
					<AccordionButtonsWrapper props={arrayFieldTemplateProps} />
				</Accordion>
			</div>
		);
	}

	setDeleteButtonRef = idx => elem => {this.props.formContext.this.deleteButtonRefs[idx] = elem;};
}

@handlesButtonsAndFocus
class PagerArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const {translations} = that.props.formContext;
		const {buttons} = getUiOptions(arrayTemplateFieldProps.uiSchema);
		const activeIdx = that.state.activeIdx;
		const getHeader = idx => <AccordionHeader 
			that={that}
			idx={idx}
			className="panel-title"
		/>;

		return (
			<div className="laji-form-single-active-array">
				<Panel className="laji-form-clickable-panel" header={
					<div className="laji-form-clickable-panel-header laji-form-accordion-header">
						<Pager>
							<Pager.Item previous 
							            href="#"
							            disabled={activeIdx <= 0 || activeIdx === undefined}
							            onClick={this.navigatePrev}>
								&larr; {translations.Previous}</Pager.Item>
							{activeIdx !== undefined ? getHeader(activeIdx) : null}
							<Pager.Item next 
							            href="#"
							            disabled={activeIdx >= that.props.formData.length - 1 || activeIdx === undefined}
							            onClick={this.navigateNext}>
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

	navigatePrev = () => this.props.formContext.this.onActiveChange(this.props.formContext.this.state.activeIdx - 1);
	navigateNext = () => this.props.formContext.this.onActiveChange(this.props.formContext.this.state.activeIdx + 1);

}

@handlesButtonsAndFocus
class UncontrolledArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const activeIdx = that.state.activeIdx;
		const {TitleField} =  arrayTemplateFieldProps;
		const Title = getUiOptions(that.props.uiSchema).renderTitleAsLabel ? Label :  TitleField;
		const title = that.state.getTitle(activeIdx);

		return activeIdx !== undefined && arrayTemplateFieldProps.items && arrayTemplateFieldProps.items[activeIdx] ? 
			<div>
				<Title title={title} label={title} className={getUiOptions(arrayTemplateFieldProps.uiSchema).titleClassName}/>
				{arrayTemplateFieldProps.items[activeIdx].children} 
			</div>
			: null;
	}
}

@handlesButtonsAndFocus
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
		const {renderTitleAsLabel, formatters} = getUiOptions(this.props.uiSchema);
		const Title = renderTitleAsLabel ? Label :  TitleField;
		const foundProps = {};
		let cols = Object.keys(schema.items.properties).reduce((_cols, prop) => {
			if (formData.some(item => {
				const found = 
					foundProps[prop] || 
					(
						item.hasOwnProperty(prop) && 
						!isEmptyString(item[prop]) && 
						(!Array.isArray(item[prop]) || Array.isArray(item[prop]) && !item[prop].every(isEmptyString)) &&
						!isHidden(uiSchema.items, prop) &&
						!isHidden(getNestedTailUiSchema(uiSchema.items), prop)
					);
				if (found) foundProps[prop] = true;
				return found;
			})) {
				_cols.push(prop);
			}
			return _cols;
		}, []);

		const {"ui:order": order} = (uiSchema.items || {});
		if (order) cols = orderProperties(cols, order.filter(field => field === "*" || foundProps[field]));

		const that = this.props.formContext.this;
		const {registry, errorSchema} = that.props;
		const activeIdx = that.state.activeIdx;

		const changeActive = idx => () => idx !== that.state.activeIdx && that.onActiveChange(idx);

		const formatValue = (item, col) => {
			const val = item[col];
			const _schema = schema.items.properties[col];
			const _uiSchema = uiSchema.items[col] || getNestedTailUiSchema(uiSchema.items)[col] || {};

			let formatterComponent = undefined;
			if (_uiSchema["ui:widget"]) formatterComponent = registry.widgets[_uiSchema["ui:widget"]];
			else if (_schema.type === "boolean") formatterComponent = registry.widgets.CheckboxWidget;
			else if (_uiSchema["ui:field"]) formatterComponent = registry.fields[_uiSchema["ui:field"]];

			let formatter = undefined;
			if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.formatValue) {
				formatter = formatterComponent.prototype.formatValue;
			} else if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.__proto__ && formatterComponent.prototype.__proto__.formatValue) {
				formatter = formatterComponent.prototype.__proto__.formatValue;
			}

			let formatted = val;
			if (formatter) {
				formatted = formatter(val, getUiOptions(_uiSchema), that.props);
			} else if (isEmptyString(val)) {
				formatted = "";
			} else if (isMultiSelect(_schema)) {
				formatted = val.map(_val => _schema.items.enumNames[_schema.items.enum.indexOf(_val)]).join(", ");
			} else if (isSelect(_schema)) {
				formatted = isEmptyString(val) ? val : _schema.enumNames[_schema.enum.indexOf(val)];
			} else if (_schema.type === "boolean") {
				formatted = this.props.formContext.translations[val ? "yes" : "no"];
			}

			if (formatters && formatters[col]) {
				formatted = tableFormatters[formatters[col].formatter](item, col, formatted, formatters[col]);
			}

			return formatted;
		};

		const {itemsClassNames, confirmDelete, titleClassName} = getUiOptions(uiSchema);

		const getDeleteButtonFor = idx => {
			const getDeleteButtonRef = elem => {that.deleteButtonRefs[idx] = elem;};
			return (
				<td key="delete" className="single-active-array-table-delete">
					{this.props.items[idx].hasRemove && <DeleteButton ref={getDeleteButtonRef}
					              confirm={confirmDelete}
					              translations={this.props.formContext.translations}
					              onClick={that.onDelete(idx)} />
					}
				</td>
			);
		};

		const title = that.state.getTitle(that.state.activeIdx);

		return (
			<div>
				<Title title={title} label={title} className={titleClassName}/>
				<DescriptionField description={this.props.description}/>
				<Table hover={true} bordered={true} condensed={true} className="single-active-array-table">
					{items.length !== 1 || that.state.activeIdx !== 0 ? (
						<thead>
								<tr className="darker">
									{[
										...cols.map(col => <th key={col}>{schema.items.properties[col].title}</th>),
										<th key="_delete" className="single-active-array-table-delete" />
									]}
								</tr>
						</thead>
					) : null}
					<tbody>
						{items.map((item, idx) => {
							let className = (idx === activeIdx) ?
								"single-active-array-table-hidden" : // We hide the active row from table, but render it to keep table layout steady.
								undefined;
							if (errorSchema[idx]) className = className ? `${className} bg-danger` : "bg-danger";
							return [
								<tr key={idx} onClick={changeActive(idx)} className={className} tabIndex={0}>
									{[
										...cols.map(col => <td key={col}>{formatValue(formData[idx], col)}</td>),
										getDeleteButtonFor(idx)
									]}
								</tr>,
								(idx === activeIdx) ? <tr key="active" onClick={changeActive(idx)}>
									<td className={itemsClassNames} colSpan={cols.length}>{item.children}</td>
									{getDeleteButtonFor(idx)}
								</tr> : null
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
const headerFormatters = {
	units: {
		component: (props) => {
			const {that: {props: {formContext: {translations}, formData}}, idx} = props;
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

			map.addData({
				featureCollection: {type: "featureCollection", features: geometries},
				getFeatureStyle: () => {
					return {opacity: 0.6, color: "#888888"};
				},
				temp: true
			});
		},
		onMouseLeave: (that) => {
			const map = new Context(`${that.props.formContext.contextId}_MAP`).map;
			const lastData = map.data[map.data.length -1];
			if (lastData && lastData.temp) {
				map.removeData(map.data.length - 1);
			}
			that.hoveredIdx = undefined;
		}
	},
	namedPlace: {
		component: class NamedPlaceHeader extends Component {
			constructor(props) {
				super(props);
				this.state = {};
			}

			componentDidMount() {
				this.mounted = true;
				this.fetch(this.props);
			}

			componentWillUnmount() {
				this.mounted = false;
			}

			componentWillReceiveProps(props) {
				this.fetch(props);
			}

			fetch = (props) => {
				const {namedPlaceID} = props.that.props.formData[props.idx];
				if (namedPlaceID) new ApiClient().fetchCached(`/named-places/${namedPlaceID}`).then(response => {
					if (this.mounted && name !== this.state.name) this.setState({
						namedPlaceID,
						name: response.name
					});
				});
			}

			render() {
				const {name} = this.state;
				const {locality} = this.props.that.props.formData[this.props.idx];
				return <span className="text-muted">{!isEmptyString(name) ? name : locality}</span>;
			}
		}
	},
	lineTransect: {
		component: (props) => {
			const lineTransectFeature = {type:"Feature", properties: {}, geometry: {type: "MultiLineString", coordinates: props.that.props.formData.map(item => item.geometry.coordinates)}};
			const [start, end] = getLineTransectStartEndDistancesForIdx(lineTransectFeature, props.idx, 10);
			return props.idx !== undefined ? <span className="text-muted">{`(${start}-${end}m)`}</span> : null;
		}
	}
};

const tableFormatters = {
	unknownTaxon: (item, col, formatted, options) => {
		return (isEmptyString(item[col]) || item[options.idField]) ? formatted : <span>{formatted} <Glyphicon glyph="warning-sign" bsClass="glyphicon glyphicon-warning-sign text-warning" /></span>;
	}
};

class AccordionHeader extends Component {
	render() {
		const {that, idx} = this.props;
		const {props} = that;
		const {uiSchema, formContext} = props;
		const title = that.state.getTitle(idx);
		const onDelete = that.onDelete(idx);
		const popupData = that.state.popups[idx];

		// try both headerFormatters & headerFormatter for backward compatibility. TODO: Remove in future.
		const options = getUiOptions(uiSchema);
		let _headerFormatters = options.headerFormatters || options.headerFormatter || [];
		if (_headerFormatters && !Array.isArray(_headerFormatters)) _headerFormatters = [_headerFormatters];

		if (options.headerFormatter) {
			console.warn("laji-form warning: 'headerFormatter' is deprecated. Use 'headerFormatters' instead.");
		}

		const formatters = _headerFormatters.map(formatter => {
			if (headerFormatters[formatter]) return headerFormatters[formatter];
			else return {
				component: (props) => {
					return <span className="text-muted">{props.formData[formatter]}</span>;
				}
			};
		});

		const headerText = (
			<span>
				{title}
				{formatters.map((formatter, i) => {
					const {component: Formatter} = formatter;
					return (
						<span key={i}> <Formatter that={that} idx={idx} /></span>
					);
				})}
			</span>
		);

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

		const header = (
			<div className={this.props.className}
			     onClick={onHeaderClick}
				   onMouseEnter={onMouseEnter}
				   onMouseLeave={onMouseLeave} >
				<div className={this.props.wrapperClassName}>
					{headerText}
					{this.props.children}
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
}

class SplitArrayFieldTemplate extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				splitRule: PropTypes.shape({
					fieldPath: PropTypes.string.isRequired,
					rules: PropTypes.arrayOf(PropTypes.string).isRequired
				}).isRequired,
				uiOptions: PropTypes.arrayOf(PropTypes.object)
			})
		}).isRequired
	};

	render() {
		const {props} = this;
		const uiOptions = getUiOptions(props.uiSchema);

		const splitItems = [];
		for (let i = 0; i <= uiOptions.splitRule.rules.length; i++) {
			splitItems.push([]);
			if (!uiOptions.uiOptions[i]) uiOptions.uiOptions[i] = {};
		}

		for (let i = 0; i < props.formData.length; i++) {
			const value = parseJSONPointer(props.formData[i], uiOptions.splitRule.fieldPath) + "";
			let match = -1;

			for (let j = 0; j < uiOptions.splitRule.rules.length; j++) {
				if (value.match(uiOptions.splitRule.rules[j])) {
					match = j;
					break;
				}
			}
			if (match === -1) { match = splitItems.length - 1; }

			if (uiOptions.uiOptions[match].removable === false) {
				props.items[i].hasRemove = false;
			}
			splitItems[match].push(props.items[i]);
		}

		let startIdx = 0;

		return (
			<div>
				{splitItems.map((items, i) => {
					const idx = startIdx;
					startIdx = startIdx + items.length;
					const title = (i === 0) ? props.schema.title : "";

					return (<_ArrayFieldTemplate key={i}
										 {...this.props}
										 className={uiOptions.uiOptions[i].classNames}
										 title={uiOptions.uiOptions[i].title || title}
										 items={items}
										 startIdx={idx}
										 canAdd={uiOptions.uiOptions[i].addable}
										 uiSchema={{...props.uiSchema, "ui:options": uiOptions.uiOptions[i]}}/>
					);})}
			</div>
		);
	}
}
