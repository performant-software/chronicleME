const fs = require("fs");
const axios = require("axios");
const moment = require("moment");

// Generate TEI version of lemma edition for use with dtsflat
// Adapted from generateAllData.js

async function generateLemmaTei(timestamp) {
    const startTime = moment();
    console.log("started", startTime.format("hh:mm:ss"));
    const config = loadConfig();
    const baseURL = `${config.options.repository}/tradition/${config.options.tradition_id}`;
    const auth = config.auth;
    const outdir = `public/data/dts-xml_${timestamp}`;

    if (!fs.existsSync("public")) fs.mkdirSync("public", { recursive: true });
    if (!fs.existsSync("public/data")) fs.mkdirSync("public/data", { recursive: true });
    if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

    // initialize TEI XML
    let teiDoc = `<?xml version="1.0" encoding="utf-8"?>
<?xml-model href="http://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <teiHeader xml:id="header">
        <fileDesc>
            <titleStmt>
                <title>The Chronicle of Matthew of Edessa Eclectic Edition</title>
            </titleStmt>
            <publicationStmt>
                <p/>
            </publicationStmt>
            <sourceDesc>
                <p/>
            </sourceDesc>
        </fileDesc>
    </teiHeader>
    <text xml:id="lemma">
        <body xml:lang="hy">`;
    teiDoc += await fetchAndProcessData().catch((e) => console.log(e));
    teiDoc += `
        </body>
    </text>
</TEI>`;
    fs.writeFileSync(`${outdir}/lemma.tei.xml`, teiDoc);

    // load config from json file
    function loadConfig() {
        const configJSON = fs.readFileSync(`script/lemma-html-config.json`, "utf8");
        return JSON.parse(configJSON);
    }

    // fetch data and append to teiDoc
    async function fetchAndProcessData() {
        const sections = await getSections().catch((e) => console.log(e));
        const sectionsForTei = await Promise.all(
            sections.map(async (section) => {
                return getSectionData(section.id);
            }),
        );
        return createTei(sectionsForTei);
    }
    async function getSectionData(sectionId) {
        // get readings for section
        const allReadings = await getReadings(sectionId);
        const filteredReadings = allReadings
            .filter((r) => r.is_lemma && !r.is_start && !r.is_end)
            .sort((first, second) => first.rank - second.rank);
        const readings = filteredReadings.map((reading) => {
            return {
                text: reading.normal_form ? reading.normal_form : reading.text,
                id: reading.id,
                rank: reading.rank,
                join_next: reading.join_next,
                join_prior: reading.join_prior,
            };
        });

        // get titles for section
        const titleArray = await getTitle(sectionId);
        let titles = {};
        if (Array.isArray(titleArray) && titleArray.length > 0) {
            const englishTitle = titleArray.find((title) => title.properties.language === "en").properties.text;
            const armenianTitle = titleArray.find((title) => title.properties.language === "hy").properties.text;
            // const milestone = armenianTitle.substr(0, 3);
            titles = {
                englishTitle: englishTitle,
                armenianTitle: armenianTitle,
                // milestone,
            };
        } else {
            console.log("no title for section: ", sectionId);
        }

        // get annotations for section
        const commentArray = await getComments(sectionId);
        const comments = createRefs(commentArray, "comment");
        const personArray = await getPersons(sectionId);
        const persons = createRefs(personArray, "person");
        const placeArray = await getPlaces(sectionId);
        const places = createRefs(placeArray, "place");
        const dateArray = await getDates(sectionId);
        const dates = createRefs(dateArray, "date");

        // create section object
        return {
            id: sectionId,
            titles,
            readings,
            annotations: [...comments, ...persons, ...places, ...dates],
        };
    }

    // helper to strip html tags from text
    function stripTags(original) {
        return original.replace(/(<([^>]+)>)/gi, "");
    }

    async function getSections() {
        const response = await axios.get(`${baseURL}/sections`, { auth }).catch((e) => console.log(e));
        return response.data;
    }
    async function getReadings(sectionId) {
        const sectionURL = `${baseURL}/section/${sectionId}`;
        const response = await axios.get(`${sectionURL}/readings`, { auth }).catch((e) => console.log(e));
        return response.data;
    }

    async function getTitle(sectionId) {
        const sectionURL = `${baseURL}/section/${sectionId}`;
        const response = await axios
            .get(`${sectionURL}/annotations`, {
                auth,
                params: { label: "TITLE" },
            })
            .catch((e) => console.log(e));
        return response.data;
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
            return response.data;
        } catch (error) {
            console.log(`no person refs for section ${sectionId} `);
            return null;
        }
    }

    async function getComments(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        try {
            const response = await axios
                .get(`${annotationURL}`, { auth, params: { label: "COMMENT" } })
                .catch((e) => console.log(e));
            return response.data;
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
            return response.data;
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
        return response.data;
    }

    function createRefs(annotations, type) {
        // Given an annotation and its type, return an object with its properties, and the ids of
        // the beginning and ending nodes that it annotates
        return annotations.map((anno) => {
            const beginNodeId = anno.links.find((l) => l.type == "BEGIN").target;
            const endNodeId = anno.links.find((l) => l.type == "END").target;
            let ref = {
                id: anno.id,
                begin: beginNodeId,
                end: endNodeId,
                type,
            };
            if (anno.properties && anno.properties.text) {
                ref["text"] = stripTags(anno.properties.text);
            }
            return ref;
        });
    }

    function getOpenTag(annotation) {
        // Get the opening TEI tag depending on the type of annotation
        switch (annotation.type) {
            case "comment":
                return `<ref target="annotation_${annotation.id}">`;
            case "person":
                return `<name ref="person_${annotation.id}">`;
            case "place":
                return `<name ref="place_${annotation.id}">`;
            case "date":
                return "<date>";
        }
    }

    function getCloseTag(annotation) {
        // Get the closing TEI tag depending on the type of annotation
        switch (annotation.type) {
            case "comment":
                return `</ref><note xml:id="annotation_${annotation.id}" xml:lang="en">${annotation.text}</note>`;
            case "person":
            case "place":
                return `</name>`;
            case "date":
                return "</date>";
        }
    }

    function makeLists(nodeList) {
        // Collect all the persons and places from nodes into lists
        const placeList = [];
        const personList = [];
        nodeList.forEach((node) => {
            if (node.annotations) {
                node.annotations.forEach((anno) => {
                    // add places/persons to lists if not present yet
                    if (anno.type === "place" && !placeList.some((place) => place.id === anno.id)) {
                        placeList.push(anno);
                    } else if (anno.type === "person" && !personList.some((person) => person.id === anno.id)) {
                        personList.push(anno);
                    }
                });
            }
        })
        // Create listPerson and listPlace TEI elements with contents from annotations
        let lists = "";
        const indent = " ".repeat(16);
        const indent2 = " ".repeat(20);
        if (personList.length > 0) {
            lists += `${indent}<listPerson>\n`;
            personList.forEach((person) => {
                lists += `${indent2}<person xml:id="person_${person.id}"><persName xml:lang="hy">${person.text}</persName></person>\n`;
            });
            lists += `${indent}</listPerson>${placeList.length > 0 ? "\n" : ""}`;
        }
        if (placeList.length > 0) {
            lists += `${indent}<listPlace>\n`;
            placeList.forEach((place) => {
                lists += `${indent2}<place xml:id="place_${place.id}"><placeName xml:lang="hy">${place.text}</placeName></place>\n`;
            });
            lists += `${indent}</listPlace>`;
        }
        return lists;
    }

    function createNodeTei(node) {
        const space = node.needsSpaceBefore ? " " : "";
        let text = stripTags(node.text);
        if (node.annotations) {
            node.annotations.forEach((anno) => {
                if (anno.isStart && anno.isEnd) {
                    // if this is the start and end of an annotation, wrap with tags
                    // check for existing tags to make sure we don't break them
                    const existingCloseTag = text.indexOf("</");
                    if (existingCloseTag > -1) {
                        const before = text.substring(0, existingCloseTag);
                        const after = text.substring(existingCloseTag);
                        text = `${getOpenTag(anno)}${before}${getCloseTag(anno)}${after}`;
                    } else {
                        text = `${getOpenTag(anno)}${text}${getCloseTag(anno)}`;
                    }
                    // NOTE: Are there other conditions where we would need to do this?
                } else if (anno.isStart) {
                    // if this is the start of an annotation, add open tag
                    text = `${getOpenTag(anno)}${text}`;
                } else if (anno.isEnd) {
                    // if this is the end of an annotation, add close tag
                    text = `${text}${getCloseTag(anno)}`;
                }
            });
        }
        return `${space}${text}`;
    }

    function createSectionTei(annotations, sectionNodes) {
        // add annotations markup to lemma text
        let annotatedNodes = [];
        // add annotation data to start, end, and middle nodes for each annotation
        annotations.forEach((anno) => {
            const startNode = sectionNodes.find((node) => parseInt(node.id) === parseInt(anno.begin));
            let nodesBetween = [];
            const endNode = sectionNodes.find((node) => parseInt(node.id) === parseInt(anno.end));
            if (startNode && endNode) {
                if (startNode.id === endNode.id) {
                    // annotation is only on this one node
                    const nodeAnnotation = {
                        ...anno,
                        isStart: true,
                        isEnd: true,
                        // Use node text for annotation text unless annotation has text already
                        text: anno.text ? anno.text : startNode.text,
                    };
                    if (startNode.annotations) startNode.annotations.push(nodeAnnotation);
                    else startNode.annotations = [nodeAnnotation];
                } else {
                    // annotation spans multiple nodes
                    // build annotation text
                    let annoText = "";
                    let filteredNodes = [];
                    annoText += startNode.text;
                    // if there are nodes between the start and end nodes, get text from them
                    const nodesAreBetween = ![endNode.startPos, endNode.startPos - 1].includes(startNode.endPos);
                    if (nodesAreBetween) {
                        const filteredNodes = sectionNodes.filter(
                            (node) => node.startPos >= startNode.endPos && node.endPos <= endNode.startPos,
                        );
                        filteredNodes.forEach((node) => {
                            annoText += (node.needsSpaceBefore ? " " : "") + node.text;
                        });
                    }
                    annoText += (endNode.needsSpaceBefore ? " " : "") + endNode.text;
                    const newAnno = { ...anno, text: anno.text ? anno.text : annoText };
                    // append annotation to start, between, and end nodes
                    const anStart = { ...newAnno, isStart: true, isEnd: false };
                    if (startNode.annotations) startNode.annotations.push(anStart);
                    else startNode.annotations = [anStart];
                    if (nodesAreBetween) {
                        nodesBetween = filteredNodes.map((node) => {
                            const nodeAnno = {
                                ...newAnno,
                                isStart: false,
                                isEnd: false,
                            };
                            if (node.annotations) node.annotations.push(nodeAnno);
                            else node.annotations = [nodeAnno];
                            return node;
                        });
                    }
                    const anEnd = { ...newAnno, isEnd: true, isStart: false };
                    if (endNode.annotations) endNode.annotations.push(anEnd);
                    else endNode.annotations = [anEnd];
                }
                // store all annotated nodes
                annotatedNodes.push(startNode, ...nodesBetween, endNode);
            }
        });
        // replace section nodes with annotated ones when possible
        const allNodes = sectionNodes.map((node) => {
            const annoNode = annotatedNodes.find((n) => n.id === node.id);
            return annoNode || node;
        });
        // collect the markup for each node and generate TEI
        const paragraph = allNodes.map((node) => createNodeTei(node)).join("");
        // create the metadata lists
        const lists = makeLists(allNodes);
        return paragraph ? `<p>${paragraph}</p>\n${lists}` : "";
    }

    // compose a TEI div for each section
    function createTei(sections) {
        const sectionsTei = sections.map((section) => {
            let sectionNodes = [];
            let pos = 0;
            section.readings.forEach((reading, i) => {
                sectionNodes.push({
                    id: reading.id,
                    text: reading.text,
                    needsSpaceBefore: i > 0 && !reading.join_prior && !section.readings[i - 1].join_next,
                    startPos: pos,
                    endPos: pos + reading.text.length,
                });
                pos += reading.text.length;
            });
            const markedupText = createSectionTei(section.annotations, sectionNodes);
            const head1 = section.titles?.armenianTitle
                ? `                <head xml:lang="hy">${section.titles.armenianTitle}</head>\n`
                : "";
            const head2 = section.titles?.englishTitle
                ? `                <head xml:lang="en">${section.titles.englishTitle}</head>`
                : "";
            return `
            <div xml:id="section_${section.id}">${head1 || head2 ? "\n" : ""}${head1}${head2}
                ${markedupText}
            </div>`;
        });
        return sectionsTei.join("");
    }
}

const timestamp = process.argv[2];
generateLemmaTei(timestamp);
