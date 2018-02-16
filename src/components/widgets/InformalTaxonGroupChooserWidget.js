import React, { Component } from "react";
import PropTypes from "prop-types";
import { Modal, Button, ListGroup, ListGroupItem, ButtonGroup, Breadcrumb, Panel, Row, Col } from "react-bootstrap";
import { TooltipComponent } from "../components";
import ApiClient from "../../ApiClient";
import Spinner from "react-spinner";
import BaseComponent from "../BaseComponent";
import { getUiOptions } from "../../utils";

@BaseComponent
export default class InformalTaxonGroupChooserWidget extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.mounted = true;
		getInformalGroups().then(state => {
			if (!this.mounted) return;
			this.setState(state);
		});
		this.componentWillReceiveProps(this.props);
	}

	componentWillReceiveProps(props) {
		if (props.value !== this.state.informalTaxonGroup) {
			if (!props.value) this.setState({name: undefined});
			getInformalGroups().then(({informalTaxonGroupsById}) => {
				this.setState({informalTaxonGroup: informalTaxonGroupsById[this.props.value]});
			});
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	getDefaultOptions = (props) => {
		const {button = true, rootOnly = false, grid = {lg: 1, md: 2, sm: 3, xs: 12} } = getUiOptions(props.uiSchema);
		return {button, rootOnly, grid};
	}

	onSelected = (id) => {
		this.props.onChange(id);
		const {button} = this.getDefaultOptions(this.props);
		if (button) this.hide();
		if (this.state.informalTaxonGroupsById && id) this.setState({informalTaxonGroup: this.state.informalTaxonGroupsById[id]});
	}

	show = () => {
		this.setState({show: true});
	}

	hide = () => {
		this.setState({show: false});
	}

	onClear = (e) => {
		e.stopPropagation();
		this.onSelected(undefined);
	}


	render () {
		let imageID = this.props.value;
		const {button, rootOnly, grid} = this.getDefaultOptions(this.props);
		const {informalTaxonGroupsById = {}} = this.state;
		if (informalTaxonGroupsById[this.props.value] && informalTaxonGroupsById[this.props.value].parent) {
			imageID = informalTaxonGroupsById[this.props.value].parent.id;
		}
		const InformalTaxonGroupChooserComponent = <InformalTaxonGroupChooser activeId={this.props.value} onSelected={this.onSelected} translations={this.props.formContext.translations} rootOnly={rootOnly} grid={grid}/>;

		if (button) {
			const title = !this.props.value 
				? <div className="informal-group-chooser-button-content"><span>{this.props.formContext.translations.PickInformalTaxonGroup}</span></div>
				: (
					<div className="informal-group-chooser-button-content">
						<div className={`informal-group-image ${imageID}`} />
						{this.state.informalTaxonGroup ? <span>{this.state.informalTaxonGroup.name}</span> : <Spinner />}
						<div className="close" onClick={this.onClear}>×</div>
					</div>
				);
			return (
				<TooltipComponent tooltip={this.state.informalTaxonGroup && this.state.informalTaxonGroup.name}>
					<div className="informal-taxon-groups-list">
						<Button onClick={this.show}>{title}</Button>
						{this.state.show && (
							<Modal show={true} onHide={this.hide} dialogClassName="laji-form informal-taxon-group-chooser">
								<Modal.Header closeButton={true}>
									<Modal.Title>{this.props.formContext.translations.PickInformalTaxonGroup}</Modal.Title>
								</Modal.Header>
							<Modal.Body>
								{InformalTaxonGroupChooserComponent}
							</Modal.Body>
						</Modal>
				)}
					</div>
				</TooltipComponent>
			);
		} else {
			return InformalTaxonGroupChooserComponent;
		}
	}
}

function walk(allGroups, _group, parent) {
	_group.forEach(group => {
		allGroups[group.id] = group;
		if (parent) group.parent = parent;
		if (group.hasSubGroup) {
			allGroups = walk(allGroups, group.hasSubGroup, parent || group);
		}
	});
	return allGroups;
}

const mapGroupsById = _groups => _groups.reduce((groups, group) => {
	groups[group.id] = group;
	return groups;
}, {});

let informalTaxonGroups, informalTaxonGroupsById;

export function getInformalGroups() {
	if (informalTaxonGroups) {
		return Promise.resolve({informalTaxonGroups, informalTaxonGroupsById});
	}
	return new ApiClient().fetchCached("/informal-taxon-groups/tree").then(response => {
		// Contains the current taxon group.
		const informalTaxonGroups = mapGroupsById(response.results);
		// Contains all groups in flat object.
		const informalTaxonGroupsById = walk({}, response.results);
		return Promise.resolve({informalTaxonGroups, informalTaxonGroupsById});
	});
}

export class InformalTaxonGroupChooser extends Component {
	static propTypes = {
		onSelected: PropTypes.func.isRequired,
		translations: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {path: [undefined]};
	}

	componentDidMount() {
		this.mounted = true;
		getInformalGroups().then(state => {
			if (!this.mounted) return;
			this.setState({...state, root: state.informalTaxonGroups});
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onSelected = (id) => () => {
		this.props.onSelected(id);
	}

	onSubgroupSelected = (id) => () => {
		let path;
		const existingIdx = this.state.path.indexOf(id);
		path = (existingIdx >= 0)
			 ? this.state.path.slice(0, existingIdx + 1)
			: [...this.state.path, id];
		this.setState({
			informalTaxonGroups: id 
				? mapGroupsById(this.state.informalTaxonGroupsById[id].hasSubGroup) 
				: this.state.root,
			path
		});
	}

	render() {
		const {path, informalTaxonGroupsById, informalTaxonGroups} = this.state;
		const {translations, rootOnly, grid, activeId} = this.props;

		const getButtonGroup = (id) => (
			<ButtonGroup>
				{informalTaxonGroupsById[id].hasSubGroup && <Button key="subgroups" onClick={this.onSubgroupSelected(id)}>{translations.ShowSubgroups}</Button>}
				<Button key="select" onClick={this.onSelected(id)}>{translations.Select}</Button>
			</ButtonGroup>
		);
		const getLabel = id => {
			const name = informalTaxonGroupsById[id].name;
			return path.length <= 1 ? <h5>{name}</h5> : <span>{name}</span>;
		};
		const Container = ({children}) => rootOnly ? <Row>{children}</Row> : <ListGroup>{children}</ListGroup>;
		const getItem = id => !rootOnly ? (
			<ListGroupItem key={id} className={path.length > 1 ? "not-root" : ""}>
				{path.length === 1 ? <div className={`informal-group-image ${id}`} /> : null}
				{getLabel(id)}
				{getButtonGroup(id)}
			</ListGroupItem>
		) : (
			<Col key={id} {...grid}>
				<Panel header={getLabel(id)} onClick={this.onSelected(id)} bsStyle={id === activeId ? "primary" : undefined}>
					<div className={`informal-group-image ${id}`} />
				</Panel>
			</Col>
		);

		return (
			<div className="informal-taxon-group-chooser">
				{!rootOnly && (
					<Breadcrumb>
					{path.map(id => 
						<Breadcrumb.Item key={id === undefined ? "root" : id} onClick={this.onSubgroupSelected(id)}>
							{id === undefined ? translations.All : informalTaxonGroupsById[id].name}
						</Breadcrumb.Item>
					)}
				</Breadcrumb>
				)}
				{informalTaxonGroups 
					? <Container>{Object.keys(informalTaxonGroups).map(getItem)}</Container>
					: <Spinner />
				}
			</div>
		);
	}
}
