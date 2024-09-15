import React, { useState, useEffect } from 'react';
import axios from 'axios';
import daytime from '../images/cloudy.jpg'; // Replace with your daytime image path
import nighttime from '../images/night.jpg'; // Replace with your nighttime image path
import useLocation from '../tools/useLocation.js';

const LocationComponent = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const [weatherData, setWeatherData] = useState(null);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const updateClock = () => {
            setCurrentTime(new Date());
        };

        const intervalId = setInterval(updateClock, 1000); // Update every second

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    useEffect(() => {
        if (latitude && longitude) {
            axios.get(`http://localhost:5000/api/weather?lat=${latitude}&lon=${longitude}`)
                .then(response => {
                    setWeatherData(response.data);
                })
                .catch(err => {
                    console.error("Error fetching weather data:", err);
                    setError("Error fetching weather data");
                });
        }
    }, [latitude, longitude]);

    const isDaytime = currentTime.getHours() >= 6 && currentTime.getHours() < 20; // Adjust sunrise/sunset times if needed

    return (
        <div
            className={` relative h-screen flex flex-col justify-center items-center py-16 px-8 rounded-lg shadow-lg ${
                isDaytime ? 'bg-cover bg-center' : 'bg-cover bg-center'
            }`}
            style={{
                backgroundImage: `url(${isDaytime ? daytime : nighttime})`,
                backgroundSize: 'cover',
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-90 rounded-lg"></div>
            <div className="relative z-10">
                <h2 className="text-4xl text-white font-bold">Your Location Weather</h2>

                {weatherData ? (
                    <div className="flex flex-col items-center mt-8">
                        <img src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`}
                             alt="Weather Icon" className="w-44 h-44 rounded-full"/>
                        <p className="text-3xl text-white font-semibold mt-4">{weatherData.weather[0].main}</p>
                        <p className="text-xl text-white">{weatherData.main.temp}°C</p>
                        <p className="text-base text-white opacity-75">{weatherData.weather[0].description}</p>
                    </div>
                ) : (
                    <p className="text-lg text-white mt-4">{error || "Fetching weather..."}</p>
                )}

                <div className="flex flex-col items-center mt-2 space-y-2">
                    <p className="text-white">See all perfect Movies for This Weather</p>

                    <button
                        className="text-white hover:text-gray-200 bg-secondary-lighter hover:bg-primary focus:ring-secondary-light font-medium rounded-lg text-xl px-5 py-2.5 text-center mr-2 mb-2 dark:hover:bg-primary">
                        Scroll Down!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationComponent;