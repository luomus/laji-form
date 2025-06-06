import * as React from "react";
import { findDOMNode } from "react-dom";

type Props = {
	onAffixChange?: (changed: boolean) => void;
	topOffset?: number
	bottomOffset?: number
	containerRef?: React.RefObject<HTMLElement>;
	style?: React.CSSProperties;
	className?: string;
}

enum AFFIX_STATE {
	TOP = "TOP",
	AFFIXED = "AFFIXED",
	BOTTOM = "BOTTOM"
}

type State = {
	affixState?: AFFIX_STATE | undefined;
	change?: number;
	width?: number;
	top?: number;
	affixHeight?: number;
	fixerHeight?: number;
}

// const TOP = "TOP", AFFIXED = "AFFIXED", BOTTOM = "BOTTOM";
export class Affix extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = this.getState(props);
	}

	containerRef = React.createRef<HTMLDivElement>();
	wrapperRef = React.createRef<HTMLDivElement>();
	positionerRef = React.createRef<HTMLDivElement>();

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onResize);
	}

	componentDidUpdate(prevProps: Props, prevState: State) {
		if (!this.props.onAffixChange || !prevState || !this.state) {
			return;
		}
		if (prevState.affixState !== AFFIX_STATE.AFFIXED && this.state.affixState === AFFIX_STATE.AFFIXED) {
			this.props.onAffixChange(true);
		} else if (prevState.affixState === AFFIX_STATE.AFFIXED && this.state.affixState !== AFFIX_STATE.AFFIXED) {
			this.props.onAffixChange(false);
		}
	}

	getState = (props: Props): State => {
		const {topOffset = 0, bottomOffset = 0, containerRef} = props;

		const container = findDOMNode((containerRef || this.containerRef).current) as HTMLElement;
		const wrapperElem = findDOMNode(this.wrapperRef.current) as HTMLElement;
		if (!container || !document.body.contains(container) || !wrapperElem) {
			return {};
		}

		const containerTop = container.getBoundingClientRect().top;
		const containerHeight = container.offsetHeight;
		const containerVisibleHeight = containerHeight + containerTop;
		const wrapperHeight = wrapperElem.offsetHeight;
		const wrapperScrollHeight = wrapperElem.scrollHeight;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const scrolled = this.containerRef.current!.getBoundingClientRect().top < topOffset;

		const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		const bottomDist = viewportHeight - container.getBoundingClientRect().top - containerHeight;
		const bottomInvisibleHeight = Math.min(bottomDist, 0);

		let affixState = AFFIX_STATE.TOP;
		if (scrolled && containerVisibleHeight < wrapperScrollHeight + topOffset) affixState = AFFIX_STATE.BOTTOM;
		else if (scrolled) affixState = AFFIX_STATE.AFFIXED;

		const width = wrapperElem ? wrapperElem.offsetWidth : undefined;
		const top = topOffset;

		const affixHeight = affixState === AFFIX_STATE.BOTTOM
			? Math.max(
				containerVisibleHeight
					- topOffset
					+ Math.min(bottomInvisibleHeight, 0)
					- (bottomDist < bottomOffset ? Math.min(bottomOffset - bottomDist, bottomOffset) : 0),
				0)
			: undefined;
		const wrapperCutHeight = wrapperHeight - (affixHeight || 0);

		let change: number | undefined = undefined;
		if (affixState === AFFIX_STATE.BOTTOM) {
			if (!this.state) {
				change = wrapperCutHeight;
			} else {
				if (this.state.affixState === AFFIX_STATE.BOTTOM) {
					const lastChange = this.state.change ?? 0;
					const changeNow = wrapperCutHeight;
					change = lastChange + changeNow;
				} else {
					change = wrapperCutHeight;
				}
			}
		}

		const fixerHeight = affixState === AFFIX_STATE.AFFIXED
			? wrapperHeight - (affixHeight || 0)
			: affixState === AFFIX_STATE.BOTTOM
				? (affixHeight ?? 0) + (change ?? 0)
				: 0;
		return { affixState, width, top, affixHeight, fixerHeight, change };
	}

	_onScroll = () => {
		this.setState(this.getState(this.props));
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}
	
	_onResize = () => {
		const positioner = findDOMNode(this.positionerRef.current) as HTMLElement;
		const width = positioner.getBoundingClientRect().width;

		const nextState: State = { width };

		const currentState = this.getState(this.props);
		if (currentState.affixState !== AFFIX_STATE.TOP) {
			nextState.top = currentState.top;
		}

		this.setState(nextState);
	}

	onResize = () => {
		requestAnimationFrame(this._onResize);
	}

	render() {
		const {children, style: containerStyle} = this.props;
		const {top, width, affixState, affixHeight, fixerHeight} = this.state || {};
		const style: React.CSSProperties = {};
		const fixerStyle: React.CSSProperties = {position: "relative", zIndex: -1, height: fixerHeight};
		style.position = "relative";
		if (affixState === AFFIX_STATE.BOTTOM || affixState === AFFIX_STATE.AFFIXED) {
			style.position = "fixed";
			style.width = width;
			style.top = top;
			style.zIndex = 1000;
			style.height = affixHeight;
			if (affixState === AFFIX_STATE.BOTTOM) {
				style.overflow = "hidden";
			}
		}
		return (
			<div style={containerStyle} ref={this.containerRef}>
				<div ref={this.positionerRef} />
				<div ref={this.wrapperRef} style={style} className={this.props.className}>
					{children}
				</div>
				<div style={fixerStyle} />
			</div>
		);
	}
}

