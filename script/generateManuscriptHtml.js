// from the mel project - https://github.com/performant-software/mel-textual-core/blob/master/scripts/whale.js#L9
const fs = require("fs");
const jsdom = require("jsdom");
const moment = require("moment");
const { JSDOM } = jsdom;
const { CETEI } = require("./CETEI");
const axios = require("axios");
const timestamp = process.argv[2];

class DirectoriesRead {
    constructor() {
        this.value = 0;
        this.total = null;
        this.onComplete = null;
    }
    static increment() {
        this.value = this.value + 1;
        console.log(`processing file: ${this.value} of ${this.total}`);
        if (this.value == this.total) this.onComplete;
    }
}

async function generateManuscriptHtml(timestamp) {
    console.log(`begin processing ${moment().format("mm:ss")}`);
    const config = loadConfig();
    const baseURL = `${config.options.repository}/${config.options.tradition_id}`;
    const auth = config.auth;
    const sourcePath = "public/images/mss";
    const sigilLookup = [];
    const sections = await getSections().catch((e) => console.log(e));

    iterateDirectories(sourcePath, timestamp);

    function loadConfig() {
        const configJSON = fs.readFileSync(
            `script/lemma-html-config.json`,
            "utf8"
        );
        return JSON.parse(configJSON);
    }

    async function getSections() {
        const response = await axios
            .get(`${baseURL}/sections`, { auth })
            .catch((e) => console.log(e));
        return response.data;
    }

    function iterateDirectories(sourcePath, timestamp) {
        const directories = fs.readdirSync(sourcePath, { withFileTypes: true });
        DirectoriesRead.value = 0;
        DirectoriesRead.total = directories.length;
        DirectoriesRead.onComplete = writeLookupFile(timestamp);

        for (let i = 0; i < directories.length; i++) {
            const teiFilePath = `${sourcePath}/${directories[i].name}/${directories[i].name}.tei.xml`;

            if (directories[i].isDirectory()) {
                fs.readFile(teiFilePath, "utf8", (err, contents) =>
                    onReadFile(err, contents, directories[i].name)
                );
            } else DirectoriesRead.increment();
        }
    }

    function onReadFile(err, filecontents, destinationPath) {
        if (err) {
            console.error(`ERROR ${err}`);
            DirectoriesRead.increment();
            return null;
        }
        convertToHTML(filecontents, destinationPath);
    }

    function convertToHTML(filecontents, directoryName) {
        const htmlFilePath = `${sourcePath}/${directoryName}/${directoryName}.html`;
        let manuscriptDescription = {
            id: null,
            settlement: null,
            repository: null,
            idno: null,
            origDate: null,
            origPlace: null,
        };
        const htmlDOM = new JSDOM();
        const ceTEI = new CETEI(htmlDOM.window);
        const xmlDOM = new JSDOM(filecontents, { contentType: "text/xml" });
        let sigil;

        const data = ceTEI.domToHTML5(xmlDOM.window.document, (el) => {
            switch (el.localName) {
                case "tei-milestone":
                    // this works because milestones are after the header so sigil is set
                    const yearId = el.getAttribute("n");
                    const compare = `milestone-${yearId}`;
                    const section = sections.find((s) => s.name === compare);
                    if (section)
                        el.innerHTML = `<br/><a href="#/Edition/${section.id}/${sigil}" >The Year ${yearId}</a><br/>`;
                    break;
                case "tei-damage":
                    el.innerHTML = `(${el.innerHTML})`;
                    break;
                case "tei-pb":
                    if (directoryName === "Ox-e.32") {
                        // only create img elements for Oxford right now
                        let pbId = el.attributes.n.nodeValue;
                        let imageUrl;
                        if (pbId.indexOf(".jpg") > -1) {
                            imageUrl = `images/mss/${directoryName}/${pbId}`;
                        } else {
                            imageUrl = `images/mss/${directoryName}/page_${pbId}.jpg`;
                        }
                        el.innerHTML = `<br/><img   src=${imageUrl} alt=${pbId} width="175px"/><br/>`;
                    }
                    break;
                case "tei-msdesc":
                    sigil = el.id;
                    manuscriptDescription.id = el.id;
                    break;
                case "tei-settlement":
                    manuscriptDescription.settlement = el.innerHTML;
                    break;
                case "tei-repository":
                    manuscriptDescription.repository = el.innerHTML;
                    break;
                case "tei-idno":
                    manuscriptDescription.idno = el.innerHTML;
                    break;
                case "tei-origdate":
                    manuscriptDescription.origDate = el.innerHTML;
                    break;
                case "tei-origplace":
                    manuscriptDescription.origPlace = el.innerHTML;
                    break;
            }
        });

        sigilLookup.push(manuscriptDescription);
        const html = data.innerHTML;
        DirectoriesRead.increment();
        fs.writeFileSync(htmlFilePath, html, "utf8");
    }

    function writeLookupFile(timestamp) {
        fs.writeFileSync(
            `public/data/data_${timestamp}/sigilLookup.json`,
            JSON.stringify(sigilLookup),
            "utf8"
        );
        console.log(`completed processing ${moment().format("mm:ss")}`);
    }
}

generateManuscriptHtml(timestamp);
