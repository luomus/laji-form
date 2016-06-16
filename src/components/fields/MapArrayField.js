import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import MapComponent from "laji-map";
import Button from "../Button";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

export default class MapArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {...this.getStateFromProps(props), direction: "directionless"};
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

		let data = [];
		if (props.formData) props.formData.forEach((item) => {
			data.push({type: "Feature", properties: {}, geometry: item.wgs84Geometry});
		});

		let activeId = (this.state && this.state.activeId !== undefined) ? this.state.activeId : (data.length ? 0 : undefined);

		return {...props, schema, uiSchema, data, activeId, onChange: this.onItemChange};
	}

	onAdd = (e) => {
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		item.wgs84Geometry = e.data.geometry;
		let formData = this.props.formData;
		if (formData && formData.length) formData.push(item);
		else formData = [item];
		this.props.onChange(formData, {validate: false});
	}

	onRemove = (e) => {
		let splices = [];
		e.ids.sort().reverse().forEach((id) => {
			splices.push([id, 1]);
		});
		this.props.onChange(update(this.props.formData, {$splice: splices}));
	}

	onEdited = (e) => {
		let formData = this.props.formData;
		Object.keys(e.data).forEach( id => {
			let geoJSON = e.data[id];
			formData[id].wgs84Geometry = geoJSON.geometry;
		});
		this.props.onChange(formData);
	}

	onActiveChange = id => {
		this.setState({activeId: id, direction: "directionless"});
	}

	onActivatePrev = () => {
		let id = (this.state.data && this.state.data.length) ? this.state.activeId - 1 : undefined;
		if (id == -1) id = this.state.data.length - 1;
		this.refs.map.focusToLayer(id)
		this.setState({direction: "left"});
	}

	onActivateNext = () => {
		let id =(this.state.data && this.state.data.length) ? this.state.activeId + 1 : undefined;
		if (id !== undefined && id >= this.state.data.length) id = 0;
		this.refs.map.focusToLayer(id)
		this.setState({direction: "right"});
	}

	onItemChange = (formData) => {
		this.props.onChange(update(this.props.formData, {$splice: [[this.state.activeId, 1, formData]]}));
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
				this.onActiveChange(e.id);
				break;
		}
	}

	render() {
		const style = {
			map: {
				height: '600px'
			}
		}

		const buttonEnabled = this.state.data && this.state.data.length && this.state.activeId !== undefined;

		return (<div>
			<div style={style.map}>
				<MapComponent
					ref={"map"}
					data={this.state.data}
					activeId={this.state.activeId}
					longitude={60.171372}
					latitude={24.931275}
					zoom={13}
					onChange={this.onMapChange}
				/>
			</div>
			<Button disabled={!buttonEnabled} onClick={this.onActivatePrev}>Edellinen</Button>
			<Button disabled={!buttonEnabled} onClick={this.onActivateNext}>Seuraava</Button>
			{"[" + ((this.state.activeId !== undefined) ? this.state.activeId + 1 : 0) + "/" + ((this.state.data) ? this.state.data.length : 0) + "]"}
			<ReactCSSTransitionGroup transitionName={"map-array-" + this.state.direction} transitionEnterTimeout={300} transitionLeaveTimeout={300}>
				{this.renderSchemaField()}
			</ReactCSSTransitionGroup>
		</div>)
	}

	renderSchemaField = () => {
		let {formData, idSchema, errorSchema} = this.props;
		let id = this.state.activeId;

		let itemFormData = (formData && formData.length) ? formData[id] : undefined;
		let itemIdSchema = toIdSchema(this.state.schema, idSchema.id + "_" + id, this.props.registry.definitions);
		let itemErrorSchema = errorSchema ? errorSchema[id] : undefined;

		if (formData && formData.length > 0) return <SchemaField key={id} {...this.props} {...this.state} formData={itemFormData} idSchema={itemIdSchema} errorSchema={itemErrorSchema} />;
		return null
	}
}
