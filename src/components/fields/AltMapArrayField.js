import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import equals from "deep-equal";
import LajiMap, { NORMAL_COLOR } from "laji-map";
import { Row, Col } from "react-bootstrap";
import { getUiOptions, getInnerUiSchema, hasData } from "../../utils";
import { shouldRender, getDefaultFormState } from  "react-jsonschema-form/lib/utils";

const popupMappers = {
	units: (schema, units, fieldName) => {
		return {[(schema.units ? schema.units.title : undefined) || fieldName]: units.map(unit => unit.informalNameString)};
	}
}

export default class AltMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {activeIdx: props.formData.length ? 0 : undefined};
	}

	render() {
		const {formData, registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, popupOffset} = options;
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...options,
				activeIdx: this.state.activeIdx, onActiveChange: idx => {this.setState({activeIdx: idx})}
			}
		};

		const geometries = this.state.activeIdx !== undefined ?
			formData[this.state.activeIdx].wgs84GeometryCollection.geometries :	[];

		return (
			<div>
				<Row>
					<Col xs={6} sm={6} md={6} lg={6}>
						<MapComponent
							drawData={{
								featureCollection: {
									type: "featureCollection",
									features: (geometries || []).map(geometry => {return {type: "Feature", properties: {}, geometry}})
								},
								getPopup: this.getPopup,
								getFeatureStyle: () => {return {color: NORMAL_COLOR, fillColor: NORMAL_COLOR}}
							}}
							onChange={this.onMapChange}
						  markerPopupOffset={(popupOffset || 0) + 40}
							featurePopupOffset={popupOffset}
						/>
					</Col>
					<Col xs={6} sm={6} md={6} lg={6}>
						<SchemaField {...this.props} uiSchema={uiSchema} />
					</Col>
				</Row>
				{popupFields ?
					<div style={{display: "none"}}>
						<Popup data={this.getPopupData(this.state.popupIdx)} ref="popup"/>
					</div> : null}
			</div>
		);
	}

	onMapChange = (events) => {
		events.forEach(e => {
			switch (e.type) {
				case "create":
					this.onAdd(e);
					break;
				case "delete":
					this.onRemove(e);
					break;
				case "edit":
					this.onEdited(e);
					break;
			}
		});

	}

	onAdd = ({feature: {geometry}}) => {
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {wgs84GeometryCollection: {geometries: {$push: [geometry]}}}}));
	}

	onRemove = (e) => {
		let splices = [];
		e.idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {wgs84GeometryCollection: {geometries: {$splice: splices}}}}));
	}

	onEdited = ({features}) => {
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {wgs84GeometryCollection: {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			}}}));
	}

	getPopup = (idx, openPopupCallback) => {
		if (!this.refs.popup || !hasData(this.getPopupData(idx))) return;
		this.setState({popupIdx: idx}, () => openPopupCallback(this.refs.popup.refs.popup));
	}

	getPopupData = (idx) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);

		const data = {};
		if (!this.props.formData) return data;
		popupFields.forEach(field => {
			const fieldName = field.field;
			const itemFormData = this.props.formData[idx];
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
}

class Popup extends Component {
	render() {
		const { data } = this.props;
		return (data && Object.keys(data).length) ? (
			<ul ref="popup" className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

class MapComponent extends Component {
	componentDidMount() {
		this.map = new LajiMap({
			...this.props,
			rootElem: this.refs.map
		});
	}

	componentWillReceiveProps(props) {
		if (this.map) {
			this.map.setDrawData(props.drawData);
			this.map.setActive(this.map.idxsToIds[props.activeIdx]);
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		function relevantProps(props) {
			const {drawData, onChange, ..._props} = props;
			return _props;
		}

		return shouldRender(
			{props: relevantProps(this.props), state: this.state},
			relevantProps(nextProps),
			nextState
		);
	}

	render() {
		return (<div className={"laji-form-map " +this.props.className} style={this.props.style} ref="map" />);
	}
}
