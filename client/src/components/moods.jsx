import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Moods = () => {
    const [selectedMoods, setSelectedMoods] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
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
            navigate('/AllMovies', {state: { suggestions }});
            console.log('Movie suggestions:', suggestions);

        } catch (error) {
            console.error('Error fetching movie suggestions:', error);
        }
    };

    const filteredMoods = moods.filter(mood => mood.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className=" flex flex-col items-center bg-gradient-to-tr from-indigo-700 to-secondary-lighter">
            <h2 className="text-4xl font-bold my-8 ">I want to feel...</h2>
            <input
                type="text"
                placeholder="Use emotive words or emojis"
                className="w-[50%] p-2 rounded-md border-2 border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex flex-col items-center w-2/3 m-auto ">
                <div className="flex flex-wrap gap-4 justify-center">
                    {filteredMoods.map((mood) => (
                        <button
                            key={mood.name}
                            className={`flex items-center text-2xl justify-center space-x-2 px-8 py-2 rounded-full transition-all duration-200 ease-in-out
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
                        className="px-6 py-2 bg-white text-black rounded-md hover:bg-primary hover:text-secondary transition-all duration-500"
                        onClick={handleSubmit}
                        disabled={selectedMoods.length === 0}
                    >
                        See Movies
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
