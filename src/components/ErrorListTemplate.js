import * as React from "react";
import { Button, ErrorPanel } from "./components";
import { parseJSONPointer, formatErrorMessage } from "../utils";
import Context from "../Context";
import ReactContext from "../ReactContext";

export default class ErrorListTemplate extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = {popped: false, poppedTouched: false};
		new Context(this.props.formContext.contextId).errorList = this;
	}

	expand = () => {
		if (!this.state.popped) this.setState({popped: true});
		this.refs.errorPanel.expand();
		this.refs.warningPanel.expand();
	}

	poppedToggle = (e) => {
		e.stopPropagation();
		this.setState({popped: !this.state.popped, poppedTouched: true});
	}

	revalidate = () => {
		const that = new Context(this.props.formContext.contextId).formInstance;
		that.validate();
		this.refs.errorPanel.expand();
		this.refs.warningPanel.expand();
	}

	submitWithWarnings = () => {
		const that = new Context(this.props.formContext.contextId).formInstance;
		that.validateAndSubmit(!"warnings");
	}

	render() {
		const {errorSchema, schema, formContext, uiSchema} = this.props;
		const {"ui:disabled": disabled, "ui:readonly": readonly} = uiSchema;
		const {contextId, translations} = formContext;
		const that = new Context(contextId).formInstance;
		const clickHandler = that.errorClickHandler;

		function walkErrors(path, id, errorSchema) {
			const {__errors, ...properties} = errorSchema;
			let {errors, warnings} = (__errors || []).reduce(({errors, warnings}, _error) => {
				const _schema = parseJSONPointer(schema, path);
				if (_error.includes("[warning]")) {
					warnings.push({
						label: _schema.title,
						error: formatErrorMessage(_error),
						id: id
					});
				} else {
					errors.push({
						label: _schema.title,
						error: formatErrorMessage(_error),
						id: id
					});
				}
				return {errors, warnings};
			}, {errors: [], warnings: []});
			Object.keys(properties).forEach(prop => {
				let _path = path;
				if (prop.match(/^\d+$/)) _path = `${_path}/items`;
				else _path = `${_path}/properties/${prop}`;
				const childErrors = walkErrors(_path, `${id}_${prop}`, errorSchema[prop]);
				errors = [...errors, ...childErrors.errors];
				warnings = [...warnings, ...childErrors.warnings];
			});
			return {errors, warnings};
		}

		const {Glyphicon} = this.context.theme;
		const {errors, warnings} = walkErrors("", "root", errorSchema);
		return (
			<div className={`laji-form-error-list${this.state.popped ? " laji-form-popped" : ""}${errors.length === 0 ? " laji-form-warning-list" : ""}`}
				 style={this.state.popped ? {top: (this.props.formContext.topOffset || 0) + 5} : null}>
				<ErrorPanel classNames="error-panel"
				            ref="errorPanel"
				            errors={errors}
				            title={translations.Errors}
				            clickHandler={clickHandler}
				            showToggle={true}
				            poppedToggle={this.poppedToggle}/>
				<ErrorPanel classNames="warning-panel"
				            ref="warningPanel"
				            errors={warnings}
				            title={translations.Warnings}
				            clickHandler={clickHandler}
				            showToggle={errors.length === 0}
				            poppedToggle={this.poppedToggle}/>
				<div className="panel-footer">
					<div>
						{errors.length > 0
							? <Button onClick={this.revalidate}><Glyphicon glyph="refresh"/> {translations.Revalidate}</Button>
							: <Button onClick={this.submitWithWarnings} disabled={disabled || readonly}>{translations.SubmitWithWarnings}</Button>
						}
					</div>
				</div>
			</div>
		);
	}
}
