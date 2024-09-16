import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProfilePage = () => {
    const [userData, setUserData] = useState({});
    // const [likedMovies, setLikedMovies] = useState([]);
    // const [savedMovies, setSavedMovies] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('_token');
    const [changedData, setChangedData] = useState({});
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (token) {
                    const response = await axios.get(`${apiUrl}/users/profile`, {
                        headers: {
                        Authorization: `Bearer ${token}`,
                        }
                    });
                    const { first_name, last_name, id} = response.data;
                    setUserData({ first_name, last_name, id});
                    // setUserData(response.data);
                    console.log(response.data);
                } else {
                    console.log('Error UnAuth');
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }
        fetchUserData();
    }, []);

        // const fetchLikedMovies = async () => {
        //     try {
        //         const response = await axios.get('/user/liked-movies'); // Replace with your liked movies API endpoint
        //         setLikedMovies(response.data);
        //     } catch (error) {
        //         console.error('Error fetching liked movies:', error);
        //     }
        // };
        //
        // const fetchSavedMovies = async () => {
        //     try {
        //         const response = await axios.get('/user/saved-movies'); // Replace with your saved movies API endpoint
        //         setSavedMovies(response.data);
        //     } catch (error) {
        //         console.error('Error fetching saved movies:', error);
        //     }
    //     };
    //
    //     fetchUserData();
    //     fetchLikedMovies();
    //     fetchSavedMovies();
    // }, []);

    // const handleLikeMovie = async (movieId) => {
    //     try {
    //         await axios.post('/user/like-movie', { movieId });
    //         const updatedLikedMovies = likedMovies.includes(movieId)
    //             ? likedMovies.filter((id) => id !== movieId)
    //             : [...likedMovies, movieId];
    //         setLikedMovies(updatedLikedMovies);
    //     } catch (error) {
    //         console.error('Error liking movie:', error);
    //     }
    // };
    //
    // const handleSaveMovie = async (movieId) => {
    //     try {
    //         await axios.post('/user/save-movie', { movieId });
    //         const updatedSavedMovies = savedMovies.includes(movieId)
    //             ? savedMovies.filter((id) => id !== movieId)
    //             : [...savedMovies, movieId];
    //         setSavedMovies(updatedSavedMovies);
    //     } catch (error) {
    //         console.error('Error saving movie:', error);
    //     }
    // };
    //
    // const handleDeleteAccount = async () => {
    //     try {
    //         await axios.delete('/user/delete-account'); // Replace with your delete account API endpoint
    //         alert('Account deleted successfully!');
    //     } catch (error) {
    //         console.error('Error deleting account:', error);
    //     }
    // };
    //
    const handleSaveChanges = async () => {
        try {
            const token = localStorage.getItem('_token');
            if (token) {
                const updatedData = {
                    first_name: userData.first_name,
                    last_name: userData.last_name
                };
                await axios.put(`${apiUrl}/users/${userData.id}/profile`, updatedData, {
                    method: 'put',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }}
                );
                setIsEditing(false);
                console.log("new Data", updatedData);
                alert('Profile updated successfully!');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-3xl font-bold mb-4">My Profile</h1>
            <div className="flex flex-col items-center text-secondary-light gap-4">
                {/*<img src={userData?.avatar} alt="Profile Picture" className="w-40 h-40 rounded-full mb-4" />*/}
                <input
                    type="text"
                    value={userData.first_name}
                    onChange={(e) => setUserData({...userData, first_name: e.target.value})}
                    className="border p-2"
                />
                <input
                    type="text"
                    value={userData.last_name}
                    onChange={(e) => setUserData({...userData, last_name: e.target.value})}
                    className="border p-2"
                />
                {/*<input*/}
                {/*    type="text"*/}
                {/*    value={userData.password}*/}
                {/*    onChange={(e) => setUserData({...userData, last_name: e.target.value})}*/}
                {/*    className="border p-2"*/}
                {/*/>*/}
                {/*<input*/}
                {/*    type="text"*/}
                {/*    value={userData.}*/}
                {/*    onChange={(e) => setUserData({...userData, last_name: e.target.value})}*/}
                {/*    className="border p-2"*/}
                {/*/>*/}
                <button
                    onClick={handleSaveChanges}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Save Changes
                </button>
                {/*    <>*/}
                {/*        <p className="text-lg font-semibold">{userData?.name}</p>*/}
                {/*        <p className="text-gray-500">{userData?.username}</p>*/}
                {/*        <button*/}
                {/*            onClick={() => setIsEditing(true)}*/}
                {/*            className="bg-blue-500 text-white px-4 py-2 rounded"*/}
                {/*        >*/}
                {/*            Edit Profile*/}
                {/*        </button>*/}
                {/*    </>*/}
                {/*)}*/}
                {/*<button*/}
                {/*    onClick={handleDeleteAccount}*/}
                {/*    className="bg-red-500 text-white px-4 py-2 mt-4 rounded"*/}
                {/*>*/}
                {/*    Delete Account*/}
                {/*</button>*/}
            </div>

            {/*<h2 className="text-2xl font-semibold mt-6">Liked Movies</h2>*/}
            {/*<ul className="list-disc">*/}
            {/*    {likedMovies.map((movieId) => (*/}
            {/*        <li key={movieId}>{movieId}</li>*/}
            {/*    ))}*/}
            {/*</ul>*/}

            {/*<h2 className="text-2xl font-semibold mt-6">Saved Movies</h2>*/}
            {/*<ul className="list-disc">*/}
            {/*    {savedMovies.map((movieId) => (*/}
            {/*        <li key={movieId}>{movieId}</li>*/}
            {/*    ))}*/}
            {/*</ul>*/}
        </div>
    );
};

export default ProfilePage;
