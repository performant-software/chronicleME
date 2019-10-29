import React from 'react';
import { HashRouter, Route, Switch, Link } from 'react-router-dom'

import { useSectionList } from './StemmaRestHooks'
import CriticalEdition from './CriticalEdition'
import HomePage from './HomePage'

function renderNavigation() {
    return (
        <div id="navigation">
            <Link to='/'>Home`</Link>
            <Link to='/edition'>Edition</Link>
        </div>
    );
}

function renderHeader() {
    return (
        <div id="header">
            <div className="title"><Link to='/'>The Chronicle of Matthew of Edessa</Link></div>
            { renderNavigation() }
        </div>
    );
}

function RenderEdition(props) {
    const { sectionID } = props.match.params;
    const sectionList = useSectionList()
    if( !sectionList ) return null

    return (
        <CriticalEdition sectionID={sectionID} sectionList={sectionList}></CriticalEdition>
    )
}

function renderContent() {
    return (
        <div id="content">
            <Switch>
                <Route path="/" component={HomePage} exact/>
                <Route path="/edition" component={RenderEdition} exact/>
                <Route path="/edition/:sectionID" component={RenderEdition} exact/>
            </Switch>
        </div>
    );
}

function renderFooter() {
    return (
        <div id="footer">
        </div>
    );
}

export function ChronicleME() {
    return (
        <HashRouter>
            { renderHeader() }
            { renderContent() }
            { renderFooter() }
        </HashRouter>
    );
}

