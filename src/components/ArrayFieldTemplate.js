import React from "react";
import { Button, DeleteButton } from "./components";
import { getUiOptions, getContext } from "../utils";
import { ButtonToolbar } from "react-bootstrap";
import { getTabbableFields, getSchemaElementById, findNearestParentSchemaElemID } from "../utils";

function onAdd(e, props, context, idToFocus, delayFocus) {
	if (getUiOptions(props.uiSchema).canAdd === false) return;
	getContext(context).idToFocus = idToFocus;
	getContext(context).delayFocus = delayFocus;
	props.onAddClick(e);
}

const buttonDefinitions = {
	add: {
		glyph: "plus",
		fn: (e) => (props, context, options = {}) => {
			onAdd(e, props, context, `${props.idSchema.$id}_${props.items.length}`, options.delayFocus);
		}
	}
};

export function getButtons(buttons, props, context) {
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

	if (!addBtnAdded && props.canAdd) _buttons = [handleButton({fn: "add"}), ..._buttons];

	const buttonElems = _buttons.map(button => {
		let {fn, fnName, glyph, label, className, callbacker, ...options} = button;
		label = label !== undefined ?
			(glyph ? ` ${label}` : label) :
			"";

		return (
			<Button key={fnName} className={className} onClick={e => {
				if (callbacker) {
					e.persist();
					callbacker(() => fn(e)(props, context, options));
				} else {
					fn(e)(props, context, options);
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

// Context passing to ArrayFieldTemplate fails, because of this issue: https://github.com/facebook/react/issues/3392.
// Context is passed here in formContext by ArrayField.
export default function ArrayFieldTemplate(props) {
	const Title = props.TitleField;
	const Description = props.DescriptionField;
	const options = getUiOptions(props.uiSchema);
	const {confirmDelete, deleteCorner, renderDelete = true} = options;
	const buttons = getButtons(options.buttons, props, props.formContext._context);
	return (
		<div className={props.className} onKeyDown={onContainerKeyDown(props, props.formContext._context)}>
			<Title title={props.title}/>
			<Description description={props.description}/>
			{props.items.map(item => {
				let deleteButtonRef = undefined;
				const getDelButton = () => deleteButtonRef;
				const deleteButton = (
					<DeleteButton ref={elem => {deleteButtonRef = elem;}}
												onClick={item.onDropIndexClick(item.index)}
												className="laji-form-field-template-buttons"
												confirm={confirmDelete}
												corner={deleteCorner}
												translations={props.formContext.translations}/>
				);
				return (
					<div key={item.index} className="laji-form-field-template-item keep-vertical" onKeyDown={onItemKeyDown(getDelButton)(item)}>
						<div className="laji-form-field-template-schema">{item.children}</div>
						{item.hasRemove && renderDelete && deleteButton}
					</div>
				);
			})}
			{buttons}
		</div>
	);
}

export function onContainerKeyDown(props, context, insertCallforward, navigateCallForward, delayFocus) { return (e) => {
	function onInsert() {
		onAdd(e, props, context, `${props.idSchema.$id}_${props.items.length}`, delayFocus);
	}

	function focusFirstOf(idx) {
		const elem = getSchemaElementById(`${props.idSchema.$id}_${idx}`);

		if (elem) {
			const tabbableFields = getTabbableFields(getSchemaElementById(`${props.idSchema.$id}_${idx}`));
			if (tabbableFields && tabbableFields.length) {
				tabbableFields[0].focus();
				e.stopPropagation();
			}
		}
	}

	if (!e.ctrlKey && e.key === "Insert") {

		e.stopPropagation();

		const canAdd = props.canAdd && getUiOptions(props.uiSchema).canAdd !== false;

		if (canAdd && insertCallforward) {
			e.persist();
			insertCallforward(() => {
				onInsert();
			});
		} else if (canAdd) {
			onInsert();
		}
	} else if (e.ctrlKey && e.key === "Enter") {
		const nearestSchemaElem = findNearestParentSchemaElemID(document.activeElement);
		// Should contain all nested array item ids. We want the last one, which is focused.
		const activeArrayItems = nearestSchemaElem.id.match(/_\d/g);
		if (!activeArrayItems) return;

		const currentIdx = parseInt(activeArrayItems[activeArrayItems.length - 1].replace("_", ""));
		const amount = e.shiftKey ? -1 : 1;

		const nextIdx = currentIdx + amount;
		if  (navigateCallForward) {
			e.persist();
			navigateCallForward(() => {
				focusFirstOf(nextIdx);
			}, nextIdx);
		} else {
			focusFirstOf(nextIdx);
		}
	}
};}

export function onItemKeyDown(getDeleteButton) { return () => e => {
	if (e.ctrlKey && e.key === "Delete") {
		getDeleteButton().onClick(e);
	}
};}
