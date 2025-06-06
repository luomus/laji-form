import * as React from "react";
import { Button, DeleteButton, Help } from "../components";
import merge from "deepmerge";
import { getUiOptions, isNullOrUndefined, isObject, isDescendant, getTabbableFields, canAdd, getReactComponentName, getUUID, getIdxWithOffset, getReversedFormDataIndex } from "../../utils";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import { SortableContainer, SortableElement } from "react-sortable-hoc";
import { getTemplate } from "@rjsf/utils";

function onAdd(e, props) {
	if (!canAdd(props)) return;
	props.onAddClick(e);
}

export function beforeAdd(props, addedIdx) {
	if (!canAdd(props)) return;
	const {contextId} = props.formContext;
	const startIdx = props.startIdx  || getUiOptions(props.uiSchema).startIdx;
	let {idToScrollAfterAdd = `${props.idSchema.$id}-add`, idxOffsets, totalOffset} = getUiOptions(props.uiSchema || {});
	let idx = addedIdx ?? (props.items || props.formData || []).length;
	const offset = startIdx !== undefined
		? startIdx
		: idxOffsets
			? getIdxWithOffset(idx, idxOffsets, totalOffset) - idx
			: 0;
	idx = offset + idx;
	let idToFocus = `${props.idSchema.$id}_${idx}`;
	getContext(contextId).idToFocus = idToFocus;
	getContext(contextId).idToScroll = idToScrollAfterAdd;
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

	const id = button.id || (props.idSchema || {}).$id;
	const buttonId = `${id}-${button.fnName}${button.key ? `-${button.key}` : ""}`;
	return <_Button key={buttonId} buttonId={buttonId} button={button} props={props}/>;
}

function _Button({button, props, getProps, buttonId}) {
	let {fn, fnName, glyph, label, className, callforward, beforeFn, callback, render, variant, tooltip, tooltipPlacement, tooltipClass, changesFormData, disabled, help, active, ...options} = button;

	label = label !== undefined
		?  (glyph ? ` ${label}` : label)
		: "";

	const onClick = React.useCallback(e => {
		const onClickProps = getProps ? getProps() : props;
		let _fn = () => fn(e)(onClickProps, options);
		const __fn = () => {
			beforeFn && beforeFn(onClickProps);
			_fn();
			callback && callback();
		};
		if (callforward) {
			e.persist();
			callforward(__fn);
		} else {
			__fn();
		}
	}, [props, getProps, options, callforward, beforeFn, callback, fn]);

	return render ? render(onClick, button) : (
		<Button id={buttonId} className={className} onClick={onClick} variant={variant} active={active} tooltip={tooltip || help} tooltipPlacement={tooltipPlacement} tooltipClass={tooltipClass} disabled={disabled  || ((fnName ===  "add" || changesFormData) && (props.disabled || props.readonly))} style={button.style}>
			{glyph && <ReactContext.Consumer>{({theme: {Glyphicon}}) => <Glyphicon glyph={glyph} />}</ReactContext.Consumer>}
			{glyph ? ` ${label}` : label}
			{help && <Help /> }
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
		<ReactContext.Consumer>{({theme: {ButtonToolbar}}) =>
			<ButtonToolbar className={getUiOptions(props.uiSchema)["ui:buttonsDesktopLayout"] ? "desktop-layout" : undefined} key="buttons">
				{buttonElems}
			</ButtonToolbar>
		}</ReactContext.Consumer>
	);
}

export function getButtonsForPosition(props, buttonDescriptions = [], position, defaultPosition = "bottom") {
	buttonDescriptions = buttonDescriptions.filter(button => button.position === position || (!button.position && position === defaultPosition));
	return (buttonDescriptions && buttonDescriptions.length) ?
		buttonDescriptions.map(buttonDescription => getButton(buttonDescription, props)).filter(button => button) :
		null;
}

