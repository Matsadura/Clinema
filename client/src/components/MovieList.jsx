import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import useLocation from '../tools/useLocation.js';

const MovieList = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const sliderRef = useRef(null);
    let scrollInterval = useRef(null);
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await axios.post('http://localhost:5000/api/movies_by_weather', {
                    latitude,
                    longitude
                });

                // Check if response has the expected structure
                if (response.data && Array.isArray(response.data.suggestions)) {
                    console.log("Movies based on weather:", response.data.suggestions);
                    setMovies(response.data.suggestions);
                } else {
                    throw new Error("Unexpected response structure");
                }
            } catch (err) {
                console.error("Error fetching movie data:", err);
                setError("Error fetching movie data");
            }
        };

        fetchMovies();

        const slider = sliderRef.current;
        const scrollSpeed = 1;

        const startScroll = () => {
            if (slider) {
                // If the slider reaches the end, reset to the start for infinite scroll
                if (slider.scrollLeft >= slider.scrollWidth / 2) {
                    slider.scrollLeft = 0;
                }
                slider.scrollLeft += scrollSpeed;
            }
        };

        // Start auto-scrolling
        scrollInterval.current = setInterval(startScroll, 20);

        // Stop scrolling on hover
        const handleMouseEnter = () => clearInterval(scrollInterval.current);

        // Resume scrolling after hover
        const handleMouseLeave = () => {
            scrollInterval.current = setInterval(startScroll, 20);
        };

        slider.addEventListener('mouseenter', handleMouseEnter);
        slider.addEventListener('mouseleave', handleMouseLeave);

        // Cleanup event listeners and intervals on component unmount
        return () => {
            clearInterval(scrollInterval.current);
            slider.removeEventListener('mouseenter', handleMouseEnter);
            slider.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [latitude, longitude]);

    return (
        <div
            ref={sliderRef}
            className="flex overflow-x-auto space-x-4 p-4 scrollbar-hide"
        >
            {error && <p className="text-red-500">{error}</p>}
            {movies.map((movie, index) => (
                <div
                    key={index}
                    className={`min-w-[300px] bg-white h-[200px] flex items-center justify-center rounded-lg shadow-lg`}
                >
                    {movie}
                </div>
            ))}
        </div>
    );
};

export default MovieList;
