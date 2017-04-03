import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { Accordion, Panel, OverlayTrigger, Tooltip, Pager } from "react-bootstrap";
import { getUiOptions, hasData } from "../../utils";
import { DeleteButton } from "../components";
import { getButtons, onContainerKeyDown, onItemKeyDown } from "../ArrayFieldTemplate";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";

const DELAY_FOCUS = 250;

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
				headerFormatters.units.onMouseLeave(that, idx);
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
			}).isRequired
		})
	}

	constructor(props) {
		super(props);
		this.deleteButtonRefs = {};
		this.state = { activeIdx: 0, ...this.getStateFromProps(props), popups: {}};
	}

	componentWillReceiveProps(props) {
		if (this.activateNew && props.formData.length !== this.props.formData.length) {
			this.activateNew = false;
			this.onActiveChange(props.formData.length - 1);
		}
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
		return this.renderers[renderer]();
	}

	renderers = {
		accordion: () => {
			const {registry: {fields: {ArrayField}}} = this.props;

			let activeIdx = this.state.activeIdx;
			if (activeIdx === undefined) activeIdx = -1;

			const title = this.props.schema.title;

			const options = getUiOptions(this.props.uiSchema);
			const addLabel = options.hasOwnProperty("addTxt") ? options.addTxt : this.props.formContext.translations.Add;

			const that = this;
			function AccordionArray(props) {
				const buttons = getUiOptions(props.uiSchema).buttons;
				buttons.forEach(button => {
					button.delayFocus = DELAY_FOCUS;
				});
				return (
						<div onKeyDown={onContainerKeyDown(
							props,
							callback => that.onActiveChange(that.props.formData.length, callback),
							(callback, idx) => that.onActiveChange(idx, callback),
							DELAY_FOCUS)
						}>
							<Accordion onSelect={key => that.onActiveChange(key)} activeKey={activeIdx}>
								{props.items.map((item, idx) => (
									<Panel onKeyDown={onItemKeyDown(() => that.deleteButtonRefs[idx])(item)}
												 key={idx}
												 eventKey={idx}
												 header={that.renderAccordionHeader(idx, title)}
												 bsStyle={that.props.errorSchema[idx] ? "danger" : "default"}>
										{item.children}
									</Panel>
								))}
							</Accordion>
							{getButtons(buttons, props)}
						</div>
				);
			}

			return (
					<ArrayField
						{...this.props}
						registry={{
							...this.props.registry,
							ArrayFieldTemplate: AccordionArray
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
		},
		pager: () => {
			const {registry: {fields: {ArrayField}}} = this.props;

			let activeIdx = this.state.activeIdx;
			if (activeIdx === undefined) activeIdx = -1;

			const title = this.props.schema.title;
			const {translations} =this.props.formContext;

			const options = getUiOptions(this.props.uiSchema);
			const addLabel = options.hasOwnProperty("addTxt") ? options.addTxt : translations.Add;

			const that = this;
			function PaginationArray(props) {
				const buttons = getUiOptions(props.uiSchema).buttons;

				return (
					<div onKeyDown={onContainerKeyDown(
						props,
						callback => that.onActiveChange(that.props.formData.length, callback),
						(callback, idx) => that.onActiveChange(idx, callback),
					)}>
						<Panel header={
							<div className="laji-map-accordion-header">
								<Pager>
									<Pager.Item previous href="#"
															disabled={activeIdx === 0}
															onClick={() => that.onActiveChange(activeIdx - 1)}>
										&larr; {translations.Previous}</Pager.Item>
									{activeIdx !== undefined ? <div className="panel-title">{`${activeIdx + 1}. ${title}`}</div> : null}
									<Pager.Item next href="#"
															disabled={activeIdx === that.props.formData.length - 1}
															onClick={() => that.onActiveChange(activeIdx + 1)}>
										{translations.Next}  &rarr;</Pager.Item>
								</Pager>
							</div>
						}>
							{props.items[activeIdx].children}
							{getButtons(buttons, props)}
						</Panel>
					</div>
				);
			}

			return (
				<ArrayField
					{...this.props}
					registry={{
						...this.props.registry,
						ArrayFieldTemplate: PaginationArray
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
	}

	renderAccordionHeader = (idx, title) => {
		const formattedIdx = idx + 1;
		const _title = title ? `${title} ${formattedIdx}` : formattedIdx;

		const {headerFormatter} = getUiOptions(this.props.uiSchema);

		const popupData = this.state.popups[idx];

		const headerTextElem = <span>{_title}</span>;

		const formatter = headerFormatters[headerFormatter];
		const headerText = formatter ? formatter.render(this, idx, headerTextElem) : headerTextElem;

		const header = (
			<div className="laji-map-accordion-header" onClick={() => {
				this.onActiveChange(idx);
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

		const {onActiveChange} = getUiOptions(this.props.uiSchema);
		onActiveChange ? onActiveChange(idx, callback) : this.setState({activeIdx: idx}, callback);
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
