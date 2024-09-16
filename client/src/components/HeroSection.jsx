export default function Example() {
	const [mobileNavOpen, setMobileNav] = useState(false);
	const [isAuth, setIsAuth] = useState(true);

	return (
		<div className="bg-secondary-dark">
			<div className="text-white">
				<div className='text-white'>
					<nav className="flex w-full items-center justify-between px-4 sm:px-6">
						<div className="navbar bg-secondary-light flex items-center w-full md:w-[80%]">
							<div className="flex w-full items-center justify-between md:w-auto">
								<a href="#">
									<span className="sr-only">Clinema</span>
									<img
										className="h-8 w-auto sm:h-10"
										src={brandImage}
										alt=""
									/>
								</a>
							</div>
							<div className="hidden md:space-x-8 space-x-1 md:ml-10 pt-2 md:flex">
								<a href="#" className="text-base font-medium text-white-light hover:text-primary">Weather</a>
								<a href="#" className="text-base font-medium text-white hover:text-primary">Mood</a>
								<a href="#" className="text-base font-medium text-white hover:text-primary">Saved</a>
								<a href="#" className="text-base font-medium text-white hover:text-primary">Liked</a>
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

						{isAuth ? <div className="hidden md:flex justify-end text-sm lg:text-lg items-center gap-2 mr-8">
							<span className='lg:font-bold border-b-2 border-primary pb-1 text-center px-2'>Hello Alien!</span>
							<div>
								<img src={avatarUserImg} className='ml-6 md:ml-0 rounded-full w-12 border-2 border-primary' alt="avatar of the user" />
							</div>
						</div>
							: <div className="hidden self-end md:flex md:items-center md:space-x-6 mr-6">
								<a href="#" className="w-24 flex justify-center text-base font-medium text-white hover:text-primary hover:rounded-md hover:bg-secondary-light px-4 py-2 border border-transparent hover:border-primary">
									Sign in
								</a>
								<a
									href="#"
									className="w-24 inline-flex justify-center items-center rounded-md border border-transparent bg-primary font-bold px-4 py-2 text-base text-white hover:border-white hover:bg-green-900"
								>
									Sign up
								</a>
							</div>}
					</nav>
				</div>

				{/* movile nav */}
				{mobileNavOpen ?
					<div className='border-t-4 border-secondary-dark bg-secondary-light flex flex-col items-start p-5'>
						{isAuth ? <div className="md:hidden flex justify-end text-sm lg:text-lg items-center gap-2 mr-8">
							<div>
								<img src={avatarUserImg} className='md:ml-0 rounded-full w-12 border-2 border-primary' alt="avatar of the user" />
							</div>
							<span className='font-bold border-b-2 border-primary pb-1 text-center px-2'>Hello Alien!</span>
						</div> : null}
						<nav>
							<div className="md:hidden text-lg flex gap-3 flex-col p-4">
								<a href="#" className="font-medium text-white-light hover:text-primary">Weather</a>
								<a href="#" className="font-medium text-white hover:text-primary">Mood</a>
								<a href="#" className="font-medium text-white hover:text-primary">Saved</a>
								<a href="#" className="font-medium text-white hover:text-primary">Liked</a>
							</div>
						</nav>
					</div> : null}
			</div>
		</div>
	)
}
