import {FormContext, RootContext} from "../components/LajiForm";
import Context from "../Context";
import { getKeyHandlerTargetId, isDescendant } from "../utils";

export type KeyFunctions = {[fnName: string]: (e: KeyboardEvent, options: any) => boolean | void}
type KeyHandleListener = (e: KeyboardEvent) => boolean | undefined;

interface ShortcutKey {
	fn: string;
	target?: string;
	[param: string]: any;
}
export type ShortcutKeys = Record<string, ShortcutKey>;

export interface InternalKeyHandler extends ShortcutKey {
	conditions: ((e: KeyboardEvent) => boolean)[];
}
type InternalKeyHandlers = InternalKeyHandler[];
type InternalKeyHandlerTargets = {id: string, handler: InternalKeyHandler}[];

/**
 *
 * A service for adding key listeners. Key events are handled in a custom event handling system, which allows many useful
 * features like listening to DOM document root, fine grained control over the order of event bubbling etc and passing any
 * needed data to the event handler.
 *
 * When initialized, it adds a global keydown listener to the document which handles the LajiForm key shortcuts defined in
 * uiSchema["ui:shortcuts"].
 *
 **/
export default class KeyhandlerService {
	public shortcuts: ShortcutKeys = {};

	private keyHandlers: InternalKeyHandlers;
	private keyHandlerTargets: InternalKeyHandlerTargets;
	private keyHandleListeners: {[id: string]: KeyHandleListener[]} = {};
	private keyHandleIdFunctions: {id: string, keyFunctions: KeyFunctions, handleKey: KeyHandleListener}[] = [];
	private blocked = false;
	private formContext: FormContext;
	private globalEventsRootHandler: {[eventName: string]: React.EventHandler<any>} = {};
	private globalEventHandlers: {[name: string]: React.EventHandler<any>[]} = {};

	constructor(formContext: FormContext) {
		this.formContext = formContext;
		this.onKeyDown = this.onKeyDown.bind(this);
	}

	initialize() {
		this.addGlobalEventHandler("keydown", this.onKeyDown);
	}

	destroy() {
		this.removeGlobalEventHandler("keydown", this.onKeyDown);
	}

	block() {
		this.blocked = true;
	}

	unblock() {
		this.blocked = false;
	}

	setShortcuts(shortcuts: ShortcutKeys = {}, keyFunctions: KeyFunctions) {
		this.keyHandleListeners = {};
		this.keyHandleIdFunctions = [];

		this.keyHandlers = this.getKeyHandlers(shortcuts);
		this.addKeyHandler("root", keyFunctions);
		this.keyHandlerTargets = this.keyHandlers.reduce((targets, handler) => {
			if (typeof handler.target === "string") targets.push({id: handler.target, handler});
			return targets;
		}, [] as InternalKeyHandlerTargets);

		this.shortcuts = shortcuts;
	}

	setFormContext(formContext: FormContext) {
		this.formContext = formContext;
	}

	getKeyHandlers(shortcuts: ShortcutKeys = {}): InternalKeyHandlers {
		return Object.keys(shortcuts).reduce((list, keyCombo) => {
			const shortcut = shortcuts[keyCombo];
			const specials: any = {
				alt: false,
				ctrl: false,
				shift: false,
			};

			list.push(keyCombo.split("+").reduce((keyHandler, key) => {
				if (key in specials) {
					(specials as any)[key] = true;
				}

				keyHandler.conditions.push(e =>
					e.key === key || (key in specials && ((specials[key] && (e as any)[`${key}Key`]) || (!specials[key] && !(e as any)[`${key}Key`])))
				);

				return keyHandler;
			}, {...shortcut, conditions: []} as InternalKeyHandler));

			for (let special in specials) {
				if (!(specials as any)[special]) list[list.length - 1].conditions.push(e => {
					return !(e as any)[`${special}Key`];
				});
			}

			return list;
		}, [] as InternalKeyHandlers);
	}

	addKeyHandler = (id: string, keyFunctions: KeyFunctions, additionalParams?: any) => {
		if (!this.keyHandleListeners[id]) this.keyHandleListeners[id] = [];
		const handleKey: KeyHandleListener = (e) => {
			if (this.blocked) {
				e.preventDefault();
				return;
			}
			return this.handleKeysWith(id, keyFunctions, e, additionalParams);
		};
		this.keyHandleIdFunctions.push({id, keyFunctions, handleKey});
		this.keyHandleListeners[id].push(handleKey);
	};

