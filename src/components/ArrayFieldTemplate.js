import React, { Component } from "react";
import { Button, DeleteButton, Label } from "./components";
import merge from "deepmerge";
import { getUiOptions, isNullOrUndefined } from "../utils";
import { ButtonToolbar } from "react-bootstrap";
import Context from "../Context";
import { findNearestParentSchemaElemId, focusById, getSchemaElementById, isDescendant, getNextInput, getTabbableFields, canAdd, getReactComponentName } from "../utils";
import { SortableContainer, SortableElement } from "react-sortable-hoc";

function onAdd(e, props, idToFocus) {
	if (!canAdd(props)) return;
	props.onAddClick(e);
	new Context(props.formContext.contextId).idToFocus = idToFocus;
}

const buttonDefinitions = {
	add: {
		glyph: "plus",
		fn: (e) => (props) => {
			const idx = (props.startIdx || 0) + props.items.length;
			onAdd(e, props, `${props.idSchema.$id}_${idx}`);
		}
	}
};

export function getButton(button, props = {}) {
	function handleButton(button) {
		function rulesSatisfied(btn) {
			return Object.keys(btn.rules || {}).every(ruleName => {
				const ruleVal = btn.rules[ruleName];
				if (ruleName === "minLength") {
					return (props.formData || []).length >= ruleVal;
				} else if (ruleName === "canAdd") {
					return canAdd(props);
				}
			});
		}

		const fnName = button.fn;
		const _buttonDefinitions = props.uiSchema && getUiOptions(props.uiSchema).buttonDefinitions ? 
			merge(buttonDefinitions, getUiOptions(props.uiSchema).buttonDefinitions) :
			buttonDefinitions;
		const definition = _buttonDefinitions[fnName];
		const _button = {...(definition || {}), ...button};

		if (!rulesSatisfied(_button)) return;

		if (!_button.fnName) _button.fnName = fnName;
		if (definition) _button.fn = _buttonDefinitions[fnName].fn;
		if (!(fnName === "add" && (!canAdd(props) || getUiOptions(props.uiSchema).renderAdd === false))) return _button;
	}

	button = handleButton(button);

	if (!button) return;

	let {fn, fnName, glyph, label, className, callforward, callback, key, ...options} = button;

	label = label !== undefined ?
		(glyph ? ` ${label}` : label) :
		"";

	const onClick = e => {
		let _fn = () => fn(e)(props, options);
		const __fn = !callback ? _fn : () => {
			_fn();
			callback();
		};
		if (callforward) {
			e.persist();
			callforward(__fn);
		} else {
			__fn();
		}
	};

	return (
		<Button key={key || fnName} className={className} onClick={onClick} >
			{glyph && <i className={`glyphicon glyphicon-${glyph}`}/>}
			<strong>{glyph ? ` ${label}` : label}</strong>
		</Button>
	);
}

export function getButtons(buttons = [], props = {}) {
	const addBtnAdded = buttons.some(button => button.fn === "add");

	if (!addBtnAdded && (!props || canAdd(props))) buttons = [{fn: "add"}, ...buttons];

	let buttonElems = buttons.map(button => getButton(button, props));

	if (props.uiSchema["ui:buttons"]) {
		buttonElems = [...buttonElems, ...props.uiSchema["ui:buttons"]];
	}

	if (buttonElems.length === 0) return null;

	return (
		<ButtonToolbar className={getUiOptions(props.uiSchema)["ui:buttonsDesktopLayout"] ? "desktop-layout" : undefined} key="buttons">
			{buttonElems}
		</ButtonToolbar>
	);
}

