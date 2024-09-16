import { useContext, useEffect } from 'react';
import './styles/NavBar.css';
import { DataContext } from "./Context";
import { useNavigate } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import AOS from "aos";
import "aos/dist/aos.css";

export default function HeroSection() {
	const { user } = useContext(DataContext);
	const navigate = useNavigate();
	useEffect(() => {
		AOS.init({
			disable: "phone",
			duration: 700,
			easing: "ease-out-cubic",
		});
	}, []);

	return <main className='h-screen grid md:grid-cols-2 grid-cols-1 p-10 md:gap-16 items-center lg:py-14 lg:px-24 mt-10 md:mt-0'>
		<div data-aos="fade-right" className="flex flex-col md:items-start items-center md:text-start text-center">
			<a
				href="#location_section"
				className="inline-flex  items-center rounded-full bg-black p-1 pr-2 text-white hover:text-gray-200 sm:text-sm lg:text-sm xl:text-base"
			>
				<span className="rounded-full bg-gradient-to-r from-primary to-green-800 px-3 py-0.5 text-sm font-semibold leading-5 text-white">
					Your weather
				</span>
				<span className="ml-4 text-sm">New movie to watch</span>
				<FiChevronRight className="ml-2 text-lg" />
			</a>
			<h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:mt-5 sm:text-6xl lg:mt-6 xl:text-6xl">
				<span className="block">Mood & Weather</span>
				<span className="block bg-gradient-to-r from-green-100 to-primary bg-clip-text pb-3 text-transparent sm:pb-5">
					Your Movie Match.
				</span>
			</h1>
			<p className="text-base text-gray-300 sm:text-xl md:p-0 px-5 lg:text-lg xl:text-xl">
				Find your perfect movie! We use your local weather and mood to suggest films you'll love. Let's start watching!
			</p>
		</div>
		<div className="h-full">
			{/* clt for mobile */}
			{user ? null : <div className="flex self-end md:hidden gap-4 justify-center my-10 items-center">
				<a onClick={() => navigate('/auth')} className="text-base font-medium text-white hover:text-primary rounded-md hover:bg-secondary-light px-4 py-2 border border-white	 hover:border-primary">
					Sign in
				</a>
				<a
					href="#"
					className="inline-flex items-center rounded-md border border-transparent bg-primary font-bold px-4 py-2 text-base text-white hover:border-white hover:bg-green-900"
					onClick={() => navigate('/auth')}
				>
					Sign up
				</a>
			</div>}
			<div data-aos="fade-left" className="max-w-md bg-cover md:h-full flex justify-center  md:px-5 sm:max-w-2xl sm:px-6 lg:max-w-none lg:px-5">
				<img
					className="md:w-full w-1/2 lg:inset-y-0 md:p-8 lg:left-0 lg:h-full lg:w-auto lg:max-w-none"
					src="https://tailwindui.com/img/component-images/cloud-illustration-teal-cyan.svg"
					alt=""
				/>
			</div>
		</div>
	</main>
}
