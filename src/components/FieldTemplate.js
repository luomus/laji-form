import React, {Component} from "react";
import Context from "../Context";
import { Label, Help } from "./components";
import { isMultiSelect, focusById, getUiOptions, formatErrorMessage } from "../utils";

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
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.id === idToFocus) {
			focusById(formContext, _context.idToFocus);
			_context.idToFocus = undefined;
		}
	}


	receiveId = (id) => {
		this.setState({id});
	}

	componentWillUnmount() {
		if (getUiOptions(this.props.uiSchema).reserveId === false) {
			return;
		}
		this.props.formContext.releaseId(this.props.id);
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

		if (hidden || uiSchema["ui:field"] === "HiddenField") {
			return children;
		}
		const inlineHelp = uiSchema["ui:inlineHelp"];
		const belowHelp = uiSchema["ui:belowHelp"];
		const htmlId = this.state.id ? `_laji-form_${formContext.contextId}_${this.state.id}` : undefined;

		const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

		let warnings = [];
		let liveErrors = [];
		const errors = (rawErrors || []).reduce((arr, err) => {
			if (err.indexOf("[warning]") > -1) {
				warnings.push(formatErrorMessage(err));
			} else if (err.indexOf("[liveError]") > -1) {
				liveErrors.push(formatErrorMessage(err));
			} else {
				arr.push(formatErrorMessage(err));
			}
			return arr;
		}, []);
		let shouldRevalidate = false;
		if (warnings.length === 0 && this.state.id) {
			const newWarnings = formContext.getWarnings(children.props.formData, id);
			if (newWarnings && this.props.formContext.invalidData()) {
				shouldRevalidate = true;
			} else {
				warnings = newWarnings;
			}
		}
		const warningClassName = (warnings.length > 0 && errors.length === 0) ? " laji-form-warning-container" : "";

		if (liveErrors.length === 0 && this.state.id) {
			const newLiveErrors = formContext.getLiveErrors(children.props.formData, id);
			if (newLiveErrors.length > 0) {
				if (this.props.formContext.invalidData()) {
					shouldRevalidate = false;
				} else {
					liveErrors = newLiveErrors;
				}
			}
		}

		liveErrors.forEach(error => {
			errors.push(error);
		});

		if (shouldRevalidate) {
			this.props.formContext.revalidate();
		}

		return (
			<div className={classNames + warningClassName} id={htmlId}>
				{label && _displayLabel ? <Label label={label} help={rawHelp} id={id} required={required} /> : null}
				{_displayLabel && description ? description : null}
				<div>
					{inlineHelp ? <div className="pull-left">{children}</div> : children}
					{inlineHelp ? (
						<div className="pull-left"><Help help={inlineHelp} id={`${htmlId}-inline-help`} /></div>
						) : null
					}
				</div>
				{belowHelp ? 
					<div className="small text-muted" dangerouslySetInnerHTML={{__html: belowHelp}} /> :
					null
				}
				{errors.length > 0 ?
					<div id={`laji-form-error-container-${id}`}>
						<p></p>
						<ul>
							{errors.map((error, i) => (
								<li key={i} className="text-danger">{error}</li>
							))}
						</ul>
					</div> : null}
				{warnings.length > 0 ?
					<div id={`laji-form-warning-container-${id}`}>
						<p></p>
						<ul>
							{warnings.map((warning, i) => (
								<li key={i} className="text-warning">{warning}</li>
							))}
						</ul>
					</div> : null}
			</div>
		);
	}
}

