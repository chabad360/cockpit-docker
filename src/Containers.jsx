import React from 'react';
import { Badge } from "@patternfly/react-core/dist/esm/components/Badge";
import { Button } from "@patternfly/react-core/dist/esm/components/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider";
import { DropdownItem } from '@patternfly/react-core/dist/esm/components/Dropdown/index.js';
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex";
import { LabelGroup } from "@patternfly/react-core/dist/esm/components/Label";
import { Text, TextVariants } from "@patternfly/react-core/dist/esm/components/Text";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect";
import { Toolbar, ToolbarContent, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar";
import { cellWidth, SortByDirection } from '@patternfly/react-table';

import cockpit from 'cockpit';
import { ListingTable } from "cockpit-components-table.jsx";
import { ListingPanel } from 'cockpit-components-listing-panel.jsx';
import ContainerDetails from './ContainerDetails.jsx';
import ContainerIntegration from './ContainerIntegration.jsx';
import ContainerTerminal from './ContainerTerminal.jsx';
import ContainerLogs from './ContainerLogs.jsx';
import ContainerHealthLogs from './ContainerHealthLogs.jsx';
import ContainerDeleteModal from './ContainerDeleteModal.jsx';
import ForceRemoveModal from './ForceRemoveModal.jsx';
import * as utils from './util.js';
import * as client from './client.js';
import ContainerCommitModal from './ContainerCommitModal.jsx';
import ContainerRenameModal from './ContainerRenameModal.jsx';
import { useDialogs, DialogsContext } from "dialogs.jsx";

import './Containers.scss';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import { ImageRunModal } from './ImageRunModal.jsx';
import PruneUnusedContainersModal from './PruneUnusedContainersModal.jsx';

import { KebabDropdown } from "cockpit-components-dropdown.jsx";

const _ = cockpit.gettext;

const ContainerActions = ({ container, healthcheck, onAddNotification, localImages, updateContainer }) => {
    const Dialogs = useDialogs();
    const { version } = utils.useDockerInfo();
    const isRunning = container.State.Status === "running";
    const isPaused = container.State.Status === "paused";
    const isRestarting = container.State.Status === "restarting";

    const deleteContainer = (event) => {
        if (container.State.Status == "running") {
            const handleForceRemoveContainer = () => {
                const id = container ? container.Id : "";

                return client.delContainer(id, true)
                        .catch(ex => {
                            const error = cockpit.format(_("Failed to force remove container $0"), container.Name); // not-covered: OS error
                            onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                            throw ex;
                        })
                        .finally(() => {
                            Dialogs.close();
                        });
            };

            Dialogs.show(<ForceRemoveModal name={container.Name}
                                           handleForceRemove={handleForceRemoveContainer}
                                           reason={_("Deleting a running container will erase all data in it.")} />);
        } else {
            Dialogs.show(<ContainerDeleteModal containerWillDelete={container}
                                               onAddNotification={onAddNotification} />);
        }
    };

    const stopContainer = (force) => {
        const args = {};

        if (force)
            args.t = 0;
        client.postContainer("stop", container.Id, args)
                .catch(ex => {
                    const error = cockpit.format(_("Failed to stop container $0"), container.Name); // not-covered: OS error
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                });
    };

    const startContainer = () => {
        client.postContainer("start", container.Id, {})
                .catch(ex => {
                    const error = cockpit.format(_("Failed to start container $0"), container.Name); // not-covered: OS error
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                });
    };

    const resumeContainer = () => {
        client.postContainer("unpause", container.Id, {})
                .catch(ex => {
                    const error = cockpit.format(_("Failed to resume container $0"), container.Name); // not-covered: OS error
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                });
    };

    const pauseContainer = () => {
        client.postContainer("pause", container.Id, {})
                .catch(ex => {
                    const error = cockpit.format(_("Failed to pause container $0"), container.Name); // not-covered: OS error
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                });
    };

    const commitContainer = () => {
        Dialogs.show(<ContainerCommitModal container={container}
                                           localImages={localImages} />);
    };

    const restartContainer = (force) => {
        const args = {};

        if (force)
            args.t = 0;
        client.postContainer("restart", container.Id, args)
                .catch(ex => {
                    const error = cockpit.format(_("Failed to restart container $0"), container.Name); // not-covered: OS error
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                });
    };

    const renameContainer = () => {
        if (container.State.Status !== "running" ||
            version.localeCompare("3.0.1", undefined, { numeric: true, sensitivity: 'base' }) >= 0) {
            Dialogs.show(<ContainerRenameModal container={container}
                                               updateContainer={updateContainer} />);
        }
    };

    const addRenameAction = () => {
        actions.push(
            <DropdownItem key="rename"
                        onClick={() => renameContainer()}>
                {_("Rename")}
            </DropdownItem>
        );
    };

    const actions = [];
    if (isRunning || isPaused || isRestarting) {
        actions.push(
            <DropdownItem key="stop"
                          onClick={() => stopContainer()}>
                {_("Stop")}
            </DropdownItem>,
            <DropdownItem key="force-stop"
                          onClick={() => stopContainer(true)}>
                {_("Force stop")}
            </DropdownItem>,
            <DropdownItem key="restart"
                          onClick={() => restartContainer()}>
                {_("Restart")}
            </DropdownItem>,
            <DropdownItem key="force-restart"
                          onClick={() => restartContainer(true)}>
                {_("Force restart")}
            </DropdownItem>
        );

        if (!isPaused) {
            actions.push(
                <DropdownItem key="pause"
                          onClick={() => pauseContainer()}>
                    {_("Pause")}
                </DropdownItem>
            );
        } else {
            actions.push(
                <DropdownItem key="resume"
                          onClick={() => resumeContainer()}>
                    {_("Resume")}
                </DropdownItem>
            );
        }
    }

    if (!isRunning && !isPaused) {
        actions.push(
            <DropdownItem key="start"
                          onClick={() => startContainer()}>
                {_("Start")}
            </DropdownItem>
        );
        actions.push(<Divider key="separator-0" />);
        if (version.localeCompare("3", undefined, { numeric: true, sensitivity: 'base' }) >= 0) {
            addRenameAction();
        }
    } else { // running or paused
        actions.push(<Divider key="separator-0" />);
        if (version.localeCompare("3.0.1", undefined, { numeric: true, sensitivity: 'base' }) >= 0) {
            addRenameAction();
        }
    }

    actions.push(<Divider key="separator-1" />);
    actions.push(
        <DropdownItem key="commit"
                      onClick={() => commitContainer()}>
            {_("Commit")}
        </DropdownItem>
    );

    actions.push(<Divider key="separator-2" />);
    actions.push(
        <DropdownItem key="delete"
                      className="pf-m-danger"
                      onClick={deleteContainer}>
            {_("Delete")}
        </DropdownItem>
    );

    return <KebabDropdown position="right" dropdownItems={actions} />;
};

export let onDownloadContainer = function funcOnDownloadContainer(container) {
    this.setState(prevState => ({
        downloadingContainers: [...prevState.downloadingContainers, container]
    }));
};

export let onDownloadContainerFinished = function funcOnDownloadContainerFinished(container) {
    this.setState(prevState => ({
        downloadingContainers: prevState.downloadingContainers.filter(entry => entry.name !== container.name),
    }));
};

const localize_health = (state) => {
    if (state === "healthy")
        return _("Healthy");
    else if (state === "unhealthy")
        return _("Unhealthy");
    else if (state === "starting")
        return _("Checking health");
    else
        console.error("Unexpected health check status", state);
    return null;
};

const ContainerOverActions = ({ handlePruneUnusedContainers, unusedContainers }) => {
    const actions = [
        <DropdownItem key="prune-unused-containers"
                            id="prune-unused-containers-button"
                            component="button"
                            className="pf-m-danger btn-delete"
                            onClick={() => handlePruneUnusedContainers()}
                            isDisabled={unusedContainers.length === 0}>
            {_("Prune unused containers")}
        </DropdownItem>,
    ];

    return <KebabDropdown toggleButtonId="containers-actions-dropdown" position="right" dropdownItems={actions} />;
};

class Containers extends React.Component {
    static contextType = DialogsContext;

    constructor(props) {
        super(props);
        this.state = {
            width: 0,
            downloadingContainers: [],
            showPruneUnusedContainersModal: false,
        };
        this.renderRow = this.renderRow.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        this.cardRef = React.createRef();

        onDownloadContainer = onDownloadContainer.bind(this);
        onDownloadContainerFinished = onDownloadContainerFinished.bind(this);

        window.addEventListener('resize', this.onWindowResize);
    }

    componentDidMount() {
        this.onWindowResize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onWindowResize);
    }

    renderRow(containersStats, container, localImages) {
        const containerStats = containersStats[container.Id];
        // if (containerStats?.name === "/build-jaeger-1") {
        //     console.log(container);
        //     console.log(containerStats);
        // }
        const image = container.Config?.Image || container.Image;
        const isToolboxContainer = container.Config?.Labels?.["com.github.containers.toolbox"] === "true";
        const isDistroboxContainer = container.Config?.Labels?.manager === "distrobox";
        let localized_health = null;

        // this needs to get along with stub containers from image run dialog, where most properties don't exist yet
        const healthcheck = container.State?.Health?.Status ?? container.State?.Healthcheck?.Status; // not-covered: only on old version
        const status = container.State?.Status ?? ""; // not-covered: race condition

        let proc_text = "";
        let mem_text = "";
        let proc = 0;
        let mem = 0;
        if (this.props.cgroupVersion === 'v1' && status === 'running') { // not-covered: only on old version
            proc_text = <div><abbr title={_("not available")}>{_("n/a")}</abbr></div>;
            mem_text = <div><abbr title={_("not available")}>{_("n/a")}</abbr></div>;
        }
        if (containerStats && status === "running") {
            [proc_text, proc] = utils.format_cpu_usage(containerStats);
            [mem_text, mem] = utils.format_memory_and_limit(containerStats);
        }

        const info_block = (
            <div className="container-block">
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <span className="container-name">{container.Name}</span>
                    {isToolboxContainer && <Badge className='ct-badge-toolbox'>toolbox</Badge>}
                    {isDistroboxContainer && <Badge className='ct-badge-distrobox'>distrobox</Badge>}
                </Flex>
                <small>{image.includes("sha256:") ? utils.truncate_id(image) : image}</small>
                <small>{utils.quote_cmdline(container.Config?.Cmd)}</small>
            </div>
        );

        let containerStateClass = "ct-badge-container-" + status.toLowerCase();
        if (container.isDownloading)
            containerStateClass += " downloading";

        const containerState = status.charAt(0).toUpperCase() + status.slice(1);

        const state = [<Badge key={containerState} isRead className={containerStateClass}>{_(containerState)}</Badge>]; // States are defined in util.js
        if (healthcheck) {
            localized_health = localize_health(healthcheck);
            if (localized_health)
                state.push(<Badge key={healthcheck} isRead className={"ct-badge-container-" + healthcheck}>{localized_health}</Badge>);
        }

        const columns = [
            { title: info_block, sortKey: container.Name },
            { title: proc_text, props: { modifier: "nowrap" }, sortKey: containerState === "Running" ? proc ?? -1 : -1 },
            { title: mem_text, props: { modifier: "nowrap" }, sortKey: mem ?? -1 },
            { title: <LabelGroup isVertical>{state}</LabelGroup>, sortKey: containerState },
        ];

        if (!container.isDownloading) {
            columns.push({
                title: <ContainerActions container={container}
                                         healthcheck={healthcheck}
                                         onAddNotification={this.props.onAddNotification}
                                         localImages={localImages}
                                         updateContainer={this.props.updateContainer} />,
                props: { className: "pf-v5-c-table__action" }
            });
        }

        const tty = !!container.Config?.Tty;

        const tabs = [];
        if (container.State) {
            tabs.push({
                name: _("Details"),
                renderer: ContainerDetails,
                data: { container }
            });

            if (!container.isDownloading) {
                tabs.push({
                    name: _("Integration"),
                    renderer: ContainerIntegration,
                    data: { container, localImages }
                });
                tabs.push({
                    name: _("Logs"),
                    renderer: ContainerLogs,
                    data: { containerId: container.Id, containerStatus: container.State.Status, width: this.state.width }
                });
                tabs.push({
                    name: _("Console"),
                    renderer: ContainerTerminal,
                    data: { containerId: container.Id, containerStatus: container.State?.Status, width: this.state.width, tty }
                });
            }
        }

        if (healthcheck) {
            tabs.push({
                name: _("Health check"),
                renderer: ContainerHealthLogs,
                data: { container, onAddNotification: this.props.onAddNotification, state: localized_health }
            });
        }

        return {
            expandedContent: <ListingPanel colSpan='4' tabRenderers={tabs} />,
            columns,
            initiallyExpanded: document.location.hash.substr(1) === container.Id,
            props: {
                key: container.Id,
                "data-row-id": container.Id,
                "data-started-at": container.StartedAt,
            },
        };
    }

    onWindowResize() {
        this.setState({ width: this.cardRef.current.clientWidth });
    }

    onOpenPruneUnusedContainersDialog = () => {
        this.setState({ showPruneUnusedContainersModal: true });
    };

    render() {
        const Dialogs = this.context;
        const columnTitles = [
            { title: _("Container"), transforms: [cellWidth(20)], sortable: true },
            { title: _("CPU"), sortable: true },
            { title: _("Memory"), sortable: true },
            { title: _("State"), sortable: true },
            ''
        ];
        let filtered = [];
        const unusedContainers = [];

        let emptyCaption = _("No containers");
        if (this.props.containers === null)
            emptyCaption = _("Loading...");
        else if (this.props.textFilter.length > 0)
            emptyCaption = _("No containers that match the current filter");
        else if (this.props.filter === "running")
            emptyCaption = _("No running containers");

        if (this.props.containers !== null) {
            const textFilter = this.props.textFilter.toLowerCase().trim();

            filtered = Object.keys(this.props.containers).filter(id => {
                const container = this.props.containers[id];

                if (this.props.filter === "running" &&
                    !["running", "restarting"].includes(container.State?.Status)) {
                    return false;
                }

                if (!textFilter)
                    return true;

                const name = (container.Name || "").toLowerCase();
                const image = (container.Config?.Image || container.Image || "").toLowerCase();
                const containerId = (container.Id || "").toLowerCase();
                const cmd = Array.isArray(container.Config?.Cmd)
                    ? container.Config.Cmd.join(" ").toLowerCase()
                    : (container.Config?.Cmd || "").toLowerCase();

                return name.includes(textFilter) ||
                       image.includes(textFilter) ||
                       containerId.includes(textFilter) ||
                       cmd.includes(textFilter);
            });

            const getHealth = id => {
                const state = this.props.containers[id]?.State;
                return state?.Health?.Status || state?.Healthcheck?.Status;
            };

            filtered.sort((a, b) => {
                // Show unhealthy containers first
                const a_health = getHealth(a);
                const b_health = getHealth(b);
                if (a_health !== b_health) {
                    if (a_health === "unhealthy")
                        return -1;
                    if (b_health === "unhealthy")
                        return 1;
                }
                return this.props.containers[a].Name > this.props.containers[b].Name ? 1 : -1;
            });

            const prune_states = ["created", "configured", "stopped", "exited"];
            for (const containerid of Object.keys(this.props.containers)) {
                const container = this.props.containers[containerid];
                // Ignore pods and running containers
                if (!prune_states.includes(container.State))
                    continue;

                unusedContainers.push({
                    id: container.Id,
                    name: container.Name,
                    created: container.Created,
                });
            }
        }

        // Convert to the search result output
        let localImages = null;
        let nonIntermediateImages = null;
        if (this.props.images) {
            localImages = Object.keys(this.props.images).map(id => {
                const img = this.props.images[id];
                img.Index = img.RepoTags?.[0] ? img.RepoTags[0].split('/')[0] : "";
                img.Name = utils.image_name(img);
                img.toString = function imgToString() { return this.Name };
                return img;
            }, []);
            nonIntermediateImages = localImages.filter(img => img.Index !== "");
        }

        const createContainer = (inPod) => {
            if (nonIntermediateImages)
                Dialogs.show(
                    <utils.DockerInfoContext.Consumer>
                        {(dockerInfo) => (
                            <DialogsContext.Consumer>
                                {(Dialogs) => (
                                    <ImageRunModal user={this.props.user}
                                                              localImages={nonIntermediateImages}
                                                              serviceAvailable={this.props.serviceAvailable}
                                                              onAddNotification={this.props.onAddNotification}
                                                              dockerInfo={dockerInfo}
                                                              dialogs={Dialogs} />
                                )}
                            </DialogsContext.Consumer>
                        )}
                    </utils.DockerInfoContext.Consumer>);
        };

        const filterRunning = (
            <Toolbar>
                <ToolbarContent className="containers-containers-toolbarcontent">
                    <ToolbarItem variant="label" htmlFor="containers-containers-filter">
                        {_("Show")}
                    </ToolbarItem>
                    <ToolbarItem>
                        <FormSelect id="containers-containers-filter" value={this.props.filter} onChange={(_, value) => this.props.handleFilterChange(value)}>
                            <FormSelectOption value='all' label={_("All")} />
                            <FormSelectOption value='running' label={_("Only running")} />
                        </FormSelect>
                    </ToolbarItem>
                    <Divider orientation={{ default: "vertical" }} />
                    <ToolbarItem>
                        <Button variant="primary" key="get-new-image-action"
                                id="containers-containers-create-container-btn"
                                isDisabled={nonIntermediateImages === null}
                                onClick={() => createContainer(null)}>
                            {_("Create container")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <ContainerOverActions unusedContainers={unusedContainers} handlePruneUnusedContainers={this.onOpenPruneUnusedContainersDialog} />
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
        );

        const sortRows = (rows, direction, idx) => {
            // CPU / Memory /States
            const isNumeric = idx == 1 || idx == 2 || idx == 3;
            const stateOrderMapping = {};
            utils.states.forEach((elem, index) => {
                stateOrderMapping[elem] = index;
            });
            const sortedRows = rows.sort((a, b) => {
                let aitem = a.columns[idx].sortKey ?? a.columns[idx].title;
                let bitem = b.columns[idx].sortKey ?? b.columns[idx].title;
                // Sort the states based on the order defined in utils. so Running first.
                if (idx === 3) {
                    aitem = stateOrderMapping[aitem];
                    bitem = stateOrderMapping[bitem];
                }
                if (isNumeric) {
                    return bitem - aitem;
                } else {
                    return aitem.localeCompare(bitem);
                }
            });
            return direction === SortByDirection.asc ? sortedRows : sortedRows.reverse();
        };

        const card = (
            <Card id="containers-containers" className="containers-containers" isClickable isSelectable>
                <CardHeader actions={{ actions: filterRunning }}>
                    <CardTitle><Text component={TextVariants.h2}>{_("Containers")}</Text></CardTitle>
                </CardHeader>
                <CardBody>
                    <Flex direction={{ default: 'column' }}>
                        {(this.props.containers === null)
                            ? <ListingTable variant='compact'
                                            aria-label={_("Containers")}
                                            emptyCaption={emptyCaption}
                                            columns={columnTitles}
                                            sortMethod={sortRows}
                                            rows={[]}
                                            sortBy={{ index: 0, direction: SortByDirection.asc }} />
                            : <Card key="table-containers"
                                             id="table-containers"
                                             isPlain
                                             // isFlat={section != "no-pod"}
                                             className="container-pod"
                                             isClickable
                                             isSelectable>
                                {/* {caption && <CardHeader actions={{ actions, className: "panel-actions" }}> */}
                                {/*    <CardTitle> */}
                                {/*        <Flex justifyContent={{ default: 'justifyContentFlexStart' }}> */}
                                {/*            <h3 className='pod-name'>{caption}</h3> */}
                                {/*            <span>{_("pod group")}</span> */}
                                {/*        </Flex> */}
                                {/*    </CardTitle> */}
                                {/* </CardHeader>} */}
                                <ListingTable variant='compact'
                                                          emptyCaption={emptyCaption}
                                                          columns={columnTitles}
                                                          sortMethod={sortRows}
                                                          rows={filtered.map(container => {
                                                              return this.renderRow(this.props.containersStats, this.props.containers[container],
                                                                                    localImages);
                                                          })}
                                                          aria-label={_("Containers")} />
                            </Card>
                        }
                    </Flex>
                    {this.state.showPruneUnusedContainersModal &&
                    <PruneUnusedContainersModal
                      close={() => this.setState({ showPruneUnusedContainersModal: false })}
                      unusedContainers={unusedContainers}
                      onAddNotification={this.props.onAddNotification}
                      serviceAvailable={this.props.serviceAvailable}
                      user={this.props.user} /> }
                </CardBody>
            </Card>
        );

        return <div ref={this.cardRef}>{card}</div>;
    }
}

export default Containers;
