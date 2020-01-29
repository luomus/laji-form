import React, { Component } from "react";
import { Button, DeleteButton } from "./components";
import merge from "deepmerge";
import { getUiOptions, isNullOrUndefined, isObject } from "../utils";
import { ButtonToolbar } from "react-bootstrap";
import Context from "../Context";
import { findNearestParentSchemaElemId, focusById, getSchemaElementById, isDescendant, getNextInput, getTabbableFields, canAdd, getReactComponentName, focusAndScroll, getUUID } from "../utils";
import { SortableContainer, SortableElement } from "react-sortable-hoc";

function onAdd(e, props) {
	if (!canAdd(props)) return;
	props.onAddClick(e);
	setImmediate(() => new Context(props.formContext.contextId).sendCustomEvent(props.idSchema.$id, "resize"));
}

export const onDelete = (item, props) => (e) => {
	item.onDropIndexClick(item.index)(e);
	setImmediate(() => new Context(props.formContext.contextId).sendCustomEvent(props.idSchema.$id, "resize"));
};

export function beforeAdd(props) {
	if (!canAdd(props)) return;
	const {contextId} = props.formContext;
	const idx = (props.startIdx  || getUiOptions(props.uiSchema).startIdx || 0) + (props.items || props.formData).length;
	let idToFocus =  `${props.idSchema.$id}_${idx}`;
	let {idToScrollAfterAdd = `${props.idSchema.$id}-add`} = getUiOptions(props.uiSchema || {});
	new Context(contextId).idToFocus = idToFocus;
	new Context(contextId).idToScroll = idToScrollAfterAdd;
}

const buttonDefinitions = {
	add: {
		glyph: "plus",
		fn: (e) => (props) => {
			onAdd(e, props);
		},
		beforeFn: beforeAdd
	}
};

export function getButton(button, props = {}) {
	function handleButton(button) {
		function rulesSatisfied(rules = {}) {
			return Object.keys(rules || {}).every(ruleName => {
				const ruleVal = rules[ruleName];
				if (ruleName === "minLength") {
					return (props.formData || []).length >= ruleVal;
				} else if (ruleName === "canAdd") {
					return (button.id && button.id !== props.idSchema.$id) || canAdd(props);
				}
			});
		}

		const fnName = button.fnName || button.fn;
		const _buttonDefinitions = props.uiSchema && getUiOptions(props.uiSchema).buttonDefinitions
			? merge(buttonDefinitions, getUiOptions(props.uiSchema).buttonDefinitions)
			: buttonDefinitions;
		const definition = _buttonDefinitions[fnName];
		const _button = {...(definition || {}), ...button};

		if (!rulesSatisfied(_button.rules)) return;

		if (!_button.fnName) _button.fnName = fnName;
		if (definition && typeof _button.fn !== "function") _button.fn = _buttonDefinitions[fnName].fn;
		if (fnName !== "add" || (getUiOptions(props.uiSchema).renderAdd !== false && ((button.id && button.id !== props.idSchema.$id) || canAdd(props)))) return _button;
	}

	button = handleButton(button);

	if (!button) return;

	let {fn, fnName, glyph, label, className, callforward, beforeFn, callback, render, bsStyle = "primary", tooltip, tooltipPlacement, changesFormData, key, disabled, ...options} = button;
	const id = button.id || (props.idSchema || {}).$id;

	label = label !== undefined
		?  (glyph ? ` ${label}` : label)
		: "";

	const onClick = e => {
		const onClickProps = button.getProps ? button.getProps() : props;
		let _fn = () => fn(e)(onClickProps, options);
		const __fn = () => {
			beforeFn && beforeFn(onClickProps, options);
			_fn();
			callback && callback();
		};
		if (callforward) {
			e.persist();
			callforward(__fn);
		} else {
			__fn();
		}
	};

	const buttonId = `${id}-${fnName}${key ? `-${key}` : ""}`;
	return render ? render(onClick, button) : (
		<Button key={buttonId} id={buttonId} className={className} onClick={onClick} bsStyle={bsStyle} tooltip={tooltip} tooltipPlacement={tooltipPlacement} disabled={disabled  || ((fnName ===  "add" || changesFormData) && (props.disabled || props.readonly))} style={button.style}>
			{glyph && <i className={`glyphicon glyphicon-${glyph}`}/>}
			<strong>{glyph ? ` ${label}` : label}</strong>
		</Button>
	);
}

