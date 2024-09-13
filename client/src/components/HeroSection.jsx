import hero_section from "../images/hero.png";

const HeroSection = () => {
    return (
        <section className="relative min-h-screen bg-secondary-dark">
            <div className="absolute inset-0">
                <img
                    src={hero_section}
                    alt="Hero Section"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-100"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white px-4">
                <h1 className="text-4xl font-bold mb-4">
                    Discover the perfect movie to match your mood and the weather.
                </h1>
                <p className="text-lg font-sans">
                    Emotion-driven AI recommendations across your favorite streaming services, all for free.
                </p>
            </div>
        </section>
    );
};

export default HeroSection;
