import React, {Component} from "react";
import Context from "../Context";
import { Label, Help } from "./components";
import { isMultiSelect, getUiOptions, formatErrorMessage, focusAndScroll } from "../utils";

export default class FieldTemplate extends Component {

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

	componentDidMount() {
		const {formContext} = this.props;
		const contextId = formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus, idToScroll} = _context;
		if (idToFocus !== undefined && this.props.id === idToFocus) {
			if (focusAndScroll(formContext, idToFocus, idToScroll)) {
				_context.idToFocus = undefined;
				_context.idToScroll = undefined;
			}
		}
	}

	receiveId = (id) => {
		this.setState({id});
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
		classNames,
		label,
		children,
		rawErrors,
		rawHelp,
		description,
		hidden,
		required,
		displayLabel,
		schema,
		uiSchema,
		formContext
		} = this.props;

		if (hidden || uiSchema["ui:field"] === "HiddenField" || uiSchema["ui:widget"] === "HiddenWidget") {
			return children;
		}
		const inlineHelp = uiSchema["ui:inlineHelp"];
		const belowHelp = uiSchema["ui:belowHelp"];
		const htmlId = this.state.id ? `_laji-form_${formContext.contextId}_${this.state.id}` : undefined;

		const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

		let warnings = [];
		const errors = (rawErrors || []).reduce((arr, err) => {
			if (err.includes("[warning]") || err.includes("[liveWarning]")) {
				warnings.push(formatErrorMessage(err));
			} else {
				arr.push(formatErrorMessage(err));
			}
			return arr;
		}, []);
		const warningClassName = (warnings.length > 0 && errors.length === 0) ? " laji-form-warning-container" : "";

		return (
			<div className={classNames + warningClassName} id={htmlId}>
				{label && _displayLabel ? <Label label={label} help={rawHelp} helpHoverable={uiSchema["ui:helpHoverable"]} id={id} required={required} _context={new Context(formContext.contextId)} /> : null}
				{_displayLabel && description ? description : null}
				<div>
					{inlineHelp ? <div className="float-left">{children}</div> : children}
					{inlineHelp ? (
						<div className="float-left"><Help help={inlineHelp} id={`${htmlId}-inline-help`} /></div>
						) : null
					}
				</div>
				{belowHelp ? 
					<div className="small text-muted" dangerouslySetInnerHTML={{__html: belowHelp}} /> :
					null
				}
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
			</div>
		);
	}
}

