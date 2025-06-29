import { FieldProps, WidgetProps } from "../types";
import { getFieldUUID } from "../utils";

export interface SubmitHook {
	hook: () => void;
	promise: Promise<any>;
	lajiFormId: string;
	relativePointer: string;
	running: boolean;
	description?: string;
	failed?: boolean;
	e?: string;
}

export default class SubmitHookService {
	private onSubmitHooksChange: (submitHooks: SubmitHook[], callback?: () => void) => void;
	private submitHooks: SubmitHook[] = [];
	constructor(onSubmitHooksChange: (submitHooks: SubmitHook[]) => void) {
		this.onSubmitHooksChange = onSubmitHooksChange;
	}

	private send(submitHooks: SubmitHook[], callback?: () => void) {
		this.submitHooks = submitHooks;
		this.onSubmitHooksChange(submitHooks, callback);
	}

	private internalAdd(_lajiFormId: string | number, relativePointer: string, hook: () => void, description?: string) {
		const lajiFormId = `${_lajiFormId}`;
		let promise: Promise<any>;
		const _hook = (): Promise<any> => {
			return new Promise((resolve) => {
				let isRetry = false;
				const hooks = (this.submitHooks || []).map(hookItem => {
					if (hookItem.hook === _hook) {
						isRetry = true;
						return {...hookItem, running: true, promise};
					}
					return hookItem;
				});
				if (isRetry) {
					this.send(hooks);
				}
				resolve(hook());
			}).then(() => {
				this.remove(lajiFormId, _hook);
			}).catch(e => {
				this.send(this.submitHooks?.map(hookItem => hookItem.hook === _hook ? {...hookItem, e, running: false, failed: true} : hookItem));
			});
		};

		promise = _hook();

		this.send([
			...this.submitHooks,
			{hook: _hook, promise, lajiFormId, description, relativePointer, running: true}
		]);
		return _hook;
	}

	/**
	 * Add a submit hook for a Field component.
	 */
	add(
		props: Pick<FieldProps<any, any>, "formData" | "idSchema" | "formContext"> | Pick<WidgetProps<any, any>, "formData" | "id" | "formContext">,
		hook: SubmitHook["hook"])
	{
		const id = getFieldUUID(props);
		const idSchemaId = "id" in props ? props.id : props.idSchema.$id;
		const relativePointer = props.formContext.services.ids.getRelativePointer(idSchemaId, id);
		return this.internalAdd(id, relativePointer, hook);
	}

	/** Remove a hook either by id or hook instance */
	remove(lajiFormId?: string, hook?: SubmitHook["hook"]) {
		return new Promise<void>(resolve => {
			lajiFormId = `${lajiFormId}`;
			const newHooks = this.submitHooks.filter(({hook: _hook, lajiFormId: _lajiFormId}) => (hook ? _hook !== hook : lajiFormId !== _lajiFormId));
			newHooks.length !== this.submitHooks.length ? this.send(newHooks, resolve) : resolve();
		});
	}

	removeAll() {
		this.send([]);
	}

	checkHooks() {
		this.send(this.submitHooks.map(hookItem => ({...hookItem, running: true})));
		return Promise.all(this.submitHooks.map(({promise, hook}) => {
			const setNotRunning = () => {
				this.send(this.submitHooks.map(hookItem =>
					({...hookItem, running: hookItem.hook === hook ? false : hookItem.running}))
				);
			};
			return promise.then(setNotRunning).catch(setNotRunning);
		}));
	}
}
