import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import HorizontalWrapper from "../HorizontalWrapper";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"

export default class EventObserversField extends Component {
	constructor(props) {
		super(props);

		let uiSchema = JSON.parse(JSON.stringify(props.uiSchema));
		delete uiSchema["ui:field"];
		let lockedObserverUiSchema = JSON.parse(JSON.stringify(props.uiSchema.items));
		lockedObserverUiSchema.name = {"ui:field": "locked"};

		this.state = {uiSchema, lockedObserverUiSchema};
	}

	render() {
		return (
			<div>
				<SchemaField {...this.props} schema={this.props.schema.items} uiSchema={this.state.lockedObserverUiSchema} formData={this.state.lockedObserver} errorSchema={{}} onChange={this.onLockedObserverChange} />
				<SchemaField {...this.props} uiSchema={this.state.uiSchema} formData={this.state.formData} onChange={this.onChange} name={undefined} />
			</div>
		);
	}

	componentDidMount() {
		if (this.props.formData.length === 0) {
			let lockedObserver = getDefaultFormState(this.props.schema.items, {name: "Testimies"}, {});

			let formData = JSON.parse(JSON.stringify(this.props.formData));
			formData.shift();

			this.setState({lockedObserver, formData}, () => {
				this.props.onChange([lockedObserver])
			});
		}
	}

	componentWillReceiveProps(props) {
		let formData = JSON.parse(JSON.stringify(props.formData));
		formData.shift();
		this.setState({formData});
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
