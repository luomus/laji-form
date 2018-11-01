import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import merge from "deepmerge";
import { Accordion, Panel, OverlayTrigger, Tooltip, Pager, Table, Row, Col } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import PanelBody from "react-bootstrap/lib/PanelBody";
import { getUiOptions, hasData, getReactComponentName, parseJSONPointer, getBootstrapCols,
	getNestedTailUiSchema, isHidden, isEmptyString, bsSizeToPixels, capitalizeFirstLetter, decapitalizeFirstLetter, formatValue, focusAndScroll, syncScroll, shouldSyncScroll } from "../../utils";
import { orderProperties } from "react-jsonschema-form/lib/utils";
import { DeleteButton, Label, Help, TooltipComponent, Button, Affix } from "../components";
import _ArrayFieldTemplate, { getButtons, getButtonElems, getButtonsForPosition, arrayKeyFunctions, arrayItemKeyFunctions, handlesArrayKeys, beforeAdd } from "../ArrayFieldTemplate";
import { copyItemFunction } from "./ArrayField";
import Context from "../../Context";
import ApiClient from "../../ApiClient";
import BaseComponent from "../BaseComponent";
import { getLineTransectStartEndDistancesForIdx } from "laji-map/lib/utils";

const popupMappers = {
	units: (schema, units, options) => {
		const identifications = units.map(item =>
			(item && item.identifications && item.identifications[0]) ?
				item.identifications[0] :
				undefined
		).filter(item => item);

		return Promise.all(
			identifications.map(identification =>
					Promise.resolve(identification.taxon)
			)
		).then(result => {
			return Promise.resolve({[(schema.units ? schema.units.title : undefined) || options.label || options.field]: result});
		});
	}
};

