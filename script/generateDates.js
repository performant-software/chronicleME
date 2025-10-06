const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const timestamp = process.argv[2];

async function generateDates(timestamp) {
    console.log("start read and generate date info", moment().format("mm ss"));
    const config = loadConfig();
    const auth = config.auth;
    const baseURL = `${config.options.repository}/${config.options.tradition_id}`;
    const outdir = `public/data/data_${timestamp}`;
    let wordHash = {};
    let dateList = [];

    await fetchReadings().catch((e) => console.log(e));

    await fetchDateInfo().catch((e) => console.log(e));

    await fetchTranslations().catch((e) => console.log(e));

    writeDateList();

    console.log("end read and generate date info", moment().format("mm ss"));

    // a possible api call to look up the reading, you can pass a begin and end node
    // we will start with getting the translation though -
    //http://www.example.com/tradId/section/sectionId/lemmatext/

    function writeDateList() {
        makeDirectory();
        let filePath = `${outdir}/chronicleDates.json`;
        writeFile(filePath, JSON.stringify(dateList));
    }

    async function fetchReadings() {
        try {
            let allReadings = await axios
                .get(`${baseURL}/readings`, { auth })
                .catch((e) => console.log(e));
            console.log("all readings = individual word nodes fetched");
            allReadings.data.forEach((reading) => {
                if (reading.is_lemma)
                    wordHash[reading.id] = {
                        section: reading.section,
                    };
            });
        } catch (error) {
            console.log(`error fetching all readings ${error} `);
        }
    }

    async function fetchDateInfo() {
        let dates = new Promise((resolve) => {
            fetchDateAnnotations().then((dates) => {
                resolve(dates);
            });
        });

        let daterefs = new Promise((resolve) => {
            fetchDateRefs().then((refs) => {
                resolve(refs);
            });
        });

        let datings = Promise.resolve(fetchDatings()).catch((error) => {
            console.log(error);
        });

        let dateInfo = await Promise.all([dates, daterefs, datings]).catch(
            (e) => console.log(e)
        );

        console.log("dates, daterefs, and datings fetched");

        dateInfo[0].forEach((date) => {
            date.links.forEach((link) => {
                let linkedId = link.target;
                let dateLinkToText;
                let dateRef = dateInfo[1].find((r) => {
                    return parseInt(r.id) === linkedId;
                });

                if (dateRef) {
                    dateLinkToText = dateRef;
                } else {
                    let dating = dateInfo[2].find(
                        (dating) => parseInt(dating.id) === linkedId
                    );
                    if (dating) {
                        dateLinkToText = dating;
                    } else {
                        console.log(
                            "no dateref or dating found for date id ",
                            date.id
                        );
                        return;
                    }
                }

                let beginNode = dateLinkToText.links.find(
                    (link) => link.type === "BEGIN"
                ).target;
                let endNode = dateLinkToText.links.find(
                    (link) => link.type === "END"
                ).target;
                let section;
                if (wordHash[beginNode] && wordHash[beginNode].section) {
                    section = wordHash[beginNode].section;
                } else {
                    return;
                }

                let earliestDate, latestDate, notBefore, notAfter;
                if (date.properties.notBefore) {
                    notBefore = moment(date.properties.notBefore).toISOString();
                }
                if (date.properties.notAfter) {
                    notAfter = moment(date.properties.notAfter).toISOString();
                }
                if (notBefore && notAfter) {
                    earliestDate = notBefore < notAfter ? notBefore : notAfter;
                    latestDate = notBefore > notAfter ? notBefore : notAfter;
                } else {
                    earliestDate = notBefore || null;
                    latestDate = notAfter || null;
                }
                dateList.push({
                    earliestDate: earliestDate ? earliestDate : null,
                    latestDate: latestDate ? latestDate : null,
                    section: section,
                    beginNode: beginNode,
                    endNode: endNode,
                });
            });
        });
    }

    async function fetchDateAnnotations() {
        try {
            const response = await axios
                .get(`${baseURL}/annotations`, {
                    auth,
                    params: { label: "DATE" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "DATE"));
        } catch (error) {
            console.log("error fetching all date annotations", error);
            return null;
        }
    }

    async function fetchDateRefs() {
        try {
            const response = await axios
                .get(`${baseURL}/annotations`, {
                    auth,
                    params: { label: "DATEREF" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "DATEREF"));
        } catch (error) {
            console.log("error fetching all date refs", error);
            return null;
        }
    }

    async function fetchDatings() {
        try {
            const response = await axios
                .get(`${baseURL}/annotations`, {
                    auth,
                    params: { label: "DATING" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "DATING"));
        } catch (error) {
            console.log("error fetching all datings", error);
            return null;
        }
    }

    async function fetchTranslations() {
        let translationPromises = [];

        dateList.forEach((dateItem) => {
            let translationPromise = new Promise((resolve) => {
                let sectionId = dateItem.section;
                fetchTranslation(sectionId).then((translation) => {
                    if (translation.length > 0) {
                        let translationText = parseTranslation(
                            translation,
                            dateItem.beginNode,
                            dateItem.endNode
                        );
                        dateItem.translation = translationText;
                    }
                    resolve();
                });
            });
            translationPromises.push(translationPromise);
        });

        let lookedUp = await Promise.all(translationPromises).catch((e) =>
            console.log(e)
        );
        console.log(" all translations for dates look up");
    }

    async function fetchTranslation(sectionId) {
        try {
            const sectionURL = `${baseURL}/section/${sectionId}`;
            const response = await axios
                .get(`${sectionURL}/annotations`, {
                    auth,
                    params: { label: "TRANSLATION" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "TRANSLATION"));
        } catch (error) {
            console.log("error fetching translation for section", sectionId);
            return null;
        }
    }

    function parseTranslation(translation, dateStart, dateEnd) {
        if (translation.length === 0) return;

        for (const entry of translation) {
            const text = entry.properties.text;
            const beginTextNode =
                entry.links[0].type === "BEGIN"
                    ? entry.links[0].target
                    : entry.links[1].target;
            const endTextNode =
                entry.links[0].type === "END"
                    ? entry.links[0].target
                    : entry.links[1].target;

            if (
                parseInt(dateStart) >= parseInt(beginTextNode) &&
                parseInt(dateEnd) <= parseInt(endTextNode)
            )
                return text;
        }
    }

    // these three should be in a shared util file but ... however thisway
    // scripts are standalone
    function loadConfig() {
        const configJSON = fs.readFileSync(
            `script/lemma-html-config.json`,
            "utf8"
        );
        return JSON.parse(configJSON);
    }

    async function makeDirectory() {
        if (!fs.existsSync("public"))
            fs.mkdirSync("public", { recursive: true });
        if (!fs.existsSync("public/data"))
            fs.mkdirSync("public/data", { recursive: true });
        if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });
    }

    function writeFile(filePath, contents) {
        fs.writeFileSync(filePath, contents);
    }
}

generateDates(timestamp);
