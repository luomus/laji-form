import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils";
import LajiMap from "laji-map";
import Button from "../Button";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import { Pagination, Row } from "react-bootstrap";

export default class MapArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				inlineProperties: PropTypes.arrayOf(PropTypes.string),
				colType: PropTypes.string
			})
		}).isRequired
	}

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

		let activeIdx = (this.state && this.state.activeIdx !== undefined) ? this.state.activeIdx : (data.length ? 0 : undefined);

		return {...props, schema, uiSchema, data, activeIdx, onChange: this.onItemChange};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onAdd = (e) => {
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		item.wgs84Geometry = e.data.geometry;
		let formData = this.props.formData;
		if (formData && formData.length) formData.push(item);
		else formData = [item];
		return {propsChange: formData};
	}

	onRemove = (e) => {
		let splices = [];
		e.idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		return {propsChange: update(this.props.formData, {$splice: splices})};
	}

	onEdited = (e) => {
		let formData = this.props.formData;
		Object.keys(e.data).forEach( idx => {
			let geoJSON = e.data[idx];
			formData[idx].wgs84Geometry = geoJSON.geometry;
		});
		return {propsChange: formData};
	}

	onActiveChange = idx => {
		let state = {activeIdx: idx};
		if (this.controlledActiveChange) {
			this.controlledActiveChange = false;
		} else {
			state.direction = "directionless";
			if (this.state.activeIdx !== undefined) state.direction = (idx > this.state.activeIdx) ? "right" : "left";
		}
		return {state};
	}

	focusToLayer = (idx) => {
		this.controlledActiveChange = true;
		this.setState({direction: (idx > this.state.activeIdx) ? "right" : "left"});
		this.refs.map.map.focusToLayer(idx)
	}

	onItemChange = (formData) => {
		let newFormData = formData;
		if (this.props.uiSchema["ui:options"].inlineProperties) {
			newFormData = this.props.formData[this.state.activeIdx];
			for (let prop in formData) {
				newFormData = update(newFormData, {[prop]: {$set: formData[prop]}});
			}
		}
		this.props.onChange(update(this.props.formData, {$splice: [[this.state.activeIdx, 1, newFormData]]}));
	}

	onMapChange = (events) => {
		let propsChange = undefined;
		let state = undefined;

		function mergeEvent(change) {
			if (change.state) {
				if (!state) state = change.state;
				state = merge(state, change.state);
			}
			if (change.propsChange) {
				if (!state) propsChange = change.propsChange;
				propsChange = merge(propsChange, change.propsChange);
			}
		}

		events.forEach(e => {
			switch (e.type) {
				case "create":
					mergeEvent(this.onAdd(e));
					break;
				case "delete":
					mergeEvent(this.onRemove(e));
					break;
				case "edit":
					mergeEvent(this.onEdited(e));
					break;
				case "active":
					mergeEvent(this.onActiveChange(e.idx));
					break;
			}
		});

		const that = this;
		function onChange() {
			if (propsChange) that.props.onChange(propsChange);
		}

		state ? this.setState(state, () => { onChange(); }) : onChange();
	}

	render() {
		const options = this.props.uiSchema["ui:options"];
		const hasInlineProps = options && options.inlineProperties && options.inlineProperties.length;
		const colType = options && options.colType;

		const buttonEnabled = this.state.data && this.state.data.length > 1 && this.state.activeIdx !== undefined;

		const description = options.description;

		return (<div>
			<TitleField title="Kartta" />
			{description !== undefined ? <DescriptionField description={description} /> : null}
			{buttonEnabled ? <Pagination
				className="container"
				activePage={this.state.activeIdx + 1}
				items={(this.state.data) ? this.state.data.length : 0}
				next={true}
				prev={true}
				boundaryLinks={true}
				maxButtons={5}
				onSelect={i => {this.focusToLayer(i - 1)}}
			/> : null}
			<Row>
				<div className={"laji-form-map" + (hasInlineProps ? " col-" + colType + "-6" : "")}>
					<MapComponent
						ref={"map"}
						data={this.state.data}
						activeIdx={this.state.activeIdx}
						locate={true}
						longitude={60.171372}
						latitude={24.931275}
						zoom={13}
						onChange={this.onMapChange}
					  lang={this.props.registry.lang}
					/>
				</div>

				<ReactCSSTransitionGroup transitionName={"map-array-" + this.state.direction} transitionEnterTimeout={300} transitionLeaveTimeout={300}>
						{hasInlineProps ? this.renderInlineSchemaField() : null}
					<p />
						{this.renderSchemaField()}
				</ReactCSSTransitionGroup>
			</Row>

	</div>)
	}

	getSchemaForFields = (fields, isInline) => {
		let {formData, idSchema, errorSchema} = this.props;
		let idx = this.state.activeIdx;

		let itemSchemaProperties = {};
		let itemFormData = (formData && formData.length && idx !== undefined) ? {} : undefined;
		let itemErrorSchema = {};
		fields.forEach(prop => {
			itemSchemaProperties[prop] = this.state.schema.properties[prop];
			if (itemFormData && formData[idx].hasOwnProperty(prop)) itemFormData[prop] = formData[idx][prop];
			if (errorSchema && errorSchema[idx]) itemErrorSchema[prop] = errorSchema[idx][prop];
		});
		let itemSchema = update(this.state.schema, {properties: {$set: itemSchemaProperties}});
		delete itemSchema.title;
		let itemIdSchema = toIdSchema(this.state.schema, idSchema.$id + "_" + idx, this.props.registry.definitions);

		let uiSchema = isInline ? this.props.uiSchema["ui:options"].inlineUiSchema : this.state.uiSchema;

		const options = this.props.uiSchema["ui:options"];
		const colType = options && options.colType;

		const SchemaField = this.props.registry.fields.SchemaField;
		
		return (itemFormData) ?
			(<div key={idx + (isInline ? "-inline" : "-default")} className={isInline ? "col-" + colType + "-6" : "col-xs-12"}>
				<SchemaField  {...this.props} {...this.state} schema={itemSchema} formData={itemFormData} idSchema={itemIdSchema} errorSchema={itemErrorSchema} uiSchema={uiSchema} name={undefined}/>
			</div>) :
			null;
	}

	renderInlineSchemaField = () => {
		return this.getSchemaForFields(this.props.uiSchema["ui:options"].inlineProperties, !!"is inline");
	}

	renderSchemaField = () => {
		const allFields = Object.keys(this.state.schema.properties);
		let inlineFields = this.props.uiSchema["ui:options"].inlineProperties;
		return this.getSchemaForFields(inlineFields ? allFields.filter(field => !inlineFields.includes(field)) : allFields);
	}
}

class MapComponent extends Component {
	componentDidMount() {
		this.map = new LajiMap({
			...this.props,
			rootElem: document.getElementById("laji-map")
		});
	}

	render() {
		return (<div id="laji-map" />);
	}
}
