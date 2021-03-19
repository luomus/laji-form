import * as React from "react";
import * as PropTypes from "prop-types";
import { getInnerUiSchema } from "../../utils";
import { Button } from "../components";
import BaseComponent from "../BaseComponent";
import ReactContext from "../../ReactContext";

@BaseComponent
export default class InitiallyHiddenField extends React.Component {
	static contextType = ReactContext;
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
		const {Row, Col, Collapse} = this.context.theme;
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
