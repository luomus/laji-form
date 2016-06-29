import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import { Row, Col, Collapse, DropdownButton } from "react-bootstrap";
import Button from "../Button";

export default class InitiallyHiddenField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {visible: false, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;

		let options = uiSchema["ui:options"];
		return {uiSchema: (options && options.uiSchema) || undefined}
	}

	toggleVisibility = () => {
		this.setState({visible: !this.state.visible});
	}

	shouldShow = (props) => {
		if (this.state.visible) return true;
		let formData = props.formData;
		console.log(props);
		if (formData) {
			if (props.schema.type === "object" && Object.keys(formData).length > 0) {
				for (let prop in formData) {
					const value = formData[prop];
					if (value !== undefined && value !== null && (!props.schema.properties[prop].default || (props.schema.properties[prop].default !== value))) return true;
				}
			}
			else if (props.schema.type === "array" && formData.length > 0) {
				for (let item in formData) {
					for (let prop in item) {
						const value = item[prop];
						if (value !== undefined && value !== null && (!props.schema.items.properties[prop].default || (props.schema.items.properties[prop].default !== value))) return true;
					}
				}
			}
			else throw new Error("schema type should be object or array for InitiallyHiddenField!");
		}
	}

	render() {
		let shouldShow = this.shouldShow(this.props);
		return (
			<div>
				<Collapse in={!shouldShow}>
					<Row><Col xs={2} xsOffset={10}><Button onClick={this.toggleVisibility}>{this.props.schema.title || this.props.name} <span className="caret" /></Button></Col></Row>
				</Collapse>
				<Collapse in={shouldShow}>
					<div>
						<SchemaField {...this.props} {...this.state} />
					</div>
				</Collapse>
			</div>);
	}
}
