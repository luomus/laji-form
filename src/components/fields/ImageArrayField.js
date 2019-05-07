import React, { Component, PureComponent } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField";
import { Modal, Row, Col, Glyphicon, Tooltip, OverlayTrigger, Alert, Pager } from "react-bootstrap";
import DropZone from "react-dropzone";
import { DeleteButton, Alert as PopupAlert, Button } from "../components";
import LajiForm from "../LajiForm";
import { getUiOptions, isObject, updateSafelyWithJSONPath, parseJSONPointer, JSONPointerToId, schemaJSONPointer  } from "../../utils";
import BaseComponent from "../BaseComponent";
import Spinner from "react-spinner";
import equals from "deep-equal";
import exif from "exif-js";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { validateLatLng, wgs84Validator } from "laji-map/lib/utils";
import moment from "moment";

const MAX_IMAGE_SIZE = 20000000;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/gif", "application/pdf"];

function toDecimal(number) {
	if (!number) return undefined;
	return number[0].numerator + number[1].numerator /
		(60 * number[1].denominator) + number[2].numerator / (3600 * number[2].denominator);
}

@BaseComponent
export default class ImageArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				titleClassName: PropTypes.string,
				imageAddModal: PropTypes.oneOfType([
					PropTypes.bool,
					PropTypes.shape({
						labels: PropTypes.shape({
							cancel: PropTypes.string
						})
					})

				]),
				autoOpenImageAddModal: PropTypes.bool,
				autoOpenMetadataModal: PropTypes.bool
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"]),
			items: PropTypes.shape({
				type: PropTypes.oneOf(["string"]).isRequired
			}).isRequired
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient();
		this._context = new Context("IMAGE_ARRAY_FIELD");
		if (!this._context.metadatas) this._context.metadatas = {};
		this.mainContext = this.getContext();
		this.state = {};
		const options = getUiOptions(props.uiSchema);
		if (options.imageAddModal && options.autoOpenImageAddModal) {
			this.state.imageAddModal = options.imageAddModal; // eslint-disable-line react/no-direct-mutation-state
		}
	}

	componentDidMount() {
		this.mounted = true;
		const settings = this.props.formContext.settings || {};
		if (settings && settings.defaultImageMetadata) {
			this._context.defaultMetadata = settings.defaultImageMetadata;
		}
		this.mainContext.addSettingSaver("defaultImageMetadata", () => {
			return this._context.defaultMetadata;
		}, !!"global");
	}

	onSettingsChange = (defaultMetadata) => {
		if (!equals(this._context.defaultMetadata, defaultMetadata)) {
			this._context.defaultMetadata = defaultMetadata;
			this.mainContext.onSettingsChange(!!"global");
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.mainContext.removeSettingSaver("defaultMetadata", !!"global");
	}

	componentDidUpdate(prevProps, prevState) {
		const getCount = (_props, _state) => ((_props.formData || []).length + (_state.loading || 0));

		if (getCount(prevProps, prevState) !== getCount(this.props, this.state)) {
			new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "resize");
		}
	}

	onDragEnter = () => {this.setState({dragging: true});};

	onDragLeave = () => {this.setState({dragging: false});};

	onDrop = files => {
		this.state.dragging && this.setState({dragging: false});
		this.onFileFormChange(files);
	};

	render() {
		const {schema, uiSchema, idSchema, name, formContext, readonly, disabled} = this.props;
		const {translations} = formContext;

		const {description, titleClassName, imageAddModal} = getUiOptions(uiSchema);
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

		const {dragging} = this.state;

		return (
			<Row>
				<Col xs={12}>
					<TitleField title={title} className={titleClassName} help={uiSchema["ui:help"]} id={idSchema.$id}/>
					{description !== undefined ? <DescriptionField description={description} /> : null}
					<div className="laji-form-images">
						{this.renderImgs()}
						{this.renderLoadingImgs()}
						<OverlayTrigger overlay={tooltip}>
							<DropZone accept="image/*, application/pdf"
							          onDragEnter={this.onDragEnter}
							          onDragLeave={this.onDragLeave}
												onDrop={this.onDrop}
												disabled={readonly || disabled}
											>
									{({getRootProps, getInputProps}) => {
										const {onClick: _onClick, ...rootProps} = getRootProps();
										const onClick = imageAddModal ? () => {
											this.setState({imageAddModal});
										} : _onClick;
										return (
											<div className={`laji-form-drop-zone${dragging ? " dragging" : ""}${readonly || disabled ? " disabled" : ""}`}
												onClick={onClick}
												{...rootProps}>
											<input {...getInputProps()} />
											<Glyphicon glyph="camera" />
										</div>
										);
									}}
							</DropZone>
						</OverlayTrigger>
						{this.renderModal()}
						{this.renderAlert()}
						{this.renderImageAddModal()}
					</div>
				</Col>
			</Row>
		);
	}

	renderImgs = () => {
		const {disabled, readonly} = this.props;
		return (this.props.formData || []).map((item, i) => (
			<div key={i} className="img-container">
				<a onClick={this.openModalFor(i)}><Thumbnail id={item} /></a>
				<DeleteButton corner={true}
					translations={this.props.formContext.translations}
					onClick={this.onImgRmClick(i)}
					disabled={disabled || readonly}
				>✖</DeleteButton>
			</div>
		));
	}

	renderLoadingImgs = () => {
		return Array(this.state.loading || 0).fill(undefined).map((item, i) => (
			<div key={i} className="img-container laji-form-drop-zone">
				<Spinner />
			</div>
		));
	}

	openModalFor = (i) => () => {
		const item = this.props.formData[i];
		this.setState({modalOpen: i});
		this.fetching = item;
		this.apiClient.fetch(`/images/${item}`).then(response => {
			if (response.id !== this.fetching) return;
			this._context.metadatas[item] = response;
			this.setState({modalIdx: i, modalImgSrc: response.originalURL, modalMetadata: this._context.metadatas[item]});
		});
	}

	onImgRmClick = (i) => () => {
		this.props.onChange(update(this.props.formData, {$splice: [[i, 1]]}));
	}

	renderModal = () => {
		const {modalOpen, modalIdx, modalMetadata, metadataSaveSuccess, modalImgSrc} = this.state;
		const {lang, translations} = this.props.registry.formContext;

		const metadataForm = this.state.metadataForm || {};

		if (typeof modalOpen === "number" && !this.state.metadataForm) {
			this.apiClient.fetchCached("/forms/JX.111712", {lang, format: "schema"})
				.then(metadataForm => {
					if (this.mounted) {
						this.setState({metadataForm});
					}
				});
		}

		const onHide = () => this.setState({modalOpen: false, metadataSaveSuccess: undefined});
		const onChange = formData => this.setState({modalMetadata: formData});

		const {Previous, Next} = this.props.formContext.translations;

		const isOpen = modalIdx === modalOpen && modalMetadata && metadataForm.schema;

		const uiSchema = isOpen ? {
			...metadataForm.uiSchema,
			"ui:shortcuts": {...(metadataForm.uiSchema["ui:shorcuts"] || {}), ...(this.mainContext.shortcuts || {})},
			"ui:disabled": this.props.disabled,
			"ui:readonly": this.props.readonly,
		} : undefined;

		return typeof modalOpen === "number" ?
			<Modal dialogClassName="laji-form image-modal" show={true}
			       onHide={onHide}>
				<Modal.Header closeButton={true}>
					<br />
					<Pager>
						<Pager.Item previous onClick={this.openModalFor(modalOpen - 1)} disabled={modalOpen <= 0}>&larr; {Previous}</Pager.Item>
						<Pager.Item next onClick={this.openModalFor(modalOpen + 1)} disabled={modalOpen >= this.props.formData.length - 1}>{Next} &rarr;</Pager.Item>
					</Pager>
				</Modal.Header>
				<Modal.Body>
					<div className="laji-form image-modal-content">
					{isOpen
						? <React.Fragment>
							<img src={modalImgSrc} />
							<LajiForm
								{...metadataForm}
								uiSchema={uiSchema}
								formData={modalMetadata}
								onChange={onChange}
								onSubmit={this.onImageMetadataUpdate}
								submitText={translations.Save}
								lang={lang}
								showShortcutButton={false}>
								{(metadataSaveSuccess !== undefined) ? (
										<Alert bsStyle={metadataSaveSuccess ? "success" : "danger"}>
											{translations[metadataSaveSuccess ? "SaveSuccess" : "SaveFail"]}
										</Alert>
									) : null
								}
							</LajiForm>
						</React.Fragment>
					: <Spinner />}
					</div>
				</Modal.Body>
			</Modal> : null;
	}

	onTakeNewPhoto = () => {
	}

	onSelectPhoto = () => {
	}

	onHideImageAddModal = () => this.setState({imageAddModal: undefined}, () => {
		this.parseExif([]);
	});

	renderImageAddModal = () => {
		const {disabled, readonly} = this.props;
		const {imageAddModal} = this.state;
		const {labels: {cancel} = {}} = isObject(imageAddModal) ? imageAddModal : {};
		const {translations} = this.props.formContext;

		if (!imageAddModal) return null;

		return (
			<Modal dialogClassName="laji-form" show={true} onHide={this.onHideImageAddModal}>
				<Modal.Header closeButton={true}>
				</Modal.Header>
				<Modal.Body>
					{[["camera", "TakeNewPhoto"], ["filesys", "SelectPhoto"]].map(([captureMethod, label]) =>
						<DropZone key={captureMethod}
						          accept="image/*, application/pdf"
						          onDrop={this.onDrop}
						          disabled={readonly || disabled}
						>
							{({getRootProps, getInputProps}) => {
								return (
									<div className="btn-block" {...getRootProps()}>
									<input {...getInputProps()} capture={captureMethod}>
									</input>
									<Button block disabled={readonly || disabled}>{translations[label]}</Button>
								</div>
								);
							}}
						</DropZone>
					)}
					<Button block onClick={this.onHideImageAddModal}>{cancel || translations.Cancel}</Button>
				</Modal.Body>
			</Modal>
		);
				
	}

	onAlertOk = () => {
		this.setState({alert: false, alertMsg: undefined});
	}

	renderAlert = () => {
		return this.state.alert ? (
      <PopupAlert onOk={this.onAlertOk}>
				{` ${this.state.alertMsg}`}
      </PopupAlert>) : null;
	}

	parseExif = (files) => {
		const {exifParsers} = getUiOptions(this.props.uiSchema);
		if (!exifParsers) return;

		const found = exifParsers.reduce((found, {parse}) => {
			found[parse] = false;
			return found;
		}, {});
		files.reduce((promise, file) => {
			if (Object.keys(found).every(k => found[k])) {
				return promise;
			}
			return promise.then(found =>
				new Promise(resolve => {
					exif.getData(file, function() {
						if (found.hasOwnProperty("geometry")) try {
							const coordinates = ["GPSLongitude", "GPSLatitude"].map(tag => toDecimal(exif.getTag(this, tag)));
							const rawDatum = exif.getTag(this, "GPSMapDatum");
							const datum = typeof rawDatum === "string"
								? rawDatum.trim().toUpperCase()
								: undefined;
							if ((datum === "WGS-84" || datum === "WGS84") && validateLatLng(coordinates, wgs84Validator)) {
								found.geometry = {
									type: "Point",
									coordinates
								};
							}
						} catch (e) {
							console.info("Reading GPS from EXIF failed", e);
						}

						if (found.hasOwnProperty("date")) try {
							const rawDate = exif.getTag(this, "DateTimeOriginal");
							const momentDate = moment(rawDate, "YYYY:MM:DD HH:mm:ss");
							if (momentDate.isValid()) {
								found.date = momentDate.toISOString();
							}

						} catch (e) {
							console.info("Reading date from EXIF failed", e);
						}
						resolve(found);
					});
				})
			);
		}, Promise.resolve(found)).then((found) => {
			let {registry: {definitions}, formContext: {contextId, getFormRef}} = this.props;
			const formInstance = getFormRef();
			let {formData, schema} = formInstance.state;
			exifParsers.filter(f => f.type === "event" || found[f.parse]).forEach(({field, parse, type, eventName}) => {
				if (type === "mutate") {
					formData = updateSafelyWithJSONPath(formData, found[parse], field, !!"immutably", (__formData, path) => {
						const _schema = parseJSONPointer(schema, schemaJSONPointer(schema, path));
						return getDefaultFormState(_schema, undefined, definitions);
					});
				}
				if (type === "event") {
					new Context(contextId).sendCustomEvent(`root_${JSONPointerToId(field)}`, eventName, found[parse], undefined, {bubble: false});
				}
			});
			formInstance.onChange(formData);
		});
	}

	onFileFormChange = (files) => {
		const {onChange} = this.props;
		let formData = this.props.formData || [];

		this.mainContext.pushBlockingLoader();
		this.setState({loading: files.length});

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
				if (!ALLOWED_FILE_TYPES.includes(file.type)) {
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
			} else if (noValidData && fileTooLarge) {
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


			const {autoOpenMetadataModal = true} = getUiOptions(this.props.uiSchema);
			this.setState({loading: 0});
			this.mainContext.popBlockingLoader();

			let shouldOpenMetadataModal = autoOpenMetadataModal;

			const finish = () => {
				const _finish = () => {
					this.parseExif(files);
					if (shouldOpenMetadataModal) {
						this.openModalFor(this.props.formData.length - files.length)();
					}
				};
				if (this.state.imageAddModal) {
					this.setState({imageAddModal: undefined}, _finish);
				} else {
					_finish();
				}
			};

			if (files.length !== ids.length) {
				shouldOpenMetadataModal = false;
				this.setState({alert: true, alertMsg: this.props.formContext.translations.FilesLengthDiffer}, finish);
			} else {
				finish();
			}
		}).catch(() => {
			this.setState({loading: 0});
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
			this.setState({modalOpen: false}, () => this.props.formContext.notifier.success(this.props.formContext.translations.SaveSuccess));
			this.onSettingsChange({
				intellectualRights: formData.intellectualRights,
				capturerVerbatim: formData.capturerVerbatim,
				intellectualOwner: formData.intellectualOwner
			});
		}).catch(() => {
			this.mainContext.popBlockingLoader();
			this.setState({metadataSaveSuccess: false});
		});
	}

	getDefaultMetadataPromise = () => {
		let defaultMetadata = this._context.defaultMetadata || {intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0"};
		const MACode = this.props.formContext.uiSchemaContext.creator;

		return !defaultMetadata.capturerVerbatim && MACode !== undefined ?
			this.apiClient.fetchCached(`/person/by-id/${MACode}`).then(({fullName}) => {
				const name = fullName || MACode;
				defaultMetadata = {
					...defaultMetadata,
					capturerVerbatim: Array.isArray(name) ? name : [name],
					intellectualOwner: name
				};
				this.onSettingsChange(defaultMetadata);
				return defaultMetadata;
			}).catch(() => {
				return new Promise(resolve => {
					this.onSettingsChange(defaultMetadata);
					resolve(defaultMetadata);
				});
			}) :
			new Promise(resolve => {
				this.onSettingsChange(defaultMetadata);
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
		return value.length ? <Thumbnail id={value} /> : null;
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
		new ApiClient().fetchCached("/images/" + id, undefined, {failSilently: true}).then(response => {
			if (!this.mounted) return;
			this.setState({url: response.squareThumbnailURL});
		});
	}

	render() {
		return this.state.url ? <img src={this.state.url} /> : <div className="image-loading"><Spinner /></div>;
	}
}
