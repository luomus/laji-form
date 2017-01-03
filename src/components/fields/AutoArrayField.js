import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import equals from "deep-equal";
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils"
import { hasData, getUiOptions } from "../../utils";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { DeleteButton } from "../components";
import FormField from "../BaseComponent";

@FormField
export default class AutoArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				confirmDelete: PropTypes.boolean
			})
		}).isRequired
	};

	getStatefromProps = (props) => {
		const state = {};

		const options = getUiOptions(props.uiSchema);
		state.confirmDelete = !!options.confirmDelete;

		return state;
	}

	render() {
		return (
			<fieldset>
				<TitleField title={this.props.schema.title || this.props.name}/>
				{this.renderItems()}
			</fieldset>
		);
	}

	renderItems = () => {
		const {registry} = this.props;
		let data = this.props.formData || [];
		const defaultData = getDefaultFormState(this.props.schema.items, undefined, registry.definitions);
		const lastItem = data[data.length - 1];
		if (data.length === 0 || hasData(lastItem) && !equals(lastItem, defaultData)) {
			data = [...data, defaultData]
		}

		const {SchemaField} = this.props.registry.fields;
		const {translations} = this.props.formContext;

		let rows = [];
		data.forEach((item, idx) => {
			let id = this.props.idSchema.$id + "_" + idx;
			let removable = idx < data.length - 1;

			const buttons = [removable ? (
				<DeleteButton
					key={this.state.idxsToKeys[idx]}
					confirm={this.state.confirmDelete}
					onClick={this.onRemoveForIdx(idx)}
					translations={translations}
				/>
			) : null];
			if (removable) buttons.push(this.renderButtons(idx));

			rows.push(
				<div key={idx} className="laji-form-field-template-item">
					<div className={"laji-form-field-template-schema"}>
						<SchemaField
							formData={item}
							onChange={this.onChangeForIdx(idx)}
							schema={this.props.schema.items}
							uiSchema={this.props.uiSchema.items}
							idSchema={toIdSchema(this.props.schema.items, id, this.props.registry.definitions)}
							registry={registry}
							errorSchema={this.props.errorSchema[idx]} />
					</div>
					<div className="laji-form-field-template-buttons">
						{buttons}
					</div>
				</div>);
		});
		return rows;
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

	onButtonKeyDown = (idx) => ({key}) => {
		if (key === "Enter") this.onRemove(idx);
	}

	onRemoveForIdx = (idx) => e => {
		if (e) e.preventDefault();
		this.onRemove(idx);
	}

	onRemove = (idx) => {
		this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}));
	}

	renderButtons = (idx) => {
		const buttons = getUiOptions(this.props.uiSchema).buttons || {};
		return Object.keys(buttons).map(button => {
			return buttons[button](idx);
		});
	}
}