@BaseComponent
export default class SingleActiveArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				renderer: PropTypes.oneOf(["accordion", "pager", "uncontrolled", "table", "split"]),
				activeIdx: PropTypes.integer
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	constructor(props) {
		super(props);
		const {formData, uiSchema, schema} = props;
		this.deleteButtonRefs = {};
		const options = getUiOptions(uiSchema);
		const formDataLength = (formData || []).length;
		this.state = {
			activeIdx: (formDataLength === 1 || formDataLength === 0 && schema.minItems) ? 0 : options.initialActiveIdx,
			...this.getStateFromProps(props), popups: {}
		};
		const id = `${this.props.idSchema.$id}`;
		this.getContext()[`${id}.activeIdx`] = this.state.activeIdx;
	}

	componentDidMount() {
		this.mounted = true;
		this.updatePopups(this.props);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "activeIdx", idx => {
			this.onActiveChange(idx);
		});
	}

	componentWillUnmount() {
		this.mounted = false;
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "activeIdx");
	}

	componentWillReceiveProps(props) {
		this.prevActiveIdx = this.state.activeIdx;
		this.setState(this.getStateFromProps(props));
		this.updatePopups(props);
	}

	componentDidUpdate(prevProps, prevState) {
		const options = getUiOptions(this.props);
		const prevOptions = getUiOptions(prevProps);
		this.getContext()[`${this.props.idSchema.$id}.activeIdx`] = this.state.activeIdx;
		const {idToFocusAfterNavigate, idToScrollAfterNavigate, focusOnNavigate = true, renderer = "accordion"} = getUiOptions(this.props.uiSchema);
		if (renderer === "uncontrolled") return;
		if (prevProps.formData.length === this.props.formData.length && ("activeIdx" in options && options.activeIdx !== prevOptions.activeIdx || (!("activeIdx" in options) && this.state.activeIdx !== prevState.activeIdx))) {
			const idToScroll = idToScrollAfterNavigate
				? idToScrollAfterNavigate
				: renderer === "accordion" || renderer === "pager" 
					? `${this.props.idSchema.$id}_${this.state.activeIdx}-header`
					: `${this.props.idSchema.$id}-add`;
			setImmediate(() => focusAndScroll(this.props.formContext, idToFocusAfterNavigate || `${this.props.idSchema.$id}_${this.state.activeIdx}`, idToScroll, focusOnNavigate));
		}
	}

	updatePopups = (props) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		let {popups} = this.state;
		let count = 0;
		if (popupFields) props.formData.forEach((item, idx) => {
			this.getPopupDataPromise(idx, props, item).then(popupData => {
				count++;
				popups  = {...popups, [idx]: popupData};
				if (this.mounted && count === props.formData.length) this.setState({popups});
			}).catch(() => {
				count++;
			});
		});
	}

	getStateFromProps(props) {
		const state = {};
		const options = getUiOptions(props.uiSchema);
		if (options.hasOwnProperty("activeIdx")) state.activeIdx = options.activeIdx;
		else if (props.formData.length === 1 && this.props.formData.length === 0) {
			state.activeIdx = 0;
		}

		return state;
	}

	getTitle = (idx) => {
		const options = getUiOptions(this.props.uiSchema);
		const {titleFormat} = options;

		const title = "ui:title" in this.props.uiSchema ? this.props.uiSchema["ui:title" ] : this.props.schema.title;
		if (!titleFormat) return title;

		const formatters = {
			idx: idx + 1,
			title: this.props.schema.title
		};

		return Object.keys(formatters).reduce((_title, key) => {
			[key, capitalizeFirstLetter(key)].map(key => `%{${key}}`).forEach(replacePattern => {
				while (_title.includes(replacePattern)) {
					const fn = replacePattern[2] === replacePattern[2].toLowerCase() ? 
						decapitalizeFirstLetter : capitalizeFirstLetter;
					_title = _title.replace(replacePattern, fn(`${formatters[key]}`));
				}
			});
			return _title;
		}, titleFormat);
	}

	onHeaderAffixChange = (elem, value) => {
		if (value) {
			this.scrollHeightFixed = elem.scrollHeight;
			this.setState({formContext: {...this.props.formContext, topOffset: this.props.formContext.topOffset + elem.scrollHeight}}, () => {
				syncScroll(this.props.formContext);
			});
		} else {
			this.scrollHeightFixed = 0;
			this.setState({formContext: {...this.props.formContext, topOffset: this.props.formContext.topOffset}});
		}
	}

	render() {
		const {renderer = "accordion", tableActiveItemClassNames} = getUiOptions(this.props.uiSchema);
		let ArrayFieldTemplate = undefined;
		switch (renderer) {
		case "accordion":
			ArrayFieldTemplate = AccordionArrayFieldTemplate;
			break;
		case "pager":
			ArrayFieldTemplate = PagerArrayFieldTemplate;
			break;
		case "uncontrolled":
			ArrayFieldTemplate = UncontrolledArrayFieldTemplate;
			break;
		case "table":
			ArrayFieldTemplate = TableArrayFieldTemplate;
			break;
		case "split":
			ArrayFieldTemplate = SplitArrayFieldTemplate;
			break;
		default:
			throw new Error(`Unknown renderer '${renderer}' for SingleActiveArrayField`);
		}

		const formContext = {...(this.state.formContext || this.props.formContext), this: this, prevActiveIdx: this.prevActiveIdx, activeIdx: this.state.activeIdx};

		const {registry: {fields: {ArrayField}}} = this.props;

		let buttons = this.props.uiSchema["ui:options"] ? (this.props.uiSchema["ui:options"].buttons || []) : [];

		let uiSchema = {
			...this.props.uiSchema,
			"ui:field": undefined,
			classNames: undefined,
			"ui:options": {
				...this.props.uiSchema["ui:options"],
				buttons,
				buttonDefinitions: this.props.uiSchema["ui:options"].buttonDefinitions ? 
					merge(this.buttonDefinitions, getUiOptions(this.props.uiSchema).buttonDefinitions) :
					this.buttonDefinitions
			}
		};

		if (renderer === "table" && tableActiveItemClassNames && !this.state.normalRendering) {
			uiSchema = {
				...uiSchema,
				items: {
					...uiSchema.items,
					classNames: tableActiveItemClassNames
				}
			};
		}

		return (
			<ArrayField
				{...this.props}
				formContext={formContext}
				registry={{
					...this.props.registry,
					ArrayFieldTemplate,
					formContext
				}}
				uiSchema={uiSchema}
			/>
		);
	}

	updateRenderingMode = (normalRendering, callback) => {
		this.setState({normalRendering}, () => callback && callback(normalRendering));
	}

	getPopupDataPromise = (idx, props, itemFormData) => {
		const {popupFields} = getUiOptions(props.uiSchema);

		if (!this.props.formData) return Promise.resolve({});

		return Promise.all(popupFields.map(field => {
			const fieldName = field.field;
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			let fieldSchema = props.schema.items.properties;

			if (field.mapper && fieldData) {
				return popupMappers[field.mapper](fieldSchema, fieldData, field);
			} else if (fieldData) {
				return new Promise(resolve => resolve({[fieldSchema  && fieldSchema[fieldName] ? fieldSchema[fieldName].title : fieldName]: fieldData}));
			}
		})).then(fields => {
			const popupData = fields.reduce((popup, item) => {
				if (item) Object.keys(item).forEach(label => {
					popup[label] = item[label];
				});
				return popup;
			}, {});
			return Promise.resolve(popupData);
		});
	}

	onActiveChange = (idx, prop, callback) => {
		if (idx !== undefined) {
			idx = parseInt(idx);
		}

		if (this.state.activeIdx === idx) {
			idx = undefined;
		}

		const {onActiveChange} = getUiOptions(this.props.uiSchema);
		onActiveChange ? onActiveChange(idx, prop, callback) : this.setState({activeIdx: idx}, callback);
	}

	onDelete = (idx) => () => {
		const formData = update(this.props.formData, {$splice: [[idx, 1]]});
		if (!formData.length) this.onActiveChange(undefined);
		if (this.state.activeIdx >= formData.length) this.onActiveChange(formData.length - 1);
		this.props.onChange(formData);
	}

	buttonDefinitions = {
		add: {
			callback: () => this.onActiveChange(this.props.formData.length)
		},
		copy: {
			fn: () => (...params) => {
				const idx = this.state.activeIdx !== undefined ?
					this.state.activeIdx :
					this.props.formData.length - 1;
				beforeAdd(this.props);
				this.props.onChange([
					...this.props.formData.slice(0, idx + 1),
					copyItemFunction(this, this.props.formData[idx])(...params),
					...this.props.formData.slice(idx + 1)
				]);
			},
			callback: () => {
				const idx = this.state.activeIdx !== undefined ?
					this.state.activeIdx :
					this.props.formData.length - 1;
				this.onActiveChange(idx + 1);
			},
			rules: {
				minLength: 1
			}
		}
	}
}

