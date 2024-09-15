import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProfilePage = () => {
    const [userData, setUserData] = useState({
        name: '',
        username: '',
        profilePicture: ''
    });
    const [likedMovies, setLikedMovies] = useState([]);
    const [savedMovies, setSavedMovies] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('/user/profile'); // Replace with your user profile API endpoint
                setUserData(response.data);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        const fetchLikedMovies = async () => {
            try {
                const response = await axios.get('/user/liked-movies'); // Replace with your liked movies API endpoint
                setLikedMovies(response.data);
            } catch (error) {
                console.error('Error fetching liked movies:', error);
            }
        };

        const fetchSavedMovies = async () => {
            try {
                const response = await axios.get('/user/saved-movies'); // Replace with your saved movies API endpoint
                setSavedMovies(response.data);
            } catch (error) {
                console.error('Error fetching saved movies:', error);
            }
        };

        fetchUserData();
        fetchLikedMovies();
        fetchSavedMovies();
    }, []);

    const handleLikeMovie = async (movieId) => {
        try {
            await axios.post('/user/like-movie', { movieId });
            const updatedLikedMovies = likedMovies.includes(movieId)
                ? likedMovies.filter((id) => id !== movieId)
                : [...likedMovies, movieId];
            setLikedMovies(updatedLikedMovies);
        } catch (error) {
            console.error('Error liking movie:', error);
        }
    };

    const handleSaveMovie = async (movieId) => {
        try {
            await axios.post('/user/save-movie', { movieId });
            const updatedSavedMovies = savedMovies.includes(movieId)
                ? savedMovies.filter((id) => id !== movieId)
                : [...savedMovies, movieId];
            setSavedMovies(updatedSavedMovies);
        } catch (error) {
            console.error('Error saving movie:', error);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete('/user/delete-account'); // Replace with your delete account API endpoint
            alert('Account deleted successfully!');
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    };

    const handleSaveChanges = async () => {
        try {
            await axios.put('/user/update-profile', userData); // Replace with your update profile API endpoint
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-3xl font-bold mb-4">My Profile</h1>
            <div className="flex flex-col items-center gap-4">
                <img src={userData?.profilePicture} alt="Profile Picture" className="w-40 h-40 rounded-full mb-4" />
                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={userData.name}
                            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                            className="border p-2"
                        />
                        <input
                            type="text"
                            value={userData.username}
                            onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                            className="border p-2"
                        />
                        <button
                            onClick={handleSaveChanges}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Save Changes
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-semibold">{userData?.name}</p>
                        <p className="text-gray-500">{userData?.username}</p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Edit Profile
                        </button>
                    </>
                )}
                <button
                    onClick={handleDeleteAccount}
                    className="bg-red-500 text-white px-4 py-2 mt-4 rounded"
                >
                    Delete Account
                </button>
            </div>

            <h2 className="text-2xl font-semibold mt-6">Liked Movies</h2>
            <ul className="list-disc">
                {likedMovies.map((movieId) => (
                    <li key={movieId}>{movieId}</li>
                ))}
            </ul>

            <h2 className="text-2xl font-semibold mt-6">Saved Movies</h2>
            <ul className="list-disc">
                {savedMovies.map((movieId) => (
                    <li key={movieId}>{movieId}</li>
                ))}
            </ul>
        </div>
    );
};

export default ProfilePage;
