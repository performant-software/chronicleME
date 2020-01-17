import React, { useEffect, useRef} from 'react'
import SVG from 'react-inlinesvg'
//import {ReactComponent as Sample} from './sample-graph.svg'// also works

const SvgGraph =(props)=>{

      const {highlightedNode, selectedSentence, sectionId, onSelectNode, }=props;
      const svgRef = useRef(null);
    
      useEffect( ()=>{
            highlightAndSelect();
      } )
//[props.selectedSentence, props.highlightedNode]
      return (
            <div style={{position:'relative', padding:'16px'}}>
                  <div   
                        className='graphWindow'
                        ref={svgRef}>
                              <SVG 
                                    src= {`data/${sectionId}/graph.svg`}
                                    onClick={handleClick}
                                    onLoad = { defaultStart }
                              />
                  </div>
            </div>
            )

      function handleClick(ev){
            const nodeGroup = ev.target; 
            if (nodeGroup != null) {
                  const id = nodeGroup.parentNode.id;
                  let trimmedId = id.replace('n','')
                  onSelectNode(trimmedId);
            }
      }



      function highlightAndSelect() {
            let allGraphNodes = svgRef.current.querySelectorAll("g.node");
            allGraphNodes.forEach( n=>{
                  if (n.id === "__START__" || n.id === "__END__" ) 
                        return;
                  let nodeId = n.id.replace('n','');
                  // to do is look up the node's rank, we need to pass the readings in (a readings hash wouldnt be bad- or encode in the svg gen script)
                  let classNames = "node";
                  let inHighlightedSentence = false;
                  if(selectedSentence)
                        inHighlightedSentence = parseInt(nodeId) >= parseInt(selectedSentence.startId) && parseInt(nodeId )<= parseInt(selectedSentence.endId); // yes we can work with rank here too but for now
                  let isSelectedNode = false;
                  if(highlightedNode)
                        isSelectedNode = nodeId === highlightedNode ;
                  if( inHighlightedSentence )
                        classNames += " highlight";
                  if( isSelectedNode)
                        classNames += " active";

                  n.setAttribute("class", classNames)

            })

            const zoomNode = highlightedNode? highlightedNode : selectedSentence? selectedSentence.startId : null;
            if(zoomNode){
                  let domNode = getGraphDOMNode(zoomNode);
                  if(domNode)
                        domNode.scrollIntoView({behavior:'smooth', inline:'center',block:'center'});
            }
          
      }

      
      function getGraphDOMNode(nodeId){
            const graphRef = svgRef.current;
            let selector = `g#n${nodeId}`;
            let found =  graphRef.querySelector(selector);
            return found;
      }

      function defaultStart(src, cache){
            let startNode = getStartNode();
            if ( startNode){
                  startNode.setAttribute("class", "node highlight start");
                  startNode.scrollIntoView({behavior:'smooth', inline:'center',block:'center'});
            }
            else
                 console.log("cant find start")
      }

      function getStartNode(){
            const graphRef = svgRef.current;
            let selector = `g#__START__`;
            let found =  graphRef.querySelector(selector);
            return found;
      }


 


}
export default SvgGraph