import React, { Component } from "react";
import { Button, DeleteButton } from "./components";
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
			onAdd(e, props, `${props.idSchema.$id}_${props.items.length}`);
		}
	}
};

export function getButton(button, props) {
	function handleButton(button) {
		const fnName = button.fn;
		const definition = buttonDefinitions[fnName];
		const _button = {...(definition || {}), ...button};
		if (!_button.fnName) _button.fnName = fnName;
		if (definition) _button.fn = buttonDefinitions[fnName].fn;
		if (!(fnName === "add" && (!canAdd(props) || getUiOptions(props.uiSchema).renderAdd === false))) return _button;
	}

	button = handleButton(button);

	if (!button) return;

	let {fn, fnName, glyph, label, className, callbacker, key, ...options} = button;

	label = label !== undefined ?
		(glyph ? ` ${label}` : label) :
		"";

	const onClick = e => {
		if (callbacker) {
			e.persist();
			callbacker(() => fn(e)(props, options));
		} else {
			fn(e)(props, options);
		}
	};

	return (
		<Button key={key || fnName} className={className} onClick={onClick} >
			{glyph && <i className={`glyphicon glyphicon-${glyph}`}/>}
			<strong>{glyph ? ` ${label}` : label}</strong>
		</Button>
	);
}

export function getButtons(buttons, props = {}) {
	if (!buttons) return;

	let _buttons = buttons;

	const addBtnAdded = _buttons.some(button => button.fn === "add");

	if (!addBtnAdded && (!props || canAdd(props))) _buttons = [{fn: "add"}, ..._buttons];

	let buttonElems = _buttons.map(button => getButton(button, props));

	if (props.uiSchema["ui:buttons"]) {
		buttonElems = [...buttonElems, ...props.uiSchema["ui:buttons"]];
	}

	return (
		<ButtonToolbar key="buttons">{buttonElems}</ButtonToolbar>
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

			context.removeKeyHandler(this.props.idSchema.$id);
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

			context.removeKeyHandler(this.props.idSchema.$id);
			if (this.childKeyHandlers) {
				this.childKeyHandlers.forEach(({id, keyFunction}) => context.removeKeyHandler(id, keyFunction));
			}
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

	};
}

@handlesArrayKeys
export default class ArrayFieldTemplate extends Component {
	onSort = ({oldIndex, newIndex}) => {
		this.props.items[oldIndex].onReorderClick(oldIndex, newIndex)();
	}

	render() {
		const {props} = this;
		const Title = props.TitleField;
		const Description = props.DescriptionField;
		const options = getUiOptions(props.uiSchema);
		const {confirmDelete, deleteCorner, renderDelete = true, orderable, nonRemovables = [], nonOrderables = [], buttons} = options;
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];

		const SortableList = SortableContainer(({items}) => (
			<div>
				{items.map((item, i) => 
					<SortableItem key={i} index={i} item={item} disabled={(!props.items[i].hasMoveDown && !props.items[i].hasMoveUp) || nonOrderables.includes(i)} />
				)}
			</div>)
		);

		const SortableItem = SortableElement(({item}) => item);

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

		return (
			<div className={props.className}>
				<Title title={props.title}/>
				<Description description={props.description}/>
				{
					orderable ? <SortableList helperClass="laji-form reorder-active" pressDelay={10} items={items} onSortEnd={this.onSort} /> : items
				}
				{getButtons(buttons, props)}
			</div>
		);
	}
}

export const arrayKeyFunctions = {
	navigateArray: function (e, {reverse, getProps, navigateCallforward, getCurrentIdx, focusByIdx}) {
		function focusIdx(idx) {
			focusByIdx ? focusByIdx(idx) : focusById(getProps().formContext.contextId, `${getProps().idSchema.$id}_${idx}`);
		}

		const nearestSchemaElemId = findNearestParentSchemaElemId(getProps().formContext.contextId, document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeItemQuery = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_\\d+`, "g"));
		const focusedIdx = activeItemQuery ? +activeItemQuery[0].replace(/^.*_(\d+)$/, "$1") : undefined;

		const currentIdx = getCurrentIdx ? getCurrentIdx() : focusedIdx;

		if (isNullOrUndefined(currentIdx) && getProps().items.length > 0) {
			focusIdx(reverse ? getProps().items.length - 1 : 0);
			return true;
		} else {
			let amount = 0;
			if (focusedIdx === currentIdx) amount = reverse ? -1 : 1;

			const nextIdx = currentIdx + amount;

			if (amount === 0 || amount < 0 && nextIdx >= 0 || amount > 0 && nextIdx < getProps().items.length) {
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
		if (!isDescendant(getSchemaElementById(getProps().formContext.contextId, id), e.target)) {
			return;
		}

		if (!getDeleteButton) return;

		const deleteButton = getDeleteButton();
		if (!deleteButton || !deleteButton.onClick) return;

		const {items, idSchema, formContext: {getFormRef, contextId}} = getProps();

		const activeId = findNearestParentSchemaElemId(getProps().formContext.contextId, document.activeElement);
		const idxsMatch = activeId.match(/_\d+/g);
		const idx = +idxsMatch[idxsMatch.length - 1].replace("_", "");
		const prevElem = getNextInput(getFormRef(), getTabbableFields(getSchemaElementById(contextId, `${idSchema.$id}_${idx}`))[0], !!"reverse");
		
		getDeleteButton().onClick(e, (deleted) => {
			if (deleted) {
				const idxToFocus = idx === items.length - 1 ? idx - 1 : idx;
				if (idxToFocus >= 0) {
					focusById(contextId, `${idSchema.$id}_${idxToFocus}`);
				} else {
					if (prevElem) prevElem.focus();
				}
			} else {
				focusById(contextId, `${activeId}`);
			}
		});
		return true;
	}
};
