import * as React from "react";
import * as PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { classNames, getUiOptions } from "../../utils";
import ReactContext from "../../ReactContext";
import { Affix, Button } from "../components";
import { FieldProps } from "../LajiForm";
import { ReactInstance } from "react";
import update from "immutability-helper";
import { IdSchema } from "@rjsf/utils";
import * as memoize from "memoizee";
import { findDOMNode } from "react-dom";
const equals = require("deep-equal");

interface CommonButtonOptions {
	label?: string;
	className?: string;
}
interface MoveAllButtonOptions extends CommonButtonOptions {
	operation: "moveAll";
	fromField: string;
	toField: string;
}
interface MoveButtonOptions extends CommonButtonOptions {
	operation: "move";
	toField: string;
}
interface DeleteButtonOptions extends CommonButtonOptions {
	operation: "delete";
}
type ButtonOptions = MoveAllButtonOptions | MoveButtonOptions | DeleteButtonOptions;

interface Options {
	buttons: ButtonOptions[];
}

interface State {
	activeButtonIdx?: number;
}

@BaseComponent
export default class MultiTagArrayField extends React.Component<FieldProps, State> {
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

	state: State = {activeButtonIdx: undefined};

	private affixContainerElem: Element|null = null;

	setAffixContainer = (ref: ReactInstance) => {
		this.affixContainerElem = findDOMNode(ref) as Element|null;
	}

	getAffixContainer = (): Element|null => {
		return this.affixContainerElem;
	}

	componentDidUpdate(prevProps: FieldProps) {
		if (this.state.activeButtonIdx !== undefined) {
			const prevButtons = getUiOptions(prevProps.uiSchema).buttons;
			const currentButtons = getUiOptions(this.props.uiSchema).buttons;

			if (!equals(prevButtons, currentButtons)) {
				this.setState({activeButtonIdx: undefined});
			}
		}
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		const {Row, Col} = this.context.theme;
		const {schema, uiSchema, idSchema, errorSchema, formData = {}, disabled, readonly} = this.props;
		const uiOptions: Options = getUiOptions(uiSchema);
		const {buttons = []} = uiOptions;

		const {activeButtonIdx} = this.state;

		const propertyKeys = Object.keys(schema.properties);

		return (
			<Row className={classNames("laji-form-multi-tag-array-field", activeButtonIdx !== undefined && "laji-form-multi-tag-array-field-active")} ref={this.setAffixContainer}>
				<Col xs={3} sm={3} md={2} lg={2} className={"laji-form-multi-tag-array-field-buttons"}>
					<Affix getContainer={this.getAffixContainer}
					       topOffset={this.props.formContext.topOffset + 15}
					       bottomOffset={this.props.formContext.bottomOffset}>
						<div className={"btn-group-vertical"}>
							{ buttons.map((btnProps, idx) => (
								<Button
									key={idx}
									onClick={this.onButtonClick(idx)}
									variant={btnProps.operation === "delete" ? "outline-danger": "default"}
									className={classNames(btnProps.className, activeButtonIdx === idx ? "active" : "")}
									disabled={disabled || readonly}
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
								...uiSchema[key],
								"ui:options": {
									...uiOptions,
									buttons: undefined,
									onTagClick: this.onTagClick(key),
									...uiSchema[key]?.["ui:options"]
								}
							}}
							errorSchema={errorSchema[key] || {}}
							idSchema={idSchema[key] as IdSchema}
							formData={formData[key] || []}
							required={uiSchema[key]?.["ui:required"] || false}
							onChange={this.onChange(key)}
						/>
					)) }
				</Col>
			</Row>
		);
	}

	onChange = memoize((key: string) => (formData: any) => {
		const newFormData = {...this.props.formData, [key]: formData};
		this.props.onChange(newFormData);
	})

	onButtonClick = memoize((idx: number) => () => {
		const {activeButtonIdx} = this.state;
		if (activeButtonIdx === idx) {
			this.setState({activeButtonIdx: undefined});
			return;
		}

		const {buttons = []} = getUiOptions(this.props.uiSchema) as Options;
		const options = buttons[idx];
		const {operation} = options;

		if (operation === "moveAll") {
			const {toField, fromField} = options as MoveAllButtonOptions;
			const toFieldNewValue = (this.props.formData[toField] || []).concat(this.props.formData[fromField] || []);
			const newFormData = {...this.props.formData, [fromField]: [], [toField]: toFieldNewValue};
			this.props.onChange(newFormData);
		} else if (operation === "move" || operation === "delete") {
			this.setState({activeButtonIdx: idx});
		}
	})

	onTagClick = memoize((fromField: string) => (idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();

		const {activeButtonIdx} = this.state;
		if (activeButtonIdx === undefined) {
			return;
		}

		const {buttons = []} = getUiOptions(this.props.uiSchema) as Options;
		const options = buttons[activeButtonIdx];
		const {operation} = options;

		if (operation === "move" || operation === "delete") {
			let formData = this.props.formData;

			if (operation === "move") {
				const {toField} = options as MoveButtonOptions;
				if (fromField === toField) {
					return;
				}

				const value = formData[fromField][idx];
				formData = update(formData, {
					[fromField]: {$splice: [[idx, 1]]},
					[toField]: {$apply: (values: any[]) => [...(values || []), value]}
				});
			} else {
				formData = update(formData, {[fromField]: {$splice: [[idx, 1]]}});
			}

			this.props.onChange(formData);
		}
	})
}
