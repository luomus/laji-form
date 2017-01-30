import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { Accordion, Panel, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, hasData } from "../../utils";
import { DeleteButton } from "../components";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";

const headerFormatters = {
	units: {
		render: (that, idx, headerElem) => {
			const {props: {formContext: {translations}}, state: {formData}} = that;
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
			)
		},
		onClick: (that, idx) => {
			if (that.state.activeIdx === idx) {
				headerFormatters.units.onMouseEnter(that, idx, !!"use the force");
			} else {
				headerFormatters.units.onMouseLeave(that, idx);
			}
		},
		onMouseEnter: (that, idx, force) => {
			const {state: {formData}} = that;
			const item = formData[idx];

			that.hoveredIdx = idx;
			if (!force && idx === that.state.activeIdx) return;
			const map = new Context("MAP").map;
			const gatheringGeometries = (item && item.geometry) ? item.geometry.geometries : [];

			const unitGeometries = (item.units || [])
				.filter(unit => unit.unitGathering && hasData(unit.unitGathering.geometry))
				.map(unit => unit.unitGathering.geometry);

			const geometries = [...gatheringGeometries, ...unitGeometries]
				.map(geometry => {
					return {type: "Feature", properties: {}, geometry}
				});

			map.setData({
				featureCollection: {type: "featureCollection", features: geometries},
				getFeatureStyle: () => {
					return {opacity: 0.6, color: "#888888"}
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
				resolve({[(schema.units ? schema.units.title : undefined) || fieldName]: result})
			})
		});
	}
};

@BaseComponent
export default class AccordionArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {...this.getStateFromProps(props), activeIdx: 0, popups: {}};
	}

	componentWillReceiveProps(props) {
		props.formData.forEach((item, idx) => {
			this.getPopupDataPromise(idx, item).then(popupData => {
				this.setState({popups: {...this.state.popups, [idx]: popupData}})
			});
		});
	}

	getStateFromProps(props) {
		const state = {};
		const options = getUiOptions(props.uiSchema);
		if (options.hasOwnProperty("activeIdx")) state.activeIdx = options.activeIdx;

		state.formData = props.formData || [getDefaultFormState(props.schema.items, undefined, props.registry)];

		return state;
	}


	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		const {formData} = this.state;

		let activeIdx = this.state.activeIdx;
		if (activeIdx === undefined) activeIdx = -1;

		const itemsSchema = this.props.schema.items;
		const schema = {...itemsSchema, title: ""};
		const title = this.props.schema.title;

		const options = getUiOptions(this.props.uiSchema);
		const addText = options.hasOwnProperty("addTxt") ? options.addTxt : this.props.formContext.translations.Add;

		function AddButton({onClick, disabled}) {
			return (
						<button type="button" className="btn btn-info col-xs-12 laji-map-accordion-header"
										tabIndex="-1" onClick={onClick}
										disabled={disabled} style={{fontWeight: "bold"}}>{`➕ ${addText}`}</button>
			);
		}

		return (<div>
			<Accordion onSelect={this.onActiveChange} activeKey={activeIdx}>
				{(formData || []).map((item, idx) => {
					let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
					return (
						<SchemaField
						{...this.props}
						formData={item}
						onChange={this.onChangeForIdx(idx)}
						schema={schema}
						uiSchema={this.props.uiSchema.items}
						idSchema={toIdSchema(schema, itemIdPrefix, this.props.registry.definitions)}
						errorSchema={this.props.errorSchema[idx]} />
					);
				}).map((comp, idx) => <Panel key={idx} bsStyle={this.props.errorSchema[idx] ? "danger" : "default"}
				                           header={this.renderHeader(idx, title)} eventKey={idx}>{comp}</Panel>)}
			</Accordion>
			<AddButton
				onClick={() => {
					this.onActiveChange(this.props.formData.length);
					this.props.onChange([
						...this.state.formData,
						getDefaultFormState(schema, undefined, this.props.registry)
					])
				}} />
		</div>);
	}

	renderHeader = (idx, title) => {
		const formattedIdx = idx + 1;
		const _title = title ? `${title} ${formattedIdx}` : formattedIdx;

		const {headerFormatter} = getUiOptions(this.props.uiSchema);

		const popupData = this.state.popups[idx];

		const headerTextElem = <span>{_title}</span>;

		const formatter = headerFormatters[headerFormatter];
		const headerText = formatter ? formatter.render(this, idx, headerTextElem) : headerTextElem;

		const header = (
			<div className="laji-map-accordion-header" onClick={() => {this.onActiveChange(idx); formatter.onClick(this, idx);}}
			     onMouseEnter={() => formatter.onMouseEnter(this, idx)} onMouseLeave={() => formatter.onMouseLeave(this, idx)}>
				<div className="panel-title">
					{headerText}
					<DeleteButton className="pull-right"
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

		if (!this.state.formData) return new Promise(resolve => resolve({}));

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
				})
				return popup;
			}, {});
			return new Promise(resolve => resolve(popupData));
		});
	}

	onActiveChange = (idx) => {
		if (idx !== undefined)  {
			idx = parseInt(idx);
		}
		if (this.state.activeIdx === idx) {
			idx = undefined;
		}

		const {onActiveChange} = getUiOptions(this.props.uiSchema);
		onActiveChange ? onActiveChange(idx) : this.setState({activeIdx: idx});
	}

	onChangeForIdx = (idx) => (itemFormData) => {
		if (!this.state.formData || idx === this.state.formData.length) {
			itemFormData = {
				...getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions),
				...itemFormData
			}
		}

		let formData = this.state.formData;
		if (!formData) formData = [];
		formData = update(formData, {$merge: {[idx]: itemFormData}});
		this.props.onChange(formData);
	}

	onDelete = (idx) => () => {
		const formData = update(this.state.formData, {$splice: [[idx, 1]]});
		if (!formData.length) this.onActiveChange(undefined);
		if (this.state.activeIdx >= formData.length) this.onActiveChange(formData.length - 1);
		this.props.onChange(formData)
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
