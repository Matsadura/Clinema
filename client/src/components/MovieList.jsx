import { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import useLocation from '../tools/useLocation.js';
import { useNavigate } from "react-router-dom";

const MovieList = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const [movies, setMovies] = useState([]);
    const [detailedMovies, setDetailedMovies] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();


    // Fetch movie data based on weather location
    useEffect(() => {
        const fetchMovies = async () => {
            try {
                if (latitude && longitude) {
                    setLoading(true);
                    const apiUrl = process.env.REACT_APP_API_URL;
                    const response = await axios.post(`${apiUrl}/movies_by_weather`, {
                        latitude,
                        longitude,
                    });

                    if (response.data && Array.isArray(response.data.suggestions)) {
                        setMovies(response.data.suggestions);
                        fetchDetailedMovies(response.data.suggestions);
                    } else {
                        throw new Error("Unexpected response structure");
                    }
                }
            } catch (err) {
                setError("Error fetching movie data");
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [latitude, longitude]);

    const fetchDetailedMovies = async (movieTitles) => {
        try {
            const tmDbApiKey = process.env.REACT_APP_TMDB_API_KEY;
            const promises = movieTitles.map(async (title) => {
                try {
                    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
                        params: {
                            api_key: tmDbApiKey,
                            query: title,
                            page: 1,
                        },
                    });

                    if (response.data.results && response.data.results.length > 0) {
                        return response.data.results[0];
                    } else {
                        return null;
                    }
                } catch (err) {
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
            setError("Failed to fetch detailed movie information");
        }
    };

    const handleSeeAllClick = () => {
        if (movies.length > 0) {
            navigate('/AllMovies', { state: { suggestions: movies } });
        } else {
            console.log('No movies available');
        }
    }

    return (
        <div id="movies" className="h-screen flex flex-col space-y-4 p-4">
            {loading && <p>Loading movie information...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <h1 className="flex justify-center text-3xl text-white font-semibold mt-4">Recommendations Based On Your Local Weather</h1>
            <div className="flex justify-end">
                <button
                    className="mb-6 group group-hover:before:duration-500 group-hover:after:duration-500 after:duration-500 hover:border-rose-300 hover:before:[box-shadow:_20px_20px_20px_30px_#a21caf] duration-500 before:duration-500 hover:duration-500 underline underline-offset-2 hover:after:-right-8 hover:before:right-12 hover:before:-bottom-8 hover:before:blur hover:underline hover:underline-offset-4  origin-left hover:decoration-2 hover:text-rose-300 relative bg-neutral-800 h-10 w-40 border text-left p-3 text-gray-50 text-base font-bold rounded-lg  overflow-hidden  before:absolute before:w-12 before:h-12 before:content[''] before:right-1 before:top-1 before:z-10 before:bg-violet-500 before:rounded-full before:blur-lg  after:absolute after:z-10 after:w-20 after:h-20 after:content['']  after:bg-rose-300 after:right-8 after:top-3 after:rounded-full after:blur-lg"
                    onClick={handleSeeAllClick}
                >
                    Show All
                </button>
            </div>
            {!loading && !error && (
                <div
                    className="flex overflow-hidden space-x-6"
                >
                    {movies.map((movie, index) => (
                        detailedMovies[movie] ? (

                            <div
                                key={index}
                                className={`w-[250px]  shrink-0 bg-white overflow-hidden rounded-3xl shadow-lg  animate-infinite-scroll hover:animate-pause`}
                            >
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${detailedMovies[movie].poster_path}`}
                                    alt={detailedMovies[movie].title}
                                    className="object-cover "
                                />
                            </div>) : null
                    ))}
                </div>
            )}
        </div>
    );
};

export default MovieList;
