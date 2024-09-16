import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCardLikedSaved.jsx';
import Navbar from '../components/Navbar.jsx';

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
            <Navbar />
            <div className="movie-list flex  flex-col items-center gap-12 pb-20">
                <h2 className='text-4xl font-bold text-white mt-14 mb-6'>Liked Movies</h2>
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
