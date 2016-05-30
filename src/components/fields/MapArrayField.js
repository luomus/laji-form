import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import MapComponent from "laji-map";
import Button from "../Button";

export default class MapArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {activeId: undefined, idsToIdxs: {}, ...this.getStateFromProps(props)};

		let initialData = [];
		if (this.props.formData) this.props.formData.forEach((item) => {
			initialData.push({type: "Feature", properties: {}, geometry: item.wgs84Geometry});
		});
		this.initialData = initialData;
	}



	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	//formData && idSchema are computed in renderSchemaField(), because they are dependent of state.
	getStateFromProps = (props) => {
		let {uiSchema, schema} = props;

		schema = schema.items;
		delete schema.properties.wgs84Geometry;

		uiSchema = uiSchema.items;
		let order = uiSchema["ui:order"];
		if (order) {
			uiSchema = update(uiSchema, {"ui:order": {$splice: [[order.indexOf("wgs84Geometry"), 1]]}})
		}

		return {...props, schema, uiSchema, onChange: this.onItemChange};
	}

	componentDidMount() {
		['deletestart', 'editstart'].forEach(start => this.refs.map.map.on('draw:' + start, e => {
			this.preventActivatingByClick = true;
		}));
		['deletestop', 'editstop'].forEach(stop => this.refs.map.map.on('draw:' + stop, e => {
			this.preventActivatingByClick = false;
		}));
	}

	getInitialIds = ids => {
		let idsToIdxs = {};
		for (let i = 0; i < ids.length; i++) {
			idsToIdxs[ids[i]]  = i;
		}
		this.setState({
			activeId: parseInt(Object.keys(idsToIdxs)[0]),
			idsToIdxs
		});
	}

	onAdd = (e) => {
		let id = e.id;
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		item.wgs84Geometry = e.data.geometry;
		let formData = this.props.formData;
		if (formData && formData.length) formData.push(item);
		else formData = [item];
		this.props.onChange(formData, {validate: false});

		let idsToIdxs = this.state.idsToIdxs;
		let arrayIdx = formData.length - 1;
		idsToIdxs[id] = arrayIdx;

		this.setState({idsToIdxs});
		this.setActive(id);
	}

	onRemove = (e) => {
		let splices = [];
		let idsToIdxs = JSON.parse(JSON.stringify(this.state.idsToIdxs));
		let ids = Object.keys(idsToIdxs).map(i => {return parseInt(i)});
		e.ids.forEach((id) => {
			let idx = idsToIdxs[id];
			splices.push([idx, 1]);

			for (let idKey = ids.indexOf(id) + 1; idKey < ids.length; idKey++) {
				let id = ids[idKey];
				idsToIdxs[id] = idsToIdxs[id] - 1;
			}
			delete idsToIdxs[id];
		});
		this.props.onChange(update(this.props.formData, {$splice: splices}));

		let activeId = this.state.activeId;
		if (e.ids.indexOf(activeId) >= 0) {
			let activeIdIdx = this.state.idsToIdxs[activeId];
			let ids = Object.keys(idsToIdxs).map(i => {return parseInt(i)});
			if (ids.length === 0) {
				activeId = undefined;
			}
			if (activeIdIdx === 0) {
				activeId = ids[0];
			} else {
				let origIds = Object.keys(this.state.idsToIdxs).map(i => {return parseInt(i)});

				function findByI(i) {
					let id = origIds[i];
					if (ids.indexOf(id) >= 0) {
						activeId = id;
						return true;
					}
				}
				for (let i = origIds.indexOf(activeId); i >= 0; i--) {
					if (findByI(i)) break;
				}
				for (let i = origIds.indexOf(activeId); i < origIds.length; i++) {
					if (findByI(i)) break;
				}
			}
			this.setState({idsToIdxs});
			this.setActive(activeId)
		}
	}

	onEdited = (e) => {
		let formData = this.props.formData;
		Object.keys(e.data).forEach( id => {
			let geoJSON = e.data[id];
			let idx = this.state.idsToIdxs[id];
			formData[idx].wgs84Geometry = geoJSON.geometry;
		});
		this.props.onChange(formData);
	}

	setActive = id => {
		this.setState({activeId: id});
		this.setViewTo(id);
	}

	setViewTo = id => {
		if (id === undefined) return;

		let layer = this.refs.map.drawnItems._layers[id];

		if (!layer) return;

		let map = this.refs.map.map;

		if (layer.getLatLng) {
			map.setView(layer.getLatLng())
		} else if (layer.getBounds) {
			map.fitBounds(layer.getBounds());
		}
	}

	onActivatePrev = () => {
		let ids = Object.keys(this.state.idsToIdxs).map( i => {return parseInt(i)});
		let idx = ids.indexOf(this.state.activeId) - 1;
		if (idx == -1) idx = ids.length - 1;
		this.setActive(ids[idx])
	}

	onActivateNext = () => {
		let ids = Object.keys(this.state.idsToIdxs).map( i => {return parseInt(i)});
		let idx = ids.indexOf(this.state.activeId) + 1;
		if (idx >= ids.length) idx = 0;
		this.setActive(ids[idx])
	}

	onItemChange = (formData) => {
		this.props.onChange(update(this.props.formData, {$splice: [[this.state.idsToIdxs[this.state.activeId], 1, formData]]}));
	}

	onMapChange = (e) => {
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
			case "active":
				this.setActive(e)
				break;
		}
	}

	onFeatureClick = id => {
		if (!this.preventActivatingByClick) {
			this.setActive(id);
		}
	}

	render() {
		const style = {
			map: {
				height: '600px'
			}
		}

		return (<div>
			<div style={style.map}>
				<MapComponent
					ref={"map"}
					data={this.initialData}
					longitude={60.171372}
					latitude={24.931275}
					zoom={13}
					getInitialIds={this.getInitialIds}
					onChange={this.onMapChange}
					onFeatureClick={this.onFeatureClick}/>
			</div>
			<Button disabled={!(this.props.formData && this.props.formData.length)} onClick={this.onActivatePrev}>Edellinen</Button>
			<Button disabled={!(this.props.formData && this.props.formData.length)} onClick={this.onActivateNext}>Seuraava</Button>
			{this.renderSchemaField()}
		</div>)
	}

	renderSchemaField = () => {
		let {formData, idSchema} = this.props;
		let idx = this.state.idsToIdxs[this.state.activeId];

		let itemFormData = formData && formData.length ? formData[idx] : undefined;
		let itemIdSchema = toIdSchema(this.state.schema, idSchema.id + "_" + idx, this.props.registry.definitions);

		if (formData && formData.length > 0) return <SchemaField {...this.props} {...this.state} formData={itemFormData} idSchema={itemIdSchema} />;
		return null
	}
}
