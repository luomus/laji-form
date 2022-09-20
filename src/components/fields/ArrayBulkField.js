import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import { Button } from "../components";
import BaseComponent from "../BaseComponent";
import { getTemplate } from "@rjsf/utils";

@BaseComponent
export default class ArrayBulkField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rowAddAmount: PropTypes.number
			})
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {rowAmount: 0, ...this.getStateFromProps(props)};
	}

	getStateFromProps = (props) => {
		let state = {};
		const {rowAddAmount} = getUiOptions(props.uiSchema);
		state.rowAddAmount = 10;
		if (rowAddAmount > 0) state.rowAddAmount = rowAddAmount;
		if (props.formData && props.formData.length > this.state.rowAmount) {
			state.rowAmount = props.formData.length + state.rowAddAmount - (props.formData.length % state.rowAddAmount);
		}
		return state;
	}

	render() {
		const TitleFieldTemplate = getTemplate("TitleFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		return (
			<fieldset>
				<TitleFieldTemplate title={this.props.schema.title || this.props.name} uiSchema={this.props.uiSchema} />
				{this.renderItems()}
				<Button onClick={this.onAddClick}>Lisää havaintorivejä</Button><br/>
			</fieldset>
		);
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
			this.props.onChange(formData.filter(item => {return Object.keys(item).length;}));
		};
	}

	onAddClick = (event) => {
		event.preventDefault();
		this.setState({rowAmount: this.state.rowAmount + this.state.rowAddAmount});
	}
}
