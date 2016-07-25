import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { Row, Col } from "react-bootstrap";
import Button from "../Button";

export default class AutoArrayField extends Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.state = this.getStatefromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStatefromProps(props))
	}

	getStatefromProps = (props) => {
		let {idxsToKeys, keyCounter} = this.state;
		const formDataLength = props.formData ? props.formData.length : 0;
		if (!idxsToKeys) {
			return {
				idxsToKeys: Array.from(new Array(formDataLength + 1), (x, i) => i),
				keyCounter: formDataLength + 1
			};
		// Would somebody tell me why 'this' is undefined in this while loop?
		} else while (props.formData && formDataLength >= idxsToKeys.length) {
			return {
				idxsToKeys: update(idxsToKeys, {$push: Array.from(new Array(formDataLength - idxsToKeys.length + 1), (x,i) => keyCounter++)}),
				keyCounter: keyCounter
			};
		}
		return {};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		return (
			<fieldset>
				<TitleField title={this.props.schema.title || this.props.name}/>
				{this.renderItems()}
			</fieldset>
		)
	}

	renderItems = () => {
		let data = this.props.formData || [];
		data = update(data, {$push: [{}]});

		const SchemaField = this.props.registry.fields.SchemaField;

		let rows = [];
		data.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
			let removable = idx < data.length - 1;
			let key = this.state.idxsToKeys[idx];
			rows.push(
				<Row key={"row_" + key}>
					<Col xs={10}>
						<SchemaField
							key={key}
							formData={item}
							onChange={this.onChangeForIdx(idx)}
							schema={this.props.schema.items}
							uiSchema={this.props.uiSchema.items}
							idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
							registry={this.props.registry}
							errorSchema={this.props.errorSchema[idx]} />
					</Col>
					{removable ? (<Col xs={2}>
						<Button type="danger"
						        classList={["col-xs-12"]}
						        onClick={this.onRemove(idx)}>✖</Button>
					</Col>) : undefined}
				</Row>);
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			if (!this.props.formData || idx === this.props.formData.length) {
				itemFormData = update(getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions), {$merge: itemFormData});
			}

			let formData = this.props.formData;
			if (!formData) formData = [];
			formData = update(formData, {$merge: {[idx]: itemFormData}});
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}

	onRemove = (idx) => e => {
		e.preventDefault();
		this.setState({idxsToKeys: update(this.state.idxsToKeys, {$splice: [[idx, 1]]})});

		this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}))
	}
}