export function getButtons(buttons = [], props = {}) {
	const addBtnAdded = buttons.some(button => button.fn === "add");

	if (!addBtnAdded && (!props || canAdd(props))) buttons = [{fn: "add", id: props.idSchema.$id}, ...buttons];
	return buttons;
}

export function getButtonElems(buttons = [], props = {}) {
	buttons = getButtons(buttons, props);
	let buttonElems = buttons.map(button => getButton(button, props));

	if (props.uiSchema["ui:buttons"]) {
		buttonElems = [...buttonElems, ...props.uiSchema["ui:buttons"]];
	}

	return getButtonsElem(buttonElems, props);
}

function getButtonsElem(buttonElems = [], props = {}) {
	if (!Array.isArray(buttonElems) || buttonElems.length === 0) {
		return null;
	}

	return (
		<ButtonToolbar className={getUiOptions(props.uiSchema)["ui:buttonsDesktopLayout"] ? "desktop-layout" : undefined} key="buttons">
			{buttonElems}
		</ButtonToolbar>
	);
}

export function getButtonsForPosition(props, buttonDescriptions = [], position, defaultPosition = "bottom") {
	buttonDescriptions = buttonDescriptions.filter(button => button.position === position || (!button.position && position === defaultPosition));
	return (buttonDescriptions && buttonDescriptions.length) ?
		buttonDescriptions.map(buttonDescription => getButton(buttonDescription, props)) :
		null;
}

