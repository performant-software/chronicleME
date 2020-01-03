import axios from 'axios';

console.log('host is' ,window.location.hostname)
let host = window.location.hostname==='localhost'?'localhost:3000':'157.245.255.111'
const  localUrl=`http://${host}/`;
//const sectionListURL = `${process.env.PUBLIC_URL}/data/sections.json`;

export const getSectionList = async ( onListReceived )=>{
      const sectionListURL = `${localUrl}data/sections.json`;
      try{
            const result = await axios.get(sectionListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getSection = async(sectionID, onSectionReceived )=>{
      const sectionURL = `${localUrl}/data/${sectionID}`
      const readingsURL = `${sectionURL}/readings.json`
      const translationURL = `${sectionURL}/translation.html`
      const lemmaTextURL = `${sectionURL}/lemmaText.html`

      await axios.all([
            axios.get(readingsURL),
            axios.get(translationURL),
            axios.get(lemmaTextURL)
          ])
      .then( axios.spread( (readings, translation, lemmaText)=>{
            onSectionReceived(readings.data, translation.data, lemmaText.data)
      }))



}
           
      





