import React, { Component } from "react";
import PropTypes from "prop-types";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { getInnerUiSchema, getUiOptions, isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import { Button, GlyphButton } from "../components";
import { Tooltip, OverlayTrigger, Glyphicon } from "react-bootstrap";

@BaseComponent
export default class UnitShorthandField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			uiSchema: PropTypes.object
		})
	}

	constructor(props) {
		super(props);
		this.state = {showSchema: false};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	getStateFromProps = (props) => {
		let {showSchema} = this.state;
		if (!this.state.showSchema && !isEmptyString(props.formData[getUiOptions(props.uiSchema).shorthandField])) {
			showSchema = true;
		}
		return {showSchema};
	}

	getToggleButton = () => {
		return (
			<GlyphButton
				key={`${this.props.idSchema.$id}-toggle-code-reader-schema`}
				bsStyle={this.state.showSchema ? "default" : "primary"}
				onClick={() => {
					new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
					this.setState({showSchema: !this.state.showSchema});
				}}
				glyph="resize-small"
			/>
		);
	}

	onCodeChange = (formData) => {
		new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
		this.props.onChange(getDefaultFormState(this.props.schema, formData, this.props.registry.definitions));
		this.setState({showSchema: true});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		const shorthandFieldName = getUiOptions(this.props.uiSchema).shorthandField;
		const toggleButton = this.getToggleButton();
		return !this.state.showSchema ? (
				<div className="laji-form-field-template-item">
					<CodeReader onChange={this.onCodeChange} value={this.props.formData[shorthandFieldName]} formID={getUiOptions(this.props.uiSchema).formID} className="laji-form-field-template-schema" />
					<div className="laji-form-field-template-buttons">{toggleButton}</div>
				</div>
			) : (
				<div>
					<SchemaField 
						{...this.props} 
						uiSchema={getInnerUiSchema({...this.props.uiSchema, "ui:buttons": [toggleButton]})} />
				</div>
			);
	}
}

@BaseComponent
class CodeReader extends Component {
	constructor(props) {
		super(props);
		this.state = {value: ""};
		this.state = this.getStateFromProps(props);
		this.apiClient = new ApiClient();
	}

	getStateFromProps = (props) => {
		console.log(props.value);
		let state = this.state;
		if (this.state.value === "" && !isEmptyString(props.value)) {
			state.value = props.value;
		}
		return state;
	}

	componentDidMount() {
		this.mounted = true;
		this.refs.input.focus();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		return <input type="text" 
			ref="input"
			className="form-control" 
			value={this.state.value}
			onChange={({target: {value}}) => this.setState({value})}
			onBlur={this.getCode}
			onKeyDown={e => {
				if (e.key === "Enter") {
					this.getCode();
				}
			}}
			/>;
	}

	getCode = () => {
		const {value} = this.state;
		value.length >= 3 && this.apiClient.fetchCached("/autocomplete/unit", {q: value, formID: this.props.formID}).then(response => {
			this.mounted && this.props.onChange(response.payload.unit);
		});
	}
}
