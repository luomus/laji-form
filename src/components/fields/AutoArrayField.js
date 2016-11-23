import React, { Component, PropTypes } from "react";
import ReactDOM from "react-dom";
import update from "react-addons-update";
import equals from "deep-equal";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { hasData, getUiOptions } from "../../utils";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Context from "../../Context";
import { DeleteButton } from "../components";

export default class AutoArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				confirmDelete: PropTypes.boolean
			})
		}).isRequired
	};

	constructor(props) {
		super(props);
		this.state = {stateKeyId: 0};
		this.state = this.getStatefromProps(props);
		new Context().addStateClearListener(this.clearState);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStatefromProps(props))
	}

	getStatefromProps = (props, defaultState) => {
		let {idxsToKeys, keyCounter} = this.state;
		const state = defaultState || {};

		const formDataLength = props.formData ? props.formData.length : 0;
		if (!idxsToKeys) {
			state.idxsToKeys = Array.from(new Array(formDataLength + 1), (x, i) => i);
			state.keyCounter = formDataLength + 1;
		} else if (props.formData && formDataLength >= idxsToKeys.length) {
			state.idxsToKeys = [...idxsToKeys, ...Array.from(new Array(formDataLength - idxsToKeys.length + 1), (x,i) => keyCounter++)];
			state.keyCounter = keyCounter;
		}

		const options = getUiOptions(props.uiSchema);
		state.confirmDelete = !!options.confirmDelete;

		return state;
	}

	clearState = () => {
		this.setState({stateKeyId: this.state.stateKeyId++});
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
				<div key={`${this.state.stateKeyId}-${this.state.idxsToKeys[idx]}`} className="laji-form-field-template-item">
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

	onConfirmRemove = (idx) => () => {
		this.setState({visibleConfirmationIdx: idx});
	}

	onClearConfirm = () => {
		this.setState({visibleConfirmationIdx: undefined});
	}

	onButtonKeyDown = (idx) => ({key}) => {
		if (key === "Enter") this.onRemove(idx);
		else if (key === "Escape") this.onClearConfirm();
	}

	onRemoveForIdx = (idx) => e => {
		e.preventDefault();
		this.onRemove(idx);
	}

	onRemove = (idx) => {
		this.setState({idxsToKeys: update(this.state.idxsToKeys, {$splice: [[idx, 1]]})});
		this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}));
		this.onClearConfirm();
	}

	renderButtons = (idx) => {
		const buttons = getUiOptions(this.props.uiSchema).buttons || {};
		return Object.keys(buttons).map(button => {
			return buttons[button](idx);
		});
	}
}
