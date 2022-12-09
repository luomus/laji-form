import { FormContext } from "../components/LajiForm";
import { highlightElem, scrollIntoViewIfNeeded } from "../utils";

type FocusHandler = () => Promise<void> | void;

export default class FocusService {
	private formContext: FormContext;
	private focusHandlers: {[id: string]: FocusHandler[]} = {};

	constructor(formContext: FormContext) {
		this.formContext = formContext;

		this.focus = this.focus.bind(this);
		this.focusNextInput = this.focusNextInput.bind(this);
	}

	setFormContext(formContext: FormContext) {
		this.formContext = formContext;
	}

	addFocusHandler(id: string, fn: FocusHandler) {
		if (!this.focusHandlers[id]) this.focusHandlers[id] = [];
		this.focusHandlers[id].push(fn);
	}

	removeFocusHandler(id: string, fn: FocusHandler) {
		if (!this.focusHandlers[id]) {
			console.warn(`laji-form warning: removing focus handler that isn't registered for id ${id}.`);
			return;
		}
		this.focusHandlers[id] = this.focusHandlers[id].filter(_fn => fn !== _fn);
	}

	focus(id: string) {
		const idParts = id.split("_");

		// Some components focus asynchronously (due to state changes etc), so we reduce
		// the focus handlers to a promise chain.
		let _id = "";
		idParts.reduce((promise, idPart) => {
			return promise.then(() => {
				_id = _id ? `${_id}_${idPart}` : idPart;
				return (this.focusHandlers[_id] || []).reduce((_promise, fn) => {
					const status = fn(); // Either undefined or a Promise.
					return status && status.then ? status : Promise.resolve();
				}, Promise.resolve());
			});
		}, Promise.resolve()).then(() => {
			const container = this.formContext.utils.getSchemaElementById(id);
			const elem = container || document.querySelector(`#laji-form-error-container-${id}`);
			const input = document.querySelector(`#${id}`) as HTMLInputElement;

			if (elem) scrollIntoViewIfNeeded(elem, this.formContext.topOffset, this.formContext.bottomOffset);
			if (input && input.focus) input.focus();

			if (!elem) return;

			highlightElem(elem);
		});
	}

	focusNextInput(reverse = false) {
		if (!this.formContext.formRef.current) {
			console.warn("Focus service can't  doesn't have ref to the form");
			return;
		}
		this.formContext.utils.focusNextInput(reverse);
	}
}
