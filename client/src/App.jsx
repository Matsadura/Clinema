// src/App.jsx
// eslint-disable-next-line no-unused-vars
import React from 'react';
import LocationComponent from './LocationComponent'; // Import the LocationComponent

function App() {
    return (
        <div className="App">
            <h1>Welcome to CliNema</h1>
            <LocationComponent /> {/* Render the LocationComponent */}
        </div>
    );
}

export default App;