class Popup extends Component {
	render() {
		const {data} = this.props;
		return (data && Object.keys(data).length) ? (
			<ul className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.filter(hasData).join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

function handlesButtonsAndFocus(ComposedComponent) {
	return @handlesArrayKeys
	class SingleActiveArrayTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent);

		addKeyHandlers() {
			const {renderer = "accordion"} = getUiOptions(this.props.uiSchema);
			const that = this.props.formContext.this;
			new Context(this.props.formContext.contextId).addKeyHandler(this.props.idSchema.$id, arrayKeyFunctions, {
				getProps: () => this.props,
				insertCallforward: callback => that.onActiveChange(that.props.formData.length, undefined, callback),
				getCurrentIdx: () => that.state.activeIdx,
				focusByIdx: (idx, prop, callback) => idx === that.state.activeIdx
					? callback()
					: that.onActiveChange(idx, prop, callback),
				getIdToScrollAfterNavigate: renderer === "accordion" || renderer === "pager"
					? () => `${this.props.idSchema.$id}_${that.state.activeIdx}-header`
					: undefined
			});
		}

		addChildKeyHandlers() {
			const that = this.props.formContext.this;
			if (this.childKeyHandlerId) new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			if (that.state.activeIdx !== undefined) {
				const id = `${this.props.idSchema.$id}_${that.state.activeIdx}`;
				this.childKeyHandlerId = id;
				new Context(this.props.formContext.contextId).addKeyHandler(id, arrayItemKeyFunctions, {id, getProps: () => this.props, getDeleteButton: () => {
					return that.deleteButtonRefs[that.state.activeIdx];
				}});
			}

			this.removeFocusHandlers();
			this.focusHandlers = [];
			for (let i = 0; i < this.props.items.length; i++) {
				this.focusHandlers.push(() => {
					if (that.state.activeIdx !== i) return new Promise(resolve => {
						that.onActiveChange(i, undefined, () => resolve());
					});
				});
				new Context(this.props.formContext.contextId).addFocusHandler(`${that.props.idSchema.$id}_${i}`, this.focusHandlers[i]);
			}

			this.prevLength = this.props.items.length;
		}

		removeFocusHandlers() {
			const that = this.props.formContext.this;
			if (this.focusHandlers) {
				this.focusHandlers.forEach((handler, i) => {
					new Context(this.props.formContext.contextId).removeFocusHandler(`${that.props.idSchema.$id}_${i}`, this.focusHandlers[i]);
				});
			}
		}

		componentWillUnmount() {
			new Context(this.props.formContext.contextId).removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			new Context(this.props.formContext.contextId).removeKeyHandler(this.childKeyHandlerId, arrayItemKeyFunctions);
			this.removeFocusHandlers();
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

// Swallow unknown prop warnings.
const ButtonsWrapper = ({props}) => {
	const buttons = getUiOptions(props.uiSchema).buttons;
	return <div>{getButtonElems(buttons, props)}</div>;
};

const AccordionButtonsWrapper = ({props, position}) => {
	const buttons = getButtonsForPosition(props, getButtons(getUiOptions(props.uiSchema).buttons, props), position);
	if (!buttons) return null;

	const cols = Object.keys(getBootstrapCols()).reduce((cols, colType) => {
		cols[colType] = (colType === "xs") ? 12 : 12 / buttons.length;
		return cols;
	}, {});

	return (
		<Row className="laji-form-accordion-buttons">
			{buttons.map((button, idx) => 
					<Col {...cols} key={idx}>{button}</Col>
			)}
		</Row>
	);

};

@handlesButtonsAndFocus
class AccordionArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const arrayFieldTemplateProps = this.props;

		const activeIdx = that.state.activeIdx;

		const onSelect = key => that.onActiveChange(key);

		const {confirmDelete, closeButton} = getUiOptions(arrayFieldTemplateProps.uiSchema);
		const {translations} = this.props.formContext;

		const getHeader = idx => (
			<AccordionHeader 
				that={that}
				idx={idx}
				wrapperClassName="panel-title"
				className="laji-form-panel-header laji-form-clickable-panel-header laji-form-accordion-header">
				<DeleteButton id={`${that.props.idSchema.$id}_${idx}`}
											ref={this.setDeleteButtonRef(idx)}
											className="pull-right"
											confirm={confirmDelete}
											translations={translations}
											onClick={that.onDelete(idx)} />
			</AccordionHeader>
		);

		return (
			<div className="laji-form-single-active-array no-transition">
				<AccordionButtonsWrapper props={arrayFieldTemplateProps} position="top" />
				<Accordion onSelect={onSelect} activeKey={activeIdx === undefined ? -1 : activeIdx} id={`${that.props.idSchema.$id}-accordion`}>
					{arrayFieldTemplateProps.items.map((item, idx) => (
						<Panel key={idx}
						       className="laji-form-panel laji-form-clickable-panel"
									 eventKey={idx}
									 bsStyle={that.props.errorSchema[idx] ? "danger" : "default"}>
							<PanelHeading>
								{getHeader(idx)}
							</PanelHeading>
							{idx === activeIdx ? (
								<PanelBody>
									{item.children}
									{closeButton ? <Button onClick={onSelect} bsSize="small" className="pull-right">{translations.Close}</Button> : null}
								</PanelBody>
							) : null}
						</Panel>
					))}
					<AccordionButtonsWrapper props={arrayFieldTemplateProps} position="bottom"/>
				</Accordion>
			</div>
		);
	}

	setDeleteButtonRef = idx => elem => {this.props.formContext.this.deleteButtonRefs[idx] = elem;};
}

@handlesButtonsAndFocus
class PagerArrayFieldTemplate extends Component {

	setContainerRef = (elem) => {
		this.containerRef = elem;
	}

	getContainerRef = () => this.containerRef

	setHeaderRef = (elem) => {
		this.headerRef = elem;
	}

	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const {translations} = that.props.formContext;
		const {buttons, affixed} = getUiOptions(arrayTemplateFieldProps.uiSchema);
		const activeIdx = that.state.activeIdx;
		let header = (
			<div className="laji-form-panel-header laji-form-accordion-header" ref={this.setHeaderRef}>
				<Pager>
					<Pager.Item previous 
											href="#"
											disabled={activeIdx <= 0 || activeIdx === undefined}
											onClick={this.navigatePrev}>
						&larr; {translations.Previous}</Pager.Item>
					{activeIdx !== undefined
							? (
								<AccordionHeader 
									that={that}
									idx={activeIdx}
									className="panel-title"
									canHaveUndefinedIdx={false}
								/> 
							)
							: null}
					<Pager.Item next 
											href="#"
											disabled={activeIdx >= that.props.formData.length - 1 || activeIdx === undefined}
											onClick={this.navigateNext}>
						{translations.Next}  &rarr;</Pager.Item>
				</Pager>
			</div>
		);

		if (affixed) {
			const offset = this.props.formContext.topOffset - (that.scrollHeightFixed || 0);
			header = (
				<Affix getContainer={this.getContainerRef} topOffset={offset} onAffixChange={this.onHeaderAffixChange}>
					{header}
				</Affix>
			);
		}

		return (
			<div className="laji-form-single-active-array" ref={this.setContainerRef}>
				<Panel className="laji-form-panel">
					<PanelHeading>
							{header}
					</PanelHeading>
					<PanelBody>
						<div key={activeIdx}>
							{activeIdx !== undefined && arrayTemplateFieldProps.items && arrayTemplateFieldProps.items[activeIdx] ? arrayTemplateFieldProps.items[activeIdx].children : null}
						</div>
						{getButtonElems(buttons, arrayTemplateFieldProps)}
					</PanelBody>
				</Panel>
			</div>
		);
	}

	onHeaderAffixChange = (value) => {
		const elem = this.headerRef;
		const that = this.props.formContext.this;
		that.onHeaderAffixChange(elem, value);
	}

	navigatePrev = () => this.props.formContext.this.onActiveChange(this.props.formContext.this.state.activeIdx - 1);
	navigateNext = () => this.props.formContext.this.onActiveChange(this.props.formContext.this.state.activeIdx + 1);
}

@handlesButtonsAndFocus
class UncontrolledArrayFieldTemplate extends Component {
	render() {
		const that = this.props.formContext.this;
		const	arrayTemplateFieldProps = this.props;
		const activeIdx = that.state.activeIdx;
		const {TitleField, DescriptionField} =  arrayTemplateFieldProps;
		const Title = getUiOptions(that.props.uiSchema).renderTitleAsLabel ? Label :  TitleField;
		const {titleFormatters} = getUiOptions(that.props.uiSchema);
		const title = that.getTitle(activeIdx);

		return activeIdx !== undefined && arrayTemplateFieldProps.items && arrayTemplateFieldProps.items[activeIdx] ? 
			<div key={activeIdx}>
				<Title title={title} label={title} className={getUiOptions(arrayTemplateFieldProps.uiSchema).titleClassName} titleFormatters={titleFormatters} formData={that.props.formData} help={arrayTemplateFieldProps.uiSchema["ui:help"]}/>
				<DescriptionField description={this.props.uiSchema["ui:description"]}/>
				{arrayTemplateFieldProps.items[activeIdx].children} 
			</div>
			: null;
	}
}

@handlesButtonsAndFocus
class TableArrayFieldTemplate extends Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.itemElems = [];
	}

	componentDidMount() {
		if (!getUiOptions(this.props.uiSchema).normalRenderingTreshold) return;
		this._updateRenderingMode = () => this.updateRenderingMode();
		window.addEventListener("resize", this._updateRenderingMode);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "resize", (data, callback) => {
			this.updateRenderingMode(callback);
		});
		this.updateRenderingMode();
	}

	componentWillUnmount() {
		if (!getUiOptions(this.props.uiSchema).normalRenderingTreshold) return;
		window.removeEventListener("resize", this._updateRenderingMode);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "resize");
	}

	componentDidUpdate(prevProps, prevState) {
		const that = this.props.formContext.this;
		let updated = false;
		if (this.props.items.length !== prevProps.items.length || this.state.activeIdx !== prevState.activeIdx) {
			if (!this.state.normalRendering && this.props.items.length === 1 && this.state.activeIdx === 0) {
				this.updateRenderingMode();
				updated = true;
			} else if (this.state.normalRendering && this.props.items.length > 1 || this.state.activeIdx !== 0) {
				this.updateRenderingMode();
				updated = true;
			}
		}

		if (!updated) {
			const activeChanged = this.state.activeIdx !== that.state.activeIdx;
			const itemsLengthChanged = prevProps.items.length !== this.props.items.length;

			let tHeadHeight, tHeadHeightChanged;
			if (this.tHeadRef) {
				tHeadHeight = this.tHeadRef.scrollHeight;
				tHeadHeightChanged = this.prevTHeadHeight && tHeadHeight !== this.prevTHeadHeight;
			}

			 if (activeChanged || itemsLengthChanged || tHeadHeightChanged) {
				this.updateLayout(this.props.formContext.this.state.activeIdx);
			}
			if (tHeadHeight) this.prevTHeadHeight = tHeadHeight;
		}
	}

	// Sets state.normalRendering on if screen is too small for table layout.
	updateRenderingMode = (callback) => {
		requestAnimationFrame(() => {
			const that = this.props.formContext.this;
			const {normalRenderingTreshold} = getUiOptions(this.props.uiSchema);
			if (!normalRenderingTreshold) return;
			let treshold = bsSizeToPixels(normalRenderingTreshold);

			let normalRendering = undefined;
			if (!this.state.normalRendering && window.innerWidth <= treshold) {
				normalRendering = true;
			} else if (this.state.normalRendering && window.innerWidth > treshold) {
				normalRendering = false;
			}

			if (normalRendering !== undefined) {
				that.updateRenderingMode(normalRendering, () => 
					this.setState({normalRendering}, () => this.updateLayout(null, callback))
				);
			}	else if (!this.state.normalRendering) {
				this.updateLayout(null, callback);
			}
		});
	}

	setActiveRef = (elem) => {
		this.activeElem = elem;
	}

	setTHeadRef = (elem) => {
		this.tHeadRef = elem;
	}

	updateLayout = (idx = null, callback) => {
		requestAnimationFrame(() => {
			const scrollBack = shouldSyncScroll(this.props.formContext);
			const that = this.props.formContext.this;
			const {activeIdx} = that.state;
			const rowElem = this.itemElems[activeIdx];
			if (!rowElem || !this.activeElem) return;
			const state = {
				activeStyle: activeIdx !== undefined ? {
					position: "absolute",
					top: rowElem.offsetTop,
					width: "100%"
				} : {},
				activeTrStyle: activeIdx !== undefined ? {
					height: this.activeElem.offsetHeight
				} : {}
			};
			if (idx !== null) state.activeIdx = idx;
			const _callback = () => {
				if (scrollBack) {
					syncScroll(this.props.formContext, !!"force");
				}
				if (callback) callback();
			};
			this.setState(state, _callback);
		});
	}

	render() {
		if (this.state.normalRendering) {
			return <_ArrayFieldTemplate {...this.props} />;
		}

		const {schema, uiSchema, formData, items, TitleField, DescriptionField} = this.props;
		const {renderTitleAsLabel, formatters = {}} = getUiOptions(this.props.uiSchema);
		const Title = renderTitleAsLabel ? Label :  TitleField;
		const foundProps = {};
		let cols = Object.keys(schema.items.properties).reduce((_cols, prop) => {
			if (formData.some(item => {
				const found = 
					foundProps[prop] || 
					(
						item.hasOwnProperty(prop) && 
						!isEmptyString(item[prop]) && 
						(!Array.isArray(item[prop]) || Array.isArray(item[prop]) && !item[prop].every(isEmptyString)) &&
						!isHidden(uiSchema.items, prop) &&
						!isHidden(getNestedTailUiSchema(uiSchema.items), prop)
					);
				if (found) foundProps[prop] = true;
				return found;
			})) {
				_cols.push(prop);
			}
			return _cols;
		}, []);

		const {"ui:order": order} = (uiSchema.items || {});
		if (order) cols = orderProperties(cols, order.filter(field => field === "*" || foundProps[field]));

		const that = this.props.formContext.this;
		const {errorSchema} = that.props;
		const activeIdx = that.state.activeIdx;

		const changeActive = idx => () => {
			idx !== that.state.activeIdx && that.onActiveChange(idx, undefined, this.updateLayout);
		};

		const {confirmDelete, titleClassName, titleFormatters} = getUiOptions(uiSchema);

		const getDeleteButtonFor = idx => {
			const getDeleteButtonRef = elem => {that.deleteButtonRefs[idx] = elem;};
			return <DeleteButton id={`${that.props.idSchema.$id}_${idx}`} 
			                     ref={getDeleteButtonRef}
			                     key={idx}
			                     confirm={confirmDelete}
			                     translations={this.props.formContext.translations}
			                     onClick={that.onDelete(idx)} />;
		};

		const setItemRef = idx => elem => {
			this.itemElems[idx] = elem;
		};

		const title = that.getTitle(that.state.activeIdx);

		const onMouseEnter = (idx) => that.props.idSchema.$id.match(/units$/)
			? () => new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "startHighlightUnit", idx)
			: undefined;
		const onMouseLeave = (idx) => that.props.idSchema.$id.match(/units$/)
			? () => new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "endHighlightUnit", idx)
			: undefined;

		return (
			<div style={{position: "relative"}} className="single-active-array-table-container">
				<Title title={title} label={title} className={titleClassName} titleFormatters={titleFormatters} formData={formData} />
				<DescriptionField description={this.props.uiSchema["ui:description"]}/>
				<div className="laji-form-field-template-item">
					<div className="table-responsive laji-form-field-template-schema">
						<Table hover={true} bordered={true} condensed={true} className="single-active-array-table">
							{items.length !== 1 || that.state.activeIdx !== 0 ? (
								<thead ref={this.setTHeadRef}>
										<tr className="darker">
											{cols.map(col => <th key={col}>{schema.items.properties[col].title}</th>)}
											<th key="_delete" className="single-active-array-table-delete" />
										</tr>
								</thead>
							) : null}
							<tbody>
								{items.map((item, idx) => {
									let className = "";
									if (errorSchema[idx]) className = className ? `${className} bg-danger` : "bg-danger";
									return [
										<tr key={idx} 
										    onClick={changeActive(idx)}
										    className={className}
										    tabIndex={0}
										    id={idx !== activeIdx ? `_laji-form_${this.props.formContext.contextId}_${this.props.idSchema.$id}_${idx}` : undefined}
										    ref={setItemRef(idx)}
										    style={idx === activeIdx ? this.state.activeTrStyle : undefined}
												onMouseEnter={onMouseEnter(idx)}
										    onMouseLeave={onMouseLeave(idx)}
										>
											{[
												...cols.map(col => (
													<td key={col}>
														{formatValue({...that.props, schema: schema.items, uiSchema: uiSchema.items, formData: formData[idx]}, col, formatters[col])}
													</td>
												)),
												idx !== activeIdx && <td key="delete" className="delete-button-container">{getDeleteButtonFor(idx)}</td>
											]}
										</tr>
									];
								})}
							</tbody>
						</Table>
					</div>
					<div className="laji-form-field-template-buttons" />
				</div>
				{activeIdx !== undefined && items[activeIdx] ? (
					<div key={activeIdx} ref={this.setActiveRef} className="laji-form-field-template-item keep-vertical" style={this.state.activeStyle} >
						<div className="laji-form-field-template-schema">{items[activeIdx].children}</div>
						<div className="laji-form-field-template-buttons">{getDeleteButtonFor(activeIdx)}</div>
					</div>
				): null}
				<ButtonsWrapper props={this.props} />
			</div>
		);
	}
}

