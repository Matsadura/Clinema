import {useContext, useEffect, useState} from "react";
import { useLocation } from "react-router-dom";
import MovieCard from "../components/MovieCard.jsx";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import {DataContext} from "../components/Context.jsx";

const AllMoviesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailedMovies, setDetailedMovies] = useState({});
  const location = useLocation();
  const { user } = useContext(DataContext);

  useEffect(() => {
    if (location.state && location.state.suggestions) {
      console.log("one");
      fetchDetailedMovies(location.state.suggestions);
    }
  }, [location]);

  const fetchDetailedMovies = async (titles) => {
    try {
      const tmDbApiKey = process.env.REACT_APP_TMDB_API_KEY;
      const promises = titles.map(async (title) => {
        try {
          const response = await axios.get(
            `https://api.themoviedb.org/3/search/movie`,
            {
              params: {
                api_key: tmDbApiKey,
                query: title,
                page: 1,
              },
            }
          );

          if (response.data.results && response.data.results.length > 0) {
            const movieData = response.data.results[0];
            
            // ADD MOVIE TO DATABASE
            const token = localStorage.getItem('_token');
            if (token) {
              const dataToSend = {
                tmdb_id: movieData.id,
                name: movieData.title,
                description: movieData.overview,
                poster: `https://image.tmdb.org/t/p/w500/${movieData.poster_path}`,
                adult: movieData.adult,
                popularity: movieData.popularity,
                year: new Date(movieData.release_date).getFullYear(),
                rating: movieData.vote_average
              };

              try {
                const addMovieResponse = await axios.post(
                  `${process.env.REACT_APP_API_URL}/movies`,
                  dataToSend,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    }
                  }
                );
                console.log('Movie added to database:', addMovieResponse.data);
              } catch (dbErr) {
                console.error('Error adding movie to database:', dbErr);
              }
            }
            
            return movieData;
          } else {
            return null;
          }
        } catch (err) {
          console.error(`Error fetching movie details for ${title}:`, err);
          return null;
        }
      });
      const results = await Promise.all(promises);
      console.log(results);
      const detailedMoviesObj = {};
      titles.forEach((title, index) => {
        if (results[index]) {
          detailedMoviesObj[title] = results[index];
        }
      });
      setDetailedMovies(detailedMoviesObj);
    } catch (err) {
      setError("Failed to fetch detailed movie information");
      console.error("Error fetching detailed movies:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="flex flex-col items-center gap-20">
        {loading ? (
          <p>Loading movies...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          Object.keys(detailedMovies).map((title) => {
            const movieDetails = detailedMovies[title];
            const moviePoster = `https://image.tmdb.org/t/p/w500/${movieDetails.poster_path}`;
            // '/path/to/default-poster.jpg';

            return (
              <MovieCard
                key={movieDetails.id}
                userId = {localStorage.getItem('_user_id')} // TMP
                movie_id={movieDetails.id}
                title={movieDetails.title}
                // adult={movieDetails.adult}
                poster={moviePoster}
                year={movieDetails.release_date?.slice(0, 4)}
                rate={movieDetails.vote_average}
                popularity={movieDetails.popularity}
                trailer={movieDetails.homepage}
                lang={movieDetails.original_language}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default AllMoviesPage;
