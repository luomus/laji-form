import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import HorizontalWrapper from "../HorizontalWrapper";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"

export default class EventObserversField extends Component {
	constructor(props) {
		super(props);

		let uiSchema = JSON.parse(JSON.stringify(props.uiSchema));
		delete uiSchema["ui:field"];
		let lockedObserverUiSchema = props.uiSchema.items ? JSON.parse(JSON.stringify(props.uiSchema.items)) : {};
		lockedObserverUiSchema.name = {"ui:field": "locked"};

		this.state = {uiSchema, lockedObserverUiSchema};
	}

	render() {
		return (
			<div>
				<SchemaField {...this.props} schema={this.props.schema.items} uiSchema={this.state.lockedObserverUiSchema} formData={this.state.lockedObserver} errorSchema={this.props.errorSchema[0]} onChange={this.onLockedObserverChange} />
				<SchemaField {...this.props} uiSchema={this.state.uiSchema} formData={this.state.formData} errorSchema={this.state.errorSchema} onChange={this.onChange} name={undefined} />
			</div>
		);
	}

	getErrorSchema = (props) => {
		let errorSchema = {};
		Object.keys(props.errorSchema).forEach((key) => {
			if (key === "0") return;
			errorSchema[parseInt(key) - 1] = props.errorSchema[key];
		});
		return errorSchema;
	}

	componentDidMount() {
		let formData = JSON.parse(JSON.stringify(this.props.formData));

		let lockedObserver = undefined;
		if  (this.props.formData.length) {
			// remove locked observer from data
			lockedObserver = formData.shift();
		} else {
			lockedObserver = getDefaultFormState(this.props.schema.items, {name: "Testimies"}, {});
		}

		let errorSchema = this.getErrorSchema(this.props);

		this.setState({lockedObserver, formData, errorSchema}, () => {
			if (this.props.formData.length === 0) {
				formData.unshift(lockedObserver);
				this.props.onChange(formData);
			}
		});
	}

	componentWillReceiveProps(props) {
		let formData = JSON.parse(JSON.stringify(props.formData));
		formData.shift();
		let errorSchema = this.getErrorSchema(props);
		this.setState({formData, errorSchema});
	}

	onLockedObserverChange = (lockedObserver) => {
		let formData = this.props.formData;
		formData[0] = lockedObserver;
		this.setState({lockedObserver}, () => {
			this.props.onChange(formData);
		});
	}

	onChange = (formData) => {
		formData.unshift(this.state.lockedObserver);
		this.props.onChange(formData);
	}
}
