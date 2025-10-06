const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const cheerio = require("cheerio");
const timestamp = process.argv[2];

async function GenerateLocationData(timestamp) {
    const startTime = moment();
    console.log("started", startTime.format("hh:mm:ss"));
    const config = loadConfig();
    const baseURL = `${config.options.repository}/${config.options.tradition_id}`;
    const auth = config.auth;
    const outdir = `public/data/data_${timestamp}`;
    const geoLocations = [];
    const locationStore = [];

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

    async function fetchData() {
        const geoRequests = [];
        const places = await getPlaces().catch((e) => console.log(e));

        places.data.forEach((p) => {
            let url = p.properties.href;
            if (url && url.indexOf("pleiades") > -1) {
                let pleiadesRequest = fetchGeoJsonLocation(url, p);
                geoRequests.push(pleiadesRequest);
            }
            if (url && url.indexOf("geonames") > -1) {
                const geoNameId = url.split("/")[3];
                const jsonUrl = `http://geonames.org/getJSON?id=${geoNameId}`;
                let geonamesRequest = fetchKMLLocation(jsonUrl, url, p);
                geoRequests.push(geonamesRequest);
            }
            if (url && url.indexOf("syriaca") > -1) {
                let syriacGazetteerRequest = fetchSyriacLocation(url, p);
                geoRequests.push(syriacGazetteerRequest);
            }
        });
        try {
            const all = await Promise.all(geoRequests).catch((e) =>
                console.log(e)
            );
        } catch (error) {
            console.log(error.message);
        }
        writeLocationFile();
    }

    async function fetchKMLLocation(url, originalUrl, place) {
        return await Promise.resolve(getGeoJson(url))
            .catch((e) => console.log(e))
            .then((openData) => {
                const record = openData.data;
                geoLocations.push({
                    // identifier:p.identifier, placeRef id
                    id: record.geonameId,
                    title: place.properties.identifier,
                    provenance: "geonames.org",
                    geometry: [
                        {
                            geometry: {
                                type: "Point",
                                coordinates: [record.lng, record.lat],
                            },
                            properties: {
                                snippet: `${record.fclName}, ${record.fcodeName}`,
                                description: `country: ${record.countryName} admin: ${record.adminName1}`,
                                link: originalUrl,
                            },
                        },
                    ],
                    links: place.links,
                });
            })
            .catch((error) => {
                console.log(error);
            });
    }

    async function fetchSyriacLocation(url, place) {
        return await Promise.resolve(getGeoJson(url))
            .catch((e) => console.log(e))
            .then((openData) => {
                const $ = cheerio.load(openData.data.trim());
                let anchors = $("a");
                let pleiadesUrl;
                for (let i = 0; i < anchors.length; i++) {
                    if (
                        anchors[i].attribs.href !== undefined &&
                        anchors[i].attribs.href.indexOf("pleiades") > -1
                    ) {
                        pleiadesUrl = anchors[i].attribs.href;
                        break;
                    }
                }
                if (pleiadesUrl) {
                    getGeoJson(pleiadesUrl).then((openData) => {
                        const record = openData.data;
                        geoLocations.push({
                            // identifier:p.identifier, placeRef id
                            id: record.id,
                            title: place.properties.identifier,
                            provenance: "http://syriaca.org/",
                            representativePoint: record.reprPoint,
                            geometry: record.features,
                            links: place.links,
                        });
                    });
                }
            })
            .catch((error) => console.log(error));
    }

    async function fetchGeoJsonLocation(url, place) {
        return await Promise.resolve(getGeoJson(url))
            .catch((e) => console.log(e))
            .then((openData) => {
                const record = openData.data;
                geoLocations.push({
                    // identifier:p.identifier, placeRef id
                    id: record.id,
                    title: place.properties.identifier,
                    provenance: record.provenance,
                    representativePoint: record.reprPoint,
                    geometry: record.features,
                    links: place.links,
                });
            })
            .catch((error) => console.log(error));
    }

    function writeLocationFile() {
        makeDirectory();
        const fileName = `${outdir}/locations.json`;
        console.log(`location count ${geoLocations.length}`);
        writeFile(fileName, JSON.stringify(geoLocations));
    }

    async function getPlaces() {
        // https://api.editions.byzantini.st/ChronicleME/stemmarest/tradition/4aaf8973-7ac9-402a-8df9-19a2a050e364/annotations?label=PLACE
        try {
            const response = await axios
                .get(`${baseURL}/annotations?label=PLACE`, { auth })
                .catch((e) => console.log(e));
            return response;
        } catch (error) {
            console.log(`error ${error.message}`);
        }
    }

    async function getGeoJson(url) {
        return await axios.get(url).catch((e) => console.log(e));
    }

    async function makeDirectory() {
        if (!fs.existsSync("public"))
            fs.mkdirSync("public", { recursive: true });
        if (!fs.existsSync(`public/data/data_${timestamp}`))
            fs.mkdirSync(`public/data/data_${timestamp}`, { recursive: true });
    }

    function writeFile(fileName, contents) {
        fs.writeFileSync(fileName, contents);
    }
}

GenerateLocationData(timestamp);
