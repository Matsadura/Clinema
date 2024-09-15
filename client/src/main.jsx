import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import HomePage from "./scenes/HomePage.jsx";
import AllMoviesPage from "./scenes/AllMoviesPage.jsx";
import { ContextProvider } from "./components/Context.jsx";
import { PrivateRoute } from "./components/PrivateRoute.jsx";
import AuthPage from "./scenes/AuthPage.jsx";

createRoot(document.getElementById("root")).render(
  // <App />
  <ContextProvider>
    <Router>
      <Routes>
        <Route
          path="/"
          element={<PrivateRoute open={true} element={HomePage} />}
        />
        <Route
          path="/AllMovies"
          element={<PrivateRoute open={true} element={AllMoviesPage} />}
        />
        <Route path="auth" element={<AuthPage />} />
      </Routes>
    </Router>
  </ContextProvider>
);
