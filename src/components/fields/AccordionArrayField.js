import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { Accordion, Panel } from "react-bootstrap";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions } from "../../utils";
import { Button, DeleteButton } from "../components";

export default class AccordionArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {activeIdx: props.formData.length ? 0 : undefined};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);
		if (options.hasOwnProperty("activeIdx")) return {activeIdx: options.activeIdx};
	}

	render() {
		const {formData, registry: {fields: {SchemaField}}} = this.props;

		const activeIdx = this.state.activeIdx;

		const itemsSchema = this.props.schema.items;
		const {title, ...schema} = itemsSchema;
		schema.title = "";

		function AddButton({onClick, disabled}) {
			return (
				<div className="row">
					<p className="col-xs-2 col-xs-offset-10 array-item-add text-right">
						<button type="button" className="btn btn-info col-xs-12"
										tabIndex="-1" onClick={onClick}
										disabled={disabled} style={{fontWeight: "bold"}}>➕</button>
					</p>
				</div>
			);
		}

		return (<div>
			<Accordion onSelect={this.onActiveChange} activeKey={activeIdx}>
				{(formData || []).map((item, idx) => {
					let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
					return (idx === activeIdx) ? (
						<SchemaField
							{...this.props}
							formData={item}
							onChange={this.onChangeForIdx(idx)}
							schema={schema}
							uiSchema={this.props.uiSchema.items}
							idSchema={toIdSchema(schema, itemIdPrefix, this.props.registry.definitions)}
							errorSchema={this.props.errorSchema[idx]} />
					) : null;
				}).map((comp, i) => <Panel key={i} header={this.renderHeader(i, title)} eventKey={i}>{comp}</Panel>)}
			</Accordion>
			<AddButton
				onClick={() => {
					this.props.onChange([
						...this.props.formData,
						getDefaultFormState(schema, undefined, this.props.registry)
					])
				}} />
		</div>);
	}

	renderHeader = (idx, title) => {
		const formattedIdx = idx + 1;
		const _title = title ? `${title} ${formattedIdx}` : formattedIdx;
		return (
			<div>
				<span >{_title}</span>
				<DeleteButton className="pull-right"
											confirm={true}
											translations={this.props.formContext.translations}
											onClick={() => this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}))} />
			</div>
		);
	}

	onActiveChange = (idx) => {
		idx = parseInt(idx);
		if (this.state.activeIdx === idx) {
			idx = undefined;
		}
		const {onActiveChange} = getUiOptions(this.props.uiSchema);
		onActiveChange ? onActiveChange(idx) : this.setState({activeIdx: idx});
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			if (!this.props.formData || idx === this.props.formData.length) {
				itemFormData = {
					...getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions),
					...itemFormData
				}
			}

			let formData = this.props.formData;
			if (!formData) formData = [];
			formData = update(formData, {$merge: {[idx]: itemFormData}});
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}
}
