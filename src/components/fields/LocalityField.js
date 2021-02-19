import * as React from "react";
import * as PropTypes from "prop-types";
import { getInnerUiSchema, isEmptyString, getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Button, GlyphButton } from "../components";
import { Row, Col, Modal } from "react-bootstrap";
import LajiForm from "../LajiForm";
import { getCenterAndRadiusFromGeometry } from "./MapField";
import ReactContext from "../../ReactContext";

@BaseComponent
export default class LocalityField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.object,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		const {radius: _radius, geometry} = getUiOptions(this.props.uiSchema);
		const fields = Object.keys(this.props.schema.properties);
		const values = fields.filter(s => !isEmptyString(this.props.formData[s])).map(f => this.props.formData[f]);
		const radius = typeof _radius === "number"
			? _radius
			: geometry
				? getCenterAndRadiusFromGeometry(geometry).radius
				: undefined;
		if (typeof radius === "number") {
			values.push(`(${this.props.formContext.translations.accuracy}: ${parseInt(radius)}m)`);
		}
		const {Panel} = this.context.theme;
		return (
			<Row>
				<Col xs={12}>
					<Panel className={getUiOptions(this.props.uiSchema).panelClassName}>
						{values.map((v, i) => (
							<span key={i}>{v}{i < values.length - 1 ? ", " : ""}</span>
						))}
						<GlyphButton onClick={this.showEditor} glyph="pencil" bsStyle="default" className="pull-right"/>
					</Panel>
				</Col>
				{this.state.modal && this.renderModal()}
			</Row>
		);
	}

	showEditor = () => {
		this.setState({modal: true});
	}

	hideEditor = () => {
		this.setState({modal: false});
	}

	setFormRef = (elem) => {
		this.lajiForm = elem;
	}

	renderModal = () => {
		const {onChange, ...props} = this.props; // eslint-disable-line @typescript-eslint/no-unused-vars
		return (
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={this.hideEditor}>
				<Modal.Header closeButton={true}>
				</Modal.Header>
				<Modal.Body>
					<LajiForm 
						ref={this.setFormRef}
						{...props}
						uiSchema={getInnerUiSchema(this.props.uiSchema)}
						onSubmit={this.onSubmit}
						lang={this.props.formContext.lang}
						showShortcutButton={false}
						renderSubmit={false}
						validators={{}}
						warnings={{}}
						apiClient={this.props.formContext.apiClient.apiClient}
						uiSchemaContext={this.props.formContext.uiSchemaContext}
					/>
					<Button block onClick={this.onSubmitClick}>OK</Button>
					<Button block onClick={this.hideEditor}>{this.props.formContext.translations.Cancel}</Button>
				</Modal.Body>
			</Modal>
		);
	}

	onSubmitClick = (e) => {
		this.lajiForm._onDefaultSubmit(e);
	}

	onSubmit = ({formData}) => {
		this.props.onChange(formData);
		this.hideEditor();
	}
}
