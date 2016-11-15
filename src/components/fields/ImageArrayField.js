import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { Modal, Row, Col, Glyphicon, Tooltip, OverlayTrigger } from "react-bootstrap";
import DropZone from "react-dropzone";
import { Button, Alert } from "../components";
import Form from "react-jsonschema-form";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import { getUiOptions } from "../../utils";

export default class ImagesArrayField extends Component {

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient();
		this._context = new Context("IMAGE_ARRAY_FIELD");
		if (!this._context.metadatas) this._context.metadatas = {};
		this.mainContext = new Context();
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let imgURLs = [];
		(props.formData || []).forEach((item, i) => {
			imgURLs.push(undefined);
			this.apiClient.fetchCached("/images/" + item).then(response => {
				if (!this.mounted) return;
				this.setState({imgURLs: update(this.state.imgURLs, {[i]: {$set: response.squareThumbnailURL}})});
			})
		});
		return {imgURLs};
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const {schema, uiSchema, name, formContext} = this.props;
		const {translations} = formContext;

		const {description} = getUiOptions(uiSchema);
		const title = (schema.title === undefined) ? name : schema.title;
		const {TitleField} = this.props.registry.fields;

		const tooltip = (
			<Tooltip id={`${this.props.idSchema.$id}-drop-zone-tooltip`}>
				{translations.DropOrSelectFiles}
			</Tooltip>
		);

		return (
			<Row>
				<Col xs={12}>
					<TitleField title={title} />
					{description !== undefined ? <DescriptionField description={description} /> : null}
					<div className="laji-form-images">
						{this.renderImgs()}
						<OverlayTrigger overlay={tooltip}>
							<DropZone ref="dropzone" className={"laji-form-drop-zone" + (this.state.dragging ? " dragging" : "")}
											  accept="image/*"
											  onDragEnter={() => {this.setState({dragging: true})}}
											  onDragLeave={() => {this.setState({dragging: false})}}
											  onDrop={files => {
													this.setState({dragging: false});
													this.onFileFormChange(files)}
												}><a href="#" onClick={e => e.preventDefault()}><Glyphicon glyph="camera" /></a></DropZone>
						</OverlayTrigger>
						{this.renderModal()}
						{this.renderAlert()}
					</div>
				</Col>
			</Row>
		);
	}

	renderImgs = () => {
		return this.state.imgURLs ?
			this.state.imgURLs.map((dataURL, i) => (
				<div key={i} className="img-container">
					<a onClick={this.onImgClick(i)}><img src={dataURL} /></a>
					<Button bsStyle="danger" className="img-remove" onClick={this.onImgRmClick(i)}>✖</Button>
				</div>
			)) :
			null;
	}

	onImgClick = (i) => () => {
		const item = this.props.formData[i];
		const state = {modalOpen: true};
		this.apiClient.fetchCached("/images/" + item).then(response => {
			this._context.metadatas[item] = response;
			state.modalImgSrc = response.originalURL;
			state.modalMetadata = this._context.metadatas[item];
			this.setState(state);
		});
	}

	onImgRmClick = (i) => () => {
		this.props.onChange(update(this.props.formData, {$splice: [[i, 1]]}));
	}

	renderModal = () => {
		const {state} = this;
		const {translations} = this.props.registry.formContext;
		const {metadataSchemas} = getUiOptions(this.props.uiSchema);
		return state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={() => this.setState({modalOpen: false})}>
				<Modal.Header closeButton={true} />
				<Modal.Body>
					<div className="laji-form image-modal-content">
						<img src={state.modalImgSrc} />
						{state.modalMetadata && metadataSchemas ? <Form
							schema={metadataSchemas.schema}
							uiSchema={metadataSchemas.uiSchema}
							formData={state.modalMetadata}
							onSubmit={this.onImageMetadataUpdate}>
						<Button type="submit">{translations.Submit}</Button>
						</Form> : null}
					</div>
				</Modal.Body>
			</Modal> : null;
	}

	renderAlert = () => {
		return this.state.alert ? (
			<Alert onOk={() => {this.state.alert(); this.setState({alert: undefined});}}>
				{this.props.formContext.translations.PictureError}
			</Alert>) : null;
	}

	onFileFormChange = (files) => {
		const {onChange} = this.props;
		let formData = this.props.formData || [];

		this.mainContext.pushBlockingLoader();

		this.processFiles(files).then(() => {
			const formDataBody = files.reduce((body, file) => {
				body.append("data", file);
				return body;
			}, new FormData());

			return this.apiClient.fetch("/images", undefined, {
				method: "POST",
				body: formDataBody
			});
		}).then(response => {
			return Promise.all(response.map(item => {
				return this.apiClient.fetch(`/images/${item.id}`, undefined, {
					method: "POST"
				});
			}));
		}).then(response => {
			onChange([...formData, ...response.map(({id}) => id)]);
			this.mainContext.popBlockingLoader();
		}).catch(() => {
			this.setState({alert: () => {
				this.mainContext.popBlockingLoader();
			}})
		});
	}

	addNameToDataURL = (dataURL, name) => {
		return dataURL.replace(";base64", `;name=${name};base64`);
	}

	processFiles = (files) => {
		return Promise.all([].map.call(files, this.processFile));
	}

	processFile = (file) => {
		const {name, size, type} = file;
		return new Promise(resolve => {
			const reader = new window.FileReader();
			reader.onload = (event) => {
				resolve({
					dataURL: this.addNameToDataURL(event.target.result, name),
					name,
					size,
					type
				});
			};
			reader.readAsDataURL(file);
		});
	}

	onImageMetadataUpdate = ({formData}) => {
		this.mainContext.pushBlockingLoader();
		this.apiClient.fetch(`/images/${formData.id}`, undefined, {
			method: "PUT",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(formData)
		}).then(response => {
			this.mainContext.popBlockingLoader();
		});
	}
}
