import * as React from "react";
import { findDOMNode } from "react-dom";

type Props = {
	mounted?: boolean;
	onResize?: () => void;
	enterViewPortTreshold?: number;
	onEnterViewPort?: () => void;
	containerRef: React.RefObject<HTMLElement>;
	topOffset?: number;
	bottomOffset?: number;
	minHeight?: number;
	className?: string;
}

type State = {
	height?: number;
	containerHeight?: number;
	horizontallyAligned?: boolean;
	top?: number;
}

export type WithNonNullableKeys<T, K extends keyof T> = Omit<T, K> & {
		[P in K]-?: NonNullable<T[P]>;
};

export class Stretch extends React.Component<Props, State> {

	constructor(props: Props) {
		super(props);
		this.state = {};
	}

	initialized = false;
	cameToViewFirstTime = false;

	wrapperRef = React.createRef<HTMLDivElement>();

	UNSAFE_componentWillReceiveProps(props: Props) {
		if (props.mounted && !this.initialized) {
			const state = this.getState();
			this.update(state);
			this.cameToViewFirstTime = (state.height || 0) > (this.props.enterViewPortTreshold || 0);
			this.initialized = true;
		}
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onScroll);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onScroll);
	}

	_onScroll = () => {
		let callback = undefined;
		const state = this.getState();
		if (!this.cameToViewFirstTime && (state.height || 0) > (this.props.enterViewPortTreshold || 0)) {
			this.cameToViewFirstTime = true;
			if (this.props.onEnterViewPort) {
				callback = () => this.props.onEnterViewPort?.();
			}
		}
		this.update(state, callback);
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}

	update = (state: Partial<State>, callback?: () => void) => {
		const afterStateChange = () => {
			this.props.onResize?.();
			callback?.();
		};
		state ? this.setState(state, () => {
			afterStateChange();
		}) : afterStateChange;
	}

	getState = (): Partial<State> => {
		const {containerRef, topOffset = 0, bottomOffset = 0, minHeight} = this.props;
		let container = findDOMNode(containerRef.current) as HTMLElement;

		if (this.wrapperRef &&
		    container.getBoundingClientRect().top !== (findDOMNode(this.wrapperRef.current) as HTMLElement).getBoundingClientRect().top) {
			return {
				horizontallyAligned: false
			};
		}

		let containerHeight = container.offsetHeight;
		if (minHeight && containerHeight < minHeight) {
			containerHeight = minHeight;
			container = findDOMNode(this.wrapperRef.current) as HTMLElement;
		}

		const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		const bottomDist = viewportHeight - container.getBoundingClientRect().top - containerHeight;
		const bottomInvisibleHeight = Math.min(bottomDist, 0);

		return {
			horizontallyAligned: true,
			containerHeight,
			height: Math.max(
				containerHeight
					+ Math.min(container.getBoundingClientRect().top, 0)
					+ Math.min(bottomInvisibleHeight, 0)
					- (container.getBoundingClientRect().top < topOffset ? Math.min(topOffset - container.getBoundingClientRect().top, topOffset) : 0)
					- (bottomDist < bottomOffset ? Math.min(bottomOffset - bottomDist, bottomOffset) : 0),
				0),
			top: Math.max(-container.getBoundingClientRect().top + topOffset, 0)
		};
	}

	render() {
		const {children} = this.props;

		const wrapperStyle = {
			height: this.state.horizontallyAligned ? this.state.containerHeight : this.props.minHeight,
		};
		const style: React.CSSProperties = {
			position: "relative",
			top: this.state.horizontallyAligned ? this.state.top : undefined,
			height: this.state.horizontallyAligned ? this.state.height : "100%",
		};

		return (
			<div ref={this.wrapperRef} style={wrapperStyle} className={this.props.className}>
				<div style={style}>
					{children}
				</div>
			</div>
		);
	}
}

