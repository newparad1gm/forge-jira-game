import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import { Game } from './Game';

function App() {
    return (
        <div>
            <div>Loading Game</div>
            <Game />
        </div>
    );
}

export default App;
