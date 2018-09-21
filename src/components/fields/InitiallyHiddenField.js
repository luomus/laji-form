import React, { Component } from "react";
import PropTypes from "prop-types";
import { Row, Col, Collapse } from "react-bootstrap";
import { getInnerUiSchema } from "../../utils";
import { Button } from "../components";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class InitiallyHiddenField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object
			})
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {visible: false, ...this.getStateFromProps(props)};
	}

	getStateFromProps(props) {
		return {uiSchema: getInnerUiSchema(props.uiSchema)};
	}

	toggleVisibility = () => {
		this.setState({visible: !this.state.visible});
	}


	render() {
		let shouldShow = this.state.visible;
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<div>
				<Collapse in={!shouldShow}>
					<Row><Col xs={2} xsOffset={10}>
						<Button className="button-right" onClick={this.toggleVisibility}>
							{this.props.schema.title || this.props.name} <span className="caret" />
						</Button>
					</Col></Row>
				</Collapse>
				<Collapse in={shouldShow}>
					<div>
						<SchemaField {...this.props} {...this.state} />
					</div>
				</Collapse>
			</div>);
	}
}
