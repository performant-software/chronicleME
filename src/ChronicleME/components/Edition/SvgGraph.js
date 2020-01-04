import React, { useEffect, useState, useRef} from 'react'
import SVG from 'react-inlinesvg'
//import {ReactComponent as Sample} from './sample-graph.svg'// also works

const SvgGraph =(props)=>{

      const {selectedNodes, sectionId, onSelectNode, onDeselectNode, viewport}=props;
      const svgRef = useRef(null);
      const [left, setLeft] = useState();
      const graphWindowStyle={
            left:left
      }

      useEffect( ()=>{
            if ( !selectedNodes )
                  return;
            highlightNodes();
            centerOnSelected();
      },[selectedNodes])

    

      return (
            <div style={{position:'relative',backgroundColor:'green', padding:'16px',overflowX:'auto'}}>
                  <div   
                        className='graphWindow'
                        style={graphWindowStyle}
                        ref={svgRef}>
                              <SVG 
                                    src= {`data/${sectionId}/graph.svg`}
                                    onClick={handleClick}
                              />
                  </div>
            </div>
            )

      function handleClick(ev){
            const nodeGroup = ev.target; 
            if (nodeGroup != null) {
                  const id = nodeGroup.parentNode.id;
                  let trimmedId = id.replace('n','')
                  let index = selectedNodes.indexOf(trimmedId);
                  if (index === -1)
                        onSelectNode(trimmedId);
                  else
                        onDeselectNode(trimmedId)
            }
      }

      function highlightNodes() {
            let nodeEls = svgRef.current.querySelectorAll("g.node.highlight");
		nodeEls.forEach.call(nodeEls, function(n) {
			n.setAttribute("class", "node");
            });
            
            if(!selectedNodes)
            return;
            selectedNodes.forEach( n=>{
                  let node = getGraphDOMNode(n);
                  if(node){
                  node.setAttribute("class", "node highlight active");
                  }
            })
      }

      function centerOnSelected(){
            if(selectedNodes.length ===0)
                  return;
            let nodeId = selectedNodes[0];
            let domNode = getGraphDOMNode(nodeId);
            domNode.scrollIntoView({behavior:'smooth', inline:'center'});
          
      }
      
      function getGraphDOMNode(nodeId){
            const graphRef = svgRef.current;
            let selector = `g#n${nodeId}`;
            let found =  graphRef.querySelector(selector);
            return found;
      }


 


}
export default SvgGraph