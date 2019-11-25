import React, { Component } from "react";
import PropTypes from "prop-types";
import { getInnerUiSchema, isEmptyString, getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Button, GlyphButton } from "../components";
import { Row, Col, Panel, Modal } from "react-bootstrap";
import PanelBody from "react-bootstrap/lib/PanelBody";
import LajiForm from "../LajiForm";
import { getCenterAndRadiusFromGeometry } from "./MapField";

@BaseComponent
export default class LocalityField extends Component {
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
		return (
			<Row>
				<Col xs={12}>
					<Panel className={getUiOptions(this.props.uiSchema).panelClassName}>
						<PanelBody>
								{values.map((v, i) => (
								<span key={i}>{v}{i < values.length - 1 ? ", " : ""}</span>
							))}
							<GlyphButton onClick={this.showEditor} glyph="pencil" bsStyle="default" className="pull-right"/>
						</PanelBody>
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
		const {onChange, ...props} = this.props; // eslint-disable-line no-unused-vars
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
