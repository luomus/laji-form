import React, { Component, PropTypes } from "react";
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
		let shouldShow = this.state.visible;
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<div>
				<Collapse in={!shouldShow}>
					<Row><Col xs={2} xsOffset={10}><Button style={{whiteSpace: "nowrap"}}onClick={this.toggleVisibility}>{this.props.schema.title || this.props.name} <span className="caret" /></Button></Col></Row>
				</Collapse>
				<Collapse in={shouldShow}>
					<div>
						<SchemaField {...this.props} {...this.state} />
					</div>
				</Collapse>
			</div>);
	}
}
