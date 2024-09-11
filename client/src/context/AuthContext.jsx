import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const token = localStorage.getItem('Token');

    const [isAuthenticated, setIsAuthenticated] = useState(token ? true : false);

    const login = async (email, password) => {
        try {
            const response = await axios.post('http://localhost:4000/auth/login', { email, password });
            localStorage.setItem('Token', response.headers.get('Token'));
            setIsAuthenticated(true);
            navigate('/');
        } catch (error) {
            alert(error.response.data.message);
        }
    };
    const register = async (data) => {
        try {
            const response = await axios.post(
                'http://localhost:4000/auth/register', data);
            if (response.status !== 200) {
                setError(response.data.message);
            } else {

                window.location.href = '/login';
            }
        } catch (err) {
            alert(err.response.data.message);
        }
    }

    const logout = () => {
        localStorage.removeItem('Token');
        setIsAuthenticated(false);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };
