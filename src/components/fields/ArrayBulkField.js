import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import Button from "../Button";

export default class ArrayBulkField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rowAddAmount: PropTypes.number
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {rowAmount: 0};
		this.state = ({...this.state, ...this.getStateFromProps(props)})
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let state = {};
		let options = props.uiSchema["ui:options"];
		state.rowAddAmount = 10;
		if (options && options.rowAddAmount && options.rowAddAmount > 0) state.rowAddAmount = options.rowAddAmount;
		if (props.formData && props.formData.length > this.state.rowAmount) {
			state.rowAmount = props.formData.length + state.rowAddAmount - (props.formData.length % state.rowAddAmount);
		}
		return state;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		return (
			<fieldset>
				<TitleField title={this.props.schema.title || this.props.name}/>
				{this.renderItems()}
				<Button onClick={this.onAddClick}>Lisää havaintorivejä</Button><br/>
			</fieldset>
		)
	}

	renderItems = () => {
		let rows = [];
		let idx = 0;
		let data = this.props.formData || [];

		while (data.length < this.state.rowAmount) {
			data.push({});
		}

		const SchemaField = this.props.registry.fields.SchemaField;
		if (data) data.forEach((item) => {
			rows.push(<SchemaField
				key={idx}
				formData={item}
				onChange={this.onChangeForIdx(idx)}
				schema={this.props.schema.items}
				uiSchema={this.props.uiSchema.items}
				idSchema={{$id: this.props.idSchema.$id + "_" + idx}}
				registry={this.props.registry}
				errorSchema={this.props.errorSchema[idx]} />);
			idx++;
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			formData[idx] = itemFormData;
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}

	onAddClick = (event) => {
		event.preventDefault();
		this.setState({rowAmount: this.state.rowAmount + this.state.rowAddAmount});
	}
}
