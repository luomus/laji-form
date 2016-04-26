import React, { Component } from "react";
import Form from "react-jsonschema-form";
import Api from "../api";
import UnitsField from "./fields/UnitsField";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {
	constructor(props) {
		super(props);
		this.state = {
			schema: undefined,
			uiSchema: undefined,
			formData: this.props.data,
			lastApiCallFailed: false,
			errorMsg: undefined
		};
		this.api = new Api(props.apiKey);
	}

	render() {
		const {schema, uiSchema, formData, errorMsg, lastApiCallFailed} = this.state;
		if (lastApiCallFailed) return (<ErrorBox errorMsg={errorMsg} />);
		return (schema == null) ? null :
			<Form
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				onChange={this.onFormDataChange}
				fields={{unitTripreport: UnitsField}}
				onError={log("errors")} />
	}

	componentDidMount() {
		let formId = this.props.formId;
		if (formId !== undefined && formId !== null) this.changeForm(formId);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.formId !== this.props.formId) {
			this.changeForm(nextProps.formId);
		}
	}

	changeForm = (id) => {
		this.api.getForm(id, (response) => {
			this.setState({schema: response.schema, uiSchema: response.uiSchema, lastApiCallFailed: false, errorMsg: undefined});
		}, (response) => {
			this.setState({schema: undefined, uiSchema: undefined, lastApiCallFailed: true, errorMsg: response});
		});
	}

	onFormDataChange = ({formData}) => this.setState({formData});
}