export function handlesArrayKeys(ComposedComponent) {
	return class ArrayFieldTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent);

		componentDidMount() {
			(super.addKeyHandlers || this.addKeyHandlers).call(this);
			(super.addChildKeyHandlers ||  this.addChildKeyHandlers).call(this);
			(super.addCustomEventListeners || this.addCustomEventListeners).call(this);
			if (super.componentDidMount) super.componentDidMount();
		}

		componentDidUpdate(prevProps, prevState) {
			(super.addChildKeyHandlers || this.addChildKeyHandlers).call(this);
			if (super.componentDidUpdate) super.componentDidUpdate(prevProps, prevState);
		}

		addKeyHandlers() {
			const context = new Context(this.props.formContext.contextId);

			//context.removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			const {arrayKeyFunctions: _arrayKeyFunctions} = getUiOptions(this.props.uiSchema);
			this.arrayKeyFunctions = {..._arrayKeyFunctions} || {...arrayKeyFunctions};
			context.addKeyHandler(this.props.idSchema.$id, this.arrayKeyFunctions, {
				getProps: () => this.props
			});
		}

		addChildKeyHandlers() {
			const context = new Context(this.props.formContext.contextId);

			if (!this.childKeyHandlers) this.childKeyHandlers = [];
			else this.childKeyHandlers.forEach(({id, keyFunction}) => context.removeKeyHandler(id, keyFunction));
			this.props.items.forEach((item, i) => {
				const id = `${this.props.idSchema.$id}_${i}`;
				this.childKeyHandlers.push({id, keyFunction: arrayItemKeyFunctions});
				context.addKeyHandler(id, arrayItemKeyFunctions, {getProps: () => this.props, id, getDeleteButton: () => {
					return this.deleteButtonRefs[i];
				}});
			});
		}

		addCustomEventListeners() {
			const context = new Context(this.props.formContext.contextId);
			context.addCustomEventListener(this.props.idSchema.$id, "focus", target => {
				if (target === "last") {
					context.idToFocus =  `${this.props.idSchema.$id}_${this.props.formData.length - 1}`;
					context.idToScroll = `_laji-form_${this.props.formContext.contextId}_${this.props.idSchema.$id}_${this.props.formData.length - 2}`;
				} else {
					console.warn(`custom event "focus" has only "last" implemented. Target value was: ${target}`);
				}
			});
			new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "copy", (options = {}) => {
				const {type = "blacklist", filter = []} = options;
				const {buttonDefinitions = {}} = getUiOptions(this.props.uiSchema);
				const {copy} = buttonDefinitions;
				if (copy) {
					copy.fn()(this.props, {type, filter});
					if (copy.callback) {
						copy.callback();
					}
				}
			});
		}

		componentWillUnmount() {
			const context = new Context(this.props.formContext.contextId);

			context.removeCustomEventListener(this.props.idSchema.$id, "focus");
			context.removeKeyHandler(this.props.idSchema.$id, this.arrayKeyFunctions);
			if (this.childKeyHandlers) {
				this.childKeyHandlers.forEach(({id, keyFunction}) => context.removeKeyHandler(id, keyFunction));
			}
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

const SortableList = SortableContainer(({items, itemProps, nonOrderables, formData}) => (
	<div>
		{items.map((item, i) => {
			return <SortableItem key={isObject(formData[i]) ? getUUID(formData[i]) : i} index={i} item={item} disabled={(!itemProps[i].hasMoveDown && !itemProps[i].hasMoveUp) || nonOrderables.includes(i)} />;
		}
		)}
	</div>)
);

const SortableItem = SortableElement(({item}) => item);

export class ArrayFieldTemplateWithoutKeyHandling extends Component {
	onSort = ({oldIndex, newIndex}) => {
		this.props.items[oldIndex].onReorderClick(oldIndex, newIndex)();
	}
	onFocuses = []
	getOnFocus = (i) => () => {
		new Context(this.props.formContext.contextId)[`${this.props.idSchema.$id}.activeIdx`] = i + (getUiOptions(this.props.uiSchema).startIdx || 0);
	}

	render() {
		const {props} = this;
		const {
			confirmDelete,
			renderTitleAsLabel,
			deleteCorner,
			removable = true,
			orderable,
			nonRemovables = [],
			nonOrderables = [],
			"ui:deleteHelp": deleteHelp,
			titleFormatters,
			buttons = []
		} = getUiOptions(props.uiSchema);
		const {readonly, disabled} = this.props;
		const {Label} = this.props.formContext;
		const Title = renderTitleAsLabel ? Label :  props.TitleField;
		const Description = props.DescriptionField;
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];

		const _buttons = getButtons(buttons, props);

		const topButtons = getButtonsElem(getButtonsForPosition(props, _buttons, "top"), props);
		const bottomButtons = getButtonsElem(getButtonsForPosition(props, _buttons, "bottom"), props);

		const getRefFor = i => elem => {this.deleteButtonRefs[i] = elem;};


		const items = props.items.map((item, i) => {
			const getDeleteButton = () => (
				<div className="laji-form-field-template-buttons">
					<DeleteButton id={`${props.idSchema.$id}_${i}`}
												disabled={disabled || readonly}
												ref={getRefFor(i)}
												onClick={onDelete(item, props)}
												confirm={confirmDelete}
												corner={deleteCorner}
												tooltip={deleteHelp}
												translations={props.formContext.translations}/>
			</div>
			);
			if (!this.onFocuses[i]) {
				this.onFocuses[i] = this.getOnFocus(i);
			}

			// RJSF array keeps items in state but formData comes from props, so they are out of sync.
			// Items & formData length can differ, and in that case we use "NEW" as key.
			const key = item.index > props.formData.length - 1
				? "NEW"
				: isObject(props.formData[item.index])
					? getUUID(props.formData[item.index])
					: item.index;
			return (
				<div key={key} className="laji-form-field-template-item keep-vertical field-array-row" onFocus={this.onFocuses[i]}>
					<div className="laji-form-field-template-schema">{item.children}</div>
					{item.hasRemove && !nonRemovables.includes(item.index) && removable && getDeleteButton()}
				</div>
			);
		});

		const title = "ui:title" in props.uiSchema ? props.uiSchema["ui:title"] : props.title;

		return (
			<div className={props.className}>
				<Title title={title} label={title} help={props.uiSchema["ui:help"]} formatters={titleFormatters} />
				{topButtons}
				{props.description && <Description description={props.description}/>}
				{
					orderable ?
						<SortableList helperClass="laji-form reorder-active"
						              distance={5}
						              items={items}
						              formData={props.formData}
						              onSortEnd={this.onSort}
						              itemProps={props.items}
						              nonOrderables={nonOrderables} /> :
						items
				}
				{bottomButtons}
			</div>
		);
	}
}

export default handlesArrayKeys(ArrayFieldTemplateWithoutKeyHandling);

