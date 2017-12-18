import React, { Component } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Row, Col, ListGroup, ListGroupItem, ButtonGroup, Breadcrumb } from "react-bootstrap";
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
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onSelected = (id) => {
		this.props.onChange(id);
		if (this.state.informalTaxonGroupsById && id) this.setState({name: this.state.informalTaxonGroupsById[id].name});
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
					{this.state.name ? <span>{this.state.name}</span> : <Spinner />}
					<div className="close" onClick={this.onClear}>×</div>
				</div>
			);
		return (
			<TooltipComponent tooltip={this.props.value && this.state.informalTaxonGroupsById && this.state.informalTaxonGroupsById[this.props.value].name}>
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
			this.setState(state);
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
		let Container, getItem;
		const getButtonGroup = (id) => (
			<ButtonGroup>
				{this.state.informalTaxonGroupsById[id].hasSubGroup && <Button key="subgroups" onClick={this.onSubgroupSelected(id)}>{this.props.translations.ShowSubgroups}</Button>}
				<Button key="select" onClick={this.onSelected(id)}>{this.props.translations.Select}</Button>
			</ButtonGroup>
		);
		switch(this.state.path.length) {
		case 1:
			Container = Row;
			getItem = id => {
				const itg = this.state.informalTaxonGroupsById[id];
				return (
					<Col key={id} lg={6} md={6} sm={6} xs={12}>
						<div className="well text-center">
							<div className={`informal-group-image ${id}`} />
							<h4>
								{itg.name}
							</h4>
							{getButtonGroup(id)}
						</div>
					</Col>
				);
			};
			break;
		default:
			Container = ListGroup;
			getItem = id => (
				<ListGroupItem key={id}>
					<h5>{this.state.informalTaxonGroupsById[id].name}</h5>
					{getButtonGroup(id)}
				</ListGroupItem>
			);
		}

		return (
			<Modal show={true} onHide={this.props.onHide} dialogClassName="laji-form informal-taxon-group-chooser">
			<Modal.Body>
				<Breadcrumb>
					{this.state.path.map(id => 
						<Breadcrumb.Item key={id === undefined ? "root" : id} onClick={this.onSubgroupSelected(id)}>
							{id === undefined ? this.props.translations.All : this.state.informalTaxonGroupsById[id].name}
						</Breadcrumb.Item>
					)}
				</Breadcrumb>
				{this.state.informalTaxonGroups 
					? <Container>{Object.keys(this.state.informalTaxonGroups).map(getItem)}</Container>
					: <Spinner />
				}
			</Modal.Body>
			</Modal>
		);
	}
}
