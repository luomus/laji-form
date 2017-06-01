import React, { Component } from "react";
import { Button, DeleteButton } from "./components";
import { getUiOptions } from "../utils";
import { ButtonToolbar } from "react-bootstrap";
import Context from "../Context";
import { findNearestParentSchemaElemId, focusById, getSchemaElementById, isDescendant, getNextInput, getTabbableFields } from "../utils";
import { SortableContainer, SortableElement } from "react-sortable-hoc";


function onAdd(e, props, idToFocus) {
	if (!props.canAdd || getUiOptions(props.uiSchema).canAdd === false) return;
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

export function getButtons(buttons, props) {
	if (!buttons) return;

	let addBtnAdded = false;

	function handleButton(button) {
		const fnName = button.fn;
		const definition = buttonDefinitions[fnName];
		const _button = {...(definition || {}), ...button};
		if (!_button.fnName) _button.fnName = fnName;
		if (definition) _button.fn = buttonDefinitions[fnName].fn;
		if (fnName === "add") addBtnAdded = true;
		if (!(fnName === "add" && (!props.canAdd || getUiOptions(props.uiSchema).canAdd === false))) return _button;
	}

	let _buttons = buttons.map(handleButton).filter(btn => btn);

	if (!addBtnAdded && props.canAdd && getUiOptions(props.uiSchema).canAdd !== false) _buttons = [handleButton({fn: "add"}), ..._buttons];

	const buttonElems = _buttons.map(button => {
		let {fn, fnName, glyph, label, className, callbacker, ...options} = button;
		label = label !== undefined ?
			(glyph ? ` ${label}` : label) :
			"";

		return (
			<Button key={fnName} className={className} onClick={e => {
				if (callbacker) {
					e.persist();
					callbacker(() => fn(e)(props, options));
				} else {
					fn(e)(props, options);
				}
			}} >
				{glyph && <i className={`glyphicon glyphicon-${glyph}`}/>}
				<strong>{glyph ? ` ${label}` : label}</strong>
			</Button>
		);
	});
	return (
		<ButtonToolbar key="buttons">{buttonElems}</ButtonToolbar>
	);
}

export default class ArrayFieldTemplate extends Component {
	componentDidMount() {
		new Context().addKeyHandler(this.props.idSchema.$id, arrayKeyFunctions, {
			getProps: () => this.props
		});
		this.childKeyHandlers = [];
		this.addChildKeyHandlers();
	}

	componentDidUpdate() {
		this.addChildKeyHandlers();
	}

	addChildKeyHandlers() {
		if (this.childKeyHandlers) this.childKeyHandlers.forEach(childKeyHandler => new Context().removeKeyHandler(childKeyHandler));
		this.props.items.forEach((item, i) => {
			const id = `${this.props.idSchema.$id}_${i}`;
			this.childKeyHandlers.push(id);
			new Context().addKeyHandler(id, arrayItemKeyFunctions, {getProps: () => this.props, id, getDeleteButton: () => this.deleteButtonRefs[i]});
		});
	}

	componentWillUnmount() {
		new Context().removeKeyHandler(this.props.idSchema.$id);
		if (this.childKeyHandlers) {
			this.childKeyHandlers.forEach(id => new Context().removeKeyHandler(id));
		}
	}

	render() {
		const {props} = this;
		const Title = props.TitleField;
		const Description = props.DescriptionField;
		const options = getUiOptions(props.uiSchema);
		const {confirmDelete, deleteCorner, renderDelete = true, orderable, nonRemovables = [], nonOrderables = []} = options;
		const buttons = getButtons(options.buttons, props);
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];


		const SortableList = SortableContainer(({items}) => (
			<div>
				{items.map((item, i) => 
					<SortableItem key={i} index={i} item={item} disabled={(!props.items[i].hasMoveDown && !props.items[i].hasMoveUp) || nonOrderables.includes(i)} />
				)}
			</div>)
		);
		const SortableItem = SortableElement(({item}) => item);

		const items = props.items.map((item, i) => {
			const deleteButton = (
				<DeleteButton ref={elem => {this.deleteButtonRefs[i] = elem;}}
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
					orderable ? <SortableList helperClass="laji-form reorder-active" pressDelay={200} items={items} onSortEnd={({oldIndex, newIndex}) => 
						props.items[oldIndex].onReorderClick(oldIndex, newIndex)
					} /> : items
				}
				{buttons}
			</div>
		);
	}
}

export const arrayKeyFunctions = {
	navigateArray: function (e, {reverse, getProps, navigateCallforward}) {
		function focusIdx(idx) {
			focusById(`${getProps().idSchema.$id}_${idx}`);
		}

		const nearestSchemaElemId = findNearestParentSchemaElemId(document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeItemQuery = nearestSchemaElemId.match(new RegExp(`${getProps().idSchema.$id}_\\d+`, "g"));
		const currentIdx = activeItemQuery ? +activeItemQuery[0].replace(/^.*_(\d+)$/, "$1") : undefined;

		if (currentIdx === undefined) {
			if (getProps().items.length > 0) {
				focusIdx(0);
				return true;
			}
			return false;
		} else {
			const amount = reverse ? -1 : 1;

			const nextIdx = currentIdx + amount;

			if (amount < 0 && nextIdx >= 0 || amount > 0 && nextIdx < getProps().items.length) {
				if (navigateCallforward) {
					e.persist();
					navigateCallforward(() => focusIdx(nextIdx), nextIdx);
				} else {
					focusIdx(nextIdx);
				}
				return true;
			}
			return false;
		}
	},
	insert: function (e, {getProps, insertCallforward}) {
		const props = getProps();
		function afterInsert() {
			onAdd(e, props, `${props.idSchema.$id}_${props.items.length}`);
		}

		const canAdd = props.canAdd && getUiOptions(props.uiSchema).canAdd !== false;

		if (canAdd) {
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
		if (!isDescendant(getSchemaElementById(id), e.target)) {
			return;
		}

		if (!getDeleteButton) return;

		const deleteButton = getDeleteButton();
		if (!deleteButton || !deleteButton.onClick) return;

		const {items, idSchema, formContext: {getFormRef}} = getProps();

		const activeId = findNearestParentSchemaElemId(document.activeElement);
		const idxsMatch = activeId.match(/_\d+/g);
		const idx = +idxsMatch[idxsMatch.length - 1].replace("_", "");
		const prevElem = getNextInput(getFormRef(), getTabbableFields(getSchemaElementById(`${idSchema.$id}_${idx}`))[0], !!"reverse");
		
		getDeleteButton().onClick(e, (deleted) => {
			if (deleted) {
				const idxToFocus = idx === items.length - 1 ? idx - 1 : idx;
				if (idxToFocus >= 0) {
					focusById( `${idSchema.$id}_${idxToFocus}`);
				} else {
					if (prevElem) prevElem.focus();
				}
			} else {
				focusById(`${activeId}`);
			}
		});
		return true;
	}
};
