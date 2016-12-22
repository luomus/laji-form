import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { Modal, Row, Col, Glyphicon, Tooltip, OverlayTrigger, Alert } from "react-bootstrap";
import DropZone from "react-dropzone";
import { Button, Alert as PopupAlert } from "../components";
import LajiForm from "../LajiForm";
import { getUiOptions, parseDotPath } from "../../utils";

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
			this.apiClient.fetchCached("/images/" + item).then(response => {
				if (!this.mounted) return;
				this.setState({imgURLs: update(this.state.imgURLs, {[i]: {$set: response.squareThumbnailURL}})});
			});
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
		this.apiClient.fetch("/images/" + item).then(response => {
			console.log(response);
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
		const {lang, translations} = this.props.registry.formContext;

		const metadataForm = this.state.metadataForm || {};

		if (this.state.modalOpen && !state.metadataForm) {
			this.apiClient.fetchCached("/forms/JX.111712", {lang, format: "schema"})
				.then(metadataForm => {
					if (this.mounted) {
						this.setState({metadataForm});
					}
				});
		}

		const {metadataSaveSuccess} = this.state;

		return state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true}
			       onHide={() => this.setState({modalOpen: false, metadataSaveSuccess: undefined})}>
				<Modal.Header closeButton={true} />
				<Modal.Body>
					<div className="laji-form image-modal-content">
						<img src={state.modalImgSrc} />
						{state.modalMetadata && metadataForm.schema ?
							<LajiForm
								{...metadataForm}
								contextId={this.props.idSchema.$id}
								formData={state.modalMetadata}
								onChange={formData => this.setState({modalMetadata: formData})}
								onSubmit={this.onImageMetadataUpdate}
								lang={lang}>
								{(metadataSaveSuccess !== undefined) ?
									(
										<Alert bsStyle={metadataSaveSuccess ? "success" : "danger"}>
											{translations[metadataSaveSuccess ? "SaveSuccess" : "SaveFail"]}
										</Alert>
									) : null
								}
							</LajiForm>
						: null}
					</div>
				</Modal.Body>
			</Modal> : null;
	}

	renderAlert = () => {
		return this.state.alert ? (
			<PopupAlert onOk={() => {this.state.alert(); this.setState({alert: undefined});}}>
				{this.props.formContext.translations.SaveFail}
			</PopupAlert>) : null;
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
			const defaultMetadata = this.getDefaultMetadata();
			return Promise.all(response.map(item => {
				return this.apiClient.fetch(`/images/${item.id}`, undefined, {
					method: "POST",
					headers: {
						"accept": "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(defaultMetadata)
				});
			}));
		}).then(response => {
			onChange([...formData, ...response.map(({id}) => id)]);
			this.mainContext.popBlockingLoader();
		}).catch(() => {
			this.mainContext.popBlockingLoader();
			this.setState({alert: () => {;}})
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
				"accept": "application/json",
				"content-type": "application/json"
			},
			body: JSON.stringify(formData)
		}).then(response => {
			this.mainContext.popBlockingLoader();
			this.setState({metadataSaveSuccess: true});
			this._context.defaultMetadata = formData;
		}).catch(() => {
			this.mainContext.popBlockingLoader();
			this.setState({metadataSaveSuccess: false});
		});
	}

	getDefaultMetadata = () => {
		const {capturerVerbatimPath} = getUiOptions(this.props.uiSchema);
		const defaultMetadata = this._context.defaultMetadata || {};

		if (this.mainContext.formData && capturerVerbatimPath && !defaultMetadata.capturerVerbatim) {
			defaultMetadata.capturerVerbatim = parseDotPath(this.mainContext.formData, capturerVerbatimPath);
		}
		if (!this._context.defaultMetadata) {
			defaultMetadata.intellectualRights = "MZ.intellectualRightsCC-BY-SA-4.0";
		}

		this._context.defaultMetadata = defaultMetadata;

		return defaultMetadata;
	}
}
