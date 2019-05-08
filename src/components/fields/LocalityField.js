import React, { Component } from "react";
import PropTypes from "prop-types";
import { getInnerUiSchema, isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Button, GlyphButton } from "../components";
import { Row, Col, Panel, Modal } from "react-bootstrap";
import LajiForm from "../LajiForm";

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
		const fields = Object.keys(this.props.schema.properties);
		const fieldsWithValue = fields.filter(s => !isEmptyString(this.props.formData[s]));
		return (
			<Row>
				<Col xs={12}>
					<Panel>
						<Panel.Body>
								{fieldsWithValue.map((f, i) => (
								<span key={f}>{this.props.formData[f]}{i < fieldsWithValue.length - 1 ? ", " : ""}</span>
							))}
							<GlyphButton onClick={this.showEditor} glyph="pencil" bsStyle="default" className="pull-right"/>
						</Panel.Body>
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
		return (
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={this.hideEditor}>
				<Modal.Header closeButton={true}>
				</Modal.Header>
				<Modal.Body>
					<LajiForm 
						ref={this.setFormRef}
						{...this.props}
						uiSchema={getInnerUiSchema(this.props.uiSchema)}
						onSubmit={this.onSubmit}
						lang={this.props.formContext.lang}
						showShortcutButton={false}
						renderSubmit={false}
						validators={{}}
						warnings={{}}
					/>
					<Button block onClick={this.onSubmitClick} className="margin-top">OK</Button>
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
