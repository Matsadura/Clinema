import {useState} from "react";
import { CiBookmark } from "react-icons/ci";
import { FaUserCircle } from "react-icons/fa";
import clinema from "../images/Clinema.png"; // Adjust this depending on the location of Navbar.jsx



const Navbar = () => {
    const [activeLink, setActiveLink] = useState("Home");

    const handleClick = (link) => {
        setActiveLink(link);
    }

    return (
        <nav className="bg-secondary-dark p-4 flex justify-between items-center shadow-white shadow-b-xl">
            {/* Left side - Logo */}
            <div className="text-white text-lg font-bold">
                <img
                    src={clinema}
                    alt="Clinema"
                    className="w-32 h-auto"
                />
            </div>
            <div className="flex space-x-4 items-center">
                <a href="#"
                   onClick={() => handleClick("Home")}
                   className={`text-gray-300 hover:text-white ${activeLink === "Home" ? "text-white" : ""}`}
                >
                    Home
                </a>
                <a
                    href="/about"
                    onClick={() => handleClick("About us")}
                    className={`text-gray-300 hover:text-white ${activeLink === "About us" ? "text-white" : ""}`}
                >
                    About us
                </a>
            </div>
            {/*Right side - Home*/}
            <div className="flex space-x-4 items-center text-white">
                {/*<div className="relative p-2 hover:bg-secondary-light rounded-full">*/}
                {/*    <CiHome className="text-2xl text-green-400"/>*/}
                {/*</div>*/}
                <div className="p-2 hover:bg-secondary-light rounded-full">
                    <CiBookmark className="text-2xl"/>
                </div>
                <div className="p-2 hover:bg-secondary-light rounded-full">
                    <FaUserCircle className="text-2xl"/>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
