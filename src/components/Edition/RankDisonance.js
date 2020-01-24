import React, {useState, useEffect} from "react";
import * as DataApi from '../../utils/Api';
import {VictoryChart, VictoryLine, VictoryTheme,
VictoryTooltip, VictorySelectionContainer} from 'victory'




const RankDisonance = (props)=> {

      const { sectionId, 
            activeWitness,  
            selectedRank, 
            selectedSentence, 
            onSelectRank,  
            nodeHash, 
            witnessCount} = props;
      const [highlightList, setHighlightList] = useState([])
     // const [rankReport, setRankReport] = useState([]); // rank report fetches the data, onSectionChange and feeds the histogram;
      const [chartData, setChartData] = useState();

      // highlight list
      useEffect(()=>{
            if( ! nodeHash)
                  return;
            setHighlightList([]);
            const highlights = [];
           for ( const n in nodeHash){
                  let id = n.id;
                  let rank = n.rank;
                  if(selectedSentence){
                        if( rank >= selectedSentence.startRank && rank <= selectedSentence.endRank ){
                              highlights.push({id:id, rank:rank})
                        }
                  }
            }
            setHighlightList(highlights)
      },[sectionId, selectedSentence])

      // rank report - for histogram
      useEffect(()=>{
           // setRankReport([]);
            setChartData(null);
            DataApi.getRankReport(sectionId, (report)=>{
                  report.sort( (a,b)=> {
                        if(a.rank > b.rank)
                              return 1;
                        if( a.rank < b.rank)
                              return -1
                        else 
                              return 0;
                  })
           // setRankReport( report ) ;

            const formatedForChart = generateChartData(report);
            setChartData(formatedForChart)
            });
      },[sectionId])


      // sentence selected
      useEffect(()=>{
            if( ! nodeHash)
                  return;
            setHighlightList([]);
            const highlights=[];
            if(selectedSentence){
                  for ( const n in nodeHash ){
                        if( n.rank >= selectedSentence.startRank && n.rank <= selectedSentence.endRank ){
                              highlights.push({id:n.id, rank:n.rank})
                        }
                  }
                  setHighlightList(highlights)
            }
            
      }, [selectedSentence])
    

      return (
            <div style={{height:'165px'}}>
                  <VictoryChart
                  height={165}
                  width={800}
                  scale={{ x: "linear", y: "linear" }}
                         theme={VictoryTheme.material}
                         containerComponent={<VictorySelectionContainer
                              selectionDimension="x"
                              onSelection={onSelectRank}
                              selectionStyle={{
                                    fill: "tomato", fillOpacity: 0.5,
                                    stroke: "tomato", strokeWidth: 2
                                  }}
                         />}>
                        <VictoryLine
                              style={{
                                    data: { stroke: "#c43a31" },
                                    parent: { border: "1px solid #ccc"}
                              }}
                              data={chartData}
                              labelComponent={
                                    <VictoryTooltip />
                              }
                              
                              >

                        </VictoryLine>

                  </VictoryChart>
                  
            </div>
            );
       
            // to do let generator script do this
            function generateChartData( report ) {
                  let data = [];
                  report.forEach( item  =>{
                        const dataPoint = {
                              x: item.rank,
                              y: item.instances,
                              label: `${item.rank}`
                        }
                        data.push( dataPoint );
                  })
                  return data;
            }
            
         

        
}


export default RankDisonance;