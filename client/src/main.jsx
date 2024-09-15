import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App.jsx'
import './index.css'
import HomePage from "./scenes/HomePage.jsx";
import AllMoviesPage from "./scenes/AllMoviesPage.jsx";

createRoot(document.getElementById('root')).render(
    // <App />
    <Router>
        <Routes>
            <Route path="/" element={<HomePage/>} />
            <Route path="/AllMovies" element={<AllMoviesPage/>} />
        </Routes>
    </Router>
);
