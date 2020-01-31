import React, { Component, PureComponent } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import Context from "../../Context";
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField";
import { Modal, Row, Col, Glyphicon, Tooltip, OverlayTrigger, Alert, Pager } from "react-bootstrap";
import DropZone from "react-dropzone";
import { DeleteButton, Button } from "../components";
import LajiForm from "../LajiForm";
import { getUiOptions, isObject, updateSafelyWithJSONPointer, parseJSONPointer, JSONPointerToId, getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId, getUUID, updateFormDataWithJSONPointer, idSchemaIdToJSONPointer, getReactComponentName } from "../../utils";
import BaseComponent from "../BaseComponent";
import Spinner from "react-spinner";
import equals from "deep-equal";
import exif from "exif-js";
import { validateLatLng, wgs84Validator } from "laji-map/lib/utils";
import moment from "moment";

function toDecimal(number) {
	if (!number) return undefined;
	return number[0].numerator + number[1].numerator /
		(60 * number[1].denominator) + number[2].numerator / (3600 * number[2].denominator);
}

let mediaUuid = 0;

@MediaArrayField
export default class ImageArrayField extends Component {
	ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/gif", "application/pdf"];
	MAX_FILE_SIZE = 20000000;
	KEY = "IMAGE";
	ENDPOINT = "images";
	GLYPH = "camera";
	METADATA_SETTINGS_KEY = "defaultImageMetadata";
	TRANSLATION_TAKE_NEW = "TakeNewPhoto";
	TRANSLATION_SELECT_FILE = "SelectPhoto";
	TRANSLATION_NO_MEDIA = "NoPhoto"
	CONTAINER_CLASS = "images-container"

	renderMedia = (id) => <Thumbnail id={id} apiClient={this.props.formContext.apiClient} />
	renderLoadingMedia = (id) => <Thumbnail dataURL={id} loading={true} />
	onMediaClick = (i) => this.openModalFor(i)
}

