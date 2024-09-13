import { useState, useEffect } from 'react';

const useLocation = () => {
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLatitude(latitude);
                    setLongitude(longitude);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setError("Error getting location");
                }
            );
        } else {
            console.log("Geolocation is not supported by this browser.");
            setError("Geolocation is not supported by this browser.");
        }
    }, []);

    return { latitude, longitude, error };
};

export default useLocation;
