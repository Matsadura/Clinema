import { VscGithub } from "react-icons/vsc";
import './styles/About.css';

const people = [
	{
		name: 'Ali JBARI',
		role: 'Fullstack Engineer',
		imageUrl: 'https://avatars.githubusercontent.com/u/104344010?v=4',
		githubUrl: 'https://github.com/ila36IX',
		twitterUrl: '#',
	},
	{
		name: 'Badr ANNABI',
		role: 'Fullstack Engineer',
		imageUrl:
			'https://avatars.githubusercontent.com/u/73182348?v=4',
		githubUrl: 'https://github.com/Annabi',
		twitterUrl: '#',
	},
	{
		name: 'Karim ASSIHOUT',
		role: 'Fullstack Engineer',
		imageUrl: 'https://avatars.githubusercontent.com/u/134794355?v=4',
		githubUrl: 'https://github.com/ashtkarim',
		twitterUrl: '#',
	},
	{
		name: 'Oumaima NAANAA',
		role: 'Fullstack Engineer',
		imageUrl: 'https://avatars.githubusercontent.com/u/138726284?v=4',
		githubUrl: 'https://github.com/naanaa59',
		twitterUrl: '#',
	},
	{
		name: 'Radouane ABOUNOUAS',
		role: 'Fullstack Engineer',
		imageUrl: 'https://avatars.githubusercontent.com/u/137453952?v=4',
		githubUrl: 'https://github.com/RadouaneAbn',
		twitterUrl: '#',
	},
	{
		name: 'Zidane ZAOUI',
		role: 'Fullstack Engineer',
		imageUrl: 'https://avatars.githubusercontent.com/u/132571698?v=4',
		githubUrl: 'https://github.com/matsadura',
		twitterUrl: '#',
	},

]


export default function About() {
	return (
		<div className="bg-secondary-dark">
			<div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8 lg:py-24">
				<div className="space-y-12">
					<div className="space-y-5 sm:space-y-4 md:max-w-xl lg:max-w-3xl xl:max-w-none">
						<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Meet our team</h2>
					</div>
					<ul role="list" className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:grid-cols-3 lg:gap-8">
						{people.map((person) => (
							<li key={person.name} className="rounded-2xl about__card bg-secondary-light py-10 px-6 text-center xl:px-10 xl:text-left">
								<div className="space-y-6 xl:space-y-10">
									<img className="mx-auto h-40 w-40 bg-secondary select-none rounded-full xl:h-56 xl:w-56" src={person.imageUrl} alt="" />
									<div className="space-y-2 xl:flex xl:items-center xl:justify-between">
										<div className="space-y-1 text-lg font-medium leading-6">
											<h3 className="text-white">{person.name}</h3>
											<p className="text-primary">{person.role}</p>
										</div>

										<ul role="list" className="flex justify-center space-x-5">
											<li>
												<a href={person.twitterUrl} className="text-white hover:text-primary">
													<span className="sr-only">Twitter</span>
													<svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
														<path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
													</svg>
												</a>
											</li>
											<li>
												<a href={person.githubUrl} className="text-white text-xl hover:text-primary">
													<span className="sr-only">LinkedIn</span>
													<svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
														<VscGithub />
													</svg>
												</a>
											</li>
										</ul>
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div >
	)
}
