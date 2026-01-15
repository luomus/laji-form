import * as React from "react";
import { FormContext } from "../LajiForm";
import ReactContext from "../../ReactContext";
import { FieldProps } from "../../types";
import { SubmitHook } from "../../services/submit-hook-service";
import { Button, ErrorPanel, PanelError } from "../components";
import { JSONPointerToId, parseJSONPointer, schemaJSONPointer, uiSchemaJSONPointer } from "../../utils";

type Props = {
	schema: FieldProps["schema"]
	uiSchema: FieldProps["schema"]
	formContext: FormContext;
	jobs?: SubmitHook[];
	errorClickHandler: (id?: string | undefined) => void;
}

type State = {
	popped: boolean;
	poppedTouched?: boolean;
}

export class FailedBackgroundJobsPanel extends React.Component<Props, State> {
	static contextType = ReactContext;
	constructor(props: Props) {
		super(props);
		this.state = {popped: true};
	}

	dismissFailedJob = ({hook, running}: SubmitHook) => (e: React.MouseEvent) => {
		e.stopPropagation();
		if (running) return;
		this.props.formContext.services.submitHooks.remove(undefined, hook);
	};

	retryFailedJob = ({hook, running}: SubmitHook) => (e: React.MouseEvent) => {
		e.stopPropagation();
		if (running) return;
		hook();
	};

	poppedToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		this.setState({popped: !this.state.popped, poppedTouched: true});
	};

	render() {
		const {jobs = [], schema, uiSchema = {}, formContext: {translations}} = this.props;

		if (!jobs.length) return null;

		const {Glyphicon} = this.context.theme;

		const errors = jobs.reduce((_errors, error) => {
			const {lajiFormId, relativePointer, e, running} = error;
			if (!e) {
				return _errors;
			}
			const getJsonPointer = () => this.props.formContext.services.ids.getJSONPointerFromLajiFormIdAndRelativePointer(lajiFormId, relativePointer);
			const jsonPointer = getJsonPointer();
			const label = parseJSONPointer(uiSchema, `${uiSchemaJSONPointer(uiSchema, jsonPointer)}/ui:title`, true)
				|| parseJSONPointer(schema, `${schemaJSONPointer(schema, jsonPointer)}/title`, true);
			const retryButton = <Button key="retry" className="pull-right" variant="link" small={true} disabled={running} onClick={this.retryFailedJob(error)}><Glyphicon className={running ? "rotating" : ""} glyph="refresh" /> {translations.Retry}</Button>;
			const dismissButton = <Button key="dismiss" className="pull-right" variant="link" small={true} onClick={this.dismissFailedJob(error)}><Glyphicon glyph="ok" /> {translations.Dismiss}</Button>;

			const getId = () => {
				const jsonPointer = getJsonPointer();
				return `root_${JSONPointerToId(jsonPointer)}`;
			};
			const _error: PanelError = {
				getId,
				error: e,
				extra: [dismissButton, retryButton],
				disabled: running,
				label
			};
			return [..._errors, _error];
		}, [] as PanelError[]);

		if (!errors.length) return null;

		const footer = (
			<Button onClick={this.props.formContext.services.submitHooks.removeAll}><Glyphicon glyph="ok"/> {`${translations.Dismiss} ${translations.all}`}</Button>
		);

		return (
			<div className={`laji-form-error-list laji-form-failed-jobs-list${this.state.popped ? " laji-form-popped" : ""}`}
				style={this.state.popped ? {top: (this.props.formContext.topOffset || 0) + 5} : undefined} >
				<ErrorPanel 
					title={translations.FailedBackgroundJobs}
					errors={errors}
					showToggle={true}
					poppedToggle={this.poppedToggle}
					clickHandler={this.props.errorClickHandler}
					classNames="error-panel"
					footer={footer}
				/>
			</div>
		);
	}
}
