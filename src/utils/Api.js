import axios from 'axios';

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

export const getWitnessList = async ( onListReceived )=>{
      const witnessListURL = `${localUrl}data/witnesses.json`;
      try{
            const result = await axios.get(witnessListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getNodeLookup = async ( sectionId, onListReceived )=>{
      const nodeListURL = `${localUrl}data/${sectionId}/readings.json`;
      try{
            const result = await axios.get(nodeListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getRankReport = async ( sectionId, onListReceived )=>{
      const rankReportURL = `${localUrl}data/${sectionId}/ranks.json`;
      try{
            const result = await axios.get(rankReportURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getPersons = async ( sectionId, onListReceived )=>{
      const personListURL = `${localUrl}data/${sectionId}/persons.json`;
      try{
            const result = await axios.get(personListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getPlaces = async ( sectionId, onListReceived )=>{
      const placeListURL = `${localUrl}data/${sectionId}/places.json`;
      try{
            const result = await axios.get(placeListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}

export const getDates = async ( sectionId, onListReceived )=>{
      const dateListURL = `${localUrl}data/${sectionId}/dates.json`;
      try{
            const result = await axios.get(dateListURL);
            onListReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}


export const getReading = async ( sectionId, reading, onTextReceived )=>{
      reading = reading === "Lemma Text" ? "lemma": reading;
      reading = reading === "Translation"? "en":reading;
      const readingURL = `${localUrl}data/${sectionId}/${reading}.html`;
      try{
            const result = await axios.get(readingURL);
            onTextReceived(result.data)
      } catch( error ) {
            console.log(error)
      }
}






