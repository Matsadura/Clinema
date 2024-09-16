import Navbar from "../components/Navbar.jsx";
import HeroSection from "../components/HeroSection.jsx";
import LocationComponent from "../components/LocationComponent.jsx";
import MovieList from "../components/MovieList.jsx";
import Moods from "../components/moods.jsx";
import Footer from "../components/Footer.jsx";

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <HeroSection />
      {/* <LocationComponent /> */}
      <Moods />
      <MovieList />
      <Footer />
    </div>
  );
};

export default HomePage;
