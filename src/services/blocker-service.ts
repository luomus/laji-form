import { FormContext } from "../components/LajiForm";

export default class BlockerService {
	private formContext: FormContext;
	private blockingLoaderCounter = 0;
	private blockingLoaderRef: HTMLDivElement;

	constructor(formContext: FormContext) {
		this.formContext = formContext;
	}

	initialize() {
		this.blockingLoaderRef = document.createElement("div");
		this.blockingLoaderRef.className = "laji-form blocking-loader";
		if (this.blockingLoaderCounter > 0) this.blockingLoaderRef.className = "laji-form blocking-loader entering";
		document.body.appendChild(this.blockingLoaderRef);
	}

	destroy() {
		document.body.removeChild(this.blockingLoaderRef);
	}

	push = () => {
		this.blockingLoaderCounter++;
		if (this.blockingLoaderCounter === 1) {
			this.blockingLoaderRef.className = "laji-form blocking-loader entering";
			this.formContext.services.keyHandlerService.block();
		}
	}

	pop = () => {
		this.blockingLoaderCounter--;
		if (this.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		} else if (this.blockingLoaderCounter === 0) {
			this.blockingLoaderRef.className = "laji-form blocking-loader leave-start";
			this.formContext.setTimeout(() => {
				if (this.blockingLoaderCounter > 0) {
					this.blockingLoaderRef.className = "laji-form blocking-loader entering";
					return;
				}
				if (this.blockingLoaderRef) this.blockingLoaderRef.className = "laji-form blocking-loader leaving";
				this.formContext.setTimeout(() => {
					if (!this.blockingLoaderRef) {
						return;
					}
					if (this.blockingLoaderCounter > 0) {
						this.blockingLoaderRef.className = "laji-form blocking-loader entering";
					} else {
						this.blockingLoaderRef.className = "laji-form blocking-loader";
					}
				}, 200); // should match css transition time.
			});
			this.formContext.services.keyHandlerService.unblock();
		}
	}
}