const headerFormatters = {
	units: {
		component: (props) => {
			const {that: {props: {formContext: {translations}, formData}}, idx} = props;
			const item = formData[idx];
			const unitsLength = (item && item.units && item.units.hasOwnProperty("length")) ?
				item.units.filter(unit =>
					unit &&
					unit.identifications &&
					unit.identifications[0] &&
					unit.identifications[0].taxon).length
				: 0;

			return (
				<span className="text-muted">
					{` (${unitsLength} ${translations.unitsPartitive})`}
				</span>
			);
		},
		onClick: (that, idx) => {
			if (that.state.activeIdx === idx) {
				headerFormatters.units.onMouseEnter(that, idx, !!"use the force");
			} else {
				headerFormatters.units.onMouseLeave(that);
			}
		},
		onMouseEnter: (that, idx, force) => {
			const {props: {formData}} = that;
			const item = formData[idx];

			that.hoveredIdx = idx;
			if (!force && idx === that.state.activeIdx) return;
			const map = new Context(`${that.props.formContext.contextId}_MAP`).map;
			const gatheringGeometries = (item && item.geometry && item.geometry.geometries) ? item.geometry.geometries : [];

			const unitGeometries = [...(item && item.units ? item.units : [])]
				.filter(unit => unit.unitGathering && hasData(unit.unitGathering.geometry))
				.map(unit => unit.unitGathering.geometry);

			const geometries = [...gatheringGeometries, ...unitGeometries]
				.map(geometry => {
					return {type: "Feature", properties: {}, geometry};
				});

			map.addData({
				featureCollection: {type: "featureCollection", features: geometries},
				getFeatureStyle: () => {
					return {opacity: 0.6, color: "#888888"};
				},
				temp: true
			});
		},
		onMouseLeave: (that) => {
			const map = new Context(`${that.props.formContext.contextId}_MAP`).map;
			const lastData = map.data[map.data.length -1];
			if (lastData && lastData.temp) {
				map.removeData(map.data.length - 1);
			}
			that.hoveredIdx = undefined;
		}
	},
	namedPlace: {
		component: class NamedPlaceHeader extends Component {
			constructor(props) {
				super(props);
				this.state = {};
			}

			componentDidMount() {
				this.mounted = true;
				this.fetch(this.props);
			}

			componentWillUnmount() {
				this.mounted = false;
			}

			componentWillReceiveProps(props) {
				this.fetch(props);
			}

			fetch = (props) => {
				const {namedPlaceID} = props.that.props.formData[props.idx];
				if (namedPlaceID) new ApiClient().fetchCached(`/named-places/${namedPlaceID}`).then(response => {
					if (this.mounted && name !== this.state.name) this.setState({
						namedPlaceID,
						name: response.name
					});
				});
			}

			render() {
				const {name} = this.state;
				const {locality} = this.props.that.props.formData[this.props.idx];
				return <span className="text-muted">{!isEmptyString(name) ? name : locality}</span>;
			}
		}
	},
	lineTransect: {
		component: (props) => {
			let start, end;
			const lineTransectFeature = Object.keys(props.that.props.formData[0].geometry).length 
				? {type:"Feature", properties: {}, geometry: {type: "MultiLineString", coordinates: props.that.props.formData.map(item => item.geometry.coordinates)}}
				: undefined;
			if (lineTransectFeature) [start, end] = getLineTransectStartEndDistancesForIdx(lineTransectFeature, props.idx, 10);
			return props.idx !== undefined && end ? <span className="text-muted">{`${start}-${end}m`}</span> : null;
		}
	}
};

