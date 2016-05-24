import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
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
		return (<div>
			<MapComponent
				ref={"map"}
				data={this.state.mapItems}
				onAdd={this.onAdd}
			  onRemove={this.onRemove}
				onActiveChanged={this.onActiveChanged}
			/>
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

class MapComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {count: this.props.data ? this.props.data.length : 0, items: this.props.data || [], activeId: this.props.data ? 0 : undefined};
	}

	render() {
		return (<div style={{backgroundColor: "green", color: "white"}}>
			STUBB MAP
			<Button onClick={this.onAddClick}>lisää kuvio</Button>
			<br/>

			{this.state.items.map((item, idx) => {
				let id = item.id;
				return <div key={id + "-bg"} style={{backgroundColor: (this.state.activeId === id) ? "darkgreen" : "initial"}}>{[<Button key={id} onClick={this.onActivatedClick(id)}>Aktivoi {id + 1}.</Button>,
				<Button key={id + "-remove"} onClick={this.onRemoveClick(idx)}>Poista {id + 1}.</Button>, <br key={id + "-br"}/>]}</div>
			})}
		</div>)
	}

	onAddClick = () => {
		let id = this.state.count;
		let items = this.state.items;
		items.push({id});
		this.setState({count: this.state.count + 1, items: items});
		this.props.onAdd(id);
		this.onActiveChanged(id);
	}

	onActivatedClick = (id) => {
		return () => {
			this.onActiveChanged(id);
		}
	}

	onActiveChanged = (id) => {
		if (this.state.items.length > 0  && this.state.items.map((item) => {return item.id}).indexOf(id) < 0) return;
		this.setState({activeId: id});
		this.props.onActiveChanged(id);
	}

	onRemoveClick = (i) => {
		return () => {
			let items = this.state.items;
			let item = items[i];

			let activeId;
			if (item.id === this.state.activeId) {
				let ids = items.map((item)=> {return item.id});
				let activeIdIdx = ids.indexOf(this.state.activeId);
				if (items.length > 1) {
					activeId = (activeIdIdx === 0) ? ids[0] : ids[activeIdIdx - 1];
				}
			}

			items.splice(i, 1);
			this.setState({items});
			this.props.onRemove(item.id);
			this.onActiveChanged(activeId);
		}
	}
}