export function handlesArrayKeys(ComposedComponent) {
	return class ArrayFieldTemplateField extends ComposedComponent {
		static displayName = getReactComponentName(ComposedComponent);

		componentDidMount() {
			this.addKeyHandlers();
			this.addChildKeyHandlers();
			if (super.componentDidMount) super.componentDidMount();
		}

		componentDidUpdate() {
			this.addKeyHandlers();
			this.addChildKeyHandlers();
			if (super.componentDidUpdate) super.componentDidUpdate();
		}

		addKeyHandlers() {
			const context = new Context(this.props.formContext.contextId);

			context.removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			context.addKeyHandler(this.props.idSchema.$id, arrayKeyFunctions, {
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
				context.addKeyHandler(id, arrayItemKeyFunctions, {getProps: () => this.props, id, getDeleteButton: () => this.deleteButtonRefs[i]});
			});
		}

		componentWillUnmount() {
			const context = new Context(this.props.formContext.contextId);

			context.removeKeyHandler(this.props.idSchema.$id, arrayKeyFunctions);
			if (this.childKeyHandlers) {
				this.childKeyHandlers.forEach(({id, keyFunction}) => context.removeKeyHandler(id, keyFunction));
			}
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

const SortableList = SortableContainer(({items, itemProps, nonOrderables}) => (
	<div>
		{items.map((item, i) => 
			<SortableItem key={i} index={i} item={item} disabled={(!itemProps[i].hasMoveDown && !itemProps[i].hasMoveUp) || nonOrderables.includes(i)} />
		)}
	</div>)
);

const SortableItem = SortableElement(({item}) => item);

@handlesArrayKeys
export default class ArrayFieldTemplate extends Component {
	onSort = ({oldIndex, newIndex}) => {
		this.props.items[oldIndex].onReorderClick(oldIndex, newIndex)();
	}

	render() {
		const {props} = this;
		const options = getUiOptions(props.uiSchema);
		const Title = options.renderTitleAsLabel ? Label :  props.TitleField;
		const Description = props.DescriptionField;
		const {confirmDelete, deleteCorner, renderDelete = true, orderable, nonRemovables = [], nonOrderables = [], buttons} = options;
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];

		const getRefFor = i => elem => {this.deleteButtonRefs[i] = elem;};

		const items = props.items.map((item, i) => {
			const deleteButton = (
				<DeleteButton ref={getRefFor(i)}
				              onClick={item.onDropIndexClick(item.index)}
				              className="laji-form-field-template-buttons"
				              confirm={confirmDelete}
				              corner={deleteCorner}
				              translations={props.formContext.translations}/>
			);
			return (
				<div key={item.index} className="laji-form-field-template-item keep-vertical">
					<div className="laji-form-field-template-schema">{item.children}</div>
					{item.hasRemove && !nonRemovables.includes(item.index) && renderDelete && deleteButton}
				</div>
			);
		});

		const title = "ui:title" in props.uiSchema ? props.uiSchema["ui:title"] : props.title;

		return (
			<div className={props.className}>
				<Title title={title} label={title} />
				<Description description={props.description}/>
				{
					orderable ? 
						<SortableList helperClass="laji-form reorder-active" 
						              pressDelay={100} 
						              items={items} 
						              onSortEnd={this.onSort} 
						              itemProps={props.items} 
						              nonOrderables={nonOrderables} /> :
						items
				}
				{getButtons(buttons, props)}
			</div>
		);
	}
}

export const arrayKeyFunctions = {
	navigateArray: function (e, {reverse, getProps, navigateCallforward, getCurrentIdx, focusByIdx}) {
		function focusIdx(idx) {
			focusByIdx ? focusByIdx(idx) : focusById(getProps().formContext, `${getProps().idSchema.$id}_${idx}`);
		}

		const nearestSchemaElemId = findNearestParentSchemaElemId(getProps().formContext.contextId, document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeItemQuery = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_\\d+`, "g"));
		const focusedIdx = activeItemQuery ? +activeItemQuery[0].replace(/^.*_(\d+)$/, "$1") : undefined;

		const currentIdx = getCurrentIdx ? getCurrentIdx() : focusedIdx;

		const arrayLength = getProps().formData ? getProps().formData.length : 0;

		if (isNullOrUndefined(currentIdx) && arrayLength > 0) {
			focusIdx(reverse ? arrayLength - 1 : 0);
			return true;
		} else {
			let amount = 0;
			if (focusedIdx === currentIdx) amount = reverse ? -1 : 1;

			const nextIdx = currentIdx + amount;

			if (amount === 0 || amount < 0 && nextIdx >= 0 || amount > 0 && nextIdx < arrayLength) {
				if (navigateCallforward) {
					e.persist();
					navigateCallforward(() => focusIdx(nextIdx), nextIdx);
				} else {
					focusIdx(nextIdx);
				}
				return true;
			}
		}
		return false;
	},
	insert: function (e, {getProps, insertCallforward}) {
		const props = getProps();
		function afterInsert() {
			onAdd(e, props, `${props.idSchema.$id}_${props.items.length}`);
		}

		if (canAdd(props)) {
			if (insertCallforward) {
				e.persist();
				insertCallforward(() => {
					afterInsert();
				});
			} else {
				afterInsert();
			}
			return true;
		}
	}
};

export const arrayItemKeyFunctions = {
	delete: function(e, {getDeleteButton, id, getProps}) {
		const {items, idSchema, formContext} = getProps();
		const {getFormRef, contextId} = formContext;

		if (!isDescendant(getSchemaElementById(contextId, id), e.target)) {
			return;
		}

		if (!getDeleteButton) return;

		const deleteButton = getDeleteButton();
		if (!deleteButton || !deleteButton.onClick) return;

		const activeId = findNearestParentSchemaElemId(contextId, document.activeElement);
		const idxsMatch = activeId.match(/_\d+/g);
		const idx = +idxsMatch[idxsMatch.length - 1].replace("_", "");
		const prevElem = getNextInput(getFormRef(), getTabbableFields(getSchemaElementById(contextId, `${idSchema.$id}_${idx}`))[0], !!"reverse");
		
		getDeleteButton().onClick(e, (deleted) => {
			if (deleted) {
				const idxToFocus = idx === items.length - 1 ? idx - 1 : idx;
				if (idxToFocus >= 0) {
					focusById(formContext, `${idSchema.$id}_${idxToFocus}`);
				} else {
					if (prevElem) prevElem.focus();
				}
			} else {
				focusById(formContext, `${activeId}`);
			}
		});
		return true;
	}
};