class AccordionHeader extends Component {
	onHeaderClick = () => {
		const {that, idx, canHaveUndefinedIdx = true} = this.props;
		const formatters = this.getFormatters();
		if (!canHaveUndefinedIdx) {
			return;
		}
		that.onActiveChange(idx);
		formatters.forEach(formatter => {formatter.onClick && formatter.onClick(that, idx);});
	}

	onMouseEnter = () => {
		this.getFormatters().forEach(formatter => {
			formatter.onMouseEnter && formatter.onMouseEnter(this.props.that, this.props.idx);
		});
	};

	onMouseLeave = () => {
		this.getFormatters().forEach(formatter => {
			formatter.onMouseLeave && formatter.onMouseLeave(this.props.that, this.props.idx);
		});
	};

	getFormatters = () => {
		const {uiSchema} = this.props.that.props;
		const formData = this.props.that.props.formData[this.props.idx];

		// try both headerFormatters & headerFormatter for backward compatibility. TODO: Remove in future.
		const options = getUiOptions(uiSchema);
		let _headerFormatters = options.headerFormatters || options.headerFormatter || [];
		if (_headerFormatters && !Array.isArray(_headerFormatters)) _headerFormatters = [_headerFormatters];

		if (options.headerFormatter) {
			console.warn("laji-form warning: 'headerFormatter' is deprecated. Use 'headerFormatters' instead.");
		}
		return _headerFormatters.map(formatter => {
			if (headerFormatters[formatter]) return headerFormatters[formatter];
			else return {
				component: () => {
					return <span className="text-muted">{formatter[0] === "/" ? parseJSONPointer(formData, formatter, !!"safe") : formData[formatter]}</span>;
				}
			};
		});
	}

