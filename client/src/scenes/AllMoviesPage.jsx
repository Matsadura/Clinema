import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import MovieCard from "../components/MovieCard.jsx";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";

const AllMoviesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailedMovies, setDetailedMovies] = useState({});
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.suggestions) {
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
            return response.data.results[0];
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
                key={title}
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
