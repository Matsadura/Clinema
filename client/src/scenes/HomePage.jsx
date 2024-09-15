import Navbar from "../components/Navbar.jsx";
import HeroSection from "../components/HeroSection.jsx";
import LocationComponent from "../components/LocationComponent.jsx";
import MovieList from "../components/MovieList.jsx";
import Moods from "../components/moods.jsx";
import MovieCard from "../components/MovieCard.jsx";

const HomePage = () => {
    return (
        <div>
            <Navbar/>
            <HeroSection/>
            <LocationComponent />
            <MovieList/>
            <Moods/>
            {/*<MovieCard/>*/}
        </div>
    )
}

export default HomePage;