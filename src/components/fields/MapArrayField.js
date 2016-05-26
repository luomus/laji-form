import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import MapComponent from "laji-map";
import Button from "../Button";

export default class MapArrayField extends Component {
	constructor(props) {
		super(props);

		let mapItems = [];
		let idsToIdxs = {};
		if (props.formData) props.formData.forEach((item, i) => {
			mapItems.push({id: i});
			idsToIdxs[i] = i;
		})
		this.state = {
			activeId: (props.formData && props.formData && Array.isArray(props.formData)) ? 0 : undefined,
			mapItems,
			idsToIdxs
		};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	//formData && idSchema are computed in renderSchemaField(), because they are dependent of state.
	getStateFromProps = (props) => {
		let {uiSchema, schema} = props;

		schema = schema.items;
		uiSchema = uiSchema.items;
		return {...props, schema, uiSchema, onChange: this.onChange};
	}

	onAdd = (id) => {
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		let formData = this.props.formData;
		if (formData && formData.length) formData.push(item);
		else formData = [item];
		this.props.onChange(formData, {validate: false});

		let idMap = this.state.idsToIdxs;
		let arrayIdx = formData.length - 1;
		idMap[id] = arrayIdx;
		this.setState({idsToIdxs: idMap});
	}

	onRemove = (id) => {
		let idsToIdxs = this.state.idsToIdxs;
		let idx = idsToIdxs[id];
		this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}));

		let ids = Object.keys(idsToIdxs).map((i) => {return parseInt(i)});
		let state = {};

		for (let idKey = ids.indexOf(id) + 1; idKey < ids.length; idKey++) {
			let id = ids[idKey];
			idsToIdxs[id] = idsToIdxs[id] - 1;
		}
		delete idsToIdxs[id];

		state.idsToIdxs = idsToIdxs;

		this.setState(state)
	}

	onActiveChanged = (id) => {
		this.setState({activeId: id});
	}

	setActive = (id) => {
		this.refs.map.onActiveChanged(id);
	}

	onActivatePrev = () => {
		let ids = Object.keys(this.state.idsToIdxs).map((i) => {return parseInt(i)});;
		this.setActive(ids[ids.indexOf(this.state.activeId) - 1])
	}

	onActivateNext = () => {
		let ids = Object.keys(this.state.idsToIdxs).map((i) => {return parseInt(i)});;
		this.setActive(ids[ids.indexOf(this.state.activeId) + 1])
	}

	onChange = (formData) => {
		this.props.onChange(update(this.props.formData, {$splice: [[this.state.idsToIdxs[this.state.activeId], 1, formData]]}));
	}

	render() {
		const style = {
			map: {
				width: '800px',
				height: '600px',
			}
		}

		const data = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.94117255463528,60.17994558364109],[24.94743538755845,60.17436615002091]]}}]}'
		function handleChange (e) {
			console.log(e.type, JSON.stringify(e.data));
		}

		return (<div>
			<div style={style.map}>
				<MapComponent
					data={JSON.parse(data)}
					longitude={60.4353462}
					latitude={22.2285623}
					zoom={6}
					onChange={handleChange} />
			</div>
			<Button disabled={this.state.activeId === undefined || this.state.idsToIdxs[this.state.activeId] === 0}
			        onClick={this.onActivatePrev}>Edellinen</Button>
			<Button disabled={this.state.activeId === undefined || (this.props.formData && this.state.idsToIdxs[this.state.activeId] === this.props.formData.length - 1)}
			        onClick={this.onActivateNext}>Seuraava</Button>
			{this.renderSchemaField()}
		</div>)
	}

	renderSchemaField = () => {
		let {formData, idSchema} = this.props;
		let idx = this.state.idsToIdxs[this.state.activeId];

		let itemFormData = formData && formData.length ? formData[idx] : undefined;
		let itemIdSchema = toIdSchema(this.state.schema, idSchema.id + "_" + idx, this.props.registry.definitions);

		if (formData) return <SchemaField {...this.props} {...this.state} formData={itemFormData} idSchema={itemIdSchema} />;
		return null
	}
}
