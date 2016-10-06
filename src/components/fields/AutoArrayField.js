import React, { Component, PropTypes } from "react";
import ReactDOM from "react-dom";
import update from "react-addons-update";
import equals from "deep-equal";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { hasData } from "../../utils";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { Row, Col, Overlay, Popover, ButtonGroup, Glyphicon } from "react-bootstrap";
import Button from "../Button";

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
		this.state = {};
		this.state = this.getStatefromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStatefromProps(props))
	}

	getStatefromProps = (props) => {
		let {idxsToKeys, keyCounter} = this.state;
		const state = {};

		const formDataLength = props.formData ? props.formData.length : 0;
		if (!idxsToKeys) {
			state.idxsToKeys = Array.from(new Array(formDataLength + 1), (x, i) => i);
			state.keyCounter = formDataLength + 1;
		} else if (props.formData && formDataLength >= idxsToKeys.length) {
			state.idxsToKeys = update(idxsToKeys,
				{$push: Array.from(new Array(formDataLength - idxsToKeys.length + 1), (x,i) => keyCounter++)}
			);
			state.keyCounter = keyCounter;
		}

		const options = props.uiSchema["ui:options"];
		state.confirmDelete = !!options.confirmDelete;
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
			</fieldset>
		)
	}

	renderItems = () => {
		const {registry} = this.props;
		let data = this.props.formData || [];
		const defaultData = getDefaultFormState(this.props.schema.items, undefined, registry.definitions);
		const lastItem = data[data.length - 1];
		if (data.length === 0 || hasData(lastItem) && !equals(lastItem, defaultData)) {
			data = update(data, {$push: [defaultData]});
		}

		const {SchemaField} = this.props.registry.fields;
		const {translations} = this.props.registry;

		let rows = [];
		data.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
			let removable = idx < data.length - 1;
			let key = this.state.idxsToKeys[idx];

			rows.push(
				<div key={"row_" + key} className="auto-array-item" >
					<div className="auto-array-schema">
						<SchemaField
							key={key}
							formData={item}
							onChange={this.onChangeForIdx(idx)}
							schema={this.props.schema.items}
							uiSchema={this.props.uiSchema.items}
							idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
							registry={this.props.registry}
							errorSchema={this.props.errorSchema[idx]} />
					</div>
					<div className="auto-array-buttons-container">
						{removable ? (<div>
							<Button bsStyle="danger"
							        className="col-xs-12 glyph-button"
							        ref={"del-" + idx}
							        onKeyDown={this.onButtonKeyDown(idx)}
							        onClick={this.state.confirmDelete ? this.onConfirmRemove(idx) : this.onRemoveForIdx(idx)}>✖</Button>
							{this.state.visibleConfirmationIdx === idx ?
								<Overlay show={true} placement="left"  rootClose={true} onHide={this.onClearConfirm} target={() => ReactDOM.findDOMNode(this.refs["del-" + idx])} >
									<Popover id="popover-trigger-click">
										<span>{translations.ConfirmRemove}</span>
										<ButtonGroup>
											<Button bsStyle="danger" onClick={this.onRemoveForIdx(idx)}>{translations.Remove}</Button>
											<Button bsStyle="default" onClick={this.onClearConfirm}>{translations.Close}</Button>
										</ButtonGroup>
									</Popover>
								</Overlay>
								: null
							}
							{this.renderButtons(idx)}
						</div>) : undefined}
					</div>
				</div>);
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
		const options = this.props.uiSchema["ui:options"];

		const buttons = options.buttons || {};
		return Object.keys(buttons).map(button => {
			return buttons[button](idx);
		});
	}
}
