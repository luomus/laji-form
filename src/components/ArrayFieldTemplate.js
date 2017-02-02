import React from "react";
import { Button, DeleteButton } from "./components";
import { getUiOptions } from "../utils";
import { ButtonToolbar } from "react-bootstrap";
import Context from "../Context";

const buttonDefinitions = {
	add: {
		glyph: "plus",
		fn: (e) => (props) => {
			new Context(props.formContext.contextId).idToFocus = `${props.idSchema.$id}_${props.items.length}`;
			props.onAddClick(e);
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
		if (fnName !== "add" || props.canAdd) return _button;
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
					callbacker(() => fn(e)(props, options))
				} else {
					fn(e)(props, options);
				}
			}} >
				{glyph && <i className={`glyphicon glyphicon-${glyph}`}/>}
				<strong>{glyph ? ` ${label}` : label}</strong>
			</Button>
		)
	});
	return (
		<ButtonToolbar key="buttons">{buttonElems}</ButtonToolbar>
	);
}

export default function ArrayFieldTemplate(props) {
	const Title = props.TitleField;
	const Description = props.DescriptionField;
	const options = getUiOptions(props.uiSchema);
	const {confirmDelete, deleteCorner, renderDelete = true} = options;
	const buttons = getButtons(options.buttons, props);
	return (
		<div className={props.className} onKeyDown={onContainerKeyDown(props)}>
			<Title title={props.title}/>
			<Description description={props.description}/>
			{props.items.map(item => {
				let deleteButtonRef = undefined;
				const getDelButton = () => deleteButtonRef;
				const deleteButton = (
					<DeleteButton ref={elem => {deleteButtonRef = elem}}
												onClick={item.onDropIndexClick(item.index)}
												className="laji-form-field-template-buttons"
												confirm={confirmDelete}
												corner={deleteCorner}
												translations={props.formContext.translations}/>
				);
				return (
					<div key={item.index} className="laji-form-field-template-item" onKeyDown={onItemKeyDown(getDelButton)(item)}>
						<div className="laji-form-field-template-schema">{item.children}</div>
						{item.hasRemove && renderDelete && deleteButton }
					</div>
				)
			})}
			{buttons}
		</div>
	);
}

export function onContainerKeyDown(props, callbacker) { return (e) => {
	if (!e.shiftKey && e.key === "Insert") {

		function onInsert() {
			new Context(props.formContext.contextId).idToFocus = `${props.idSchema.$id}_${props.items.length}`;
			props.onAddClick(e);
		}

		if (callbacker) {
			e.persist();
			callbacker(() => {
				onInsert();
			})
		} else {
			onInsert();
		}
	}
}}

export function onItemKeyDown(getDeleteButton) { return props => e => {
	if (e.shiftKey && e.key === "Delete") {
		getDeleteButton().onClick(e);
	}
}}
