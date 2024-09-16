import { useState, useEffect } from 'react';
import axios from 'axios';

const useUserData = () => {
    const [userData, setUserData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("start");
        const fetchUserData = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL;
                const token = localStorage.getItem('_token');
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
    console.log("end");
    return { userData, loading, error };
};

export default useUserData;
