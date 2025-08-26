import BaseComponent from "../BaseComponent";
import * as React from "react";
import { FieldProps, JSONSchemaObject } from "src/types";
import ReactContext from "../../ReactContext";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import merge from "deepmerge";
import { beforeAdd } from "../templates/ArrayFieldTemplate";
import { copyItemFunction } from "./ArrayField";
import { AccordionArrayFieldTemplate } from "./SingleActiveArrayField";

interface State {
	activeIdx: number[];
}

@BaseComponent
export default class MultiActiveArrayField extends React.Component<FieldProps<JSONSchemaObject>, State> {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				renderer: PropTypes.oneOf(["accordion"]),
				activeIdx: PropTypes.arrayOf(PropTypes.number)
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	// these are required by the AccordionArrayFieldTemplate
	deleteButtonRefs = {};
	deleteButtonRefSetters = {};

	constructor(props: FieldProps<JSONSchemaObject>) {
		super(props);
		this.deleteButtonRefs = {};
		this.deleteButtonRefSetters = {};
		this.state = {
			activeIdx: this.getInitialActiveIdx(props),
			...this.getStateFromProps(props)
		};
	}

	getInitialActiveIdx = (props: FieldProps<JSONSchemaObject>): number[] => {
		const {formData} = props;
		const formDataLength = (formData || []).length;
		return [...Array(formDataLength).keys()];
	}

	getStateFromProps(props: FieldProps<JSONSchemaObject>): State | null {
		let activeIdx: number[]|undefined;

		const options = getUiOptions(props.uiSchema);

		if ("activeIdx" in options) {
			activeIdx = options.activeIdx;
		} else if ((props.formData || []).length > 0 && (this.props.formData || []).length === 0) {
			activeIdx = [...Array((props.formData || []).length).keys()];
		}

		if (!activeIdx && this.props && props.idSchema.$id !== this.props.idSchema.$id) {
			activeIdx = this.getInitialActiveIdx(props);
		}

		return activeIdx ? { activeIdx } : null;
	}

	render() {
		const {renderer = "accordion"} = getUiOptions(this.props.uiSchema);
		let ArrayFieldTemplate = undefined;
		switch (renderer) {
		case "accordion":
			ArrayFieldTemplate = AccordionArrayFieldTemplate;
			break;
		default:
			throw new Error(`Unknown renderer '${renderer}' for MultiActiveArrayField`);
		}

		const formContext = {...this.props.formContext, this: this, activeIdx: this.state.activeIdx};

		const {registry: {fields: {ArrayField}}} = this.props;

		const {buttons = [], buttonDefinitions} = getUiOptions(this.props.uiSchema);

		let uiSchema = {
			...this.props.uiSchema,
			"ui:field": undefined,
			"ui:classNames": undefined,
			"ui:options": {
				...getUiOptions(this.props.uiSchema),
				buttons,
				buttonDefinitions: buttonDefinitions
					? merge(this.buttonDefinitions, buttonDefinitions)
					: this.buttonDefinitions
			}
		};

		uiSchema["ui:ArrayFieldTemplate"] = ArrayFieldTemplate as any;

		return (
			<ArrayField
				{...this.props}
				formContext={formContext}
				registry={{
					...this.props.registry,
					formContext
				}}
				schema={this.props.schema}
				uiSchema={uiSchema}
				idSchema={this.props.idSchema}
				errorSchema={this.props.errorSchema as any}
				onChange={this.props.onChange}
				onBlur={this.props.onBlur}
				onFocus={this.props.onFocus}
				disabled={this.props.disabled}
				readonly={this.props.readonly}
				name={this.props.name}
			/>
		);
	}

	onActiveChange = (idx: number, prop?: string, callback?: () => void) => {
		let newActiveIdx: number[];

		if (this.state.activeIdx.includes(idx)) {
			newActiveIdx = this.state.activeIdx.filter(i => i !== idx);
		} else {
			newActiveIdx = [...this.state.activeIdx, idx];
		}

		this.setState({activeIdx: newActiveIdx}, callback);
	}

	onDelete = (item: any) => (e: any) => {
		const idx = item.index;

		const newActiveIdx = this.state.activeIdx.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
		this.setState({activeIdx: newActiveIdx});

		item.onDropIndexClick(item.index)(e);
	}

	buttonDefinitions = {
		add: {
			callback: () => this.onActiveChange((this.props.formData || []).length)
		},
		addPredefined: {
			callback: () =>  this.onActiveChange((this.props.formData || []).length)
		},
		copy: {
			fn: () => (...params: any[]) => {
				const {formData = []} = this.props;
				const idx = this.state.activeIdx.length > 0 ?
					this.state.activeIdx[this.state.activeIdx.length - 1] :
					formData.length - 1;
				beforeAdd(this.props, idx + 1);
				this.props.onChange([
					...formData.slice(0, idx + 1),
					copyItemFunction(this, formData[idx])(...params),
					...formData.slice(idx + 1)
				]);
			},
			callback: () => {
				const idx = this.state.activeIdx !== undefined ?
					this.state.activeIdx[this.state.activeIdx.length - 1] :
					(this.props.formData || []).length - 1;
				this.onActiveChange(idx + 1);
			},
			rules: {
				minLength: 1
			}
		}
	}
}
