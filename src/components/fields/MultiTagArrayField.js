import * as React from "react";
import * as PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import {classNames, getUiOptions} from "../../utils";
import ReactContext from "../../ReactContext";
import {Affix, Button} from "../components";


@BaseComponent
export default class MultiTagArrayField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				buttons: PropTypes.arrayOf(PropTypes.oneOfType(
					[
						PropTypes.shape({
							operation: PropTypes.oneOf(["moveAll"]),
							fromField: PropTypes.string.isRequired,
							toField: PropTypes.string.isRequired,
							label: PropTypes.string,
							className: PropTypes.string
						}),
						PropTypes.shape({
							operation: PropTypes.oneOf(["move"]),
							toField: PropTypes.string.isRequired,
							label: PropTypes.string,
							className: PropTypes.string
						}),
						PropTypes.shape({
							operation: PropTypes.oneOf(["delete"]),
							label: PropTypes.string,
							className: PropTypes.string
						})
					]
				))
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	}

	constructor(props) {
		super(props);
		this.state = {activeButtonIdx: undefined};
	}

	setContainerRef = (elem) => {
		this.containerElem = elem;
	}

	getContainerRef = () => {
		return this.containerElem;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		const {Row, Col} = this.context.theme;
		const {schema, uiSchema, idSchema, errorSchema, formData = {}} = this.props;
		const uiOptions = getUiOptions(uiSchema);
		const {buttons = []} = uiOptions;

		const {activeButtonIdx} = this.state;

		const propertyKeys = Object.keys(schema.properties)

		return (
			<Row className={`laji-form-multi-tag-array-field${activeButtonIdx !== undefined ? " laji-form-multi-tag-array-field-active" : ""}`}>
				<Col xs={3} sm={3} md={2} lg={2} className={"laji-form-multi-tag-array-field-buttons"} ref={this.setContainerRef}>
					<Affix getContainer={this.getContainerRef}
						   topOffset={this.props.formContext.topOffset + 15}
						   bottomOffset={this.props.formContext.bottomOffset}>
						<div className={"btn-group-vertical"}>
							{ buttons.map((btnProps, idx) => (
								<Button
									key={idx}
									onClick={this.onButtonClick(idx, btnProps)}
									variant={btnProps.operation === "delete" ? "outline-danger": "default"}
									className={classNames(btnProps.className, activeButtonIdx === idx ? "active" : "")}
								>{ btnProps.label }</Button>
							)) }
						</div>
					</Affix>
				</Col>
				<Col xs={9} sm={9} md={10} lg={10} className={"laji-form-multi-tag-array-field-content"}>
					{ propertyKeys.map(key => (
						<SchemaField
							{...this.props}
							key={key}
							schema={{title: "", ...schema.properties[key]}}
							uiSchema={{
								"ui:field": "TagArrayField",
								"ui:options": {
									...uiOptions,
									buttons: undefined,
									onTagClick: this.onTagClick(key)
								}
							}}
							errorSchema={errorSchema[key] || {}}
							idSchema={idSchema[key]}
							formData={formData[key] || []}
							required={uiSchema[key]?.["ui:required"] || false}
							onChange={this.onChange(key)}
						/>
					)) }
				</Col>
			</Row>
		);
	}

	onChange = (key) => (formData) => {
		const newFormData = {...this.props.formData, [key]: formData};
		this.props.onChange(newFormData);
	}

	onButtonClick = (idx, {operation, fromField, toField}) => () => {
		const {activeButtonIdx} = this.state;
		if (activeButtonIdx === idx) {
			this.setState({activeButtonIdx: undefined});
			return;
		}

		if (operation === "moveAll") {
			const toFieldNewValue = (this.props.formData[toField] || []).concat(this.props.formData[fromField] || []);
			const newFormData = {...this.props.formData, [fromField]: [], [toField]: toFieldNewValue};
			this.props.onChange(newFormData);
		} else if (operation === "move" || operation === "delete") {
			this.setState({activeButtonIdx: idx});
		}
	}

	onTagClick = (fromField) => (idx) => {
		const {activeButtonIdx} = this.state;
		if (activeButtonIdx === undefined) {
			return;
		}

		const {buttons = []} = getUiOptions(this.props.uiSchema);
		const {operation, toField} = buttons[activeButtonIdx];
		if (fromField === toField) {
			return;
		}

		let formData = this.props.formData;

		if (operation === "move" || operation === "delete") {
			const value = formData[fromField][idx];
			const fromFieldNewValue = [...formData[fromField]];
			fromFieldNewValue.splice(idx, 1);

			if (operation === "move") {
				const toFieldNewValue = [...(formData[toField] || []), value]
				formData = {...formData, [fromField]: fromFieldNewValue, [toField]: toFieldNewValue};
			} else {
				formData = {...formData, [fromField]: fromFieldNewValue};
			}

			this.props.onChange(formData);
		}
	}
}
