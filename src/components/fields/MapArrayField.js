import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import update from "react-addons-update";
import merge from "deepmerge";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils";
import LajiMap from "laji-map";
import Button from "../Button";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import { Pagination, Nav, NavItem, Row, Tooltip, OverlayTrigger } from "react-bootstrap";

const popupMappers = {
	units: (schema, units, fieldName) => {
		return {[schema.label || fieldName]: units.map(unit => unit.informalNameString)};
	}
}

const SCROLLING = "SCROLLING";
const SQUEEZING = "SQUEEZING";
const FIXED = "FIXED";

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

		return {...props, schema, uiSchema, data, activeIdx, onChange: this.onItemChange};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onAdd = (e) => {
		let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);
		item.wgs84Geometry = e.feature.geometry;
		let formData = this.props.formData;
		if (formData && formData.length) formData.push(item);
		else formData = [item];
		return {propsChange: formData};
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

	onActiveChange = idx => {
		let state = {activeIdx: idx};
		if (this.controlledActiveChange) {
			this.controlledActiveChange = false;
		} else {
			state.direction = "directionless";
			if (this.state.activeIdx !== undefined) state.direction = (idx > this.state.activeIdx) ? "right" : "left";
		}
		return {state};
	}

	focusToLayer = (idx) => {
		this.controlledActiveChange = true;
		this.setState({direction: (this.state.activeIdx === undefined) ?
			"directionless" :
			((idx > this.state.activeIdx) ? "right" : "left")
		});
		this.refs.map.map.focusToLayer(idx)
	}

	onItemChange = (formData) => {
		if (this.state.activeIdx === undefined) return;

		let newFormData = formData;

		if (this.props.uiSchema["ui:options"].inlineProperties) {
			newFormData = this.props.formData[this.state.activeIdx];
			for (let prop in formData) {
				newFormData = update(newFormData, {[prop]: {$set: formData[prop]}});
			}
		}
		this.props.onChange(update(this.props.formData, {$splice: [[this.state.activeIdx, 1, newFormData]]}));
	}

	onMapChange = (events) => {
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

		const that = this;
		function onChange() {
			if (propsChange) that.props.onChange(propsChange);
		}

		state ? this.setState(state, () => { onChange(); }) : onChange();
	}

	render() {
		const options = this.props.uiSchema["ui:options"];
		const hasInlineProps = options && options.inlineProperties && options.inlineProperties.length;
		const colType = this.getColType(this.props);

		const navigationEnabled = this.state.data && this.state.data.length > 1 && this.state.activeIdx !== undefined;
		const paginationEnabled = !hasInlineProps && navigationEnabled;

		const description = options.description;
		const title = options.title !== undefined ? options.title : this.props.registry.translations.Map;

		const inlineStyle = {width: this.state.containerWidth, left: this.state.containerLeft};

		let fixedHeight = this.state.fixedHeight;

		const mapStyle = {height: this.state.mapHeight};
		const inlineSchemaStyle = {height: this.state.inlineSchemaHeight};

		const heightFixerStyle = {height: fixedHeight};
		const mapHeightFixerStyle = {height: 0};
		const inlineSchemaHeightFixerStyle = {height: 0};

		let inlineHeight = fixedHeight;
		let scrolledHeight = this.state.inlineHeight - this.state.inlineScrolledAmount;

		const state = this.state.scrollState;

		const inlineContentHeight = this.state.inlineSchemaHeight + this.state.navContainerHeight;

		if (state === SQUEEZING &&
		    ["inlineHeight", "inlineScrolledAmount"].every(stateProp => this.state.hasOwnProperty(stateProp)))
			inlineHeight = scrolledHeight;

		if (state !== SCROLLING) {
			inlineStyle.height = inlineHeight;
			if (this.state.mapHeight > inlineHeight) {
				mapStyle.height = Math.max(inlineHeight, (this.state.mapHeight - this.state.inlineScrolledAmount || 0));
			}
			if (inlineContentHeight > inlineHeight) {
				inlineSchemaStyle.height = (inlineHeight > (inlineContentHeight - this.state.inlineScrolledAmount || 0)) ?
					(inlineHeight - this.state.navContainerHeight) :
					(this.state.inlineSchemaHeight - this.state.inlineScrolledAmount || 0);
			}
			heightFixerStyle.height = this.state.inlineHeight;
			mapHeightFixerStyle.height = this.state.mapHeight - mapStyle.height || 0;
			inlineSchemaHeightFixerStyle.height = this.state.inlineSchemaHeight - inlineSchemaStyle.height || 0;
		}

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
			<Row ref="mapAndSchemasContainer" >
				<div ref="inlineContainer"
				     className={"form-map-inline-container " + ((state !== SCROLLING) ? "out-of-view" : undefined)}
				     style={inlineStyle} >
					<div className={hasInlineProps ? " col-" + colType + "-6" : ""} >
						<MapComponent
							style={state !== SCROLLING ? mapStyle : undefined}
							ref={"map"}
							drawData={{featureCollection: {type: "featureCollection", features: this.state.data}}}
							activeIdx={this.state.activeIdx}
							center={[62.3, 25]}
							zoom={3}
							onChange={this.onMapChange}
							getPopup={this.getPopup}
							onInitializeDrawLayer={this.onInitializeLayer}
							lang={this.props.registry.lang}
						/>
						{(state !== SCROLLING) ? <div ref="mapHeightFixer" style={mapHeightFixerStyle} /> : null}
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
								{hasInlineProps ? this.renderInlineSchemaField(inlineSchemaStyle,
									(state !== SCROLLING) ?
										<div ref="inlineSchemaHeightFixer"
										     className={"col-"  + colType + "-6"}
										     style={inlineSchemaHeightFixerStyle} /> : null)
									: null}
							</ReactCSSTransitionGroup>
						</div>) : null
					}
				</div>
				{(state !== SCROLLING) ?  <div style={heightFixerStyle} /> : null}
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

		return navEnabled ?
			<div ref="navContainer" className={colType ? "col-" + colType + "-6" : "col-xs-12"}>
				<Nav bsStyle="tabs" >
					{this.state.data.map((item, i) => {
						const popup = <Popup data={this.getPopupData(i)} />;
						const tooltip = <Tooltip id={"nav-tooltip-" + i}>{popup}</Tooltip>;

						const nav = (
							<NavItem key={i} eventKey={i} active={i === this.state.activeIdx}
							         className={this.state.hoveredNav === i ? "hover" : ""}
							         onClick={() => this.focusToLayer(i)}
							         onMouseEnter={this.onNavItemMouseEnter(i)}
							         onMouseLeave={this.onNavItemMouseLeave(i)}>
								{i + 1}
							</NavItem>
						)

						return popup ? (
							<OverlayTrigger key={i + "-tooltip"}
							                placement="bottom"
							                overlay={tooltip} >
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
		const layer = map.getDrawLayerById(map.idxsToIds[idx]);
		map.updateLayerStyle(layer, {color: "#36B43A"});
	}

	onNavItemMouseLeave = (idx) => () => {
		const {map} = this.refs.map;
		map.updateDrawLayerStyle(map.idxsToIds[idx]);
	}

	getSchemaForFields = (fields, isInline, style, sibling) => {
		let {formData, idSchema, errorSchema} = this.props;
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
					className={isInline ? "map-array-inline-schema col-" + colType + "-6" : "col-xs-12"}>
					<SchemaField
						{...this.props}
						{...this.state}
						schema={itemSchema}
						formData={itemFormData}
						idSchema={itemIdSchema}
						errorSchema={itemErrorSchema}
						uiSchema={uiSchema}
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
		const inlineRef = this.refs.inlineContainer;
		const mapAndSchemasRef = this.refs.mapAndSchemasContainer;

		let inlineHeight, mapHeight, inlineSchemaHeight, schemaBottomDistance,
		    navContainerHeight, inlineScrolledAmount, fixedHeight;
		let scrollState = SCROLLING;

		if (mapAndSchemasRef) {
			const mapAndSchemasElem = findDOMNode(mapAndSchemasRef);

			if (this.shouldBeFixed()) {
				const inlineElem = findDOMNode(inlineRef);
				const inlineSchemaElem = this.refs.inlineSchema;
				const navContainerElem = this.refs.navContainer;

				inlineScrolledAmount = -mapAndSchemasElem.getBoundingClientRect().top;

				inlineHeight = inlineElem.scrollHeight;
				if (this.refs.schema) {
					schemaBottomDistance = this.refs.schema.getBoundingClientRect().bottom;
				}

				mapHeight = findDOMNode(this.refs.map).offsetHeight;
				if (this.refs.mapHeightFixer) mapHeight += findDOMNode(this.refs.mapHeightFixer).scrollHeight;


				navContainerHeight = (navContainerElem) ? navContainerElem.scrollHeight : 0;

				inlineSchemaHeight = (inlineSchemaElem) ? inlineSchemaElem.offsetHeight : undefined;
				if (this.refs.inlineSchemaHeightFixer) {
					inlineSchemaHeight += findDOMNode(this.refs.inlineSchemaHeightFixer).scrollHeight;
				}

				let scrolledHeight = inlineHeight - inlineScrolledAmount;

				fixedHeight = this.fixedHeight;
				fixedHeight = Math.min(fixedHeight, schemaBottomDistance || 0);

				scrollState = (inlineScrolledAmount < 0) ? SCROLLING :
					(scrolledHeight < fixedHeight) ? FIXED : SQUEEZING;
				if (fixedHeight < 0) scrollState = SCROLLING;
			}
		}
		return {scrollState, mapHeight, inlineHeight, inlineSchemaHeight,
		        schemaBottomDistance, navContainerHeight, inlineScrolledAmount, fixedHeight};
	}

	getColType = (props) => {
		const uiSchema = props.uiSchema;
		if (uiSchema) {
			const options = uiSchema["ui:options"];
			if (options.colType) return options.colType;
		}
		return "md";
	}

	shouldBeFixed = () => {
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

	render() {
		return (<div className={"laji-form-map " +this.props.className} style={this.props.style} ref="map" />);
	}
}
