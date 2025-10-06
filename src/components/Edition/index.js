import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Grid } from "@material-ui/core";
import withWidth from "@material-ui/core/withWidth"; // used by grid
import SectionList from "./SectionList";
import ViewOptions from "./ViewOptions";
import TextPane from "./TextPane";
import SvgGraph from "./SvgGraph";
import RankDisonance from "./RankDisonance";
import { useParams } from "react-router-dom";
import * as DataApi from "../../utils/Api";
import EditionHeader from "./EditionHeader";
import Hidden from "@material-ui/core/Hidden";
import Paper from "@material-ui/core/Paper";
import { withRouter } from "react-router-dom";
import PreviousNext from "./PreviousNext";
import Citation from "./Citation";

const Edition = (props) => {
    const {
        sections,
        viewport,
        witnesses,
        onSearch,
        searchTerm,
        manuscripts,
        selectedTimestamp,
        onTimestampSelect,
        timestampsList,
    } = props;

    let { sectionID } = useParams();
    let { witnessID } = useParams();

    const sectionIndex = useMemo(() =>
        sections && sections.find((s) => (s.sectionId === sectionID))
            ? sections.find((s) => (s.sectionId === sectionID)).index
            : null,
        [sectionID]
    );

    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedSentence, setSelectedSentence] = useState({});
    const [selectedRank, setSelectedRank] = useState();
    const [personList, setPersonList] = useState([]);
    const [placeList, setPlaceList] = useState([]);
    const [dateList, setDateList] = useState([]);
    const [commentList, setCommentList] = useState([]);
    const [nodeHash, setNodeHash] = useState();
    const [nodeArray, setNodeArray] = useState([]);
    const [graphVisible, setGraphVisible] = useState(false);
    const [personsVisible, setPersonsVisible] = useState(false);
    const [placesVisible, setPlacesVisible] = useState(false);
    const [datesVisible, setDatesVisible] = useState(false);
    const [leftReading, setLeftReading] = useState(
        witnessID
            ? witnessID === "Lemma text"
                ? "Lemma Text"
                : witnessID
            : "Lemma Text"
    );
    const [rightReading, setRightReading] = useState("Translation");
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        //update the section ID if necessary if the timestamp is changed
        if (sections && !sections.find((s) => (s.sectionId === sectionID))) {
            //in this case we'll default to navigating to the section in the new list 
            // that shares the index of the current section in the old list
            const newSectionID = sections?.length ? (sections.find((s) => (s.index === sectionIndex))?.sectionId || sections[0].sectionId) : null;
            newSectionID && props.history.push(`/Edition/${newSectionID}`);
        }
    }, [sections]);

    useEffect(() => {
        setSelectedSentence(null);
        setSelectedNode(null);
        setSelectedRank(null);
    }, [sectionID]);

    useEffect(() => {
        if ((graphVisible) => graphVisible === false) {
            setSelectedNode(null);
            setSelectedRank(null);
        }
    }, [graphVisible]);

    useEffect(() => {
        if (selectedTimestamp) {
            let hash = {};
            const list = [];
            setNodeHash(hash);
            DataApi.getNodeLookup(
                sectionID,
                (nodelist) => {
                    nodelist.sort((a, b) => {
                        if (parseInt(a.rank) > parseInt(b.rank)) return 1;
                        if (parseInt(a.rank) < parseInt(b.rank)) return -1;
                        else return 0;
                    });
                    nodelist.forEach((node) => {
                        const value = {
                            id: node.id,
                            rank: node.rank,
                            witnesses: node.witnesses,
                        };
                        hash[node.id] = value;
                        list.push(value);
                    });
                    setNodeHash(hash);
                    setNodeArray(list);
                },
                selectedTimestamp
            );
        }
    }, [sectionID, selectedTimestamp]);

    useEffect(() => {
        if (personsVisible && selectedTimestamp)
            DataApi.getPersons(
                sectionID,
                (list) => {
                    setPersonList(list);
                },
                selectedTimestamp
            );
        else setPersonList([]);
    }, [personsVisible, sectionID, selectedTimestamp]);

    useEffect(() => {
        if (placesVisible && selectedTimestamp)
            DataApi.getPlaces(
                sectionID,
                (list) => {
                    setPlaceList(list);
                },
                selectedTimestamp
            );
        else setPlaceList([]);
    }, [placesVisible, sectionID, selectedTimestamp]);

    useEffect(() => {
        if (selectedTimestamp) {
            DataApi.getComments(
                sectionID,
                (list) => {
                    setCommentList(list);
                },
                selectedTimestamp
            );
        }
    }, [sectionID, selectedTimestamp]);

    useEffect(() => {
        if (datesVisible && selectedTimestamp)
            DataApi.getDates(
                sectionID,
                (list) => {
                    setDateList(list);
                },
                selectedTimestamp
            );
        else setDateList([]);
    }, [datesVisible, sectionID, selectedTimestamp]);

    useEffect(() => {
        if (!props.searchTerm) return;
    }, [props.searchTerm]);

    let textContainerStyle = {
        overflowY: "auto",
        height: graphVisible
            ? `${viewport.height * 0.3 - 84}px`
            : `${viewport.height - 254}px`,
    };

    return (
        <Grid container spacing={0}>
            <Grid
                id="edition-header"
                item
                xs={12}
                style={{ backgrounColor: "red", height: "114px" }}
            >
                <EditionHeader onSearch={onSearch} />
            </Grid>

            <Hidden smDown>
                <Grid item id="sideBar" md={2}>
                    <div
                        style={{
                            marginTop: "12px",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            minWidth: "160px",
                        }}
                    >
                        <ViewOptions
                            viewport={viewport}
                            witnesses={witnesses}
                            manuscripts={manuscripts}
                            graphVisible={graphVisible}
                            onToggleGraph={handleToggleGraph}
                            personsVisible={personsVisible}
                            onTogglePersons={handleTogglePersons}
                            placesVisible={placesVisible}
                            onTogglePlaces={handleTogglePlaces}
                            datesVisible={datesVisible}
                            onToggleDates={handleToggleDates}
                            leftReading={leftReading}
                            rightReading={rightReading}
                            selectedTimestamp={selectedTimestamp}
                            onTimestampSelect={onTimestampSelect}
                            timestampsList={timestampsList}
                            onSelectLeftReading={setLeftReading}
                            onSelectRightReading={setRightReading}
                            isExpanded={isExpanded}
                            setIsExpanded={setIsExpanded}
                        />

                        <SectionList
                            height={
                                isExpanded
                                    ? ` ${
                                          viewport.height - 590 > 0
                                              ? viewport.height - 590
                                              : 0
                                      }px`
                                    : ` ${viewport.height - 228}px`
                            }
                            sectionId={sectionID}
                            witnessId={witnessID}
                            list={sections}
                        />
                    </div>
                </Grid>
            </Hidden>

            <Grid id="mainContent" item xs={12} md={10}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {sectionID && graphVisible && (
                        <div>
                            <div>
                                <Paper
                                    style={{
                                        margin: "12px",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        height: `${viewport.height * 0.3}px`,
                                    }}
                                >
                                    <SvgGraph
                                        viewport={viewport}
                                        sectionId={sectionID}
                                        highlightedNode={selectedNode}
                                        selectedSentence={selectedSentence}
                                        selectedRank={selectedRank}
                                        nodeHash={nodeHash}
                                        nodeList={nodeArray}
                                        persons={personList}
                                        places={placeList}
                                        dates={dateList}
                                        onSelectNode={handleSelectNode}
                                        onSelectSentence={handleSelectSentence}
                                        selectedTimestamp={selectedTimestamp}
                                    />
                                </Paper>
                            </div>
                            <div>
                                <Paper
                                    style={{
                                        margin: "12px",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    <RankDisonance
                                        viewport={viewport}
                                        sectionId={sectionID}
                                        highlightedNode={selectedNode}
                                        selectedSentence={selectedSentence}
                                        selectedRank={selectedRank}
                                        onSelectRank={handleSelectRank}
                                        selectedTimestamp={selectedTimestamp}
                                    />
                                </Paper>
                            </div>
                        </div>
                    )}

                    {sectionID && (
                        <React.Fragment>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    height: "84px",
                                    marginTop: "20px",
                                }}
                            >
                                <PreviousNext
                                    onPrevious={previousSection}
                                    onNext={nextSection}
                                    sections={sections}
                                    sectionId={sectionID}
                                />
                            </div>
                            <div style={textContainerStyle}>
                                <Grid container spacing={0}>
                                    <Grid item xs={12} md={6}>
                                        <TextPane
                                            nodeHash={nodeHash}
                                            manuscripts={manuscripts}
                                            searchTerm={searchTerm}
                                            sections={sections}
                                            sectionId={sectionID}
                                            persons={personList}
                                            places={placeList}
                                            comments={commentList}
                                            dates={dateList}
                                            reading={leftReading}
                                            graphVisible={graphVisible}
                                            selectedNode={selectedNode}
                                            selectedRank={selectedRank}
                                            selectedSentence={selectedSentence}
                                            selectedTimestamp={
                                                selectedTimestamp
                                            }
                                            onSelectNode={handleSelectNode}
                                            onSelectSentence={
                                                handleSelectSentence
                                            }
                                            onSelectLocation={
                                                handleSelectLocation
                                            }
                                            onSelectPerson={handleSelectPerson}
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <TextPane
                                            nodeHash={nodeHash}
                                            manuscripts={manuscripts}
                                            searchTerm={searchTerm}
                                            sections={sections}
                                            sectionId={sectionID}
                                            persons={personList}
                                            places={placeList}
                                            dates={dateList}
                                            reading={rightReading}
                                            selectedNode={selectedNode}
                                            selectedRank={selectedRank}
                                            selectedSentence={selectedSentence}
                                            selectedTimestamp={
                                                selectedTimestamp
                                            }
                                            onSelectNode={handleSelectNode}
                                            onSelectSentence={
                                                handleSelectSentence
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </div>
                        </React.Fragment>
                    )}

                    <Citation selectedTimestamp={selectedTimestamp} />
                </div>
            </Grid>
        </Grid>
    );

    function handleSelectNode(node) {
        if (selectedNode)
            if (node.nodeId === selectedNode.nodeId) {
                setSelectedNode(null);
                setSelectedRank(null);
                return;
            }
        setSelectedRank(parseInt(node.rank));
        setSelectedNode(node);
    }

    function handleSelectSentence(start, end) {
        const startRank = parseInt(start.split("-")[0]);
        const startNodeId = start.split("-")[1];
        const endRank = parseInt(end.split("-")[0]);
        const endNodeId = end.split("-")[1];

        if (selectedSentence) {
            if (selectedSentence.startId === startNodeId) {
                setSelectedSentence(null);
                return;
            }
        }

        setSelectedSentence({
            startRank: startRank,
            startId: startNodeId,
            endRank: endRank,
            endId: endNodeId,
        });
    }

    function handleSelectLocation(node) {
        props.history.push(`/Exploration/Map/${node.place.annotationId}`);
    }

    function handleSelectPerson(node) {
        props.history.push(`/Exploration/Persons/${node.person.annotationId}`);
    }

    function handleToggleGraph() {
        let toggled = !graphVisible;
        setGraphVisible(toggled);
    }
    function handleTogglePersons() {
        let toggled = !personsVisible;
        setPersonsVisible(toggled);
    }
    function handleTogglePlaces() {
        let toggled = !placesVisible;
        setPlacesVisible(toggled);
    }
    function handleToggleDates() {
        let toggled = !datesVisible;
        setDatesVisible(toggled);
    }

    function handleSelectRank(rank) {
        if (selectedRank && selectedRank === rank) {
            setSelectedRank(null);
            setSelectedNode(null);
            return;
        }
        setSelectedNode(null);
        setSelectedRank(parseInt(rank));
    }

    function nextSection() {
        let index = sections.findIndex((s) => {
            return s.sectionId === sectionID;
        });
        if (index !== sections.length - 1) index++;
        const next = sections[index];
        props.history.push(`/Edition/${next.sectionId}`);
    }

    function previousSection() {
        let index = sections.findIndex((s) => {
            return s.sectionId === sectionID;
        });
        if (index !== 0) index--;
        const previous = sections[index];
        props.history.push(`/Edition/${previous.sectionId}`);
    }
};

Edition.propTypes = {
    history: PropTypes.shape({
        push: PropTypes.func.isRequired,
    }).isRequired,
    manuscripts: PropTypes.array,
    onSearch: PropTypes.func,
    onTimestampSelect: PropTypes.func,
    searchTerm: PropTypes.string,
    sections: PropTypes.array,
    selectedTimestamp: PropTypes.string,
    timestampsList: PropTypes.array,
    viewport: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
    }),
    witnesses: PropTypes.array,
};

export default withWidth()(withRouter(Edition));
