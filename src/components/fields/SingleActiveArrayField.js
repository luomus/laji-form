import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { Accordion, Panel, OverlayTrigger, Tooltip, Pager } from "react-bootstrap";
import { getUiOptions, hasData, focusById } from "../../utils";
import { DeleteButton } from "../components";
import { getButtons, onContainerKeyDown, onItemKeyDown } from "../ArrayFieldTemplate";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";

const headerFormatters = {
	units: {
		render: (that, idx, headerElem) => {
			const {props: {formContext: {translations}, formData}} = that;
			const item = formData[idx];
			const unitsLength = (item && item.units && item.units.hasOwnProperty("length")) ?
				item.units.filter(unit =>
					unit &&
					unit.identifications &&
					unit.identifications[0] &&
					unit.identifications[0].taxonID).length
				: 0;

			return (
				<span>
					{headerElem}
					<span className="text-muted">
						{` (${unitsLength} ${translations.unitsPartitive})`}
					</span>
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
			const map = new Context("MAP").map;
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
			const map = new Context("MAP").map;
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
				renderer: PropTypes.oneOf(["accordion", "pager"]),
				activeIdx: PropTypes.integer,
				addTxt: PropTypes.string
			})
		})
	}

	constructor(props) {
		super(props);
		this.deleteButtonRefs = {};
		this.state = {
			activeIdx: (props.formData && props.formData.length) ? 0 : undefined, 
			...this.getStateFromProps(props), popups: {}
		};
		this.AccordionArrayFieldTemplate = AccordionArrayFieldTemplate.bind(this);
		this.PagerArrayFieldTemplate = PagerArrayFieldTemplate.bind(this);
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
			ArrayFieldTemplate = this.AccordionArrayFieldTemplate;
		} else if (renderer === "pager") {
			ArrayFieldTemplate = this.PagerArrayFieldTemplate;
		} else {
			throw new Error(`Unknown renderer '${renderer}' for SingleActiveArrayField`);
		}

		const options = getUiOptions(this.props.uiSchema);
		const addLabel = options.hasOwnProperty("addTxt") ? 
			options.addTxt : this.props.formContext.translations.Add;

		const {registry: {fields: {ArrayField}}} = this.props;
		return (
				<ArrayField
					{...this.props}
					registry={{
						...this.props.registry,
						ArrayFieldTemplate
					}}
					uiSchema={{
						...this.props.uiSchema,
						"ui:field": undefined,
						"ui:options": {
							...this.props.uiSchema["ui:options"],
							renderDelete: false,
							buttons: [
								{
									fn: "add",
									className: "col-xs-12 laji-map-accordion-header",
									callbacker: (callback) => {this.onActiveChange(this.props.formData.length, callback);},
									label: addLabel
								}
							]
						}
					}}
				/>
		);
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
			focusById(`${that.props.idSchema.$id}_${idx}`);
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
			<ul ref="popup" className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.filter(hasData).join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

// 'this' is binded to SingleActiveArrayField class context.
function AccordionArrayFieldTemplate(arrayFieldTemplateProps) {
	this.renderAccordionHeader = renderAccordionHeader.bind(this);

	const buttons = getUiOptions(arrayFieldTemplateProps.uiSchema).buttons;
	const activeIdx = this.state.activeIdx;
	const title = this.props.schema.title;
	return (
			<div className="laji-form-single-active-array" onKeyDown={onContainerKeyDown({
				props: arrayFieldTemplateProps,
				insertCallforward: callback => this.onActiveChange(this.props.formData.length, callback),
				navigateCallforward: (callback, idx) => this.onActiveChange(idx, callback)
			})}>
				<Accordion onSelect={key => this.onActiveChange(key)} activeKey={activeIdx === undefined ? -1 : activeIdx}>
					{arrayFieldTemplateProps.items.map((item, idx) => (
						<Panel onKeyDown={onItemKeyDown(() => this.deleteButtonRefs[idx])(item)}
						       key={idx}
						       eventKey={idx}
						       header={this.renderAccordionHeader(idx, title, this.props.idSchema.$id)}
						       bsStyle={this.props.errorSchema[idx] ? "danger" : "default"}>
							{item.children}
						</Panel>
					))}
				</Accordion>
				{getButtons(buttons, arrayFieldTemplateProps)}
			</div>
	);
}

// 'this' is binded to SingleActiveArrayField class context.
function PagerArrayFieldTemplate(arrayTemplateFieldProps) {
	const {translations} = this.props.formContext;
	const buttons = getUiOptions(arrayTemplateFieldProps.uiSchema).buttons;
	const activeIdx = this.state.activeIdx;
	const title = this.props.schema.title || "";

	return (
		<div className="laji-form-single-active-array" onKeyDown={onContainerKeyDown({
			props: arrayTemplateFieldProps,
			insertCallforward: callback => this.onActiveChange(this.props.formData.length, callback),
			navigateCallforward:	(callback, idx) => this.onActiveChange(idx, callback),
		})}>
			<Panel header={
				<div className="laji-map-accordion-header">
					<Pager>
						<Pager.Item previous href="#"
						            disabled={activeIdx <= 0 || activeIdx === undefined}
						            onClick={() => this.onActiveChange(activeIdx - 1)}>
							&larr; {translations.Previous}</Pager.Item>
						{activeIdx !== undefined ? <div className="panel-title">{`${activeIdx + 1}. ${title}`}</div> : null}
						<Pager.Item next href="#"
						            disabled={activeIdx >= this.props.formData.length - 1 || activeIdx === undefined}
						            onClick={() => this.onActiveChange(activeIdx + 1)}>
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

// 'this' is binded to SingleActiveArrayField class context.
function renderAccordionHeader(idx, title, id) {
	const popupData = this.state.popups[idx];

	const formattedIdx = idx + 1;
	const _title = title ? `${title} ${formattedIdx}` : formattedIdx;
	const {headerFormatter} = getUiOptions(this.props.uiSchema);
	const headerTextElem = <span>{_title}</span>;
	const formatter = headerFormatters[headerFormatter];
	const headerText = formatter ? formatter.render(this, idx, headerTextElem) : headerTextElem;

	const header = (
		<div className="laji-map-accordion-header" onClick={() => {
			const {activeIdx} = this.state;
			this.onActiveChange(idx);
			formatter.onClick(this, idx);
		}}
			onMouseEnter={() => {if (formatter) formatter.onMouseEnter(this, idx);}}
			onMouseLeave={() => {if (formatter) formatter.onMouseLeave(this, idx);}} >
			<div className="panel-title">
				{headerText}
				<DeleteButton ref={elem => {this.deleteButtonRefs[idx] = elem;}}
											className="pull-right"
											confirm={true}
											translations={this.props.formContext.translations}
											onClick={this.onDelete(idx)} />
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