	removeKeyHandler = (_id: string, _keyFunctions: {[fnName: string]: () => boolean | void}) => {
		this.keyHandleIdFunctions.forEach((idFunction, i) => {
			const {id, keyFunctions, handleKey} = idFunction;
			if (id === _id && _keyFunctions === keyFunctions) {
				this.keyHandleIdFunctions.splice(i, 1);
				this.keyHandleListeners[id] = this.keyHandleListeners[id].filter((_handleKey: any) =>
					_handleKey !== handleKey
				);
			}
		});
	}

	onKeyDown(e: KeyboardEvent) {
		const currentId = this.formContext.utils.findNearestParentSchemaElemId(e.target as HTMLElement) || "";

		let order = Object.keys(this.keyHandleListeners).filter(id => {
			if (currentId.startsWith(id)) return true;
			return;
		}).sort((a, b) => {
			return b.length - a.length;
		});

		const targets = this.keyHandlerTargets
			.filter(({handler}) => handler.conditions.every(condition => condition(e)))
			.map(({id}) => getKeyHandlerTargetId(id, new Context(this.formContext.contextId) as RootContext));
		order = [...targets, ...order];

		order.some(id => this.keyHandleListeners[id]?.some((keyHandleListener: KeyHandleListener) => keyHandleListener(e)));
	}

	/**
	 * Global event handlers are listened for the whole DOM document. React can't listen to events on document level, hence this is useful.
	 **/
	addGlobalEventHandler(name: string, fn: React.EventHandler<any>) {
		if (!this.globalEventHandlers[name]) {
			this.globalEventsRootHandler[name] = e => {
				if (!e.persist) e.persist = () => {};
				const origStopPropagation = e.stopPropagation;
				e.stopPropagation = () => {
					e._lajiFormStoppedFlag = true;
					origStopPropagation.call(e);
				};
				this.globalEventHandlers[name].some(h => {
					if (e._lajiFormStoppedFlag) {
						return true;
					}
					h(e);
					return false;
				});
			};
			document.addEventListener(name, this.globalEventsRootHandler[name]);
			this.globalEventHandlers[name] = [];
		}
		this.globalEventHandlers[name].push(fn);
	}

	removeGlobalEventHandler(name: string, fn: React.EventHandler<any>) {
		this.globalEventHandlers[name] = this.globalEventHandlers[name].filter(_fn => _fn !== fn);
		if (this.globalEventHandlers[name].length === 0) {
			delete this.globalEventHandlers[name];
			document.removeEventListener(name, this.globalEventsRootHandler[name]);
		}
	}

	private handleKeysWith(id: string, keyFunctions: KeyFunctions = {}, e: KeyboardEvent, additionalParams: any = {}) {
		if (this.blocked && !isDescendant(document.querySelector(".pass-block"), e.target as HTMLElement)) {
			e.preventDefault();
			return;
		}

		if (isDescendant(document.querySelector(".laji-map"), e.target as HTMLElement)) return;

		function handleKey(keyHandler: InternalKeyHandler) {
			const returnValue = keyFunctions[keyHandler.fn](e, {...keyHandler, ...additionalParams});
			const eventHandled = returnValue !== undefined ? returnValue : true;
			if (eventHandled) {
				e.preventDefault();
				e.stopPropagation();
			}
			return eventHandled;
		}

		const highPriorityHandled = this.keyHandlers.some(keyHandler => {
			let target = getKeyHandlerTargetId(keyHandler.target, new Context(this.formContext.contextId) as RootContext);
			if (keyFunctions[keyHandler.fn] && "target" in keyHandler && id.match(target) && keyHandler.conditions.every(condition => condition(e))) {
				if (!handleKey(keyHandler)) {
					e.preventDefault();
					e.stopPropagation();
				}
				return true;
			}
			return false;
		});

		if (highPriorityHandled) return highPriorityHandled;

		return this.keyHandlers.some(keyHandler => {
			if (keyFunctions[keyHandler.fn] && keyHandler.conditions.every(condition => condition(e))) {
				return handleKey(keyHandler);
			}
			return false;
		});
	}
}


