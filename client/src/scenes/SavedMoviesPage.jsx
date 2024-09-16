import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCardLikedSaved.jsx';
import Navbar from '../components/Navbar.jsx';

const SavedMoviesPage = ({ userId }) => {
    const [savedMovies, setSavedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSavedMovies = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL;
                const token = localStorage.getItem('_token');
                const userId = localStorage.getItem('_user_id');
                const response = await axios.get(`${apiUrl}/${userId}/save`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                // Fetch movie details for each saved movie
                const movieDetailsPromises = response.data.map(async (movie) => {
                    const movieResponse = await axios.get(`${apiUrl}/movies/${movie.movie_id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });
                    return movieResponse.data;
                });

                const movieDetails = await Promise.all(movieDetailsPromises);
                setSavedMovies(movieDetails);
                setLoading(false);
            } catch (error) {
                setError(error.response?.data || error.message);
                setLoading(false);
            }
        };
        fetchSavedMovies();
    }, [userId]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="saved-movies-page">
            <Navbar />
            <div className="movie-list flex-col gap-10 flex items-center">
                <h2 className='text-4xl font-bold text-white mt-14 mb-6'>Saved Movies</h2>
                {savedMovies.length > 0 ? (
                    savedMovies.map(movie => (
                        <MovieCard key={movie.movie_id} {...movie} />
                    ))
                ) : (
                    <p>No saved movies found.</p>
                )}
            </div>
        </div>
    );
};

export default SavedMoviesPage;
