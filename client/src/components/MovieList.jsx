import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import useLocation from '../tools/useLocation.js';

const MovieList = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const sliderRef = useRef(null);
    let scrollInterval = useRef(null);
    const [movies, setMovies] = useState([]);
    const [detailedMovies, setDetailedMovies] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                if (latitude && longitude) {
                    setLoading(true);
                    const apiUrl = 'http://localhost:5000/api';
                    const response = await axios.post(`${apiUrl}/movies_by_weather`, {
                        latitude,
                        longitude
                    });

                    if (response.data && Array.isArray(response.data.suggestions)) {
                        console.log("Movies based on weather:", response.data.suggestions);
                        setMovies(response.data.suggestions);
                        fetchDetailedMovies(response.data.suggestions);
                    } else {
                        throw new Error("Unexpected response structure");
                    }
                }
            } catch (err) {
                console.error("Error fetching movie data:", err);
                setError("Error fetching movie data");
            } finally {
                setLoading(false);
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

    const fetchDetailedMovies = async (movieTitles) => {
        try {
            const tmdbApiKey = '053eb113f643b3927cdb732d7dec43bc';
            const promises = movieTitles.map(async (title) => {
                try {
                    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
                        params: {
                            api_key: tmdbApiKey,
                            query: title,
                            page: 1
                        }
                    });

                    if (response.data.results && response.data.results.length > 0) {
                        return response.data.results[0];
                    } else {
                        console.warn(`No detailed info found for movie: ${title}`);
                        return null;
                    }
                } catch (err) {
                    console.error(`Error fetching detailed info for movie ${title}:`, err);
                    return null;
                }
            });
            const results = await Promise.all(promises);
            const detailedMoviesObj = {};
            results.forEach((result, index) => {
                if (result) {
                    detailedMoviesObj[movieTitles[index]] = result;
                }
            });
            setDetailedMovies(detailedMoviesObj);
        } catch (err) {
            console.error("Error fetching detailed movie data:", err);
            setError("Failed to fetch detailed movie information");
        }
    };

    return (
        <div className="flex flex-col space-y-4 p-4">
            {loading && <p>Loading movie information...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
                <div
                    ref={sliderRef}
                    className="flex overflow-x-auto space-x-4 scrollbar-hide"
                >
                    {movies.map((movie, index) => (
                        <div
                            key={index}
                            className={`min-w-[300px] bg-white h-[400px] rounded-lg shadow-lg`}
                        >
                            {detailedMovies[movie] ? (
                                <>
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${detailedMovies[movie].poster_path}`}
                                        alt={detailedMovies[movie].title}
                                        className="object-cover w-full h-48"
                                    />
                                    <div className="p-4">
                                        <h2 className="text-xl font-bold mb-2">{detailedMovies[movie].title}</h2>
                                        <p className="mb-2">{detailedMovies[movie].overview}</p>
                                        <p className="font-semibold">Release Date: {detailedMovies[movie].release_date}</p>
                                        <p className="font-semibold">Rating: {detailedMovies[movie].vote_average}/10</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p>No detailed info available</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MovieList;
