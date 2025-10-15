import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { Grid } from "@material-ui/core";
import { Link } from "react-router-dom";
import Header from "./Header";

const EditionLanding = ({ onSearch, sections }) => {
    const cardStyle = {
        width: "210px",
        height: "210px",
    };

    // the years at which the books are split
    const milestones = [500, 550, 577];

    const book1Id = useMemo(() => (sections?.length && sections[0].sectionId), [sections]);
    const book2Id = useMemo(() => (sections?.length && sections.find((s) => (Number(s.milestone) >= milestones[0]))?.sectionId), [sections]);
    const book3Id = useMemo(() => (sections?.length && sections.find((s) => (Number(s.milestone) >= milestones[1]))?.sectionId), [sections]);
    const continuationId = useMemo(() => (sections && sections.find((s) => (Number(s.milestone) >= milestones[2]))?.sectionId), [sections]);

    return (
        <Grid container>
            <Grid item>
                <Header onSearch={onSearch} />
            </Grid>
            <Grid item xs={12}>
                <Grid container alignItems="center" direction="column">
                    <Grid item xs={12}>
                        <Typography
                            variant="h4"
                            style={{
                                textAlign: "center",
                                margin: "30px 0px 10px 0px",
                            }}
                        >
                            {"Critical Edition"}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Typography
                            variant="body1"
                            style={{
                                textAlign: "justify",
                                padding: "0px 12px",
                                marginTop: "16px",
                                marginBottom: "30px",
                            }}
                        >
                            Եւ վասն այսորիկ ես Մատթէոս Ուռհայեցի եւ վանական
                            զաշխատութեան զգործ իմ ոչինչ համարեցայ, այլ թողի զայս
                            յիշատակ սիրողաց ժամանակագրութեանց, զի յորժամ ի
                            հանդէս քննութեան ելցեն յաղագս ժամանակաց անցելոցն,
                            դիւրաւ կարասցեն գտանել զժամս եւ զժամանակս. եւ
                            զկատարած բարկութեանն ի վերայ ժամանակացն գտանիցեն, եւ
                            այնու զմտաւ ածեալ յիշեսցեն զաստուածասաստ
                            բարկութիւնն՝ զոր վասն մեղացն ընկալաք զհատուցումն
                            յարդար դատաւորէն յԱստուծոյ. / And therefore I,
                            Mattʿēos Uṙhayecʿi, a monk, have reckoned as nothing
                            my work of labour, but I leave this record for those
                            who love chronicles, so that when they enter into an
                            examination of past times, they will easily be able
                            to find the times and the epochs. And they might
                            learn of the fulfilment of wrath over the eras, and
                            having pondered that, they might remember the severe
                            divine wrath which we received from the righteous
                            judge, God, in return for our sins.
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Grid container justify="center" alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        margin: "6px",
                                    }}
                                >
                                    <Card style={cardStyle} variant="outlined">
                                        <CardActions>
                                            <Button
                                                size="large"
                                                component={Link}
                                                to={`/Edition/${book1Id}`}
                                                color="secondary"
                                            >
                                                <Typography variant="body2">
                                                    {"Book 1"}
                                                </Typography>
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </div>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        margin: "6px",
                                    }}
                                >
                                    <Card style={cardStyle} variant="outlined">
                                        <CardActions>
                                            <Button
                                                size="large"
                                                component={Link}
                                                to={`/Edition/${book2Id}`}
                                                color="secondary"
                                            >
                                                <Typography variant="body2">
                                                    {"Book 2"}
                                                </Typography>
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </div>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        margin: "6px",
                                    }}
                                >
                                    <Card style={cardStyle} variant="outlined">
                                        <CardActions>
                                            <Button
                                                size="large"
                                                component={Link}
                                                to={`/Edition/${book3Id}`}
                                                color="secondary"
                                            >
                                                <Typography variant="body2">
                                                    {"Book 3"}
                                                </Typography>
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </div>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        margin: "6px",
                                    }}
                                >
                                    <Card style={cardStyle} variant="outlined">
                                        <CardActions>
                                            <Button
                                                size="large"
                                                component={Link}
                                                to={`/Edition/${continuationId}`}
                                                color="secondary"
                                            >
                                                <Typography variant="body2">
                                                    {"Continuation"}
                                                </Typography>
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </div>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            {/* <Grid item xs={12}>
                        <Paper style={{margin:'12px 16px 24px 16px', height:'140px',padding:'16px'}} >
                              <Typography variant="body1">{"footer..."}</Typography>
                        </Paper>
                  </Grid> */}
        </Grid>
    );
};

EditionLanding.propTypes = {
    onSearch: PropTypes.func,
    sections: PropTypes.array
};

export default EditionLanding;
