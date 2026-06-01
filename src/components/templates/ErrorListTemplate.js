import * as React from "react";
import { Button, ErrorPanel } from "../components";
import { parseJSONPointer, formatErrorMessage } from "../../utils";
import ReactContext from "../../ReactContext";

export default class ErrorListTemplate extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = {popped: false, poppedTouched: false};
		this.props.formContext.services.rootInstance.setErrorListInstance(this);
	}

	expand = () => {
		if (!this.state.popped) this.setState({popped: true});
		this.refs.errorPanel.expand();
		this.refs.warningPanel.expand();
	};

	poppedToggle = (e) => {
		e.stopPropagation();
		this.setState({popped: !this.state.popped, poppedTouched: true});
	};

	revalidate = () => {
		this.props.formContext.services.rootInstance.validate();
		this.refs.errorPanel.expand();
		this.refs.warningPanel.expand();
	};

	submitWithWarnings = () => {
		this.props.formContext.services.rootInstance.submitWithWarnings();
	};

	render() {
		const {errorSchema, schema, formContext, uiSchema} = this.props;
		const {"ui:disabled": disabled, "ui:readonly": readonly} = uiSchema;
		const {translations} = formContext;
		const clickHandler = formContext.services.focus.focus;

		function walkErrors(path, id, errorSchema, uiSchema, defaultTitle) {
			const {__errors, ...properties} = errorSchema;
			try {
				parseJSONPointer(schema, path);
			} catch (e) {
				console.warn("If you see this warning, tell Olli about with repro steps please");
			}
			// TODO shouldn't really default to {} here. If the errors do not follow the schema, there's another bug somewhere
			// and this is a mere symptom. This was added because I absolutely could not repro the bug.
			// https://luomus-ict.slack.com/archives/CQUQRRATU/p1779693889123989
			const _schema = parseJSONPointer(schema, path) || {};
			const title = _schema.title || defaultTitle;

			let {externalErrors, errors, warnings} = (__errors || []).reduce(({externalErrors, errors, warnings}, _error) => {
				const error = {
					label: title,
					error: formatErrorMessage(_error),
					id: id
				};
				if (_error.includes("[external]")) {
					externalErrors.push(error);
				} else if (_error.includes("[warning]")) {
					warnings.push(error);
				} else {
					errors.push(error);
				}
				return {externalErrors, errors, warnings};
			}, {externalErrors: [], errors: [], warnings: []});
			Object.keys(properties).forEach(prop => {
				let _path = path;
				if (prop.match(/^\d+$/)) _path = `${_path}/items`;
				else _path = `${_path}/properties/${prop}`;
				const _defaultTitle = _schema.type === "array" || uiSchema["ui:multiLanguage"] ? `${title} (${prop})` : prop;
				const childErrors = walkErrors(_path, `${id}_${prop}`, errorSchema[prop], uiSchema[prop] || {}, _defaultTitle);
				externalErrors = [...externalErrors, ...childErrors.externalErrors];
				errors = [...errors, ...childErrors.errors];
				warnings = [...warnings, ...childErrors.warnings];
			});
			return {externalErrors, errors, warnings};
		}

		const {Glyphicon} = this.context.theme;
		const {externalErrors, errors, warnings} = walkErrors("", "root", errorSchema, uiSchema, "");
		const footer = (
			errors.length > 0
				? <Button onClick={this.revalidate}><Glyphicon glyph="refresh"/> {translations.Revalidate}</Button>
				: <Button onClick={this.submitWithWarnings} variant={"success"} disabled={disabled || readonly}>{translations.SubmitWithWarnings}</Button>
		);
		return (
			<div className={`laji-form-error-list${this.state.popped ? " laji-form-popped" : ""}${errors.length === 0 ? " laji-form-warning-list" : ""}`}
				style={this.state.popped ? {top: (this.props.formContext.topOffset || 0) + 5} : null}>
				<ErrorPanel
					classNames="error-panel"
					ref="externalErrorPanel"
					errors={externalErrors}
					title={translations.ExternalErrors}
					clickHandler={clickHandler}
					showToggle={true}
					poppedToggle={this.poppedToggle}
					popped={this.state.popped}
					formContext={this.props.formContext}
					footer={null} />
				<ErrorPanel classNames="error-panel"
					ref="errorPanel"
					errors={errors}
					title={translations.Errors}
					clickHandler={clickHandler}
					showToggle={externalErrors.length === 0}
					poppedToggle={this.poppedToggle}
					popped={this.state.popped}
					formContext={this.props.formContext}
					footer={warnings.length === 0 ? footer : null} />
				<ErrorPanel classNames="warning-panel"
					ref="warningPanel"
					errors={warnings}
					title={translations.Warnings}
					clickHandler={clickHandler}
					showToggle={externalErrors.length === 0 && errors.length === 0}
					poppedToggle={this.poppedToggle}
					popped={this.state.popped}
					formContext={this.props.formContext}
					footer={footer} />
			</div>
		);
	}
}