export function MediaArrayField(ComposedComponent) {
	return @BaseComponent
	class MediaArrayField extends ComposedComponent {
		static propTypes = {
			uiSchema: PropTypes.shape({
				"ui:options": PropTypes.shape({
					titleClassName: PropTypes.string,
					addModal: PropTypes.oneOfType([
						PropTypes.bool,
						PropTypes.shape({
							labels: PropTypes.shape({
								cancel: PropTypes.string
							})
						})
					]),
					autoOpenAddModal: PropTypes.bool,
					autoOpenMetadataModal: PropTypes.bool,
					sideEffects: PropTypes.object,
					exifParsers: PropTypes.arrayOf(PropTypes.object)
				})
			}),
			schema: PropTypes.shape({
				type: PropTypes.oneOf(["array"]),
				items: PropTypes.shape({
					type: PropTypes.oneOf(["string"]).isRequired
				}).isRequired
			}).isRequired,
			formData: PropTypes.array
		}

		static displayName = getReactComponentName(ComposedComponent);

		deprecatedOptions = {
			imageAddModal: "addModal",
			autoOpenImageAddModal: "autoOpenAddModal"
		};

		constructor(props) {
			super(props);
			
			["ALLOWED_FILE_TYPES",
				"MAX_FILE_SIZE",
				"KEY",
				"ENDPOINT",
				"GLYPH",
				"METADATA_SETTINGS_KEY",
				"renderMedia",
				"renderLoadingMedia",
				"TRANSLATION_TAKE_NEW",
				"TRANSLATION_SELECT_FILE",
				"TRANSLATION_NO_MEDIA",
				"CONTAINER_CLASS"
			].forEach(prop => {
				if (this[prop] === undefined) {
					throw new Error(`${getReactComponentName(ComposedComponent)} doesn't implement MediaArrayField ${prop}`);
				}
			});
			const options = this.getOptions(props.uiSchema);
			Object.keys(this.deprecatedOptions).forEach(deprecated => {
				if (options[deprecated] !== undefined) {
					console.warn(`laji-form warning: {getReactComponentName(ComposedComponent)} ui:option '${deprecated}' is deprecated. Use '${this.deprecatedOptions[deprecated]}' instead!`);
				}
			});
			this.apiClient = props.formContext.apiClient;
			this._context = new Context(`${this.KEY}_ARRAY_FIELD`);
			if (!this._context.metadatas) this._context.metadatas = {};
			if (!this._context.tmpMedias) this._context.tmpMedias = {};
			this.mainContext = this.getContext();
			this.state = {tmpMedias: Object.keys(this._context.tmpMedias[this.getContainerId()] || {})};
			const {addModal, autoOpenAddModal} = options;
			if (addModal
				&& autoOpenAddModal
				&& (props.formData || []).length === 0
				&& !props.formContext.uiSchemaContext.isEdit
			) {
				this.state.addModal = addModal; // eslint-disable-line react/no-direct-mutation-state
			}
		}

		getOptions = (uiSchema) => {
			let options = getUiOptions(uiSchema);
			Object.keys(this.deprecatedOptions).forEach(deprecated => {
				if (options[deprecated] !== undefined) {
					options = {
						...options,
						[this.deprecatedOptions[deprecated]]: options[deprecated]
					};
				}
			});
			return options;
		}

		componentDidMount() {
			this.mounted = true;
			const settings = this.props.formContext.settings || {};
			if (settings && settings[this.METADATA_SETTINGS_KEY]) {
				this._context.defaultMetadata = settings[this.METADATA_SETTINGS_KEY];
			}
			this.mainContext.addSettingSaver(this.METADATA_SETTINGS_KEY, () => {
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
			const getCount = (_props, _state) => ((_props.formData || []).length + (_state.tmpMedias || []).length);

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

			const {description, titleClassName, addModal} = getUiOptions(uiSchema);
			const title = (schema.title === undefined) ? name : schema.title;
			const {TitleField} = this.props.registry.fields;

			const tooltip = (
				<Tooltip id={`${this.props.idSchema.$id}-drop-zone-tooltip`}>
					<span>{translations.DropOrSelectFiles}. </span>
					<span>
						{translations.AllowedFileFormats} {this.getAllowedMediaFormatsAsString()} {translations.and} {translations.allowedFileSize} {this.getMaxFileSizeAsString()}.
					</span>
				</Tooltip>
			);

			const {dragging} = this.state;

			return (
				<Row>
					<Col xs={12}>
						<TitleField title={title} className={titleClassName} help={uiSchema["ui:help"]} id={idSchema.$id}/>
						{description !== undefined ? <DescriptionField description={description} /> : null}
						<div className={`laji-form-medias ${this.CONTAINER_CLASS}`}>
							{this.renderMedias()}
							{this.renderLoadingMedias()}
							<OverlayTrigger overlay={tooltip}>
								<DropZone accept={this.ALLOWED_FILE_TYPES.join(", ")}
								onDragEnter={this.onDragEnter}
								onDragLeave={this.onDragLeave}
								onDrop={this.onDrop}
								disabled={readonly || disabled}
							>
									{({getRootProps, getInputProps}) => {
										const {onClick: _onClick, ...rootProps} = getRootProps();
										const onClick = addModal ? () => {
											this.setState({addModal});
										} : _onClick;
										return (
											<div className={`laji-form-drop-zone${dragging ? " dragging" : ""}${readonly || disabled ? " disabled" : ""}`}
											onClick={onClick}
											{...rootProps}>
											<input {...getInputProps()} />
											<Glyphicon glyph={this.GLYPH} />
										</div>
										);
									}}
									</DropZone>
								</OverlayTrigger>
								{this.renderMetadataModal()}
								{this.renderMediaAddModal()}
							</div>
						</Col>
					</Row>
			);
		}

		renderMedias = () => {
			const {disabled, readonly} = this.props;
			const {deleteConfirmPlacement = "top"} = getUiOptions(this.props.uiSchema);
			return (this.props.formData || []).map((item, i) => (
				<div key={i} className="media-container">
					<a onClick={this.onMediaClick(i)}>{this.renderMedia(item, i)}</a>
					<DeleteButton corner={true}
					confirm={true}
					confirmPlacement={deleteConfirmPlacement}
					translations={this.props.formContext.translations}
					onClick={this.onMediaRmClick(i)}
					disabled={disabled || readonly}
					id={`${this.props.idSchema.$id}_${i}`}
				>✖</DeleteButton>
				{this.renderMediaExtra && this.renderMediaExtra(this.props)}
			</div>
			));
		}

		renderLoadingMedias = () => {
			const containerId = this.getContainerId();
			return (this.state.tmpMedias || []).map((item, i) => {
				const medias = this._context.tmpMedias[containerId];
				if (!medias || !medias[item]) return null;
				return (
					<div key={i} className="media-container">
						<a>{this.renderLoadingMedia(medias[item])}</a>
					</div>
				);
			});
		}

		openModalFor = (i) => () => {
			const item = this.props.formData[i];
			this.setState({metadataModalOpen: i});
			this.fetching = item;
			this.apiClient.fetch(`/${this.ENDPOINT}/${item}`).then(response => {
				if (response.id !== this.fetching) return;
				this._context.metadatas[item] = response;
				this.setState({modalIdx: i, modalMediaSrc: response.originalURL, modalMetadata: this._context.metadatas[item]});
			});
		}

		onMediaRmClick = (i) => () => {
			const id = this.props.formData[i];
			this.props.onChange(update(this.props.formData, {$splice: [[i, 1]]}));
			this.apiClient.fetch(`/${this.ENDPOINT}/${id}`, undefined, {
				method: "DELETE",
				failSilently: true
			});
		}

		hideMetadataModal = () => this.setState({metadataModalOpen: false, metadataSaveSuccess: undefined});

		onMetadataFormChange = formData => this.setState({modalMetadata: formData});

		renderMetadataModal = () => {
			const {metadataModalOpen, modalIdx, modalMetadata, metadataSaveSuccess, modalMediaSrc} = this.state;
			const {lang, translations} = this.props.registry.formContext;

			const metadataForm = this.state.metadataForm || {};

			if (typeof metadataModalOpen === "number" && !this.state.metadataForm) {
				this.apiClient.fetchCached("/forms/JX.111712", {lang, format: "schema"})
					.then(metadataForm => {
						if (this.mounted) {
							this.setState({metadataForm});
						}
					});
			}

			const {Previous, Next} = this.props.formContext.translations;

			const isOpen = modalIdx === metadataModalOpen && modalMetadata && metadataForm.schema;

			const uiSchema = isOpen ? {
				...metadataForm.uiSchema,
				"ui:shortcuts": {...(metadataForm.uiSchema["ui:shorcuts"] || {}), ...(this.mainContext.shortcuts || {})},
				"ui:disabled": this.props.disabled,
				"ui:readonly": this.props.readonly,
			} : undefined;

			const {metadataModal = true} = getUiOptions(this.props.uiSchema);

			return typeof metadataModalOpen === "number" ?
				<Modal dialogClassName="laji-form media-modal" show={true}
				onHide={this.hideMetadataModal}>
				<Modal.Header closeButton={true}>
					<br />
					<Pager>
						<Pager.Item previous onClick={this.openModalFor(metadataModalOpen - 1)} disabled={metadataModalOpen <= 0}>&larr; {Previous}</Pager.Item>
						<Pager.Item next onClick={this.openModalFor(metadataModalOpen + 1)} disabled={metadataModalOpen >= this.props.formData.length - 1}>{Next} &rarr;</Pager.Item>
					</Pager>
				</Modal.Header>
				<Modal.Body>
					<div className={`laji-form${metadataModal ? " media-modal-content" : ""}`}>
						{isOpen
							? <React.Fragment>
								<img src={modalMediaSrc} />
								{metadataModal && <LajiForm
								{...metadataForm}
								uiSchema={uiSchema}
								formData={modalMetadata}
								onChange={this.onMetadataFormChange}
								onSubmit={this.onMediaMetadataUpdate}
								submitText={translations.Save}
								lang={lang}
								apiClient={this.props.formContext.apiClient.apiClient}
								uiSchemaContext={this.props.formContext.uiSchemaContext}
								showShortcutButton={false}>
								{(metadataSaveSuccess !== undefined) ? (
									<Alert bsStyle={metadataSaveSuccess ? "success" : "danger"}>
										{translations[metadataSaveSuccess ? "SaveSuccess" : "SaveFail"]}
									</Alert>
								) : null
								}
									</LajiForm>}
								</React.Fragment>
							: <Spinner />}
						</div>
					</Modal.Body>
					</Modal> : null;
		}

		onHideMediaAddModal = () => this.setState({addModal: undefined}, () => {
			this.parseExif([]);
		});

		renderMediaAddModal = () => {
			const {disabled, readonly} = this.props;
			const {addModal} = this.state;
			const {labels: {cancel} = {}} = isObject(addModal) ? addModal : {};
			const {translations} = this.props.formContext;

			if (!addModal) return null;

		
			return (
				<Modal dialogClassName="laji-form media-add-modal" show={true} onHide={this.onHideMediaAddModal}>
					<Modal.Header closeButton={true}>
					</Modal.Header>
					<Modal.Body>
						{[
							["environment",
								this.TRANSLATION_TAKE_NEW,
								this.ALLOWED_FILE_TYPES.filter(t => t !== "application/pdf").join(", ")],
							[
								"filesystem",
								this.TRANSLATION_SELECT_FILE,
								this.ALLOWED_FILE_TYPES.join(", ")]
						].map(([captureMethod, label, accept]) =>
							<DropZone key={captureMethod}
							accept={accept}
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
									<Button className="cancel" block onClick={this.onHideMediaAddModal}>{cancel || translations[this.TRANSLATION_NO_MEDIA]}</Button>
								</Modal.Body>
							</Modal>
			);

		}

		onAlertOk = () => {
			this.setState({alert: false, alertMsg: undefined});
		}

		parseExif = (files) => {
			const {exifParsers = []} = getUiOptions(this.props.uiSchema);
			if (!exifParsers) return;

			const found = exifParsers.reduce((found, {parse}) => {
				found[parse] = false;
				return found;
			}, {});
			return files.reduce((promise, file) => {
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
								if ((!datum || datum === "WGS-84" || datum === "WGS84") && validateLatLng(coordinates, wgs84Validator)) {
									found.geometry = {
										type: "Point",
										coordinates
									};
								}
							} catch (e) {
								console.info("Reading GPS from EXIF failed", e);
							}

							const readDateFromFile = () => {
								if (file.lastModified) {
									const momentDate = moment(file.lastModified);
									if (momentDate.isValid()) {
										const date = momentDate.format("YYYY-MM-DDTHH:mm");
										if (date) {
											found.date = date;
										}
									}
								}
							};

							if (found.hasOwnProperty("date")) {
								try {
									const rawDate = exif.getTag(this, "DateTimeOriginal");
									const momentDate = moment(rawDate, "YYYY:MM:DD HH:mm:ss");
									if (momentDate.isValid()) {
										found.date = momentDate.format("YYYY-MM-DDTHH:mm");
									} else {
										readDateFromFile();
									}
								} catch (e) {
									console.info("Reading date from EXIF failed, trying to read from file", e);
									readDateFromFile();
								}
							} else {
								readDateFromFile();
							}
							resolve(found);
						});
					})
				);
			}, Promise.resolve(found)).then((found) => {
				let {registry, formContext: {contextId}} = this.props;
				const lajiFormInstance = new Context(this.props.formContext.contextId).formInstance;
				const {schema} = lajiFormInstance.props;
				let {formData} = lajiFormInstance.state;
				exifParsers.filter(f => f.type === "event" || found[f.parse]).forEach(({field, parse, type, eventName}) => {
					if (type === "mutate") {
						formData = updateFormDataWithJSONPointer({formData, schema, registry}, found[parse], field);
					}
					if (type === "event") {
						new Context(contextId).sendCustomEvent(`root_${JSONPointerToId(field)}`, eventName, found[parse], undefined, {bubble: false});
					}
				});
				return formData;
			});
		}

		sideEffects = (formData) => {
			const lajiFormInstance = new Context(this.props.formContext.contextId).formInstance;
			const {formData: lajiFormFormData} = lajiFormInstance.state;
			const {schema} = lajiFormInstance.props;
			const {sideEffects} = getUiOptions(this.props.uiSchema);
			if (sideEffects) {
				const thisPath = idSchemaIdToJSONPointer(this.props.idSchema.$id);
				const containerPath = thisPath.replace(/^(\/.*)\/.*$/, "$1");
				const parseRelativePaths = (path, containerPath) => {
					while ((path.match(/\/\.\./g) || []).length > 1) {
						containerPath = containerPath.replace(/^(\/.*)\/.*$/, "$1");
						path = path.replace(/^(.*)\/\.\.(.*)/, "$1$2");
					}
					return path.replace(/^(.*)\/\.\.(.*)/, `$1${containerPath}$2`);
				};
				formData = Object.keys(sideEffects).reduce((formData, field) =>
					updateFormDataWithJSONPointer({schema, registry: this.props.registry, formData},
						sideEffects[field],
						parseRelativePaths(field, containerPath)
					),
					formData
				);
			}
			if (formData !== lajiFormFormData) {
				lajiFormInstance.onChange({formData});
			}
		}

		onFileFormChange = (files) => {
			if (this.state.addModal) {
				this.setState({addModal: undefined});
			}

			this.parseExif(files).then(this.sideEffects);

			const id = this.getContainerId();

			const lajiFormInstance = new Context(this.props.formContext.contextId).formInstance;
			const saveAndOnChange = () => this.saveMedias(files).then(mediaIds => {
				if (!lajiFormInstance.mounted) {
					return;
				}

				let pointer = getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(lajiFormInstance.tmpIdTree, lajiFormInstance.state.formData, this.props.idSchema.$id, id);
				const newFormData = [
					...(this.mounted
						? this.props.formData || []
						: parseJSONPointer(lajiFormInstance.state.formData, pointer) || []
					),
					...mediaIds
				];

				if (!lajiFormInstance.mounted) return;

				if (this.mounted || id === "root") {
					this.props.onChange(newFormData);
					// Settimeout because the resource is undefined 404 if fetched right away.
					setTimeout(() => {
						if (!this.mounted) return;
						const {autoOpenMetadataModal = false} = getUiOptions(this.props.uiSchema);
						let shouldOpenMetadataModal = autoOpenMetadataModal;
						if (shouldOpenMetadataModal) {
							this.openModalFor(newFormData.length - mediaIds.length)();
						}
					}, 0);
					return;
				}

				pointer = getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(lajiFormInstance.tmpIdTree, lajiFormInstance.state.formData, this.props.idSchema.$id, id);
				lajiFormInstance.onChange({formData: updateSafelyWithJSONPointer(lajiFormInstance.state.formData, newFormData, pointer)});
			});

			this.addSubmitHook(saveAndOnChange);
		}

		getContainerId = () => {
			const {_parentLajiFormId = "root"} = this.props.formContext;
			return _parentLajiFormId;
		}

		saveMedias(files) {
			const containerId = this.getContainerId();
			let tmpMedias;

			const fail = (translationKey, additionalInfo="") => {
				throw `${this.props.formContext.translations[translationKey]} ${additionalInfo}`;
			};

			return this.processFiles(files).then((processedFiles) => {
				let invalidFile = (files.length <= 0);
				let fileTooLarge = false;
				let noValidData = true;

				if (!this._context.tmpMedias[containerId]) {
					this._context.tmpMedias[containerId] = {};
				}
				tmpMedias = processedFiles.map(f => {
					mediaUuid++;
					this._context.tmpMedias[containerId][mediaUuid] = f.dataURL;
					return mediaUuid;
				});
				this.mounted && this.setState({tmpMedias: [...(this.state.tmpMedias || []), ...tmpMedias]});

				const formDataBody = files.reduce((body, file) => {
					if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
						invalidFile = true;
					} else if (file.size > this.MAX_FILE_SIZE) {
						fileTooLarge = true;
					} else {
						body.append("data", file);
						noValidData = false;
					}
					return body;
				}, new FormData());

				if (noValidData && invalidFile) {
					fail("AllowedFileFormats", this.getAllowedMediaFormatsAsString() + ".");
				} else if (noValidData && fileTooLarge) {
					fail("AllowedFileSize", this.getMaxFileSizeAsString() + ".");
				} else {
					return this.apiClient.fetchRaw(`/${this.ENDPOINT}`, undefined, {
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
						return this.apiClient.fetchRaw(`/${this.ENDPOINT}/${item.id}`, undefined, {
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

				tmpMedias.forEach(id => {
					delete this._context.tmpMedias[containerId][id];
				});
				this.mounted && this.setState({tmpMedias: this.state.tmpMedias.filter(id => !tmpMedias.includes(id))});
				return ids;
			}).catch((e) => {
				if (tmpMedias) {
					tmpMedias.forEach(id => {
						delete this._context.tmpMedias[containerId][id];
					});
					this.mounted && this.setState({tmpMedias: this.state.tmpMedias.filter(id => !tmpMedias.includes(id))});
				}
				throw e;
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

		onMediaMetadataUpdate = ({formData}) => {
			this.mainContext.pushBlockingLoader();
			this.apiClient.fetch(`/${this.ENDPOINT}/${formData.id}`, undefined, {
				method: "PUT",
				headers: {
					"accept": "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(formData)
			}).then(() => {
				this.mainContext.popBlockingLoader();
				const notify = () => this.props.formContext.notifier.success(this.props.formContext.translations.SaveSuccess);
				if (this.mounted) {
					this.setState({metadataModalOpen: false}, notify);
				} else {
					notify();
				}
				this.onSettingsChange({
					intellectualRights: formData.intellectualRights,
					capturerVerbatim: formData.capturerVerbatim,
					intellectualOwner: formData.intellectualOwner
				});
			}).catch(() => {
				this.mainContext.popBlockingLoader();
				this.mounted && this.setState({metadataSaveSuccess: false});
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
			let maxSize = this.MAX_FILE_SIZE.toString().substring(0, this.MAX_FILE_SIZE.toString().length - 6);
			return maxSize + " " + `${this.props.formContext.translations.Mb}`;
		}

		getAllowedMediaFormatsAsString = () => {
			let formats = "";

			for (let i = 0; i < this.ALLOWED_FILE_TYPES.length; i++) {
				formats += this.ALLOWED_FILE_TYPES[i].split("/")[1];
				if (i < this.ALLOWED_FILE_TYPES.length - 2) {
					formats += ", ";
				} else if (i === this.ALLOWED_FILE_TYPES.length - 2) {
					formats += ` ${this.props.formContext.translations.and} `;
				}
			}

			return formats;
		}

		formatValue(value, options, props, parentProps) {
			const {"ui:field": component} = props.uiSchema;
			let key = "";
			if (component === "ImageArrayField") {
				key = "IMAGE";
			} else if (component === "AudioArrayField") {
				key = "AUDIO";
			}
			if (!key) {
				throw new Error("Failed to inspect MediaArrayField type");
			}
			const imgs = value && value.length ? value.map((id, idx) => <Thumbnail key={idx} id={id} apiClient={props.formContext.apiClient} />) : [];
			const parentFormData = (parentProps ||{}).formData || {};
			const lajiFormId = getUUID(parentFormData || {});
			const {tmpMedias = {}} = new Context(`${key}_ARRAY_FIELD`);
			if (lajiFormId && tmpMedias[lajiFormId]) {
				return [...imgs, ...Object.keys(tmpMedias[lajiFormId]).map(id => <Thumbnail key={id} dataURL={tmpMedias[lajiFormId][id]} />)];
			}
			return imgs;
		}
	};
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

	updateURL = ({id, apiClient}) => {
		if (!id) return;
		apiClient.fetchCached(`/images/${id}`, undefined, {failSilently: true}).then(response => {
			if (!this.mounted) return;
			this.setState({url: response.squareThumbnailURL});
		});
	}

	render() {
		const url = this.state.url || this.props.dataURL;
		const img = url ? <img src={url} /> : null;
		return !url || this.props.loading
			?  <div className="media-loading">{img}<Spinner /></div>
			: img;
	}
	}
