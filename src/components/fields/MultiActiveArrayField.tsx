import BaseComponent from "../BaseComponent";
import * as React from "react";
import { FieldProps, JSONSchemaObject } from "src/types";
import ReactContext from "../../ReactContext";
import * as PropTypes from "prop-types";
import { getUiOptions, ReactUtils } from "../../utils";
import merge from "deepmerge";
import { beforeAdd } from "../templates/ArrayFieldTemplate";
import { copyItemFunction } from "./ArrayField";
import { AccordionArrayFieldTemplate, getPopupDataPromise } from "./SingleActiveArrayField";
import { FormContext } from "../LajiForm";

interface State {
	activeIdx: number[];
	scrollHeightFixed: number;
	popups: any;
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

	deleteButtonRefs = {};
	deleteButtonRefSetters = {};
	localContext?: FormContext;
	localContextKey?: number;
	mounted = false;

	constructor(props: FieldProps<JSONSchemaObject>) {
		super(props);
		this.deleteButtonRefs = {};
		this.deleteButtonRefSetters = {};
		this.state = {
			activeIdx: this.getInitialActiveIdx(props),
			scrollHeightFixed: 0,
			...this.getStateFromProps(props),
			popups: {}
		};
		const id = `${this.props.idSchema.$id}`;
		this.props.formContext.globals[`${id}.activeIdx`] = this.state.activeIdx;
	}

	getInitialActiveIdx = (props: FieldProps<JSONSchemaObject>): number[] => {
		const {formData} = props;
		const formDataLength = (formData || []).length;
		return [...Array(formDataLength).keys()];
	}

	componentDidMount() {
		this.mounted = true;
		this.updatePopups(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	UNSAFE_componentWillReceiveProps(props: FieldProps<JSONSchemaObject>) {
		this.setState(this.getStateFromProps(props));
		this.updatePopups(props);
	}

	componentDidUpdate() {
		this.props.formContext.globals[`${this.props.idSchema.$id}.activeIdx`] = this.state.activeIdx;
	}

	shouldComponentUpdate(prevProps: FieldProps<JSONSchemaObject>, prevState: State) {
		if ((this.state.scrollHeightFixed && !prevState.scrollHeightFixed)
			|| this.state.scrollHeightFixed && this.state.scrollHeightFixed !== prevState.scrollHeightFixed
		) {
			return false;
		}
		return true;
	}

	updatePopups = (props: FieldProps<JSONSchemaObject>) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		let {popups} = this.state;
		let count = 0;
		if (popupFields) props.formData.forEach((item: any, idx: number) => {
			getPopupDataPromise(props, item).then(popupData => {
				count++;
				popups  = {...popups, [idx]: popupData};
				if (this.mounted && count === props.formData.length) this.setState({popups});
			}).catch(() => {
				count++;
			});
		});
	}

	getStateFromProps(props: FieldProps<JSONSchemaObject>): Pick<State, "activeIdx"> | null {
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

	onHeaderAffixChange = (elem: HTMLElement, value: boolean) => {
		this.setState({scrollHeightFixed: value ? elem.scrollHeight : 0});
	}

	getLocalFormContext = (): FormContext => {
		if (this.localContext && this.localContextKey === this.state.scrollHeightFixed) {
			return this.localContext;
		}
		this.localContextKey = this.state.scrollHeightFixed;
		this.localContext = {...this.props.formContext, topOffset: this.props.formContext.topOffset + this.state.scrollHeightFixed};
		this.localContext.utils = ReactUtils(this.localContext);
		return this.localContext;
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

		const formContext = {...this.getLocalFormContext(), this: this, activeIdx: this.state.activeIdx};

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
