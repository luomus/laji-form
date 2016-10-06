import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import update from "react-addons-update";
import merge from "deepmerge";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils";
import { getUpdateObjectFromPath } from "../../utils";
import LajiMap from "laji-map";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import { Pagination, Nav, NavItem, Row, Tooltip, OverlayTrigger, Glyphicon, Panel } from "react-bootstrap";
import Button from "../Button";
import Context from "../../Context";

const SCROLLING = "SCROLLING";
const SQUEEZING = "SQUEEZING";
const FIXED = "FIXED";

const popupMappers = {
	units: (schema, units, fieldName) => {
		return {[(schema.units ? schema.units.title : undefined) || fieldName]: units.map(unit => unit.informalNameString)};
	}
}

export default class MapArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				inlineProperties: PropTypes.arrayOf(PropTypes.string),
				colType: PropTypes.string
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {...this.getStateFromProps(props), direction: "directionless", inlineOutOfView: false};
		this.fixedHeight = 300;
	}

	buttonSettings = {
		detach: idx => {
			const tooltip = <Tooltip id={`map-array-detach-${idx}`}>{this.props.registry.translations.DetachUnit}</Tooltip>;

			return <OverlayTrigger key={`${this.props.idSchema.$id}-detach-${idx}`} overlay={tooltip} placement="left" >
				<Button className="glyph-button" onClick={() => {this.detach(idx)}}><Glyphicon glyph="new-window" /></Button></OverlayTrigger>;
		}
	}

	componentDidMount() {
		this.updateFromDimensions();
		window.addEventListener("scroll", this.updateFromScroll);
		window.addEventListener("resize", this.updateFromDimensions);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.updateFromScroll);
		window.removeEventListener("resize", this.updateFromDimensions);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	//formData && idSchema are computed in renderSchemaField(), because they are dependent of state.
	getStateFromProps = (props) => {
		let {uiSchema, schema} = props;

		schema = schema.items;
		delete schema.properties.wgs84Geometry;

		uiSchema = uiSchema.items;
		let order = uiSchema["ui:order"];
		if (order) {
			uiSchema = update(uiSchema, {"ui:order": {$splice: [[order.indexOf("wgs84Geometry"), 1]]}})
		}

		let data = [];
		if (props.formData) props.formData.forEach((item) => {
			data.push({type: "Feature", properties: {}, geometry: item.wgs84Geometry});
		});

		let activeIdx = (this.state && this.state.activeIdx !== undefined) ? this.state.activeIdx : (data.length ? 0 : undefined);
		let state = {...props, schema, uiSchema, data, activeIdx};
		if (this.stateToMerge) {
			state = merge(state, this.stateToMerge);
			this.stateToMerge = undefined;
		}

		const options = this.props.uiSchema["ui:options"] || {};
		const {buttons} = options;

		if (buttons) for (let button in buttons) {
			const buttonOptions = buttons[button];
			const updateObject = getUpdateObjectFromPath(buttonOptions.uiSchemaTarget, this.buttonSettings[button]);
			state.uiSchema = merge(uiSchema, updateObject);
		}

		if (!this.props.formData || !this.props.formData.length) state = {...state,  ...this.getInlineWidth()};

		return state;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onAdd = (e) => {
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		item.wgs84Geometry = e.feature.geometry;
		let {formData} = this.props;
		const formDataUpdate = (formData && formData.length) ? update(formData, {$push: [item]}) : [item];
		return {propsChange: formDataUpdate};
	}

	onRemove = (e) => {
		let splices = [];
		e.idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		return {propsChange: update(this.props.formData, {$splice: splices})};
	}

	onEdited = (e) => {
		let formData = this.props.formData;
		Object.keys(e.features).forEach( idx => {
			let geoJSON = e.features[idx];
			formData[idx].wgs84Geometry = geoJSON.geometry;
		});
		return {propsChange: formData};
	}

	onActiveChange = (idx) => {
		let state = {activeIdx: idx};
		if (this.controlledActiveChange) {
			this.controlledActiveChange = false;
		} else {
			state.direction = "directionless";
			if (this.state.activeIdx !== undefined) state.direction = (idx > this.state.activeIdx) ? "right" : "left";
		}
		return {state};
	}

	detach = (idx) => {
			this.setState({detachUnitMode: true});

			const mapComponent = this.refs.map;

			this.state.scrollState === SCROLLING ?
				mapComponent.refs.map.scrollIntoView() :
				window.scrollBy(0, -this.state.inlineContainerScrolledAmount);

			this._onMapChange = events => {
				events.forEach(e => {
					switch (e.type) {
						case "create":
							const formDataTarget = this.props.uiSchema["ui:options"].buttons.detach.formDataTarget;
							const activeFormData = this.props.formData[this.state.activeIdx];
							const popSource = activeFormData[formDataTarget];
							const popObject = popSource[idx];
							let newDataItem = update(activeFormData,
								{[formDataTarget]: {$set: [popObject]}, wgs84Geometry: {$set: e.feature.geometry}});
							let newFormData = update(this.props.formData, {$push: [newDataItem]});
							newFormData = update(newFormData, {[this.state.activeIdx]: {[formDataTarget]: {$splice: [[idx, 1]]}}})
							this.props.onChange(newFormData);
							new Context().clearState();
							this.stopDetach();
					}
				});
			}
	}

	stopDetach = () => {
		this._onMapChange = undefined;
		this.setState({detachUnitMode: false});
	}

	focusToLayer = (idx) => {
		this.controlledActiveChange = true;
		this.setState({direction: (this.state.activeIdx === undefined) ?
			"directionless" :
			((idx > this.state.activeIdx) ? "right" : "left")
		});
		this.refs.map.map.focusToLayer(idx)
	}

	onItemChange = (idx) => (formData) => {
		if (idx === undefined || !this.props.formData[idx]) return;

		let newFormData = formData;

		if (this.props.uiSchema["ui:options"].inlineProperties) {
			newFormData = this.props.formData[idx];
			for (let prop in formData) {
				newFormData = update(newFormData, {[prop]: {$set: formData[prop]}});
			}
		}
		this.props.onChange(update(this.props.formData, {$splice: [[idx, 1, newFormData]]}));
	}

	onMapChange = (events) => {
		if (this._onMapChange) {
			this._onMapChange(events);
			return;
		}

		let propsChange = undefined;
		let state = undefined;

		function mergeEvent(change) {
			if (change.state) {
				if (!state) state = change.state;
				state = merge(state, change.state);
			}
			if (change.propsChange) {
				if (!state) propsChange = change.propsChange;
				propsChange = merge(propsChange, change.propsChange);
			}
		}

		events.forEach(e => {
			switch (e.type) {
				case "create":
					mergeEvent(this.onAdd(e));
					break;
				case "delete":
					mergeEvent(this.onRemove(e));
					break;
				case "edit":
					mergeEvent(this.onEdited(e));
					break;
				case "active":
					mergeEvent(this.onActiveChange(e.idx));
					break;
			}
		});

		if (state && propsChange)  {
			this.stateToMerge = state;
			this.props.onChange(propsChange);
		} else if (state) {
			this.setState(state);
		}
	}

	componentDidUpdate = (prevProps, prevState) => {
		window.map = this.refs.map;
		if (this.refs.map && this.refs.map.map.map) this.refs.map.map.map.invalidateSize();

		if (this.state.detachUnitMode) {
			if (!prevState.detachUnitMode) new Context().pushBlockingLoader(true);
			this.refs.map.map.setDrawData({featureCollection: {type: "featureCollection", features: []}});
			this.refs.map.map.setData({
				featureCollection: {type: "featureCollection", features: this.state.data},
				getPopup: this.getPopup,
				getFeatureStyle: e => {
					const color =  (e.featureIdx == this.state.activeIdx) ? "#708e72" : "#9fbcd5";
					return {color: color, fillColor: color, opacity: 1, fillOpacity: 0.7}
				}
			});

		} else if (!this.state.detachUnitMode) {
			if (prevState.detachUnitMode) new Context().popBlockingLoader();
			this.refs.map.map.setData({featureCollection: {type: "featureCollection", features: []}});
		}

	}

	render() {
		const options = this.props.uiSchema["ui:options"];
		const hasInlineProps = options && options.inlineProperties && options.inlineProperties.length;
		const colType = this.getColType(this.props);

		const navigationEnabled = this.state.data && this.state.data.length > 1 && this.state.activeIdx !== undefined;
		const paginationEnabled = !hasInlineProps && navigationEnabled;

		const description = options.description;
		const title = options.title !== undefined ? options.title : this.props.registry.translations.Map;

		const inlineContainerStyle = {width: this.state.containerWidth, left: this.state.containerLeft, top: options.topOffset || 0};

		let fixedHeight = this.state.fixedHeight;

		const mapStyle = {height: this.state.mapHeight};
		const inlineSchemaStyle = {height: this.state.inlineSchemaHeight};

		const heightFixerStyle = {height: fixedHeight};
		const mapHeightFixerStyle = {height: 0};
		const inlineSchemaHeightFixerStyle = {height: 0};

		let inlineContainerHeight = fixedHeight;
		let scrolledHeight = this.state.inlineContainerHeight - this.state.inlineContainerScrolledAmount;

		const state = this.state.scrollState;

		const inlineContentHeight = this.state.inlineSchemaHeight;

		if (state === SQUEEZING &&
		    ["inlineContainerHeight", "inlineContainerScrolledAmount"].every(stateProp => this.state.hasOwnProperty(stateProp)))
			inlineContainerHeight = scrolledHeight;

		if (state !== SCROLLING) {
			inlineContainerStyle.height = inlineContainerHeight;
			if (this.state.mapHeight > inlineContainerHeight) {
				mapStyle.height = Math.max(inlineContainerHeight, (this.state.mapHeight - this.state.inlineContainerScrolledAmount || 0));
			}
			if (inlineContentHeight > inlineContainerHeight) {
				inlineSchemaStyle.height = (inlineContainerHeight > (inlineContentHeight - this.state.inlineContainerScrolledAmount || 0)) ?
					inlineContainerHeight :
					(this.state.inlineSchemaHeight - this.state.inlineContainerScrolledAmount || 0);
				inlineSchemaStyle.height -= this.state.navContainerHeight;
			}
			heightFixerStyle.height = this.state.inlineContainerHeight;
			mapHeightFixerStyle.height = this.state.mapHeight - mapStyle.height || 0;
			inlineSchemaHeightFixerStyle.height = this.state.inlineSchemaHeight - inlineSchemaStyle.height || 0;
		}

		const {translations} = this.props.registry;

		const scrollMode = (state !== SCROLLING && !this.state.detachUnitMode);

		return (<div>
			<TitleField title={title} />
			{description !== undefined ? <DescriptionField description={description} /> : null}
			{paginationEnabled ? <Pagination
				className="container"
				activePage={(this.state.activeIdx !== undefined) ? this.state.activeIdx + 1 : undefined}
				items={(this.state.data) ? this.state.data.length : 0}
				next={true}
				prev={true}
				boundaryLinks={true}
				maxButtons={5}
				onSelect={i => {this.focusToLayer(i - 1)}}
			/> : null}
			<Row ref="mapAndSchemasContainer">
				<div ref="inlineContainer"
				     className={"form-map-inline-container " + (scrollMode ? "out-of-view" : "")}
				     style={scrollMode ? inlineContainerStyle : null} >
					<div className={hasInlineProps ? " col-" + colType + "-6" : ""}>
						{this.state.detachUnitMode ? <div className="pass-block"><Panel><span>{translations.DetachUnitHelp}</span><Button bsStyle="default" onClick={this.stopDetach}>{translations.Cancel}</Button></Panel></div> : null}
						<MapComponent
							style={scrollMode ? mapStyle : undefined}
							className={this.state.detachUnitMode ? "pass-block" : ""}
							ref={"map"}
							drawData={{featureCollection: {type: "featureCollection", features: this.state.data},
							           getPopup: this.getPopup}}
							activeIdx={this.state.activeIdx}
							center={[62.3, 25]}
							zoom={3}
							onChange={this.onMapChange}
							onInitializeDrawLayer={this.onInitializeLayer}
							lang={this.props.registry.lang}
						  popupOnHover={true}
						/>
						{scrollMode ? <div ref="mapHeightFixer" style={mapHeightFixerStyle} /> : null}
						{options.popupFields ?
							<div style={{display: "none"}}>
								<Popup data={this.getPopupData(this.state.popupIdx)} ref="popup"/>
							</div> : null}
					</div>

					{hasInlineProps ? (
						<div>
							{this.renderNav()}
							<ReactCSSTransitionGroup transitionName={"map-array-" + this.state.direction}
							                         transitionEnterTimeout={300}
							                         transitionLeaveTimeout={300}>
								{hasInlineProps ? this.renderInlineSchemaField((scrollMode ? inlineSchemaStyle : null),
									scrollMode ?
										<div ref="inlineSchemaHeightFixer"
										     className={"col-"  + colType + "-6"}
										     style={inlineSchemaHeightFixerStyle} /> : null)
									: null}
							</ReactCSSTransitionGroup>
						</div>) : null
					}
				</div>
				{scrollMode ?  <div style={heightFixerStyle} /> : null}
				<ReactCSSTransitionGroup
					transitionName={"map-array-" + this.state.direction}
					transitionEnterTimeout={300}
					transitionLeaveTimeout={300}>
						{this.renderSchemaField()}
				</ReactCSSTransitionGroup>
			</Row>

	</div>)
	}

	renderNav = () => {
		const options = this.props.uiSchema["ui:options"];
		const hasInlineProps = options && options.inlineProperties && options.inlineProperties.length;
		const navigationEnabled = this.state.data && this.state.data.length > 1 && this.state.activeIdx !== undefined;
		const navEnabled = hasInlineProps && navigationEnabled;
		const colType = this.getColType(this.props);
		const {translations} = this.props.registry;

		return navEnabled ?
			<div ref="navContainer" className={(colType ? "col-" + colType + "-6" : "col-xs-12") + " laji-form-map-navi"}>
				<Nav bsStyle="tabs" >
					{this.state.data.map((item, i) => {
						const popupData = this.getPopupData(i);
						const isActive = i === this.state.activeIdx;

						const nav = (
							<NavItem key={i} eventKey={i} active={isActive}
							         className={this.state.hoveredNav === i ? "hover" : ""}
							         onClick={() => this.focusToLayer(i)}
							         onMouseEnter={this.onNavItemMouseEnter(i)}
							         onMouseLeave={this.onNavItemMouseLeave(i)}>
								{(isActive ? translations.Place + " " : "") + (i + 1)}
							</NavItem>
						)

						return Object.keys(popupData).length ? (
							<OverlayTrigger key={i + "-tooltip"}
							                placement="bottom"
							                overlay={<Tooltip id={"nav-tooltip-" + i}><Popup data={popupData} /></Tooltip>} >
								{nav}
							</OverlayTrigger>
						) : nav
					}
				)}
			</Nav>
		</div> : null
	}

	onNavItemMouseEnter = (idx) => () => {
		const {map} = this.refs.map;
		const layer = map._getDrawLayerById(map.idxsToIds[idx]);
		map.updateLayerStyle(layer, {color: "#36B43A"});
	}

	onNavItemMouseLeave = (idx) => () => {
		const {map} = this.refs.map;
		map._updateDrawLayerStyle(map.idxsToIds[idx]);
	}

	getSchemaForFields = (fields, isInline, style, sibling) => {
		let {formData, idSchema, errorSchema, registry} = this.state;
		let idx = this.state.activeIdx;

		let itemSchemaProperties = {};
		let itemFormData = (formData && formData.length && idx !== undefined) ? {} : undefined;
		let itemErrorSchema = {};
		fields.forEach(prop => {
			itemSchemaProperties[prop] = this.state.schema.properties[prop];
			if (itemFormData && formData[idx].hasOwnProperty(prop)) itemFormData[prop] = formData[idx][prop];
			if (errorSchema && errorSchema[idx]) itemErrorSchema[prop] = errorSchema[idx][prop];
		});
		let itemSchema = update(this.state.schema, {properties: {$set: itemSchemaProperties}});
		delete itemSchema.title;
		let itemIdSchema = toIdSchema(this.state.schema, idSchema.$id + "_" + idx, this.props.registry.definitions);

		let uiSchema = isInline ? this.props.uiSchema["ui:options"].inlineUiSchema : this.state.uiSchema;

		const options = this.props.uiSchema["ui:options"];
		const colType = this.getColType(this.props);

		const SchemaField = this.props.registry.fields.SchemaField;

		return (itemFormData) ? (
			<div key={idx + (isInline ? "-inline" : "-default")}>
				<div
					ref={isInline ? "inlineSchema" : "schema"}
					style={style}
					className={isInline ? "map-array-inline-schema col-" + colType + "-6" : "map-array-schema col-xs-12"}>
					<SchemaField
						{...this.props}
						{...this.state}
						schema={itemSchema}
						formData={itemFormData}
						idSchema={itemIdSchema}
						errorSchema={itemErrorSchema}
						uiSchema={uiSchema}
						registry={registry}
						onChange={this.onItemChange(idx)}
						name={undefined} />
				</div>
				{sibling ? sibling : null}
			</div>) :
			null;
	}

	renderInlineSchemaField = (style, sibling) => {
		return this.getSchemaForFields(this.props.uiSchema["ui:options"].inlineProperties, !!"is inline", style, sibling);
	}

	renderSchemaField = () => {
		const allFields = Object.keys(this.state.schema.properties);
		let inlineFields = this.props.uiSchema["ui:options"].inlineProperties;
		return this.getSchemaForFields(inlineFields ? allFields.filter(field => !inlineFields.includes(field)) : allFields);
	}

	getPopup = (idx, openPopupCallback) => {
		if (!this.refs.popup) return;
		this.setState({popupIdx: idx}, () => openPopupCallback(this.refs.popup.refs.popup));
	}

	getPopupData = (idx) => {
		const popupOptions = this.props.uiSchema["ui:options"].popupFields;

		const data = {};
		if (!this.props.formData) return data;
		popupOptions.forEach(field => {
			const fieldName = field.field;
			const itemFormData = this.props.formData[idx];
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			let fieldSchema = this.props.schema.items.properties;

			if (field.mapper && fieldData) {
				const mappedData = popupMappers[field.mapper](fieldSchema, fieldData, fieldName);
				for (let label in mappedData) {
					data[label] = mappedData[label];
				}
			} else if (fieldData) {
				data[fieldSchema[fieldName].title || fieldName] = fieldData;
			}

		});
		return data;
	}

	onInitializeLayer = (idx, layer) => {
		layer.on("mouseover", () => this.setState({hoveredNav: idx}));
		layer.on("mouseout", () => this.setState({hoveredNav: undefined}));
	}

	getScrollVariables = () => {
		const offset = this.props.uiSchema["ui:options"].topOffset || 0;

		const inlineRef = this.refs.inlineContainer;
		const mapAndSchemasRef = this.refs.mapAndSchemasContainer;

		let inlineContainerHeight, mapHeight, inlineSchemaHeight, schemaBottomDistance,
		    navContainerHeight, inlineContainerScrolledAmount, fixedHeight;
		let scrollState = SCROLLING;

		if (mapAndSchemasRef) {
			const mapAndSchemasElem = findDOMNode(mapAndSchemasRef);

			if (this.wideEnoughForFixed()) {
				const inlineElem = findDOMNode(inlineRef);
				const inlineSchemaElem = this.refs.inlineSchema;
				const navContainerElem = this.refs.navContainer;

				inlineContainerScrolledAmount = -mapAndSchemasElem.getBoundingClientRect().top + offset;

				inlineContainerHeight = inlineElem.scrollHeight;
				if (this.refs.schema) {
					schemaBottomDistance = this.refs.schema.getBoundingClientRect().bottom - offset;
				}

				mapHeight = findDOMNode(this.refs.map).offsetHeight;
				if (this.refs.mapHeightFixer) mapHeight += findDOMNode(this.refs.mapHeightFixer).scrollHeight;

				navContainerHeight = (navContainerElem) ? navContainerElem.scrollHeight : 0;

				inlineSchemaHeight = (inlineSchemaElem) ? inlineSchemaElem.offsetHeight : undefined;
				if (this.refs.inlineSchemaHeightFixer) {
					inlineSchemaHeight += findDOMNode(this.refs.inlineSchemaHeightFixer).scrollHeight;
				}

				let scrolledHeight = inlineContainerHeight - inlineContainerScrolledAmount;

				fixedHeight = this.fixedHeight - offset;
				fixedHeight = Math.min(fixedHeight, schemaBottomDistance || 0);

				scrollState = (inlineContainerScrolledAmount <= 0) ? SCROLLING :
					(scrolledHeight < fixedHeight) ? FIXED : SQUEEZING;
				if (fixedHeight <= 0) scrollState = SCROLLING;
			}
		}
		return {scrollState, mapHeight, inlineContainerHeight, inlineSchemaHeight,
		        schemaBottomDistance, navContainerHeight, inlineContainerScrolledAmount, fixedHeight};
	}

	getColType = (props) => {
		const uiSchema = props.uiSchema;
		if (uiSchema) {
			const options = uiSchema["ui:options"];
			if (options.colType) return options.colType;
		}
		return "md";
	}

	wideEnoughForFixed = () => {
		function getMinWidthForType(type) {
			switch(type){
				case "lg":
					return 1200;
				case "md":
					return 992;
				case "sm":
					return 768;
			}
		}

		const {inlineProperties} = this.props.uiSchema["ui:options"];
		const colType = this.getColType(this.props);

		return (
			inlineProperties &&
			(colType === "xs" || (window && window.matchMedia && window.matchMedia("(min-width: " + getMinWidthForType(colType) + "px)").matches))
		);
	}

	updateFromScroll = () => {
		this.setState(this.getScrollVariables());
	}

	updateFromDimensions = () => {
		this.setState({...this.getScrollVariables(), ...this.getInlineWidth()});
	}

	getInlineWidth = () => {
		const mapAndSchemasRef = this.refs.mapAndSchemasContainer;

		if (mapAndSchemasRef) {
			const mapAndSchemasElem = findDOMNode(mapAndSchemasRef);
			const containerWidth = mapAndSchemasElem.offsetWidth;
			const containerLeft = mapAndSchemasElem.getBoundingClientRect().left;
			return {containerWidth, containerLeft};
		}
		return {};
	}
}

class Popup extends Component {
	render() {
		const { data } = this.props;
		return (data && Object.keys(data).length) ? (
			<ul ref="popup" className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

class MapComponent extends Component {
	componentDidMount() {
		this.map = new LajiMap({
			...this.props,
			rootElem: this.refs.map
		});
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		if (this.map) {
			this.map.setDrawData(this.props.drawData);
			this.map.setActive(this.map.idxsToIds[this.props.activeIdx]);
		}
		return (<div className={"laji-form-map " +this.props.className} style={this.props.style} ref="map" />);
	}
}
