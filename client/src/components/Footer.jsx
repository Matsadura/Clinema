import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';
import clinema from "../images/brand-logo-light.svg";

const Footer = () => {

    const handleLikedMoviesClick = () => {
        // Navigate to your liked movies page
        navigate('/liked-movies');
    };
    const handleSavedMoviesClick = () => {
        // Navigate to your saved movies page
        navigate('/saved-movies');
    };
    return (
        <footer className="bg-secondary-dark text-white md:px-36 py-5">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap justify-between">
                    <div className="w-full md:w-1/3 mb-6 md:mb-0">
                        <img src={clinema} alt="Clinema" className="w-32 h-auto" />
                        <p className="mt-2 text-left text-gray-400 w-2/3">
                            Discover the perfect movie based on your mood and the weather. Enjoy personalized
                            recommendations and more!
                        </p>
                    </div>

                    {/* Navigation Links */}
                    <div className="w-full md:w-1/3 mb-6 md:mb-0">
                        <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
                        <div className='flex flex-col gap-4 items-start'>
                            <a href="/#location_section" className=" scroll-smooth text-base font-medium text-white-light hover:text-primary">Weather</a>
                            <button href="#" className="text-base font-medium text-white hover:text-primary">Mood</button>
                            <button onClick={handleSavedMoviesClick} className="text-base font-medium text-white hover:text-primary">Saved</button>
                            <button onClick={handleLikedMoviesClick} className="text-base font-medium text-white hover:text-primary">Liked</button>
                        </div>
                    </div>
                </div>
                {/* Copyright Notice */}
                <div className="text-center mt-8 border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Cliovie. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
