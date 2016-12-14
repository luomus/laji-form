import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { ButtonToolbar } from "react-bootstrap";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, hasData, parseDotPath } from "../../utils";
import { DeleteButton, Button } from "../components";
import Context from "../../Context";

const buttonDefinitions = {
	add: (that, options, key) => {
		const {text} = options;
		return (
			<Button key={key} onClick={that.onAdd}>
				<i className="glyphicon glyphicon-plus"/> <strong>{text}</strong>
			</Button>
		);
	},
	copy: (that, options, key) => {
		const {text, type, filter} = options;
		return (
			<Button key={key} onClick={() => that.onCopy(type, filter)}>
				<i className="glyphicon glyphicon-duplicate"/> <strong>{text}</strong>
			</Button>
		);
	}
};

export default class CustomButtonArrayField extends Component {
	static propTypes = {
		uiSchema:PropTypes.shape({
			"ui:options": PropTypes.shape({
				buttons: PropTypes.arrayOf(
					PropTypes.shape({
						add: PropTypes.shape({
							text: PropTypes.string,
						}),
						copy: PropTypes.shape({
							type: PropTypes.oneOf(["blacklist", "whitelist"]).isRequired,
							text: PropTypes.string,
							filter: PropTypes.arrayOf(PropTypes.string),
						})
					})
				)
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {
			stateKeyId: 0,

		};
		this.state = {
			...this.state,
			...this.getStateFromProps(props),
			formData: props.formData || [getDefaultFormState(props.schema.items, undefined, props.registry)]
		};
		new Context().addStateClearListener(this.clearState);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const {confirmDelete} = getUiOptions(props.uiSchema);
		let {idxsToKeys, keyCounter} = this.state;

		const state = {confirmDelete};

		const formDataLength = props.formData ? props.formData.length : 0;
		if (!idxsToKeys) {
			state.idxsToKeys = Array.from(new Array(formDataLength + 1), (x, i) => i);
			state.keyCounter = formDataLength + 1;
		} else if (props.formData && formDataLength >= idxsToKeys.length) {
			state.idxsToKeys = [...idxsToKeys, ...Array.from(new Array(formDataLength - idxsToKeys.length + 1), (x,i) => keyCounter++)];
			state.keyCounter = keyCounter;
		}

		state.formData = props.formData;

		return state;
	}

	clearState = () => {
		this.setState({stateKeyId: this.state.stateKeyId++});
	}

	render() {
		const {registry: {fields: {SchemaField, TitleField}}} = this.props;

		return (<div>
			<TitleField title={this.props.schema.title || this.props.name}/>
			{
				this.state.formData.map((item, idx) => {
					let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
					return (
						<div key={`${this.state.stateKeyId}-${this.state.idxsToKeys[idx]}`} className="laji-form-field-template-item">
							<div className="laji-form-field-template-schema">
							<SchemaField
								schema={this.props.schema.items}
								uiSchema={this.props.uiSchema.items}
								formData={item}
								idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
								onChange={this.onChangeForIdx(idx)}
								registry={this.props.registry}
								errorSchema={this.props.errorSchema[idx]}
							/>
							</div>
							<div className="laji-form-field-template-buttons">
								<DeleteButton
									confirm={this.state.confirmDelete}
									onClick={this.onRemoveForIdx(idx)}
									translations={this.props.formContext.translations}
								/>
							</div>
						</div>
					);
				})
			}
			{
				this.renderButtons()
			}
		</div>);
	}

	renderButtons = () => {
		const {buttons} = getUiOptions(this.props.uiSchema);

		return (
			<ButtonToolbar>{
				(buttons || []).map((button, i) =>
					buttonDefinitions[button.name](this, button, i)
				)
			}</ButtonToolbar>
		);
	}

	onAdd = () => {
		this.props.onChange([
			...(this.state.formData || []),
			getDefaultFormState(this.props.schema.items, undefined, this.props.registry)
		]);
	}

	onCopy = (type, filter) => {
		const filterDict = filter.reduce((dict, f) => {
			dict[f] = true;
			return dict;
		}, {});

		const fieldsFilter = (type === "blacklist") ? field => !filterDict[field] : field => filterDict[field];
		const fields = Object.keys(this.props.schema.items.properties).filter(fieldsFilter);
		const nestedFilters = filter.filter(f => f.includes("."));

		const {formData} = this.state;
		const defaultItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry);

		const lastIdx = formData.length - 1;
		const lastItem = formData[lastIdx];

		function clone(field) {
			if (!field) return field;
			return JSON.parse(JSON.stringify(field));
		}

		const copyItem = lastIdx >= 0 ? (() => {
			return fields.reduce((item, field) => {
				item[field] = clone(lastItem[field]);
				return item;
			}, defaultItem)
		})() : defaultItem;

		nestedFilters.forEach(filter => {
			const splitted = filter.split(".");
			const last = splitted.pop();

			const nested = splitted.reduce((_nested, path) => {
				_nested = copyItem[path];
				return Array.isArray(_nested) ? _nested[0] : _nested;
			}, copyItem);

			if (type === "blacklist") {
				const nestedSchema = filter.split(".").reduce((nested, path) => {
					if (nested.properties) return nested.properties[path];
					if (nested.items) return nested.items.properties[path];
					if (nested[path]) return nested[path];
				}, this.props.schema.items);

				if (nested) nested[last] = getDefaultFormState(nestedSchema, undefined, this.props.registry);
			} else {
				const origNestedField = filter.split(".").reduce((nested, path) => {
					if (nested) return nested[path];
					else if (nested && nested[0]) return nested[0][path];
					return undefined;
				}, lastItem);
				if (nested) nested[last] = origNestedField;
			}
		});

		this.props.onChange([
			...this.state.formData,
			copyItem
		]);
	}

	onChangeForIdx = (idx) => (itemFormData) => {
		const updateObject = this.state.formData ? {$merge: {[idx]: itemFormData}} : {$set: [itemFormData]};
		this.props.onChange(update(this.state.formData, updateObject));
	}

	onRemoveForIdx = (idx) => e => {
		if (e) e.preventDefault();
		this.setState({idxsToKeys: update(this.state.idxsToKeys, {$splice: [[idx, 1]]})});
		this.props.onChange(update(this.state.formData, {$splice: [[idx, 1]]}));
	}
}