	render() {
		const {that, idx} = this.props;
		const title = that.getTitle(idx);
		const popupData = that.state.popups[idx];
		const {uiSchema} = that.props;
		const hasHelp = uiSchema && uiSchema["ui:help"];

		const headerText = (
			<span>
				{title}
				{this.getFormatters().map((formatter, i) => {
					const {component: Formatter} = formatter;
					return (
						<span key={i}> <Formatter that={that} idx={idx} /></span>
					);
				})}
				{hasHelp ? <Help/> : null}
			</span>
		);

		const headerTextComponent = hasHelp ? <TooltipComponent tooltip={uiSchema["ui:help"]}>{headerText}</TooltipComponent> : headerText;

		const header = (
			<div className={this.props.className}
			     id={`${that.props.idSchema.$id}_${idx}-header`}
			     tabIndex={0}
			     onClick={this.onHeaderClick}
				   onMouseEnter={this.onMouseEnter}
				   onMouseLeave={this.onMouseLeave} >
				<div className={this.props.wrapperClassName}>
					{headerTextComponent}
					{this.props.children}
				</div>
			</div>
		);

		return hasData(popupData) ? (
			<OverlayTrigger placement="left"
											overlay={<Tooltip id={"nav-tooltip-" + idx}><Popup data={popupData} /></Tooltip>}>
				{header}
			</OverlayTrigger>
		) : (
			header
		);
	}
}

