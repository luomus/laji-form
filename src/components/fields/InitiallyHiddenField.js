import React, { Component, PropTypes } from "react";
import { Row, Col, Collapse } from "react-bootstrap";
import { getInnerUiSchema } from "../../utils";
import { Button } from "../components";
import FormField from "../BaseComponent";

@FormField
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
