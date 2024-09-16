import { useContext, useState } from "react";
import { CiBookmark } from "react-icons/ci";
import { FaUserCircle } from "react-icons/fa";
import clinema from "../images/Clinema.png"; // Adjust this depending on the location of Navbar.jsx
import { DataContext } from "./Context";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [activeLink, setActiveLink] = useState("Home");
  const { user } = useContext(DataContext);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const navigate = useNavigate();


  const handleClick = (link) => {
    setActiveLink(link);
  };


  const handlePopoverToggle = () => {
      setIsPopoverOpen(!isPopoverOpen);
  };
  const handleLogout = () => {
      localStorage.removeItem('_token');
      window.location.href = '/';
  };
  const handleProfileClick = () => {
      // Navigate to your profile page
      navigate('/users/profile');
  };
  const handleLikedMoviesClick = () => {
      // Navigate to your liked movies page
      navigate('/liked-movies');
  };
  const handleSavedMoviesClick = () => {
      // Navigate to your saved movies page
      navigate('/saved-movies');
  };

  return (
    <nav className="bg-secondary-dark p-4 flex justify-between items-center shadow-white shadow-b-xl">
      {/* Left side - Logo */}
      <div className="text-white text-lg font-bold">
        <img src={clinema} alt="Clinema" className="w-32 h-auto" />
      </div>
      <div className="flex space-x-4 items-center">
        <a
          href="/"
          onClick={() => handleClick("Home")}
          className={`text-gray-300 hover:text-white ${
            activeLink === "Home" ? "text-white" : ""
          }`}
        >
          Home
        </a>
        <a
          href="/about"
          onClick={() => handleClick("About us")}
          className={`text-gray-300 hover:text-white ${
            activeLink === "About us" ? "text-white" : ""
          }`}
        >
          About us
        </a>
      </div>
      {/*Right side - Home*/}
      <div className="flex space-x-4 items-center text-white">
        {/*<div className="relative p-2 hover:bg-secondary-light rounded-full">*/}
        {/*    <CiHome className="text-2xl text-green-400"/>*/}
        {/*</div>*/}
        {user ? (
          <>
            <div className="p-2 hover:bg-secondary-light rounded-full">
              <CiBookmark className="text-2xl" />
            </div>
              <div className="relative">
                  <button
                      className="p-2 hover:bg-secondary-light rounded-full"
                      onClick={handlePopoverToggle}
                  >
                      <FaUserCircle className="text-2xl"/>
                  </button>
                  {(isPopoverOpen || !isPopoverOpen) && (
                      <div
                          className={`absolute z-30 text-gray-700 right-0 top-full mt-2 bg-white rounded-lg shadow-md w-48 ${isPopoverOpen ? 'slide-down-animation' : 'slide-up-animation'}`}
                      >
                          {isPopoverOpen && (
                              <ul className="list-none p-2">
                                  <li
                                      className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
                                      onClick={handleProfileClick}
                                  >
                                      Profile
                                  </li>
                                  <li
                                      className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
                                      onClick={handleLikedMoviesClick}
                                  >
                                      Liked Movies
                                  </li>
                                  <li
                                      className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
                                      onClick={handleSavedMoviesClick}
                                  >
                                      Saved Movies
                                  </li>
                                  <li
                                      className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
                                      onClick={handleLogout}
                                  >
                                      Logout
                                  </li>
                              </ul>
                          )}
                      </div>
                  )}
              </div>
          </>
        ) : (
            <div className="flex gap-3">
                <button
                    onClick={() => navigate("/auth")}
                    className="p-2 text-white hover:text-black bg-transparent hover:bg-primary border-2 border-white transition-all ease-in-out duration-500 rounded-full
            font-bold w-20 bg-indigo-700"
                >
                    Login
                </button>
                <button
                    onClick={() => navigate("/auth")}
                    className="p-2 text-white hover:text-black bg-transparent hover:bg-primary border-2 border-white transition-all ease-in-out duration-500 rounded-full
            font-bold w-20 bg-indigo-700"
                >
                    Register
                </button>
            </div>

        )}
      </div>
    </nav>
  );
};

export default Navbar;
