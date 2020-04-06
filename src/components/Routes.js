import React,{useState, useEffect} from 'react';
import AboutPage from './About';
import MethodsPage from './Methods';
import ManuscriptPage from './Manuscript';
import Edition from './Edition/index';
import HomePage from './HomePage';
import EditionLanding from './EditionLanding';
import ManuscriptViewClientParse from './Manuscript/ManuscriptViewClientParse'
import { Route, Switch } from 'react-router-dom';
import useWindowSize from '../utils/Viewport';
import ChronicleTheme from './Theme';
import { ThemeProvider } from '@material-ui/core/styles';
import SearchResults from './Edition/SearchResults';
import * as DataApi from './../utils/Api';
import MapView from './Visualizations/Map'


const Routes = ( props)=>{
      const viewport = useWindowSize();
      const {sections, witnesses} = props;
      const [searchTerm, setSearchTerm ] = useState('');
      const [translationDictionary, setTranslationDictionary] = useState([]);
      const [translationIndex, setTranslationIndex] = useState();
      const [armenianDictionary, setArmenianDictionary] = useState([])
      const [armenianIndex, setArmenianIndex] = useState();
      const [mapFeatures,setMapFeatures] = useState([]);
      const [locationLookup, setLocationLookup]=useState([]);

      useEffect(()=>{
            if( ! translationIndex )
            DataApi.getTranslationIndex((data)=>{
                  setTranslationIndex(data )
            })
      },[])

      useEffect(()=>{
            if( translationDictionary.length===0 )
                  DataApi.getLunrData((data)=>{
                        setTranslationDictionary(data )
            })
      },[])
      useEffect(()=>{
            if( ! armenianIndex )
                  DataApi.getArmenianIndex((data)=>{
                        setArmenianIndex(data )
                  })
      },[])
      useEffect(()=>{
            if( armenianDictionary.length===0 )
            DataApi.getLunrArmenianData((data)=>{
                  setArmenianDictionary(data )
                  })
      },[]);

      useEffect(()=>{
            if(mapFeatures.length===0){
                  DataApi.getLocationData((data)=>{
                        setMapFeatures(data)
                  })
            }
      })

      useEffect(()=>{
            if(locationLookup.length===0){
                  DataApi.getLocationLookup((data)=>{
                        setLocationLookup(data)
                  })
            }
      })


      return (
            <ThemeProvider  theme={ChronicleTheme}>
                        <Switch>
                              <Route path="/Edition/:sectionID/:witnessID" exact>
                                    <Edition onSearch={setSearchTerm} searchTerm = {searchTerm} sections={sections}  viewport={viewport} witnesses = { witnesses} />
                              </Route>
                              <Route path="/Edition/:sectionID" exact>
                                    <Edition onSearch={setSearchTerm}  searchTerm = {searchTerm} sections={sections}  viewport={viewport} witnesses = { witnesses} />
                              </Route>
                              <Route path="/Edition">
                                    <EditionLanding   sections={sections} onSearch={setSearchTerm}  />
                              </Route>
                              <Route path="/About" >
                                    <AboutPage onSearch={setSearchTerm} /> 
                              </Route>
                              <Route path="/Methods" >
                                    <MethodsPage onSearch={setSearchTerm} /> 
                              </Route>
                              <Route path="/Manuscripts" >
                                    <ManuscriptPage onSearch={setSearchTerm} /> 
                              </Route>
                                <Route path="/ManuscriptView/:manuscriptId" exact>
                                    <ManuscriptViewClientParse onSearch={setSearchTerm}  viewport={viewport}  /> 
                              </Route>   
                              <Route path="/Home" exact>
                                    <HomePage sections={sections} onSearch={setSearchTerm} />
                              </Route> 
                              <Route path="/Search" exact>
                                    <SearchResults 
                                          sections={sections}
                                          translationDictionary={translationDictionary} translationIndex={translationIndex}
                                          armenianDictionary = {armenianDictionary} armenianIndex={armenianIndex}
                                          onSearch={setSearchTerm} searchTerm = {searchTerm} />
                              </Route>
                              <Route path="/Map" exact>
                                    <MapView  onSearch={setSearchTerm} geoData= {mapFeatures} locationLookup = {locationLookup} sections={sections} />
                              </Route>
                              <Route path="/Map/:locationId" exact>
                                    <MapView onSearch={setSearchTerm} geoData= {mapFeatures} locationLookup = {locationLookup} sections={sections}/>
                              </Route>
                               <Route path="/" exact>
                                    <HomePage  onSearch={setSearchTerm} sections={sections} />
                              </Route> 
                        </Switch>
            </ThemeProvider>
      )

}
export default Routes