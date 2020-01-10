const fs = require('fs')
const axios = require('axios');
const moment = require('moment')
     
//https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await
// inspired by fast async await example - everything in paralell when possible - 
// do add error handling please


async function generateStore() { 
      const startTime= moment();
      console.log('started', startTime.format('hh:mm:ss'));
      const config = loadConfig();
      const baseURL=`${config.options.repository}/tradition/${config.options.tradition_id}`;
      const auth = config.auth;
      const outdir = "public/data";

      await fetchData(baseURL,auth);
      const endTime= moment();
      console.log('Done!', endTime.format('hh:mm:ss'))

      function loadConfig() {
            const configJSON = fs.readFileSync(`script/lemma-html-config.json`, "utf8");
            return JSON.parse(configJSON);
      }

      async function fetchData(baseURL, auth){
            const sections = getSections();
            const witnesses =  getWitnesses();
            let lists = await Promise.all([sections, witnesses])
            let sectionStore= await getSectionStore(lists[0], lists[1]);
      }

      async function getSections(){
            const response =   await axios.get(`${baseURL}/sections`, {auth} ) 
            return response.data;
      }

      async function getWitnesses(){
            const response =   await axios.get(`${baseURL}/witnesses`, {auth} ) 
            return response.data;
      }

       async function getSectionStore(sections, witnesses){
            const sectionPromises = [];
            const validSections = [];
            sections.forEach( section =>{
                  sectionData = getSectionData(section.id, witnesses, validSections);
                  sectionPromises.push(sectionData);
            });
            sectionStore = await Promise.all(sectionPromises);
            writeSectionFile( validSections);
      }

      async function getSectionData( sectionId, witnesses, validSections ){
            let lemmaTextFinal = await getLemmaText(sectionId);
           
            if( lemmaTextFinal.text ) {
                 
                  let allReadings = new Promise( (resolve )=>{
                        getReadings(sectionId)
                        .then( readings=>{
                              writeLemmaFile( readings, sectionId); 
                              writeWitnessFiles(readings, witnesses, sectionId);
                              resolve();
                        })

                  });

                  let englishTranslation = new Promise( (resolve) =>{
                        getTranslation(sectionId)
                        .then( translation=>{
                              writeTranslationFile(translation,sectionId);
                              resolve();
                        })

                  });

                  let titleArray = new Promise( (resolve) =>{ // demonstrating that this is the same as using new promise and resolve
                        getTitle(sectionId)
                        .then( titles =>{
                              const englishTitle = titles[0].properties.language === "en" ? titles[0].properties.text : titles[1].properties.text;
                              const armenianTitle= titles[1].properties.language === "hy" ? titles[1].properties.text : titles[0].properties.text;

                               let validSection = {
                                     sectionId: sectionId,
                                     englishTitle: englishTitle,
                                     armenianTitle: armenianTitle
                               }
                               validSections.push(validSection);
                              resolve();
                        });

                  });

                 return data =  await Promise.all( [allReadings,englishTranslation,titleArray] )
                 // etc for person place and date - although this will just be used for text highlights
            }
      }

      async function getLemmaText(sectionId){
            const url = `${baseURL}/section/${sectionId}/lemmatext`;
            const response = await axios.get(url, { auth, params: {'final': 'true'} });
            return response.data;
      }

      async function getReadings(sectionId){
            const sectionURL = `${baseURL}/section/${sectionId}`
            const response = await axios.get(`${sectionURL}/readings`, {auth});
            return response.data;
      }

      async function getTranslation(sectionId){
            const sectionURL = `${baseURL}/section/${sectionId}`;
            const response = await axios.get( `${sectionURL}/annotations`, {auth, params: {label: 'TRANSLATION'}})
            return response.data;
      }

      async function getTitle(sectionId){
            const sectionURL = `${baseURL}/section/${sectionId}`;
            const response = await axios.get( `${sectionURL}/annotations`, {auth, params: {label: 'TITLE'}})
            return response.data
      }

      async function getPersons( sectionId ){
            const sectionURL = `${this.baseURL}/section/${sectionId}`;
            const response = await axios.get( `${sectionURL}/annotations`, {auth, params: {label: 'PERSON'}})
            return response.data;
      }

      async function getPlaces(sectionId){
            const sectionURL = `${this.baseURL}/section/${sectionId}`;
            const response = await axios.get( `${sectionURL}/annotations`, {auth, params: {label: 'PLACE'}})
            return response.data;
      }

      async function getDates(sectionId){
            const sectionURL = `${this.baseURL}/section/${sectionId}`;
            const response = await axios.get( `${sectionURL}/annotations`, {auth, params: {label: 'DATE'}})
            return response.data;
      }

      function readingToHTML( reading ){
            let textElements = [] ;
            if( reading.length === 0 )
            return;
            for (const entry of reading ) {
                  const text = entry.normal_form ? entry.normal_form : entry.text
                  textElements.push( `<span id='text-${entry.id}' key=${entry.id}>${text}</span>`)
            }
            return  `${textElements.join('')}`
      }

      function translationToHTML( translation, sectionId ){
            let textElements = [] ;
            if( translation.length === 0 )
            return;
            if( translation.length > 1)
                  console.log( 'there is more than one translation for this section', sectionId)
            for (const entry of translation ) {
                  const text = entry.properties.text;
                  const beginTextNode = entry.links[0].type==="BEGIN" ? entry.links[0].target:entry.links[1].target;
                  textElements.push( `<span id='text-${beginTextNode}' key=${beginTextNode}>${text}</span>`)
            }
            return  `${textElements.join('')}`


      }

      function writeLemmaFile(readings,sectionId){
            const sectiondir = `${outdir}/${sectionId}`;
            const lemmaFilePath = `${sectiondir}/lemmaText.html`
            let rawLemma = parseWitnessReading("Lemma text", readings);
            let htmlLemma = readingToHTML(rawLemma.readings);
            makeDirectory(sectiondir)
            writeFile(lemmaFilePath,htmlLemma)  
      }

      function writeWitnessFiles(readings, witnesses, sectionId){
            const sectiondir = `${outdir}/${sectionId}`;
            witnesses.forEach( witness=>{
                  const witnessFilePath = `${sectiondir}/${witness.sigil}.html`;
                  let witnessData = parseWitnessReading(witness.sigil, readings);
                  let htmlWitness = readingToHTML(witnessData.readings);
                  if(htmlWitness){
                        makeDirectory(sectiondir);
                        //console.log('writing witness reading for sigil: ', witness.sigil)
                        writeFile(witnessFilePath,htmlWitness)
                  }
               
            })
      }

      function writeTranslationFile( translation,sectionId){
            if ( ! translation.length > 0 )
                  return;
            const sectiondir = `${outdir}/${sectionId}`;
            const translationFilePath = `${sectiondir}/translation.html`;
            const translationHTML = translationToHTML(translation, sectionId)
            makeDirectory(sectiondir);
            //console.log('writing translation file for section ', sectionId)
            writeFile(translationFilePath,translationHTML)
      };
     

    

      function parseWitnessReading(sigil, readings) {
            const filterCondition = sigil === 'Lemma text'
                  ? (r) => r.is_lemma && !r.is_start && !r.is_end
                  : (r) => r.witnesses.includes(sigil) && !r.is_start && !r.is_end;
            const witReadings = readings.filter(filterCondition);
            witReadings.sort((first, second) => first.rank - second.rank)
            return {
                  sigil: sigil,
                  readings: witReadings
            };
      }

      async function makeDirectory(sectiondir){
            if( ! fs.existsSync('public') )
                   fs.mkdirSync('public', {recursive:true});
            if(!fs.existsSync('public/data'))
                  fs.mkdirSync('public/data', {recursive:true});
            if(!fs.existsSync(sectiondir))
                  fs.mkdirSync(sectiondir, {recursive:true});
      }

      function writeFile(fileName, contents){
            fs.writeFileSync( fileName, contents )  
      }

     

      function writeSectionFile( validSections ){
            const sectFile = `${outdir}/sections.json`
            fs.writeFileSync( sectFile, JSON.stringify(validSections) )
      }

     
     
    
}

// RUN 
generateStore();