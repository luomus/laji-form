import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import equals from "deep-equal";
import LajiMap, { NORMAL_COLOR } from "laji-map";
import { Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getUiOptions, getInnerUiSchema, hasData, getUpdateObjectFromPath } from "../../utils";
import { GlyphButton } from "../components";
import { shouldRender, getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import Context from "../../Context";

const popupMappers = {
	units: (schema, units, fieldName) => {
		return {[(schema.units ? schema.units.title : undefined) || fieldName]: units.map(unit => unit.informalNameString)};
	}
}

const geometryMappers = {
	units: (idx, formData) => {
		const item = formData[idx];
		let geometries = idx !== undefined ?
			item.wgs84GeometryCollection.geometries : [];
		item.units.forEach(unit => {
			const {unitGathering: {wgs84Geometry}} = unit;
			if (wgs84Geometry && hasData(wgs84Geometry)) {
				geometries = [...geometries, wgs84Geometry];
			}
		});
		return geometries;
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
		const {popupFields, geometryMapper} = options;
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...getUiOptions(getInnerUiSchema(uiSchema)),
				activeIdx: this.state.activeIdx,
				onActiveChange: idx => {this.setState({activeIdx: idx})},
				getPopupData: this.getPopupData
			}
		};

		const geometries = geometryMappers[geometryMapper](this.state.activeIdx, formData);

		return (
			<div>
				<Row>
					<Col xs={6} sm={6} md={6} lg={6}>
						{this.state.detachUnitMode ?
							<div className="pass-block">
								<Panel>
									<span>{translations.DetachUnitHelp}</span>
									<Button bsStyle="default" onClick={this.stopDetach}>{translations.Cancel}</Button>
								</Panel>
							</div> : null}
						<MapComponent
							lang="fi"
							drawData={{
								featureCollection: {
									type: "featureCollection",
									features: (geometries || []).map(geometry => {return {type: "Feature", properties: {}, geometry}})
								},
								getPopup: this.getPopup,
								getFeatureStyle: () => {return {color: NORMAL_COLOR, fillColor: NORMAL_COLOR}}
							}}
							onChange={this.onMapChange}
						  markerPopupOffset={45}
							featurePopupOffset={5}
						  popupOnHover={true}
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
					const item = mappedData[label];
					if (hasData(item)) data[label] = item;
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
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.map = new LajiMap({
			...this.props,
			rootElem: this.refs.map
		});
		const _context = new Context("MAP");
		_context.map = this.map;
		_context.grabFocus = this.grabFocus;
		_context.releaseFocus = this.releaseFocus;
	}

	componentWillReceiveProps(props) {
		if (this.map) {
			this.map.setDrawData(props.drawData);
			this.map.setActive(this.map.idxsToIds[props.activeIdx]);
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		function relevantProps(props) {
			const {drawData, onChange, ...relevantProps} = props;
			return relevantProps;
		}

		return shouldRender(
			{props: relevantProps(this.props), state: this.state},
			relevantProps(nextProps),
			nextState
		);
	}

	grabFocus = () => {
		const mainContext = new Context();
		mainContext.pushBlockingLoader();
		this.setState({className: "pass-block"});
	}

	releaseFocus = () => {
		const mainContext = new Context();
		mainContext.popBlockingLoader();
		this.setState({className: undefined});
	}

	render() {
		return (<div className={`laji-form-map ${this.props.className || ""} ${this.state.className || ""}`}
		             style={this.props.style} ref="map" />);
	}
}