class SplitArrayFieldTemplate extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				splitRule: PropTypes.shape({
					fieldPath: PropTypes.string.isRequired,
					rules: PropTypes.arrayOf(PropTypes.string).isRequired
				}).isRequired,
				uiOptions: PropTypes.arrayOf(PropTypes.object)
			})
		}).isRequired
	};

	render() {
		const {props} = this;
		const uiOptions = getUiOptions(props.uiSchema);

		const splitItems = [];
		for (let i = 0; i <= uiOptions.splitRule.rules.length; i++) {
			splitItems.push([]);
			if (!uiOptions.uiOptions[i]) uiOptions.uiOptions[i] = {};
		}

		for (let i = 0; i < props.formData.length; i++) {
			const value = parseJSONPointer(props.formData[i], uiOptions.splitRule.fieldPath) + "";
			let match = -1;

			for (let j = 0; j < uiOptions.splitRule.rules.length; j++) {
				if (value.match(uiOptions.splitRule.rules[j])) {
					match = j;
					break;
				}
			}
			if (match === -1) { match = splitItems.length - 1; }

			if (uiOptions.uiOptions[match].removable === false) {
				props.items[i].hasRemove = false;
			}
			splitItems[match].push(props.items[i]);
		}

		let startIdx = 0;

		return (
			<div>
				{splitItems.map((items, i) => {
					const idx = startIdx;
					startIdx = startIdx + items.length;
					const title = (i === 0) ? props.schema.title : "";

					return (<_ArrayFieldTemplate key={i}
										 {...this.props}
										 className={uiOptions.uiOptions[i].classNames}
										 title={uiOptions.uiOptions[i].title || title}
										 items={items}
										 startIdx={idx}
										 canAdd={uiOptions.uiOptions[i].addable}
										 uiSchema={{...props.uiSchema, "ui:options": uiOptions.uiOptions[i]}}/>
					);})}
			</div>
		);
	}
}
