import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { Accordion, Panel, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, hasData } from "../../utils";
import { DeleteButton } from "../components";
import Context from "../../Context";

const headerFormatters = {
	units: {
		render: (that, idx, headerElem) => {
			const {props: {formContext: {translations}}, state: {formData}} = that;
			const item = formData[idx];
			const unitsLength = (item && item.units && item.units.hasOwnProperty("length")) ? item.units.length : 0;

			function onMouseEnter() {
				if (idx === that.state.activeIdx) return;
				const map = new Context("MAP").map;
				const gatheringGeometries = (item && item.wgs84GeometryCollection) ? item.wgs84GeometryCollection.geometries : [];

				const unitGeometries = (item.units || [])
					.filter(unit => unit.unitGathering && hasData(unit.unitGathering.wgs84Geometry))
					.map(unit => unit.unitGathering.wgs84Geometry);

				const geometries = [...gatheringGeometries, ...unitGeometries]
					.map(geometry => {return {type: "Feature", properties: {}, geometry}});

				map.setData({
					featureCollection: {type: "featureCollection", features: geometries},
					getFeatureStyle: () => {return {opacity: 0.6, color: "#888888"}}
				});
			}

			function onMouseLeave() {
				const map = new Context("MAP").map;
				map.setData();
			}

			return (
				<span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
					{headerElem}
					<span className="text-muted" >
						{` (${unitsLength} ${translations.unitsPartitive})`}
					</span>
				</span>
			)
		}
	}
};

const popupMappers = {
	units: (schema, units, fieldName) => {
		return {[(schema.units ? schema.units.title : undefined) || fieldName]: units.map(unit => unit.informalNameString)};
	}
}

export default class AccordionArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {activeIdx: 0, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
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
		const {title, ...schema} = itemsSchema;
		schema.title = "";

		function AddButton({onClick, disabled}) {
			return (
				<div className="row">
					<p className="col-xs-2 col-xs-offset-10 array-item-add text-right">
						<button type="button" className="btn btn-info col-xs-12"
										tabIndex="-1" onClick={onClick}
										disabled={disabled} style={{fontWeight: "bold"}}>➕</button>
					</p>
				</div>
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
				}).map((comp, i) => <Panel key={i} header={this.renderHeader(i, title)} eventKey={i}>{comp}</Panel>)}
			</Accordion>
			<AddButton
				onClick={() => {
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

		const popupData = this.getPopupData(idx);

		const header =  <span>{_title}</span>;
		const headerText = headerFormatter ? headerFormatters[headerFormatter].render(this, idx, header) : header;

		return (
			<div>
				{hasData(popupData) ? (
					<OverlayTrigger placement="bottom"
													overlay={<Tooltip id={"nav-tooltip-" + idx}><Popup data={popupData} /></Tooltip>} >
						{headerText}
					</OverlayTrigger>) : (
					headerText
					)
				}
				<DeleteButton className="pull-right"
				              confirm={true}
				              translations={this.props.formContext.translations}
				              onClick={this.onDelete(idx)} />
			</div>
		);
	}

	getPopupData = (idx) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);

		const data = {};
		if (!this.state.formData) return data;
		popupFields.forEach(field => {
			const fieldName = field.field;
			const itemFormData = this.state.formData[idx];
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			let fieldSchema = this.props.schema.items.properties;

			if (field.mapper && fieldData) {
				const mappedData = popupMappers[field.mapper](fieldSchema, fieldData, fieldName);
				for (let label in mappedData) {
					data[label] = mappedData[label];
				}
			} else if (fieldData) {
				data[fieldSchema[fieldName].title || fieldName] = fieldData;
			}

		});
		return data;
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

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
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
	}

	onDelete = (idx) => () => {
		const formData = update(this.state.formData, {$splice: [[idx, 1]]});
		if (!formData.length) this.onActiveChange(undefined);
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