export const arrayKeyFunctions = {
	navigateArray: function (e, {reverse, getProps, navigateCallforward, getCurrentIdx, focusByIdx, getIdToScrollAfterNavigate}) {
		function focusIdx(idx, prop) {
			function callback() {
				const options = getUiOptions(getProps().uiSchema);
				const {focusOnNavigate = true, idToFocusAfterNavigate, keepPropFocusOnNavigate = false} = options;
				const idByIdx =  `${getProps().idSchema.$id}_${idx}`;
				const _idToFocusAfterNavigate = idToFocusAfterNavigate ||
					prop && keepPropFocusOnNavigate
					? `${idByIdx}_${prop}`
					: idByIdx;
				const idToScrollAfterNavigate = options.idToScrollAfterNavigate
					? options.idToScrollAfterNavigate
					: getIdToScrollAfterNavigate
						? getIdToScrollAfterNavigate()
						: undefined;
				focusAndScroll(getProps().formContext, _idToFocusAfterNavigate, idToScrollAfterNavigate, focusOnNavigate);
			}
			if (focusByIdx) {
				focusByIdx(idx, prop, callback);
			} else {
				callback();
			}
		}

		const nearestSchemaElemId = findNearestParentSchemaElemId(getProps().formContext.contextId, document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeItemQuery = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_\\d+`, "g"));
		const focusedIdx = activeItemQuery ? +activeItemQuery[0].replace(/^.*_(\d+)$/, "$1") : undefined;
		const lastId = nearestSchemaElemId.substring(`${getProps().idSchema.$id}_${focusedIdx}`.length + 1, nearestSchemaElemId.length);
		const focusedProp = isNaN(lastId) ? lastId : undefined;

		const currentIdx = getCurrentIdx ? getCurrentIdx() : focusedIdx;

		const arrayLength = getProps().formData ? getProps().formData.length : 0;

		if (isNullOrUndefined(currentIdx) && arrayLength > 0) {
			focusIdx(reverse ? arrayLength - 1 : 0, focusedProp);
			return true;
		} else {
			let amount = 0;
			if (focusedIdx === currentIdx) amount = reverse ? -1 : 1;

			const nextIdx = currentIdx + amount;

			if (amount === 0 || amount < 0 && nextIdx >= 0 || amount > 0 && nextIdx < arrayLength) {
				if (navigateCallforward) {
					e.persist();
					navigateCallforward(() => focusIdx(nextIdx, focusedProp), nextIdx);
				} else {
					focusIdx(nextIdx, focusedProp);
				}
				return true;
			}
		}
		return false;
	},
	insert: function(e, _props) {
		const {getProps, insertCallforward} = _props;
		const props = getProps();
		function afterInsert() {
			onAdd(e, props);
		}

		if (!props.disabled && !props.readonly && canAdd(props)) {
			if (insertCallforward) {
				e.persist();
				beforeAdd(props);
				insertCallforward(() => {
					afterInsert();
				});
			} else {
				beforeAdd(props);
				afterInsert();
			}
			return true;
		}
		return false;
	}
};

export const arrayItemKeyFunctions = {
	delete: function(e, {getDeleteButton, id, getProps}) {
		const {items, idSchema, formContext, readonly, disabled} = getProps();
		const {getFormRef, contextId} = formContext;

		if (readonly || disabled || !isDescendant(getSchemaElementById(contextId, id), e.target)) {
			return;
		}

		if (!getDeleteButton) return;

		const deleteButton = getDeleteButton();
		if (!deleteButton || !deleteButton.onClick) return;

		const activeId = findNearestParentSchemaElemId(contextId, document.activeElement);
		const idxsMatch = activeId.match(/_\d+/g);
		const idx = +idxsMatch[idxsMatch.length - 1].replace("_", "");
		const elem = getSchemaElementById(contextId, `${idSchema.$id}_${idx}`);
		const prevElem = elem ? getNextInput(getFormRef(), getTabbableFields(elem)[0], !!"reverse") : null;

		deleteButton.onClick(e, (deleted) => {
			if (deleted) {
				const idxToFocus = idx === items.length - 1 ? idx - 1 : idx;
				if (idxToFocus >= 0) {
					focusById(formContext, `${idSchema.$id}_${idxToFocus}`);
				} else if (prevElem) {
					prevElem.focus();
				}
			} else {
				focusById(formContext, `${activeId}`);
			}
		});
		return true;
	}
};
