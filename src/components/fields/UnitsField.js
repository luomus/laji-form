import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Button from "../Button";
import UnitField from "./ScopeField";

export default class UnitsField extends Component {
	constructor(props) {
		super(props);
		this.rowAddAmount = 10;
		this.state = {rowAmount: 0};
		this.state = ({...this.state, ...this.getStateFromProps(props)})
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let state = {};
		if (props.formData && props.formData.length > this.state.rowAmount) {
			state.rowAmount = props.formData.length + this.rowAddAmount - (props.formData.length % this.rowAddAmount);
		}
		return state;
	}
	render() {
		return (
			<fieldset>
				<TitleField title={this.props.schema.title || this.props.name}/>
				{this.renderUnits()}
				<Button onClick={this.onAddClick}>Lisää havaintorivejä</Button><br/>
			</fieldset>
		)
	}

	renderUnits = () => {
		let unitRows = [];
		let idx = 0;
		let data = this.props.formData || [];

		while (data.length < this.state.rowAmount) {
			data.push({});
		}

		if (data) data.forEach((unit) => {
			unitRows.push(<SchemaField
				key={idx}
				formData={unit}
				onChange={this.onChangeForIdx(idx)}
				schema={this.props.schema.items}
				uiSchema={this.props.uiSchema.items}
				idSchema={{id: this.props.idSchema.id + "_" + idx}}
				registry={this.props.registry}
				errorSchema={this.props.errorSchema[idx]} />);
			idx++;
		});
		return unitRows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			formData[idx] = itemFormData;
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}

	onAddClick = () => {
		event.preventDefault();
		this.setState({rowAmount: this.state.rowAmount + this.rowAddAmount});
	}
}
