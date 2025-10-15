import React, { Fragment, useMemo } from "react";
import PropTypes from "prop-types";
import TextPane from "./Edition/TextPane";
import Typography from "@material-ui/core/Typography";
import { Grid } from "@material-ui/core";
import Header from "./Header";
import Button from "@material-ui/core/Button";
import { Link } from "react-router-dom";

const HomePage = ({ sections, onSearch, selectedTimestamp }) => {
    const firstSectionId = useMemo(() => (sections?.length && sections[0].sectionId), [sections]);

    return (
        <Fragment>
            <Header onSearch={onSearch} />
            <div id="home-page">
                <div id="introduction">
                    <div style={{ height: "16px" }} />
                    <Typography variant="h6">
                        The <i>Chronicle</i> (Ժամանակագրութիւն) of Mattʿēos
                        Uṙhayecʿi, known to most Western historians as Matthew
                        of Edessa, was completed sometime before 1137 and covers
                        events between the Armenian years 401 and 577 (April
                        952–February 1129). Matthew was a monk, an elder (erecʿ)
                        in a monastery in Edessa, born perhaps in the third
                        quarter of the eleventh century. His work was continued
                        by Grigor, a priest living in the nearby town of Kesun,
                        who provides information about events in the Armenian
                        years 585–611 (February 1136–February 1163) as well. The
                        Chronicle of Uṙhayecʿi is traditionally divided into
                        three books covering respectively the Armenian years
                        401-500, 500–550, and 550–577, plus the continuation of
                        Grigor.
                    </Typography>
                    <div style={{ height: "16px" }} />
                    <Typography variant="h6">
                        More information about the edition can be found in the
                        menu bar above; alternatively, you can begin reading the
                        text below.
                    </Typography>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        margin: "24px 0px",
                    }}
                >
                    <img
                        alt="line graphic"
                        src="images/edessa_line.png"
                        style={{ width: "70%" }}
                    />
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Grid container spacing={4}>
                        <Grid item md={6} xs={12}>
                            <TextPane
                                onSelectLocation={() => {}}
                                onSelectNode={() => {}}
                                onSelectPerson={() => {}}
                                onSelectSentence={() => {}}
                                reading="Lemma Text"
                                sectionId={firstSectionId}
                                sections={sections}
                                selectedTimestamp={selectedTimestamp}
                            />
                        </Grid>

                        <Grid item md={6} xs={12}>
                            <TextPane
                                onSelectLocation={() => {}}
                                onSelectNode={() => {}}
                                onSelectPerson={() => {}}
                                onSelectSentence={() => {}}
                                reading="Translation"
                                sectionId={firstSectionId}
                                sections={sections}
                                selectedTimestamp={selectedTimestamp}
                            />
                        </Grid>
                        <Grid
                            item
                            style={{
                                textAlign: "center",
                                marginBottom: "48px",
                            }}
                            xs={12}
                        >
                            <Button
                                color="secondary"
                                component={Link}
                                size="large"
                                to={`/Edition/${firstSectionId}`}
                            >
                                <Typography variant="h5">
                                    {"Read on..."}
                                </Typography>
                            </Button>
                        </Grid>
                    </Grid>
                </div>
            </div>
        </Fragment>
    );
};

HomePage.propTypes = {
    onSearch: PropTypes.func,
    sections: PropTypes.array,
    selectedTimestamp: PropTypes.string,
};

export default HomePage;
