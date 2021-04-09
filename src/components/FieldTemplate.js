import * as React from "react";
import Context from "../Context";
import { Help, TooltipComponent } from "./components";
import { isMultiSelect, getUiOptions, formatErrorMessage, focusAndScroll, classNames } from "../utils";

export default class FieldTemplate extends React.Component {

	constructor(props) {
		super(props);
		if (getUiOptions(props.uiSchema).reserveId === false) {
			this.state = {};
			return;
		}
		const id = this.props.formContext.reserveId(this.props.id, this.receiveId);
		if (id) {
			this.state = {id};
		} else {
			this.state = {};
		}
	}

	canFocus = () => {
		const {formContext} = this.props;
		const {uiSchema = {}} = (formContext.getFormRef() || {props: {}}).props;
		return uiSchema.autoFocus !== false;
	}

	componentDidMount() {
		const {formContext} = this.props;
		const contextId = formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus, idToScroll} = _context;
		if (this.canFocus() && idToFocus !== undefined && this.state.id === idToFocus) {
			if (focusAndScroll(formContext, idToFocus, idToScroll)) {
				_context.idToFocus = undefined;
				_context.idToScroll = undefined;
			}
		}
	}

	componentWillReceiveProps(props) {
		if (getUiOptions(props.uiSchema).reserveId !== false && this.props.id !== props.id) {
			this.props.formContext.releaseId(this.props.id, this.receiveId);
			const id = props.formContext.reserveId(props.id, this.receiveId);
			id && this.receiveId(id);
		}
	}

	receiveId = (id) => {
		this.setState({id}, () => {
			const {idToFocus, idToScroll} = new Context(this.props.formContext.contextId);
			if (this.canFocus() && idToFocus === id) {
				focusAndScroll(this.props.formContext, idToFocus, idToScroll);
			}
		});
	}

	componentWillUnmount() {
		if (getUiOptions(this.props.uiSchema).reserveId === false) {
			return;
		}
		this.props.formContext.releaseId(this.props.id, this.receiveId);
	}

	render() {
		const {
			id,
			classNames: _classNames,
			children,
			rawErrors,
			rawHelp,
			description,
			hidden,
			required,
			displayLabel,
			schema,
			uiSchema,
			formContext,
			label: _label
		} = this.props;

		const label = "ui:title" in uiSchema
			? uiSchema["ui:title"]
			: "title" in schema
				? schema.title
				: _label;

		if (hidden || uiSchema["ui:field"] === "HiddenField" || uiSchema["ui:widget"] === "HiddenWidget") {
			return children;
		}
		const inlineHelp = uiSchema["ui:inlineHelp"];
		const belowHelp = uiSchema["ui:belowHelp"];
		const htmlId = this.state.id ? `_laji-form_${formContext.contextId}_${this.state.id}` : undefined;

		const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

		let warnings = [];
		const errors = (rawErrors || []).reduce((arr, err) => {
			if (err.includes("[warning]")) {
				warnings.push(formatErrorMessage(err));
			} else {
				arr.push(formatErrorMessage(err));
			}
			return arr;
		}, []);
		const warningClassName = (warnings.length > 0 && errors.length === 0) && "laji-form-warning-container";

		const {Label, errorsAsPopup} = this.props.formContext;
		const component = (errorsComponent) => (
			<div className={classNames(_classNames, warningClassName)} id={htmlId}>
				{label && _displayLabel ? <Label label={label} help={rawHelp} helpHoverable={uiSchema["ui:helpHoverable"]} helpPlacement={uiSchema["ui:helpPlacement"]} id={id} required={required || uiSchema["ui:required"]} _context={new Context(formContext.contextId)} /> : null}
				{_displayLabel && description ? description : null}
				<div>
					{inlineHelp ? <div className="pull-left">{children}</div> : children}
					{inlineHelp
						? (
							<div className="pull-left"><Help help={inlineHelp} id={`${htmlId}-inline-help`} /></div>
						) : null
					}
				</div>
				{belowHelp ? 
					<div className="small text-muted" dangerouslySetInnerHTML={{__html: belowHelp}} /> :
					null
				}
				{errorsComponent}
			</div>
		);

		const errorsComponent = (
			<React.Fragment>
				{errors.length > 0 ?
					<ul id={`laji-form-error-container-${id}`} className="laji-form-error-container">
						{errors.map((error, i) => (
							<li key={i}>{error}</li>
						))}
					</ul>
					: null}
				{warnings.length > 0 ?
					<ul  id={`laji-form-warning-container-${id}`} className="laji-form-warning-container">
						{warnings.map((warning, i) => (
							<li key={i}>{warning}</li>
						))}
					</ul>
					: null}
			</React.Fragment>
		);

		if (errorsAsPopup && (rawErrors || []).length) {
			return <TooltipComponent placement="bottom" tooltip={errorsComponent} className="location-chooser-errors">{component()}</TooltipComponent>;
		}
		return component(errorsComponent);
	}
}

