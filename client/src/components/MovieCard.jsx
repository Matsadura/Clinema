import { TiHeartFullOutline, TiBookmark, TiEject, TiArrowRight, TiStarFullOutline } from "react-icons/ti";
import { LuClock } from "react-icons/lu";
import { MdDateRange } from "react-icons/md";
import { MdLanguage } from "react-icons/md";
import { useState } from 'react';
import axios from 'axios';
import { MdPeopleAlt } from "react-icons/md";


export default function MovieCard({userId, movie_id, title, poster, year, rate, popularity, trailer, language, description }) {
    const [liked, setLiked] = useState(false)
    const [save, setSave] = useState(false);


    const toggleLike = async (movie_id, liked) => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const token = localStorage.getItem('_token');
            const userId = localStorage.getItem('_user_id');

            // Check if user already liked this movie
            const userLikedResponse = await axios.get(`${apiUrl}/${userId}/user_movies`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            console.log("9bel:", userLikedResponse);
            const likedMovie = userLikedResponse.data.find(movie => movie && movie.movie_id && movie.movie_id === movie_id);
            console.log("likedMovie", likedMovie);

            if (likedMovie) {
                // Update existing like record
                const dataToSend = {
                    user_id: userId,
                    movie_id: movie_id,
                    like: !liked  // Update like value to the opposite
                };

                const updateResponse = await axios.put(`${apiUrl}/${userId}/liked/${likedMovie.id}`, dataToSend, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                if (updateResponse.status === 200) {

                    console.log("Like status updated (PUT):", updateResponse);
                    setLiked(!liked);  // Toggle the local state
                } else {
                    console.error("Error updating like:", updateResponse.data);
                }
            } else {
                // Send new like request
                const dataToSend = {
                    user_id: userId,
                    movie_id: movie_id,
                    like: true
                };

                const response = await axios.post(`${apiUrl}/${userId}/liked`, dataToSend, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                console.log("New like added (POST):", response.data);
                setLiked(true);
            }
        } catch (error) {
            console.error("Error toggling like:", error.response?.data || error.message);
        }
    };

    const toggleSave = async (movie_id, saved) => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const token = localStorage.getItem('_token');
            const userId = localStorage.getItem('_user_id');

            // Check if user already liked this movie
            const userSavedResponse = await axios.get(`${apiUrl}/${userId}/user_movies`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            console.log("9bel:", userSavedResponse);
            const savedMovie = userSavedResponse.data.find(movie => movie && movie.movie_id && movie.movie_id === movie_id);
            console.log("savedMovie", savedMovie);

            if (savedMovie) {
                // Update existing like record
                const dataToSend = {
                    user_id: userId,
                    movie_id: movie_id,
                    save: !save  // Update like value to the opposite
                };

                const updateResponse = await axios.put(`${apiUrl}/${userId}/save/${savedMovie.id}`, dataToSend, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                if (updateResponse.status === 200) {

                    console.log("Save status updated (PUT):", updateResponse);
                    setSave(!save);  // Toggle the local state
                } else {
                    console.error("Error updating save:", updateResponse.data);
                }
            } else {
                // Send new like request
                const dataToSend = {
                    user_id: userId,
                    movie_id: movie_id,
                    save: true
                };

                const response = await axios.post(`${apiUrl}/${userId}/save`, dataToSend, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                console.log("New like added (POST):", response.data);
                setSave(true);
            }
        } catch (error) {
            console.error("Error toggling save:", error.response?.data || error.message);
        }
    };

    return <div className='flex justify-start  ml-5 mt-5 md:flex-row flex-col md:h-96 h-fit'>
        {/* Container contains the poster and the movie infos  */}
        <div className='text-white gap-3  bg-secondary-light rounded-3xl flex flex-col-reverse md:flex-row md:rounded-br-none pr-5'>
            {/* Movies poster container */}
            <div className='flex-shrink-0 p-5 md:w-60 justify-center w-[1000pw] aspect-[1.5] md:relative top-[1rem] md:scale-110 scale-1 bg-secondary-light rounded-3xl flex'>
                {poster ?
                    <img className="object-cover rounded-2xl" src={poster} alt="testing" />
                    : <div className='bg-primary border-2 w-full rounded-2xl flex items-center justify-center font-bold'>Poster Not found</div>}
            </div>
            {/* Movies infos container */}
            <div className='md:p-10 w-[600px] p-4 flex flex-col justify-between'>
                <h3 className='font-bold text-3xl pt-5 md:mb-0 mb-8 md:text-start text-center'>{title || 'No Title :('}</h3>
                <div className='ml-4 flex items-center md:border-0 md:py-0 border-b-2 border-t-2 py-4 md:justify-start justify-center md:mt-0 mt-5 gap-2'>
                    <div className='text-4xl text-yellow-400'>
                        <TiStarFullOutline />
                    </div>
                    <span className='text-2xl font-bold relative top-[4px]'>{rate || 0.0}</span>
                </div>
                {/* Description section */}
                <div className='mt-5'>
                        <h4 className='font-bold text-lg mb-2'>Description</h4>
                        <p className='text-sm md:text-md text-gray-300'>{description || 'No description available.'}</p>
                    </div>
                <div className='flex flex-row justify-around gap-2 md:mt-5 mt-10 md:flex-nowrap flex-wrap'>
                    <div className='flex md:flex-row flex-col gap-3 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <MdPeopleAlt/>
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Popularity</p>
                            <p className='md:text-lg md:text-md font-bold'>{popularity || '0%'}</p>
                        </div>
                    </div>
                    <div className='flex md:flex-row flex-col gap-2 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <MdDateRange />
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Year</p>
                            <p className='md:text-lg md:text-md font-bold'>{year || 1912}</p>
                        </div>
                    </div>
                    <div className='flex md:flex-row flex-col gap-2 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <MdLanguage />
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Language</p>
                            <p className='md:text-lg md:text-md font-bold'>{language || 'Nolang'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/* This is the buttons side*/}
        <div className='bg-secondary rounded-3xl flex flex-col md:h-96 text-white'>
            <div className='p-4 flex justify-center gap-4 rounded-3xl bg-secondary'>
                <button
                    onClick={() => toggleLike(movie_id, liked)}
                    className={`rounded-2xl ${liked ? 'text-red-400' : ''} text-4xl bg-secondary-light p-4 hover:bg-primary hover:shadow-sm hover:shadow-secondary-lighter`}>
                    <TiHeartFullOutline/>
                </button>
                <button
                    onClick={() => toggleSave(movie_id, liked)}
                    className={`rounded-2xl ${save ? 'text-yellow-400' : ''} text-4xl bg-secondary-light p-4 hover:bg-primary hover:shadow-sm hover:shadow-secondary-lighter`}>
                    <TiBookmark/>
                </button>
            </div>
        </div>
    </div >
}