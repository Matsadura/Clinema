import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCardLikedSaved.jsx';

const LikedMoviesPage = ({ userId }) => {
    const [likedMovies, setLikedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLikedMovies = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL;
                const token = localStorage.getItem('_token');
                const userId = localStorage.getItem('_user_id');
                const response = await axios.get(`${apiUrl}/${userId}/liked`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                // Fetch movie details for each liked movie
                const movieDetailsPromises = response.data.map(async (movie) => {
                    const movieResponse = await axios.get(`${apiUrl}/movies/${movie.movie_id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    });
                    return movieResponse.data;
                });

                const movieDetails = await Promise.all(movieDetailsPromises);
                setLikedMovies(movieDetails);
                setLoading(false);
            } catch (error) {
                setError(error.response?.data || error.message);
                setLoading(false);
            }
        };
        fetchLikedMovies();
    }, [userId]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="liked-movies-page">
            <h2>Liked Movies</h2>
            <div className="movie-list">
                {likedMovies.length > 0 ? (
                    likedMovies.map(movie => (
                        <MovieCard key={movie.movie_id} {...movie} />
                    ))
                ) : (
                    <p>No liked movies found.</p>
                )}
            </div>
        </div>
    );
};

export default LikedMoviesPage;
