import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import HomePage from "./scenes/HomePage.jsx";
import AllMoviesPage from "./scenes/AllMoviesPage.jsx";
import { ContextProvider } from "./components/Context.jsx";
import { PrivateRoute } from "./components/PrivateRoute.jsx";
import AuthPage from "./scenes/AuthPage.jsx";
import About from "./scenes/About.jsx";
import UserProfile from "./scenes/UserProfile.jsx";
import LikedMoviesPage from "./scenes/LikedMoviesPage.jsx";
import SavedMoviesPage from "./scenes/SavecMoviesPage.jsx";

createRoot(document.getElementById("root")).render(
  <ContextProvider>
    <Router>
      <Routes>
        <Route
          path="/"
          element={<PrivateRoute open={true} element={HomePage} />}
        />
        <Route path="/AllMovies" element={<PrivateRoute open={true} element={AllMoviesPage} />} />    
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/liked-movies" element={<PrivateRoute  element={LikedMoviesPage} />} />
        <Route path="/saved-movies" element={<PrivateRoute  element={SavedMoviesPage} />} />
        <Route path="/users/profile" element={<PrivateRoute element={UserProfile} />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  </ContextProvider>
);
