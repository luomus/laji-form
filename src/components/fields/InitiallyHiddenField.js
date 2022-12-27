import * as React from "react";
import * as PropTypes from "prop-types";
import { Button } from "../components";
import ReactContext from "../../ReactContext";
import NextSchemaField from "../NextSchemaField";

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

	toggleVisibility = () => {
		this.setState({visible: !this.state.visible});
	}

	render() {
		let shouldShow = this.state.visible;
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
						<NextSchemaField {...this.props} {...this.state} />
					</div>
				</Collapse>
			</div>);
	}
}
