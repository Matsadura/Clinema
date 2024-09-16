import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useLocation from "../tools/useLocation.js";

const Moods = () => {
    const { latitude, longitude, error: locationError } = useLocation();
    const [selectedMoods, setSelectedMoods] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingCombined, setLoadingCombined] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const moods = [
        { name: "Joyful", emoji: "😊" },
        { name: "Euphoric", emoji: "🤩" },
        { name: "Serene", emoji: "😌" },
        { name: "Grateful", emoji: "🙏" },
        { name: "Optimistic", emoji: "🌞" },
        { name: "Hopeful", emoji: "🌟" },
        { name: "Excited", emoji: "🎉" },
        { name: "Enthusiastic", emoji: "🤗" },
        { name: "Astonished", emoji: "😲" },
        { name: "Intrigued", emoji: "🤔" },
        { name: "Curious", emoji: "❓" },
        { name: "Confident", emoji: "😎" },
        { name: "Proud", emoji: "🏆" },
        { name: "Sad", emoji: "😢" },
        { name: "Depressed", emoji: "😔" },
        { name: "Stressed", emoji: "😓" },
        { name: "Angry", emoji: "😡" },
        { name: "Surprised", emoji: "😮" },
        { name: "Tired", emoji: "😴" },
        { name: "Relaxed", emoji: "🛀" },
        { name: "Bored", emoji: "😐" },
        { name: "Lonely", emoji: "😞" },
        { name: "Calm", emoji: "🌊" },
        { name: "Reflective", emoji: "🤔" },
    ];

    const handleMoodClick = (mood) => {
        const newSelectedMoods = [...selectedMoods];
        const index = newSelectedMoods.indexOf(mood.name);
        if (index !== -1) {
            newSelectedMoods.splice(index, 1);
        } else {
            newSelectedMoods.push(mood.name);
        }
        setSelectedMoods(newSelectedMoods);
    };

    const handleSubmit = async () => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await axios.post(`${apiUrl}/movies_by_mood`, { mood: selectedMoods });
            const suggestions = response.data.suggestions;
            navigate('/AllMovies', { state: { suggestions } });

        } catch (error) {
            console.error('Error fetching movie suggestions:', error);
        }
    };

    const handleWeatherAndMoodClick = async () => {
        try {
            setLoadingCombined(true);
            if (latitude && longitude) {
                const apiUrl = process.env.REACT_APP_API_URL;
                const response = await axios.post(`${apiUrl}/movies_by_mood_and_weather`, {
                    mood: selectedMoods,
                    latitude,
                    longitude,
                });

                if (response.data && Array.isArray(response.data.suggestions)) {
                    const suggestions = response.data.suggestions;
                    navigate('/AllMovies', { state: { suggestions } });
                } else {
                    throw new Error("Unexpected response structure");
                }
            }
        } catch (err) {
            setError("Error fetching movie data");
        } finally {
            setLoadingCombined(false);
        }
    };

    const filteredMoods = moods.filter(mood => mood.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="md:h-screen flex flex-col items-center border-t-2 border-primary py-14">
            <h2 className="text-4xl font-bold text-white my-8">I want to feel...</h2>
            <input
                type="text"
                placeholder="Use emotive words or emojis"
                className="w-[50%] p-4 bg-secondary-dark text-white rounded-md border-2 border-primary focus:outline-none mb-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex flex-col mt-4 items-center w-2/3 m-auto ">
                <div className="flex flex-wrap gap-4 justify-center">
                    {filteredMoods.map((mood) => (
                        <button
                            key={mood.name}
                            className={`flex items-center md:text-2xl text-sm justify-center border-2 border-primary space-x-2 px-8 py-2 rounded-full transition-all duration-200 ease-in-out
                        ${selectedMoods.includes(mood.name) ? 'bg-primary text-black' : 'bg-secondary-dark text-white'} 
                        hover:scale-110 hover:shadow-md`}
                            onClick={() => handleMoodClick(mood)}
                        >
                            <span>{mood.emoji}</span>
                            <span>{mood.name}</span>
                        </button>
                    ))}
                </div>
                <div className="my-6 flex justify-center space-x-4">

                    <button
                        className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-700 transition-all duration-500"
                        onClick={handleWeatherAndMoodClick}
                    >
                        Movies by Mood & Weather
                    </button>

                    <button
                        className="px-6 py-2 bg-white text-bold text-black rounded-md hover:bg-primary hover:text-secondary transition-all duration-500"
                        onClick={handleSubmit}
                        disabled={selectedMoods.length === 0}
                    >
                        Movies By Mood
                    </button>
                    <button
                        className="px-6 py-2 bg-white text-black rounded-md hover:bg-red-600 transition-all duration-500"
                        onClick={() => setSelectedMoods([])}
                    >
                        Clear Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Moods;
