import { useEffect, useState } from 'react';
import axios from 'axios';

const LocationComponent = () => {
    // eslint-disable-next-line no-unused-vars
    const [latitude, setLatitude] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [longitude, setLongitude] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if Geolocation API is available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLatitude(latitude);
                    setLongitude(longitude);
                    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

                    // Send latitude and longitude to the Flask backend
                    axios.get(`http://localhost:5000/weather?lat=${latitude}&lon=${longitude}`)
                        .then(response => {
                            setWeatherData(response.data);  // Set weather data in state
                            console.log("Weather data:", response.data); // Log the response data
                        })
                        .catch(err => {
                            console.error("Error fetching weather data:", err);
                            setError("Error fetching weather data");
                        });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setError("Error getting location");
                }
            );
        } else {
            console.log("Geolocation is not supported by this browser.");
            setError("Geolocation is not supported by this browser.");
        }
    }, []);  // The empty array ensures this runs once when the component mounts

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
        </div>
    );
};

export default LocationComponent;
