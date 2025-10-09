const fs = require("fs");
const axios = require("axios");
const moment = require("moment");

// Generate TEI version of lemma edition for use with dtsflat
// Adapted from generateAllData.js

async function generateLemmaTei(timestamp) {
    const startTime = moment();
    console.log("started", startTime.format("hh:mm:ss"));
    const config = loadConfig();
    const baseURL = `${config.options.repository}/${config.options.tradition_id}`;
    const auth = config.auth;
    const outdir = `public/data/dts-xml_${timestamp}`;

    // initialize directory structure
    if (!fs.existsSync("public")) fs.mkdirSync("public", { recursive: true });
    if (!fs.existsSync("public/data")) fs.mkdirSync("public/data", { recursive: true });
    if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

    // make strings for person, place, event, and comments for each section
    let lists = {
        people: "",
        places: "",
        events: "",
        annotations: ""
    }

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
    teiDoc += await fetchAndProcessData(lists).catch((e) => console.log(e));
    teiDoc += `
        </body>
    </text>
    <standOff>`
    if (lists.people?.length) {
        teiDoc += `
        <listPerson>
            ${lists.people}
        </listPerson>`
    }
    if (lists.places?.length) {
        teiDoc += `
        <listPlace>
            ${lists.places}
        </listPlace>`
    }
    if (lists.events?.length) {
        teiDoc += `
        <listEvent>
            ${lists.events}
        </listEvent>`
    }
    if (lists.annotations?.length) {
        teiDoc += `
        <listAnnotation>
            ${lists.annotations}
        </listAnnotation>`
    }
    teiDoc += `
    </standOff>
</TEI>`;
    fs.writeFileSync(`${outdir}/lemma.tei.xml`, teiDoc);

    // load config from json file
    function loadConfig() {
        const configJSON = fs.readFileSync(`script/lemma-html-config.json`, "utf8");
        return JSON.parse(configJSON);
    }

    // fetch data and append to teiDoc
    async function fetchAndProcessData(lists) {
        const sections = await getSections().catch((e) => console.log(e));
        console.log('Sections fetched.')
        const sectionsForTei = await Promise.all(
            sections.map(async (section) => {
                return getSectionData(section.id);
            }),
        );
        return createTei(sectionsForTei, lists);
    }
    async function getSectionData(sectionId) {
        console.log(`Processing section ${sectionId}...`)
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

        // get annotations
        const annotations = await getAnnotations(sectionId);

        const titleArray = annotations && annotations.filter((a) => (a.label === "TITLE"));
        const commentArray = annotations && annotations.filter((a) => (a.label === "COMMENT"));
        const personArray = annotations && annotations.filter((a) => (a.label === "PERSONREF"));
        const placeArray = annotations && annotations.filter((a) => (a.label === "PLACEREF"));
        const dateArray = annotations && annotations.filter((a) => (a.label === "DATEREF"));
        const datingArray = annotations && annotations.filter((a) => (a.label === "DATING"));


        // get titles for section
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
        const comments = createRefs(commentArray, "comment");
        const persons = createRefs(personArray, "person");
        const places = createRefs(placeArray, "place");
        const dates = createRefs(dateArray, "date");
        const events = createRefs(datingArray, "event")

        // create section object
        return {
            id: sectionId,
            titles,
            readings,
            annotations: [...comments, ...persons, ...places, ...dates, ...events],
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

    async function getAnnotations(sectionId) {
        const annotationURL = `${baseURL}/section/${sectionId}/annotations`;
        try {
            const response = await axios
                .get(`${annotationURL}`, {
                    auth
                })
                .catch((e) => console.log(e));
            return response.data;
        } catch (error) {
            console.log(`no annotations for section ${sectionId} `);
            return null;
        }
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
                return `<milestone type="comment" unit="start" ana="#annotation_${annotation.id}" />`;
            case "person":
                return `<name ref="person_${annotation.id}">`;
            case "place":
                return `<name ref="place_${annotation.id}">`;
            case "date":
                return "<date>";
            case "event":
                return `<milestone type="event" unit="start" ana="#event_${annotation.id}" />`;
        }
    }

    function getCloseTag(annotation) {
        // Get the closing TEI tag depending on the type of annotation
        switch (annotation.type) {
            case "comment":
                return `<milestone type="comment" unit="end" ana="#annotation_${annotation.id}" />`;
            case "person":
            case "place":
                return `</name>`;
            case "date":
                return "</date>";
            case "event":
                return `<milestone type="event" unit="end" ana="#event_${annotation.id}" />`
        }
    }

    function makeLists(nodeList, sectionId) {
        // Collect all the persons, places, comments, and events from nodes into lists
        const placeList = [];
        const personList = [];
        const eventList = [];
        const annotationList = [];
        nodeList.forEach((node) => {
            if (node.annotations) {
                node.annotations.forEach((anno) => {
                    // add places/persons/events/annotations to lists if not present yet
                    if (anno.type === "place" && !placeList.some((place) => place.id === anno.id)) {
                        placeList.push(anno);
                    } else if (anno.type === "person" && !personList.some((person) => person.id === anno.id)) {
                        personList.push(anno);
                    } else if (anno.type === "event" && !eventList.some((event) => event.id === anno.id)) {
                        eventList.push(anno);
                    } else if (anno.type === "comment" && !annotationList.some((comment) => comment.id === anno.id)) {
                        annotationList.push(anno);
                    }
                });
            }
        })
        // Create listPerson and listPlace TEI elements with contents from annotations
        let lists = "";
        let people = "";
        let places = "";
        let events = "";
        let annotations = "";
        const indent = " ".repeat(16);
        const indent2 = " ".repeat(20);
        if (personList.length > 0) {
            people += `${indent}<listPerson xml:id="section_${sectionId}_people">\n`;
            personList.forEach((person) => {
                people += `${indent2}<person xml:id="person_${person.id}"><persName xml:lang="hy">${person.text}</persName></person>\n`;
            });
            people += `${indent}</listPerson>\n`;
        }
        if (placeList.length > 0) {
            places += `${indent}<listPlace xml:id="section_${sectionId}_places">\n`;
            placeList.forEach((place) => {
                places += `${indent2}<place xml:id="place_${place.id}"><placeName xml:lang="hy">${place.text}</placeName></place>\n`;
            });
            places += `${indent}</listPlace>\n`;
        }
        if (eventList.length > 0) {
            events += `${indent}<listEvent xml:id="section_${sectionId}_events">\n`;
            eventList.forEach((event) => {
                events += `${indent2}<event xml:id="event_${event.id}"><eventName xml:lang="hy">${event.text}</eventName></event>\n`;
            });
            events += `${indent}</listEvent>\n`;
        }
        if (annotationList.length > 0) {
            annotations += `${indent}<listAnnotation xml:id="section_${sectionId}_annotations">\n`;
            annotationList.forEach((anno) => {
                annotations += `<note xml:id="annotation_${anno.id}" xml:lang="en">${anno.text}</note>\n`;
            });
            annotations += `${indent}</listAnnotation>\n`;
        }
        return {
            people,
            places,
            events,
            annotations
        };
    }

    function createNodeTei(node) {
        // create TEI markup for a single node
        const space = node.needsSpaceBefore ? " " : "";
        // we only have to worry about breaking existing tags with non-self-closing nodes
        const nonSCTypes = ["place", "person", "date"]
        let text = stripTags(node.text);
        if (node.annotations) {
            node.annotations.forEach((anno) => {
                if (anno.isStart && anno.isEnd) {
                    // if this is the start and end of an annotation, wrap with tags
                    // check for existing tags to make sure we don't break them
                    const existingCloseTag = text.indexOf("</");
                    if (existingCloseTag > -1 && nonSCTypes.includes(anno.type)) {
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

    function createSectionTei(sectionAnnotations, sectionNodes, sectionId, lists) {
        // add annotations markup to lemma text
        let annotatedNodes = [];
        // add annotation data to start, end, and middle nodes for each annotation
        sectionAnnotations.forEach((anno) => {
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
        const { people, places, events, annotations } = makeLists(allNodes, sectionId);
        lists.people += people;
        lists.places += places;
        lists.events += events;
        lists.annotations += annotations;
        return paragraph ? `<p>${paragraph}</p>\n` : "";
    }

    // compose a TEI div for each section
    function createTei(sections, lists) {
        const sectionsTei = sections.map((section) => {
            let sectionNodes = [];
            let pos = 0;
            // add each section (with start and end positions in the text) to sectionNodes
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
            // create markup and return the TEI div
            const markedupText = createSectionTei(section.annotations, sectionNodes, section.id, lists);
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
