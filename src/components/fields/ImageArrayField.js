import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { Modal, Row, Col } from "react-bootstrap";
import DropZone from "react-dropzone";
import Button from "../Button";

const CONTEXT_KEY = "IMAGE_ARRAY_FIELD";

export default class ImagesArrayField extends Component {

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient();
		this._context = new Context().get(CONTEXT_KEY);
		this.mainContext = new Context().get("MAIN");
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let imgURLs = [];
		(props.formData || []).forEach((item, i) => {
			if (item.substr(0, 3) === "MM.") {
				imgURLs.push(undefined);
				this.mainContext.pushBlockingLoader();
				this.apiClient.fetchCached("/images/" + item).then(response => {
					if (!this.mounted) return;
					this.setState({imgURLs: update(this.state.imgURLs, {[i]: {$set: response.squareThumbnailURL}})});
					this.mainContext.popBlockingLoader();
				}).catch(this.mainContext.popBlockingLoader);
			} else if (item.substr(0, 4) !== "data") {
				imgURLs.push(this._context[item]);
			} else {
				imgURLs.push(item);
			}
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
		const {schema, uiSchema, name, registry} = this.props;
		const {translations} = registry;

		const options = uiSchema["ui:options"] || {};
		const description = options.description;
		const title = (schema.title === undefined) ? name : schema.title;

		return (
			<Row>
				<Col xs={12}>
					<label>{title}</label>
					{description !== undefined ? <DescriptionField description={description} /> : null}
					<div className="laji-form-images">
						{this.renderImgs()}
							<DropZone ref="dropzone" className={"laji-form-drop-zone" + (this.state.dragging ? " dragging" : "")}
											  accept="image/*"
											  onDragEnter={() => {this.setState({dragging: true})}}
											  onDragLeave={() => {this.setState({dragging: false})}}
											  onDrop={files => {
													this.setState({dragging: false});
													this.onFileFormChange(files)}
												}><a href="#" onClick={e => e.preventDefault()}>{translations.DropOrSelectFiles}</a></DropZone>
						{this.renderModal()}
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
					<Button buttonType="danger" classList={["img-remove"]} onClick={this.onImgRmClick(i)}>✖</Button>
				</div>
			)) :
			null;
	}

	onImgClick = (i) => () => {
		const item = this.props.formData[i];
		const state = {modalOpen: true};
		if (item.match(/MM\./)) {
			this.apiClient.fetchCached("/images/" + item).then(response => {
				state.modalImgSrc = response.originalURL;
				this.setState(state);
			})
		} else if (item.substr(0, 4) !== "data") {
			state.modalImgSrc = this._context[item];
			this.setState(state);
		} else {
			state.modalImgSrc = item;
			this.setState(state);
		}
	}

	onImgRmClick = (i) => () => {
		this.props.onChange(update(this.props.formData, {$splice: [[i, 1]]}));
	}

	renderModal = () => {
		return this.state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={() => this.setState({modalOpen: false})}>
				<Modal.Header closeButton={true} />
				<Modal.Body>
					<div className="laji-form image-modal-content">
						<img src={this.state.modalImgSrc} />
					</div>
				</Modal.Body>
			</Modal> : null;
	}

	onFileFormChange = (files) => {
		const {onChange} = this.props;
		let formData = this.props.formData || [];

		let formDataLength = formData ? formData.length : 0;
		let dataURLs = undefined;

		this.mainContext.pushBlockingLoader();

		this.processFiles(files).then(filesInfo => {
			dataURLs = filesInfo.map(fileInfo => fileInfo.dataURL);
			onChange(update(formData, {$push: dataURLs}));

			const formDataBody = new FormData();

			files.forEach(file => {
				formDataBody.append("data", file);
			});

			return this.apiClient.fetch("/images", undefined, {
				method: "POST",
				body: formDataBody
			});
		}).then(response => {
			onChange(update(formData,
				response.reduce((updateObject, item, idx) => {
						const id = item.id;
						this._context[id] = dataURLs[idx];
						updateObject.$merge[formDataLength + idx] = id;
						return updateObject;
					}, {$merge: {}}))
			);

			this.mainContext.popBlockingLoader();
		}).catch(() => {
			alert(this.props.registry.translations.PictureError);
			onChange(update(this.props.formData,
				dataURLs.reduce((updateObject, dataURL, idx) => {
					updateObject.$splice[0].push(formDataLength + idx);
					return updateObject;
				}, {$splice: [[]]})
			));

			this.mainContext.popBlockingLoader();
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
}
