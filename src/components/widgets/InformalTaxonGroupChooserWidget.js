import React, { Component } from "react";
import PropTypes from "prop-types";
import { Modal, Button, ListGroup, ListGroupItem, ButtonGroup, Breadcrumb } from "react-bootstrap";
import { TooltipComponent } from "../components";
import ApiClient from "../../ApiClient";
import Spinner from "react-spinner";

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

	onSelected = (id) => {
		this.props.onChange(id);
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
		const {informalTaxonGroupsById = {}} = this.state;
		if (informalTaxonGroupsById[this.props.value] && informalTaxonGroupsById[this.props.value].parent) {
			imageID = informalTaxonGroupsById[this.props.value].parent.id;
		}
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
					{this.state.show && <InformalTaxonGroupChooser onHide={this.hide} onSelected={this.onSelected} translations={this.props.formContext.translations}/>}
				</div>
			</TooltipComponent>
		);
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
		onHide: PropTypes.func.isRequired,
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
		this.props.onHide();
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
		const {translations, onHide} = this.props;

		const getButtonGroup = (id) => (
			<ButtonGroup>
				{informalTaxonGroupsById[id].hasSubGroup && <Button key="subgroups" onClick={this.onSubgroupSelected(id)}>{translations.ShowSubgroups}</Button>}
				<Button key="select" onClick={this.onSelected(id)}>{translations.Select}</Button>
			</ButtonGroup>
		);
		const getItem = id => (
			<ListGroupItem key={id}>
				{path.length === 1 ? <div className={`informal-group-image ${id}`} /> : null}
				<h5>{informalTaxonGroupsById[id].name}</h5>
				{getButtonGroup(id)}
			</ListGroupItem>
		);

		return (
			<Modal show={true} onHide={onHide} dialogClassName="laji-form informal-taxon-group-chooser">
				<Modal.Header closeButton={true}>
					<Modal.Title>{translations.PickInformalTaxonGroup}</Modal.Title>
				</Modal.Header>
			<Modal.Body>
				<Breadcrumb>
					{path.map(id => 
						<Breadcrumb.Item key={id === undefined ? "root" : id} onClick={this.onSubgroupSelected(id)}>
							{id === undefined ? translations.All : informalTaxonGroupsById[id].name}
						</Breadcrumb.Item>
					)}
				</Breadcrumb>
				{informalTaxonGroups 
					? <ListGroup>{Object.keys(informalTaxonGroups).map(getItem)}</ListGroup>
					: <Spinner />
				}
			</Modal.Body>
			</Modal>
		);
	}
}
