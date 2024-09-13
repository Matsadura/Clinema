import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useLocation from '../tools/useLocation.js';

const LocationComponent = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const [weatherData, setWeatherData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (latitude && longitude) {
            axios.get(`http://localhost:5000/api/weather?lat=${latitude}&lon=${longitude}`)
                .then(response => {
                    setWeatherData(response.data);
                    console.log("Weather data:", response.data);
                })
                .catch(err => {
                    console.error("Error fetching weather data:", err);
                    setError("Error fetching weather data");
                });
        }
    }, [latitude, longitude]);  // Use location in the effect

    return (
        <div>
            <h2>Your Location Weather</h2>
            {weatherData ? (
                <div>
                    <p>Temperature: {weatherData.main.temp}°C</p>
                    <p>Weather: {weatherData.weather[0]?.description}</p>
                    <p>Location: {weatherData.name}</p>
                </div>
            ) : (
                <p>{error ? error : "Fetching weather..."}</p>
            )}
            {locationError && <p>{locationError}</p>}
        </div>
    );
};

export default LocationComponent;
