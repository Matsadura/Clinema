import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import HomePage from "./scenes/HomePage.jsx";
import AllMoviesPage from "./scenes/AllMoviesPage.jsx";
import { ContextProvider } from "./components/Context.jsx";
import { PrivateRoute } from "./components/PrivateRoute.jsx";

createRoot(document.getElementById("root")).render(
  // <App />
  <ContextProvider>
    <Router>
      <Routes>
        <Route
          path="/"
          element={<PrivateRoute open={true} component={HomePage} />}
        />
        <Route
          path="/AllMovies"
          element={<PrivateRoute open={true} component={AllMoviesPage} />}
        />
      </Routes>
    </Router>
  </ContextProvider>
);
