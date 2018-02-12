import React, { Component, PureComponent } from "react";
import update from "immutability-helper";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField";
import { Modal, Row, Col, Glyphicon, Tooltip, OverlayTrigger, Alert } from "react-bootstrap";
import DropZone from "react-dropzone";
import { DeleteButton, Alert as PopupAlert } from "../components";
import LajiForm from "../LajiForm";
import { getUiOptions, parseJSONPointer } from "../../utils";
import BaseComponent from "../BaseComponent";

const MAX_IMAGE_SIZE = 20000000;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/gif", "application/pdf"];

@BaseComponent
export default class ImageArrayField extends Component {

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient();
		this._context = new Context("IMAGE_ARRAY_FIELD");
		if (!this._context.metadatas) this._context.metadatas = {};
		this.mainContext = this.getContext();
		this.state = {};
	}


	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const {schema, uiSchema, idSchema, name, formContext} = this.props;
		const {translations} = formContext;

		const {description, titleClassName} = getUiOptions(uiSchema);
		const title = (schema.title === undefined) ? name : schema.title;
		const {TitleField} = this.props.registry.fields;

		const tooltip = (
			<Tooltip id={`${this.props.idSchema.$id}-drop-zone-tooltip`}>
				<span>{translations.DropOrSelectFiles}. </span>
				<span>
					{translations.AllowedFileFormats} {this.getAllowedImageFormatsAsString()} {translations.and} {translations.allowedFileSize} {this.getMaxFileSizeAsString()}.
				</span>
			</Tooltip>
		);

		const onDragEnter = () => {this.setState({dragging: true});};
		const onDragLeave = () => {this.setState({dragging: false});};
		const onDrop = files => {
			this.setState({dragging: false});
			this.onFileFormChange(files);
		};
		const onGlyphClick = e => e.preventDefault();

		return (
			<Row>
				<Col xs={12}>
					<TitleField title={title} className={titleClassName} help={uiSchema["ui:help"]} id={idSchema.$id}/>
					{description !== undefined ? <DescriptionField description={description} /> : null}
					<div className="laji-form-images">
						{this.renderImgs()}
						<OverlayTrigger overlay={tooltip}>
							<DropZone className={"laji-form-drop-zone" + (this.state.dragging ? " dragging" : "")}
							          accept="image/*, application/pdf"
							          onDragEnter={onDragEnter}
							          onDragLeave={onDragLeave}
							          onDrop={onDrop
												}>
								<a href="#" onClick={onGlyphClick}><Glyphicon glyph="camera" /></a>
							</DropZone>
						</OverlayTrigger>
						{this.renderModal()}
						{this.renderAlert()}
					</div>
				</Col>
			</Row>
		);
	}

	renderImgs = () => {
		return this.props.formData.map((item, i) => (
			<div key={i} className="img-container">
				<a onClick={this.onImgClick(i)}><Thumbnail id={item} /></a>
				<DeleteButton corner={true} translations={this.props.formContext.translations} onClick={this.onImgRmClick(i)}>✖</DeleteButton>
			</div>
		));
	}

	onImgClick = (i) => () => {
		const item = this.props.formData[i];
		const state = {modalOpen: true};
		this.apiClient.fetch(`/images/${item}`).then(response => {
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
		
		const onHide = () => this.setState({modalOpen: false, metadataSaveSuccess: undefined});
		const onChange = formData => this.setState({modalMetadata: formData});

		return state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true}
			       onHide={onHide}>
				<Modal.Header closeButton={true} />
				<Modal.Body>
					<div className="laji-form image-modal-content">
						<img src={state.modalImgSrc} />
						{state.modalMetadata && metadataForm.schema ?
							<LajiForm
								{...metadataForm}
								uiSchema={{...metadataForm.uiSchema, "ui:shortcuts": {...(metadataForm.uiSchema["ui:shorcuts"] || {}), ...(this.mainContext.shortcuts || {})}}}
								formData={state.modalMetadata}
								onChange={onChange}
								onSubmit={this.onImageMetadataUpdate}
								lang={lang}>
								{(metadataSaveSuccess !== undefined) ? (
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
		const onOk = () => this.setState({alert: false, alertMsg: undefined});
		return this.state.alert ? (
      <PopupAlert onOk={onOk}>
				{` ${this.state.alertMsg}`}
      </PopupAlert>) : null;
	}

	onFileFormChange = (files) => {
		const {onChange} = this.props;
		let formData = this.props.formData || [];

		this.mainContext.pushBlockingLoader();

		const fail = (translationKey, additionalInfo="") => {
			this.mainContext.popBlockingLoader();
			this.setState({alert: true, alertMsg:
				`${this.props.formContext.translations.SaveFail} ${this.props.formContext.translations[translationKey]} ${additionalInfo}`
			});
		};

		this.processFiles(files).then(() => {
			let invalidFile = (files.length <= 0);
			let fileTooLarge = false;
			let noValidData = true;

			const formDataBody = files.reduce((body, file) => {
				if (ALLOWED_FILE_TYPES.indexOf(file.type) === -1) {
					invalidFile = true;
				} else if (file.size > MAX_IMAGE_SIZE) {
					fileTooLarge = true;
				} else {
					body.append("data", file);
					noValidData = false;
				}
				return body;
			}, new FormData());

			if (noValidData && invalidFile) {
				fail("AllowedFileFormats", this.getAllowedImageFormatsAsString() + ".");
			} else if (noValidData && fileTooLarge){
				fail("AllowedFileSize", this.getMaxFileSizeAsString() + ".");
			} else {
				return this.apiClient.fetchRaw("/images", undefined, {
					method: "POST",
					body: formDataBody
				});
			}
		}).then(response => {
			if (!response) return;
			if (response.status < 400) {
				return response.json();
			} else if (response.status ===  400) {
				fail("InvalidFile");
			} else if (response.status === 503) {
				fail("InsufficientSpace");
			} else {
				fail("TryAgainLater");
			}
		}).then(response => {
			if (!response) return;
			return this.getDefaultMetadataPromise().then(defaultMetadata => {
				return Promise.all(response.map(item => {
					return this.apiClient.fetchRaw(`/images/${item.id}`, undefined, {
						method: "POST",
						headers: {
							"accept": "application/json",
							"content-type": "application/json"
						},
						body: JSON.stringify(defaultMetadata)
					}).then(response => {
						if (response.status < 400) {
							return response.json();
						}
					});
				}));
			});
		}).then(response => {
			if (!response) return;
			const ids = response.map((item) => item ? item.id : undefined).filter(item => item !== undefined);
			onChange([...formData, ...ids]);
			this.mainContext.popBlockingLoader();
			if (files.length !== ids.length) {
				this.setState({alert: true, alertMsg: this.props.formContext.translations.FilesLengthDiffer});
			}
		}).catch(() => {
			this.mainContext.popBlockingLoader();
			this.setState({alert: true, alertMsg: `${this.props.formContext.translations.SaveFail} ${this.props.formContext.translations.TryAgainLater}`});
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
			reader.onload = event => {
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
		}).then(() => {
			this.mainContext.popBlockingLoader();
			this.setState({metadataSaveSuccess: true});
			this._context.defaultMetadata = formData;
		}).catch(() => {
			this.mainContext.popBlockingLoader();
			this.setState({metadataSaveSuccess: false});
		});
	}

	getDefaultMetadataPromise = () => {
		const {capturerVerbatimPath} = getUiOptions(this.props.uiSchema);
		let defaultMetadata = this._context.defaultMetadata || {};

		const MACode = parseJSONPointer(this.mainContext.formData, capturerVerbatimPath);

		if (!this._context.defaultMetadata) {
			defaultMetadata = {...defaultMetadata, intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0"};
		}

		return MACode !== undefined ?
			this.apiClient.fetchCached(`/person/by-id/${MACode}`).then(({fullName}) => {
				const name = fullName || MACode;
				defaultMetadata = {
					...defaultMetadata,
					capturerVerbatim: Array.isArray(name) ? name : [name]
				};
				this._context.defaultMetadata = defaultMetadata;
				return defaultMetadata;
			}).catch(() => {
				return (
					new Promise(resolve => {
						this._context.defaultMetadata = defaultMetadata;
						resolve(defaultMetadata);
					}));
			}) :
			new Promise(resolve => {
				this._context.defaultMetadata = defaultMetadata;
				resolve(defaultMetadata);
			});
	}

	getMaxFileSizeAsString = () => {
		let maxSize = MAX_IMAGE_SIZE.toString().substring(0, MAX_IMAGE_SIZE.toString().length - 6);
		return maxSize + " " + `${this.props.formContext.translations.Mb}`;
	}

	getAllowedImageFormatsAsString = () => {
		let formats = "";

		for (let i = 0; i < ALLOWED_FILE_TYPES.length; i++) {
			formats += ALLOWED_FILE_TYPES[i].split("/")[1];
			if (i < ALLOWED_FILE_TYPES.length - 2) {
				formats += ", ";
			} else if (i === ALLOWED_FILE_TYPES.length - 2) {
				formats += ` ${this.props.formContext.translations.and} `;
			}
		}

		return formats;
	}

	formatValue(value) {
		return <Thumbnail id={value} />;
	}
}

class Thumbnail extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {};
		this.updateURL(props);
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentWillReceiveProps(props) {
		this.updateURL(props);
	}

	updateURL = ({id}) => {
		new ApiClient().fetchCached("/images/" + id).then(response => {
			if (!this.mounted) return;
			this.setState({url: response.squareThumbnailURL});
		});
	}

	render() {
		return <img src={this.state.url} />;
	}
}
