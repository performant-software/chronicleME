const fs = require("fs");
const axios = require("axios");
const moment = require("moment");
const lunr = require("lunr");
const timestamp = process.argv[2];
//https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await
// inspired by fast async await example - everything in parallel when possible -
// do add error handling please

async function generateStore(timestamp) {
    const startTime = moment();
    console.log("started", startTime.format("hh:mm:ss"));
    const config = loadConfig();
    const baseURL = `${config.options.repository}/${config.options.tradition_id}`;
    const auth = config.auth;
    const outdir = `public/data/data_${timestamp}`;
    const lunrIndex = [];
    const locationLookup = [];
    const personLookup = [];

    await fetchData(baseURL, auth).catch((e) => console.log(e));
    const endTime = moment();
    console.log("Done!", endTime.format("hh:mm:ss"));

    function loadConfig() {
        const configJSON = fs.readFileSync(
            `script/lemma-html-config.json`,
            "utf8"
        );
        return JSON.parse(configJSON);
    }

    async function fetchData(baseURL, auth) {
        try {
            // sections and witnesses
            let lists = await Promise.all([getSections(), getWitnesses()]);
            writeWitnessList(lists[1]);
            await getSectionStore(lists[0], lists[1]);
            // persons list
            const persons = await getAllPersons();
            writeFile(`${outdir}/persons.json`, JSON.stringify(persons.data));
        } catch (e) {
            console.log(e);
        }
    }

    async function getSections() {
        const response = await axios
            .get(`${baseURL}/sections`, { auth })
            .catch((e) => console.log(e));
        return response.data;
    }

    async function getWitnesses() {
        const response = await axios
            .get(`${baseURL}/witnesses`, { auth })
            .catch((e) => console.log(e));
        return response.data;
    }

    async function getSectionStore(sections, witnesses) {
        const validSections = [];
        await Promise.all(
            sections.map(async (section, index) => {
                console.log("fetching manuscripts with section", section.id);
                try {
                    // keep track of index to ensure order is as returned from endpoint
                    let sectionData = await getSectionData(
                        section.id,
                        index,
                        witnesses,
                        validSections
                    );
                    return Promise.resolve(sectionData);
                } catch (err) {
                    return Promise.reject(err);
                }
            })
        );
        // fyi - sectionIds have nothing to do with it, they are not sequential
        // should not be chronological; should sort by index as returned from endpoint
        validSections.sort((a, b) => parseInt(a.index) - parseInt(b.index));
        writeSectionFile(validSections);
        writeLunrIndex();
        writeFile(
            `${outdir}/locationLookup.json`,
            JSON.stringify(locationLookup)
        );
        writeFile(`${outdir}/personLookup.json`, JSON.stringify(personLookup));
    }

    async function getSectionData(sectionId, index, witnesses, validSections) {
        await getLemmaText(sectionId).catch((e) => console.log(e));

        let allReadings = new Promise((resolve) => {
            getReadings(sectionId).then((readings) => {
                writeReadingLookup(readings, sectionId);
                writeLemmaFile(readings, sectionId);
                writeWitnessFiles(readings, witnesses, sectionId);
                getTranslation(sectionId).then((translation) => {
                    writeTranslationFile(translation, sectionId, readings);
                    resolve();
                });
            });
        });

        let titleArray = new Promise((resolve) => {
            getTitle(sectionId).then((titles) => {
                if (titles.length === 0)
                    console.log("no title for section: ", sectionId);
                else {
                    const englishTitle =
                        titles[0].properties.language === "en"
                            ? titles[0].properties.text
                            : titles[1].properties.text;
                    const armenianTitle =
                        titles[1].properties.language === "hy"
                            ? titles[1].properties.text
                            : titles[0].properties.text;
                    const milestone = armenianTitle.substr(0, 3);
                    console.log("milestone", milestone);
                    let validSection = {
                        sectionId: sectionId,
                        englishTitle: englishTitle,
                        armenianTitle: armenianTitle,
                        milestone: milestone,
                        index,
                    };
                    validSections.push(validSection);
                }
                resolve();
            });
        });

        let personArray = new Promise((resolve) => {
            getPersons(sectionId).then((persons) => {
                if (persons) writeAnnotationList(persons, sectionId, "persons");
                let sectionPersons = annotationLookup(sectionId, persons);
                personLookup.push(...sectionPersons);
                resolve();
            });
        });

        let commentArray = new Promise((resolve) => {
            getComments(sectionId).then((comments) => {
                if (comments)
                    writeAnnotationList(comments, sectionId, "comments");
                resolve();
            });
        });

        let placeArray = new Promise((resolve) => {
            getPlaces(sectionId).then((places) => {
                if (places) writeAnnotationList(places, sectionId, "places");
                let sectionPlaces = annotationLookup(sectionId, places);
                locationLookup.push(...sectionPlaces);
                resolve();
            });
        });

        let dateArray = new Promise((resolve) => {
            getDates(sectionId).then((dates) => {
                if (dates) writeAnnotationList(dates, sectionId, "dates");
                resolve();
            });
        });
        return await Promise.all([
            allReadings,
            titleArray,
            personArray,
            commentArray,
            placeArray,
        ]).catch((e) => console.log(e));
    }

    async function getLemmaText(sectionId) {
        const url = `${baseURL}/section/${sectionId}/lemmatext`;
        const response = await axios
            .get(url, { auth, params: { final: "true" } })
            .catch((e) => console.log(e));
        return response.data.filter((i) => (i.final));
    }

    async function getReadings(sectionId) {
        const sectionURL = `${baseURL}/section/${sectionId}`;
        const response = await axios
            .get(`${sectionURL}/readings`, { auth })
            .catch((e) => console.log(e));
        return response.data;
    }

    async function getAllReadings() {
        const allreadingsURL = `${baseURL}/readings`;
        const response = await axios
            .get(allreadingsURL, { auth })
            .catch((e) => console.log(e));
        return response.data;
    }

    async function getTranslation(sectionId) {
        const sectionURL = `${baseURL}/section/${sectionId}`;
        const response = await axios
            .get(`${sectionURL}/annotations`, {
                auth,
                params: { label: "TRANSLATION" },
            })
            .catch((e) => console.log(e));
        return response.data.filter((i) => (i.label === "TRANSLATION"));
    }

    async function getTitle(sectionId) {
        const sectionURL = `${baseURL}/section/${sectionId}`;
        const response = await axios
            .get(`${sectionURL}/annotations`, {
                auth,
                params: { label: "TITLE" },
            })
            .catch((e) => console.log(e));
        return response.data.filter((i) => (i.label === "TITLE"));
    }

    async function getPersons(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        try {
            const response = await axios
                .get(`${annotationURL}`, {
                    auth,
                    params: { label: "PERSONREF" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "PERSONREF"));
        } catch (error) {
            console.log(`no person refs for section ${sectionId} `);
            return null;
        }
    }

    async function getAllPersons() {
        // get all person annotations across the entire tradition
        try {
            const response = await axios
                .get(`${baseURL}/annotations?label=PERSON`, { auth })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "PERSON"));
        } catch (error) {
            console.log(error.message);
        }
    }

    async function getComments(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        try {
            const response = await axios
                .get(`${annotationURL}`, { auth, params: { label: "COMMENT" } })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "COMMENT"));
        } catch (error) {
            console.log(`no comments for section ${sectionId} `);
            return null;
        }
    }

    async function getPlaces(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        try {
            const response = await axios
                .get(`${annotationURL}`, {
                    auth,
                    params: { label: "PLACEREF" },
                })
                .catch((e) => console.log(e));
            return response.data.filter((i) => (i.label === "PLACEREF"));
        } catch (error) {
            console.log(`no place refs for section ${sectionId} `);
            return null;
        }
    }

    async function getDates(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        const response = await axios
            .get(`${annotationURL}`, { auth, params: { label: "DATEREF" } })
            .catch((e) => console.log(e));
        return response.data.filter((i) => (i.label === "DATEREF"));
    }

    function readingToHTML(reading) {
        if (reading.length === 0) return;
        let textElements = [];
        for (let i = 0; i < reading.length; i++) {
            let entry = reading[i];
            const text = entry.normal_form ? entry.normal_form : entry.text;
            if (i > 0 && !reading[i - 1].join_next && !entry.join_prior) {
                textElements.push(" ");
            }
            textElements.push(
                `<span id='${entry.id}' key=${entry.rank}>${text}</span>`
            );
        }
        return `${textElements.join("")}`;
    }

    function translationToHTML(translation, sectionId, reading) {
        if (translation.length === 0) return null;
        let textElements = [];
        let lunrText = [];
        const translationFragments = [];
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
            const startNode = reading.find(
                (r) => r.id === beginTextNode.toString()
            );
            const endNode = reading.find(
                (r) => r.id === endTextNode.toString()
            ); // could also check for join_previous and next here
            const translationFragment = {
                text: text,
                start: beginTextNode,
                startRank: startNode ? startNode.rank : "",
                end: endTextNode,
                endRank: endNode ? endNode.rank : "",
            };
            translationFragments.push(translationFragment);
        }
        translationFragments.sort((a, b) => {
            return a.startRank - b.startRank;
        });

        translationFragments.forEach((f) => {
            lunrText.push(f.text);
            const textElement = `<span id='${f.startRank}-${f.start}' key='${f.endRank}-${f.end}'>${f.text}</span>`;
            textElements.push(textElement);
        });
        const textJoined = `${lunrText.join(" ")}`;
        appendLunrIndex(textJoined, sectionId);
        return `${textElements.join(" ")}`;
    }

    function writeLemmaFile(readings, sectionId) {
        const sectiondir = `${outdir}/${sectionId}`;
        const lemmaFilePath = `${sectiondir}/lemma.html`;
        let rawLemma = parseWitnessReading("Lemma text", readings);
        let htmlLemma = readingToHTML(rawLemma.readings);
        makeDirectory(sectiondir);
        writeFile(lemmaFilePath, htmlLemma);
    }

    function writeWitnessFiles(readings, witnesses, sectionId) {
        const sectiondir = `${outdir}/${sectionId}`;
        witnesses.forEach((witness) => {
            const witnessFilePath = `${sectiondir}/${witness.sigil}.html`;
            let witnessData = parseWitnessReading(witness.sigil, readings);
            let htmlWitness = readingToHTML(witnessData.readings);
            if (htmlWitness) {
                makeDirectory(sectiondir);
                writeFile(witnessFilePath, htmlWitness);
            }
        });
    }

    function writeReadingLookup(readings, sectionId) {
        const id_rank = [];
        readings.forEach((node) => {
            id_rank.push({
                id: node.id,
                rank: node.rank,
                witnesses: node.witnesses.length,
            });
        });
        id_rank.sort((a, b) => {
            if (a.rank > b.rank) return 1;
            if (a.rank < b.rank) return -1;
            else return 0;
        });

        const sectiondir = `${outdir}/${sectionId}`;
        makeDirectory(sectiondir);
        const readingFilePath = `${sectiondir}/readings.json`;
        fs.writeFileSync(readingFilePath, JSON.stringify(id_rank));

        writeReadingReport(id_rank, sectionId);
    }

    // aggregates rank count for this section
    // how many different nodes were associated with a rank = ordinal position in the text
    function writeReadingReport(nodeHash, sectionId) {
        const highestRank = nodeHash.reduce((a, c) => {
            return c.rank > a.rank ? c : a;
        });

        const rankHash = [];
        for (let i = 0; i < highestRank.rank; i++) {
            const nodesAtRank = nodeHash.filter((node) => node.rank === i);
            rankHash.push({ rank: i, instances: nodesAtRank.length });
        }
        const sectiondir = `${outdir}/${sectionId}`;
        makeDirectory(sectiondir);
        const rankFilePath = `${sectiondir}/ranks.json`;
        fs.writeFileSync(rankFilePath, JSON.stringify(rankHash));
    }

    function parseWitnessReading(sigil, readings) {
        const filterCondition =
            sigil === "Lemma text"
                ? (r) => r.is_lemma && !r.is_start && !r.is_end
                : (r) =>
                    r.witnesses.includes(sigil) && !r.is_start && !r.is_end;
        const witReadings = readings.filter(filterCondition);
        witReadings.sort((first, second) => {
            return first.rank - second.rank;
        });
        return {
            sigil: sigil,
            readings: witReadings,
        };
    }

    function writeTranslationFile(translation, sectionId, readings) {
        if (!translation.length > 0) {
            console.log("no translation for section", sectionId);
        }
        const sectiondir = `${outdir}/${sectionId}`;
        const translationFilePath = `${sectiondir}/en.html`;
        const translationHTML = translationToHTML(
            translation,
            sectionId,
            readings
        );
        makeDirectory(sectiondir);
        writeFile(translationFilePath, translationHTML);
    }

    function writeSectionFile(validSections) {
        const sectFile = `${outdir}/sections.json`;
        fs.writeFileSync(sectFile, JSON.stringify(validSections));
    }

    function writeWitnessList(witnesses) {
        witnesses.splice(0, 0, { id: "lemma", sigil: "Lemma Text" });
        witnesses.splice(1, 0, { id: "en", sigil: "Translation" });
        const datadir = `${outdir}`;
        makeDirectory(datadir);
        const sectFile = `${outdir}/witnesses.json`;
        fs.writeFileSync(sectFile, JSON.stringify(witnesses));
    }

    function writeAnnotationList(annotations, sectionId, fileName) {
        const refs = [];
        annotations.forEach((anno) => {
            const beginNodeId = anno.links.find(
                (l) => l.type == "BEGIN"
            ).target;
            const endNodeId = anno.links.find((l) => l.type == "END").target;
            let ref = {
                annotationId: anno.id,
                begin: beginNodeId,
                end: endNodeId,
            };
            if (anno.properties && anno.properties.text) {
                ref["text"] = anno.properties.text;
            }
            refs.push(ref);
        });
        const sectiondir = `${outdir}/${sectionId}`;
        makeDirectory(sectiondir);
        const sectFile = `${sectiondir}/${fileName}.json`;
        fs.writeFileSync(sectFile, JSON.stringify(refs));
    }

    function annotationLookup(sectionId, annotations) {
        return annotations.map((annotation) => ({
            annotationRefId: annotation.id,
            sectionId: sectionId,
        }));
    }

    async function makeDirectory(sectiondir) {
        if (!fs.existsSync("public"))
            fs.mkdirSync("public", { recursive: true });
        if (!fs.existsSync("public/data"))
            fs.mkdirSync("public/data", { recursive: true });
        if (!fs.existsSync(sectiondir))
            fs.mkdirSync(sectiondir, { recursive: true });
    }

    function writeFile(fileName, contents) {
        if (contents) {
            fs.writeFileSync(fileName, contents);
        } else {
            console.log(`Did not write file ${fileName}; missing contents`);
        }
    }

    function appendLunrIndex(translation, sectionId) {
        lunrIndex.push({ sectionId: sectionId, title: "", text: translation });
    }

    function writeLunrIndex() {
        var idx = lunr(function () {
            this.ref("sectionId");
            this.field("title");
            this.field("text");

            lunrIndex.forEach(function (doc) {
                this.add(doc);
            }, this);
        });
        const lunrFile = `${outdir}/lunrIndex.json`;
        fs.writeFileSync(lunrFile, JSON.stringify(idx));
        console.log("lunr index file written");
    }
}

generateStore(timestamp);
