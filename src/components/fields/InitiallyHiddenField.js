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

	render() {
		return (
			<div>
				<Collapse in={!this.state.visible}>
					<Row><Col xs={2} xsOffset={10}><DropdownButton bsStyle="info" onClick={this.toggleVisibility} title={this.props.schema.title || this.props.name} /></Col></Row>
				</Collapse>
				<Collapse in={this.state.visible}>
					<div>
						<SchemaField {...this.props} {...this.state} />
					</div>
				</Collapse>
			</div>);
	}
}
