const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const moment = require("moment");

async function generateDtsStructure(timestamp) {
    // use generated TEI to build lemma DTS
    const lemmaFile = `public/data/dts-xml_${timestamp}/lemma.tei.xml`;
    await teiToDtsFlat(lemmaFile, "lemma", "div");

    // build manuscript DTS
    manuscriptsDirs = await fs.readdir("public/images/mss");
    await Promise.all(manuscriptsDirs.map(async (dir) => {
        const dirPath = path.resolve("public/images/mss", dir);
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
            manuscriptFiles = await fs.readdir(dirPath);
            return Promise.all(manuscriptFiles.map(async (file) => {
                // process every xml file in each manuscript folder
                if (path.extname(file).toLowerCase().includes("xml")) {
                    // console.log(`opening ${path.resolve(dirPath, file)}`);
                    await teiToDtsFlat(
                        path.resolve(dirPath, file),
                        // use manuscript name (directory name) as id
                        dirPath.split(path.sep).pop(),
                        // use page break (pb) mode
                        "pb",
                    );
                }
                return Promise.resolve();
            }));
        } else {
            return Promise.resolve();
        }
    }));

    function teiToDtsFlat(filename, id, mode) {
        return new Promise((resolve, reject) => {
            const proc = spawn("python3", [
                `script/vendor/simple-tei2dtsflat/tei2dtsflat.py`,
                "-b", `public/data/dts-data_${timestamp}`, // Base dir to save structure
                "-m", mode, // element by which to split tei (pb or div)
                "-i", id, // ID for output XML
                "--gen-id-prefix", `${id}_`, // prefix for generated ids
                filename, // Input file
            ]);
            proc.stdout.on("data", (data) => {
                console.log(data.toString());
            });
            proc.stderr.on("data", (data) => {
                console.log(data.toString());
            });
            proc.on("error", async (error) => {
                console.log(error);
                reject(error);
            });
            // proc.on("exit", async (code) => {
            //     console.log(`exited ${filename} with code ${code}`);
            // });
            proc.on("close", async (code) => {
                // console.log(`closed ${filename} with code ${code}`);
                if (filename === lemmaFile) {
                    // delete temp dir
                    await fs.rm(`public/data/dts-xml_${timestamp}`, {
                        recursive: true,
                        force: true,
                    });
                }
                resolve(code);
            });
        });
    }
}

(async () => {
    const timestamp = process.argv[2];
    await generateDtsStructure(timestamp);

    const endTime = moment();
    console.log("Done!", endTime.format("hh:mm:ss"));
})();
