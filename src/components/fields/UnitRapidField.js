import React, { Component } from "react";
import PropTypes from "prop-types";
import { getInnerUiSchema, getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import { GlyphButton } from "../components";

@BaseComponent
export default class LineTransectUnitCodeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			uiSchema: PropTypes.object
		})
	}

	constructor(props) {
		super(props);
		this.state = {showSchema: false};
	}

	getToggleButton = () => {
		return (
			<GlyphButton
				key={`${this.props.idSchema.$id}-toggle-code-reader`}
				bsStyle={this.state.showSchema ? "default" : "primary"}
				onClick={() => {
					new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
					this.setState({showSchema: !this.state.showSchema});
				}}
				glyph="text-background"
			/>
		);
	}

	onCodeChange = (formData) => {
		new Context(this.props.registry.formContext.contextId).idToFocus = this.props.idSchema.$id
		this.props.onChange(formData);
		this.setState({showSchema: true});
	}

	render() {
		const toggleButton = this.getToggleButton();
		const {SchemaField} = this.props.registry.fields;
		return !this.state.showSchema ? (
				<div className="laji-form-field-template-item">
					<CodeReader onChange={this.onCodeChange} formID={getUiOptions(this.props.uiSchema).formID} className="laji-form-field-template-schema" />
					<div className="laji-form-field-template-buttons">{toggleButton}</div>
				</div>
			) :
			<SchemaField 
				{...this.props} 
				uiSchema={{
					...this.props.uiSchema, 
					...getInnerUiSchema(this.props.uiSchema),
					"ui:buttons": [...(this.props.uiSchema["ui:buttons"] || []), toggleButton]
				}} />;
	}
}

class CodeReader extends Component {
	constructor(props) {
		super(props);
		this.state = {value: ""};
		this.apiClient = new ApiClient();
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
