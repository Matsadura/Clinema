import brandImage from '../images/brand-logo-light.svg';
import avatarUserImg from '../images/user_avatar.png';
import { GiHamburgerMenu } from "react-icons/gi";
import { IoCloseSharp } from "react-icons/io5";
import { useContext, useState } from 'react';
import './styles/NavBar.css';
import { DataContext } from "./Context";
import { useNavigate } from "react-router-dom";
import ProfilePage from '../scenes/UserProfile';

function Navbar() {
  const [mobileNavOpen, setMobileNav] = useState(false);


  const { user } = useContext(DataContext);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const navigate = useNavigate();

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
    <div className="bg-secondary-dark">
      <div className="text-white">
        <div className='text-white'>
          <nav className="flex w-full items-center justify-between px-4 sm:px-6">
            <div className="navbar bg-secondary-light flex items-center w-full md:w-[80%]">
              <div className="flex w-full items-center justify-between md:w-auto">
                <a href="/">
                  <span className="sr-only">Clinema</span>
                  <img
                    className="h-8 w-auto sm:h-10"
                    src={brandImage}
                    alt=""
                  />
                </a>
              </div>
              <div className="hidden md:space-x-8 space-x-1 md:ml-10 pt-2 md:flex">
                <button href="#" className="text-base font-medium text-white-light hover:text-primary">Weather</button>
                <button href="#" className="text-base font-medium text-white hover:text-primary">Mood</button>
                <button onClick={handleSavedMoviesClick} className="text-base font-medium text-white hover:text-primary">Saved</button>
                <button onClick={handleLikedMoviesClick} className="text-base font-medium text-white hover:text-primary">Liked</button>
              </div>
            </div>

            {/* Mobile hamburger icon */}
            <div className='md:hidden hamburger__icon flex justify-center w-[130px] bg-secondary-light items-center'>
              <button
                className='border-2 text-1xl rounded-full p-2 hover:text-primary hover:border-primary'
                onClick={() => setMobileNav(!mobileNavOpen)}
              >
                {mobileNavOpen ? <IoCloseSharp /> : <GiHamburgerMenu />}
              </button>
            </div>

            {user ? <div className="hidden md:flex relative justify-end text-sm lg:text-lg items-center gap-2 mr-8">
              <span className='lg:font-bold border-b-2 border-primary pb-1 text-center px-2'>{`Hello ${user.first_name}!`}</span>
              <div>
                <button
                  className="p-1 hover:bg-secondary-light rounded-full"
                  onClick={handlePopoverToggle}
                >
                  <img src={avatarUserImg} className='ml-6 md:ml-0 rounded-full w-12 border-2 border-primary' alt="avatar of the user" />
                </button>
                <div
                  className={`absolute z-20 text-secondary-dark right-0 mt-2 bg-white  rounded-lg shadow-md w-48 ${isPopoverOpen ? 'slide-down-animation' : 'slide-up-animation'}`}
                >
                  <ul className="list-none p-2">
                    <li
                      className="hover:bg-gray-300 p-2 rounded-md cursor-pointer"
                    >
                      <a href="/users/profile" className='w-full block'>Profile</a>
                    </li>
                    <li
                      className="hover:bg-gray-300 p-2 rounded-md cursor-pointer"
                      onClick={handleLogout}
                    >
                      <button>Logout</button>
                    </li>
                  </ul>

                </div>
              </div>
            </div>
              : <div className="hidden self-end md:flex md:items-center md:space-x-6 mr-6">
                <button onClick={() => navigate('/auth')} className="w-24 flex justify-center text-base font-medium text-white hover:text-primary hover:rounded-md hover:bg-secondary-light px-4 py-2 border border-transparent hover:border-primary">
                  Sign in
                </button>
                <button
                  className="w-24 inline-flex justify-center items-center rounded-md border border-transparent bg-primary font-bold px-4 py-2 text-base text-white hover:border-white hover:bg-green-900"
                  onClick={() => navigate('/auth')}
                >
                  Sign up
                </button>
              </div>}
          </nav>
        </div>

        {/* movile nav */}
        {
          mobileNavOpen ?
            <div className='border-t-4 border-secondary-dark bg-secondary-light flex flex-col items-start p-5'>
              {user ? <div className="md:hidden flex justify-end text-sm lg:text-lg items-center gap-2 mr-8">
                <div>
                  <img src={avatarUserImg} className='md:ml-0 rounded-full w-12 border-2 border-primary' alt="avatar of the user" />
                </div>
                <span className='font-bold border-b-2 border-primary pb-1 text-center px-2'>{`Hello ${user.first_name}!`}</span>
              </div> : null}
              <nav>
                <div className="md:hidden text-lg flex gap-3 flex-col items-start justify-start p-4">
                  <a className="font-medium text-white cursor-pointer hover:text-primary pointer" onClick={handleProfileClick}>Profile</a>
                  <button className="font-medium text-white hover:text-primary">Weather</button>
                  <button className="font-medium text-white hover:text-primary">Mood</button>
                  <a onClick={handleSavedMoviesClick} className="font-medium cursor-pointer text-white hover:text-primary">Saved</a>
                  <a onClick={handleLikedMoviesClick} className="font-medium cursor-pointer text-white hover:text-primary">Liked</a>
                  <button onClick={handleLogout} className="font-medium text-white hover:text-primary" >Log Out</button>
                </div>
              </nav>
            </div> : null
        }
      </div >
    </div >
  )
}


export default Navbar;