export function handlesArrayKeys(ComposedComponent) {
	return class ArrayFieldTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent) + "_handlesArrayKeys";

		componentDidMount() {
			this.addKeyHandlers(this.props);
			this.addChildKeyHandlers(this.props);
			this.addCustomEventListeners(this.props);
			if (super.componentDidMount) super.componentDidMount();
		}

		componentDidUpdate(prevProps, prevState) {
			this.removeKeyHandlers(prevProps);
			this.addKeyHandlers(this.props);
			this.removeChildKeyHandlers(prevProps);
			this.addChildKeyHandlers(this.props);
			this.removeCustomEventListeners(prevProps);
			this.addCustomEventListeners(this.props);
			if (super.componentDidUpdate) super.componentDidUpdate(prevProps, prevState);
		}

		componentWillUnmount() {
			this.removeKeyHandlers(this.props);
			this.removeChildKeyHandlers(this.props);
			this.removeCustomEventListeners(this.props);
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

		addKeyHandlers() {
			const [keys, options] = (super.getKeyHandlers || this.getKeyHandlers).call(this, this.props);
			this.arrayKeyFunctions = keys;
			this.props.formContext.services.keyHandler.addKeyHandler(this.props.idSchema.$id, keys, options);
		}

		removeKeyHandlers(props) {
			this.props.formContext.services.keyHandler.removeKeyHandler(props.idSchema.$id, this.arrayKeyFunctions);
		}

		getKeyHandlers(props) {
			const {arrayKeyFunctions: _arrayKeyFunctions} = getUiOptions(props.uiSchema);
			return [_arrayKeyFunctions ? {..._arrayKeyFunctions} : {...arrayKeyFunctions}, {
				getProps: () => this.props,
			}];
		}

		addChildKeyHandlers(props) {
			this.childKeyHandlers = (super.getChildKeyHandlers || this.getChildKeyHandlers).call(this, props);
			this.childKeyHandlers.forEach(handler => {
				this.props.formContext.services.keyHandler.addKeyHandler(...handler);
			});
		}

		removeChildKeyHandlers() {
			this.childKeyHandlers.forEach(handler => {
				this.props.formContext.services.keyHandler.removeKeyHandler(...handler);
			});
		}

		getChildKeyHandlers(props) {
			return props.items.map((item, i) => {
				const id = `${props.idSchema.$id}_${i}`;
				return [id, arrayItemKeyFunctions, {getProps: () => this.props, id, getDeleteButton: () => {
					return this.deleteButtonRefs[i];
				}}];
			});
		}

		onFocus = target => {
			const context = getContext(this.props.formContext.contextId);
			if (target === "last") {
				context.idToFocus =  `${this.props.idSchema.$id}_${this.props.formData.length - 1}`;
				context.idToScroll = `_laji-form_${this.props.idSchema.$id}_${this.props.formData.length - 2}`;
			} else {
				console.warn(`custom event "focus" has only "last" implemented. Target value was: ${target}`);
			}
		}

		onCopy = (options = {}) => {
			const {type = "blacklist", filter = []} = options;
			const {buttonDefinitions = {}} = getUiOptions(this.props.uiSchema);
			const {copy} = buttonDefinitions;
			if (copy) {
				copy.fn()(this.props, {type, filter});
				if (copy.callback) {
					copy.callback();
				}
			}
		}

		getCustomEventListeners() {
			return [
				["focus", this.onFocus],
				["copy", this.onCopy]
			];
		}

		addCustomEventListeners(props) {
			const {customEvents} = props.formContext.services;
			const customEventListeners = (super.getCustomEventListeners || this.getCustomEventListeners).call(this, props);
			this.customEventListeners = customEventListeners;
			customEventListeners.forEach(params => customEvents.add(props.idSchema.$id, ...params));
		}

		removeCustomEventListeners(props) {
			const {customEvents} = props.formContext.services;
			this.customEventListeners.forEach(params => customEvents.remove(props.idSchema.$id, ...params));
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

export class ArrayFieldTemplateWithoutKeyHandling extends React.Component {
	onSort = ({oldIndex, newIndex}) => {
		this.props.items[oldIndex].onReorderClick(oldIndex, newIndex)();
	}
	onFocuses = []
	getOnFocus = (i) => () => {
		getContext(this.props.formContext.contextId)[`${this.props.idSchema.$id}.activeIdx`] = i + (getUiOptions(this.props.uiSchema).startIdx || 0);
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
			buttons = []
		} = getUiOptions(props.uiSchema);
		const {readonly, disabled} = this.props;
		const {Label} = this.props.formContext;
		const Title = renderTitleAsLabel ? Label : getTemplate("TitleFieldTemplate", props.registry, getUiOptions(props.uiSchema));
		const Description = getTemplate("DescriptionFieldTemplate", this.props.registry, getUiOptions(props.uiSchema));
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
					              onClick={item.onDropIndexClick(item.index)}
					              confirm={confirmDelete}
					              corner={deleteCorner}
					              tooltip={deleteHelp}
					              translations={props.formContext.translations}/>
				</div>
			);
			if (!this.onFocuses[i]) {
				this.onFocuses[i] = this.getOnFocus(i);
			}

			return (
				<div key={getUUID(props.formData[i]) || item.key} className="laji-form-field-template-item keep-vertical field-array-row" onFocus={this.onFocuses[i]}>
					<div className="laji-form-field-template-schema">{item.children}</div>
					{item.hasRemove && !nonRemovables.includes(item.index) && removable && getDeleteButton()}
				</div>
			);
		});

		const title = "ui:title" in props.uiSchema ? props.uiSchema["ui:title"] : props.title;

		return (
			<div className={props.className}>
				<Title title={title} label={title} uiSchema={this.props.uiSchema} registry={this.props.registry} id={this.props.idSchema.$id} />
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
				getProps().formContext.utils.focusAndScroll(_idToFocusAfterNavigate, idToScrollAfterNavigate, focusOnNavigate);
			}
			if (focusByIdx) {
				focusByIdx(idx, prop, callback);
			} else {
				callback();
			}
		}

		const nearestSchemaElemId = getProps().formContext.utils.findNearestParentSchemaElemId(document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeItemQuery = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_\\d+`, "g"));
		const focusedIdx = activeItemQuery ? getReversedFormDataIndex(+activeItemQuery[0].replace(/^.*_(\d+)$/, "$1"), getProps().uiSchema) : undefined;
		const focusedPropMaybe = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_${focusedIdx}_(.+)`))?.[1];
		const focusedProp = isNaN(focusedPropMaybe) ? focusedPropMaybe : undefined;

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

		if (!props.disabled && !props.readonly && canAdd(props) && getUiOptions(props.uiSchema).canAddByKey !== false) {
			if (e.target) {
				e.target.blur();
			}
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

		if (readonly || disabled || !isDescendant(getProps().formContext.utils.getSchemaElementById(id), e.target)) {
			return;
		}

		if (!getDeleteButton) return;

		const deleteButton = getDeleteButton();
		if (!deleteButton || !deleteButton.onClick) return;

		const activeId = formContext.utils.findNearestParentSchemaElemId(document.activeElement);
		const idxsMatch = activeId.match(/_\d+/g);
		const idx = +idxsMatch[idxsMatch.length - 1].replace("_", "");
		const elem = getProps().formContext.utils.getSchemaElementById(`${idSchema.$id}_${idx}`);
		const prevElem = elem ? formContext.utils.getNextInput(getTabbableFields(elem)[0], !!"reverse") : null;

		deleteButton.onClick(e, (deleted) => {
			if (deleted) {
				const idxToFocus = idx === items.length - 1 ? idx - 1 : idx;
				if (idxToFocus >= 0) {
					getProps().formContext.utils.focusById(`${idSchema.$id}_${idxToFocus}`);
				} else if (prevElem) {
					prevElem.focus();
				}
			} else {
				getProps().formContext.utils.focusById(`${activeId}`);
			}
		});
		return true;
	}
};
