const { execSync, spawn } = require("child_process");
const moment = require("moment");
const apiAuth = require("./lemma-html-config.json");

const timestamp = moment().format("YYYY-MM-DD_hh:mm:ss");

spawn("python3", [
    `script/generate_svgs.py`,
    `-r ${apiAuth["options"]["repository"]}`,
    `-u ${apiAuth["auth"]["username"]}`,
    `-p ${apiAuth["auth"]["password"]}`,
    `-t ${apiAuth["options"]["tradition_id"]}`,
    `-v`,
    `${timestamp}`,
]).stdout.on("data", (data) => {
    process.stdout.write(data.toString());
});

execSync(`node script/generateDates.js ${timestamp}`, { stdio: "inherit" });

execSync(`node script/generateManuscriptHtml.js ${timestamp}`, {
    stdio: "inherit",
});

execSync(`node script/generateStore.js ${timestamp}`, { stdio: "inherit" });

execSync(`node script/generateLocationData.js ${timestamp}`, {
    stdio: "inherit",
});

execSync(`node script/generateAllWitnessLunrData.js ${timestamp}`, {
    stdio: "inherit",
});

execSync(`node script/generateLunrData.js ${timestamp}`, { stdio: "inherit" });

execSync(`node script/generateTimestampsList.js`, { stdio: "inherit" });
