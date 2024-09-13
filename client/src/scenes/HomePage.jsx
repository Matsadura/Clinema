import Navbar from "../components/Navbar.jsx";
import HeroSection from "../components/HeroSection.jsx";
import LocationComponent from "../components/LocationComponent.jsx";
import MovieList from "../components/MovieList.jsx";

const HomePage = () => {
    return (
        <div>
            <Navbar/>
            <HeroSection/>
            <LocationComponent />
            <MovieList/>
        </div>
    )
}

export default HomePage;