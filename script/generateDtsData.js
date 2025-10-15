const { execSync } = require("child_process");
const moment = require("moment");

const timestamp = moment().format("YYYY-MM-DD_hh:mm:ss");

execSync(`node script/generateLemmaTei.js ${timestamp}`, { stdio: "inherit" });

execSync(`node script/generateDtsStructure.js ${timestamp}`, { stdio: "inherit" });
