import { TiHeartFullOutline, TiBookmark, TiEject, TiArrowRight, TiStarFullOutline } from "react-icons/ti";
import { LuClock } from "react-icons/lu";
import { MdDateRange } from "react-icons/md";
import { MdLanguage } from "react-icons/md";
import { useState } from 'react';

export default function MovieCard({ title, poster, year, rate, length, trailer, lang }) {
    const [like, setLike] = useState(false);

    return <div className='flex justify-start md:max-w-[600px] w-[90%] ml-5 mt-5 md:flex-row flex-col md:h-96 h-fit'>
        {/* Container contains the poster and the movie infos  */}
        <div className='text-white gap-3  bg-secondary-light rounded-3xl flex flex-col-reverse md:flex-row md:rounded-br-none pr-5'>
            {/* Movies poster container */}
            <div className='flex-shrink-0 p-5 md:w-60 justify-center w-[1000pw] aspect-[1.5] md:relative top-[1rem] md:scale-110 scale-1 bg-secondary-light rounded-3xl flex'>
                {poster ?
                    <img className="object-cover rounded-2xl" src={poster} alt="testing" />
                    : <div className='bg-primary border-2 w-full rounded-2xl flex items-center justify-center font-bold'>Poster Not found</div>}
            </div>
            {/* Movies infos container */}
            <div className='md:p-10 p-4 flex flex-col justify-between'>
                <h3 className='font-bold text-5xl pt-5 md:mb-0 mb-8 md:text-start text-center'>{title || 'No Title :('}</h3>
                <div className='ml-4 flex items-center md:border-0 md:py-0 border-b-2 border-t-2 py-4 md:justify-start justify-center md:mt-0 mt-5 gap-2'>
                    <div className='text-4xl text-yellow-400'>
                        <TiStarFullOutline />
                    </div>
                    <span className='text-2xl font-bold relative top-[4px]'>{rate || 0.0}</span>
                </div>
                <div className='flex flex-row justify-around gap-2 md:mt-5 mt-10 md:flex-nowrap flex-wrap'>
                    <div className='flex md:flex-row flex-col gap-3 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <LuClock />
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Length</p>
                            <p className='md:text-lg md:text-md font-bold'>{length || '00:00:01'}</p>
                        </div>
                    </div>
                    <div className='flex md:flex-row flex-col gap-2 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <MdDateRange />
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Year</p>
                            <p className='md:text-lg md:text-md font-bold'>{year || 1912}</p>
                        </div>
                    </div>
                    <div className='flex md:flex-row flex-col gap-2 items-center px-5 md:border-r'>
                        <div className='text-4xl'>
                            <MdLanguage />
                        </div>
                        <div className='md:text-start text-center'>
                            <p className='md:mb-0 mb-1'>Language</p>
                            <p className='md:text-lg md:text-md font-bold'>{lang || 'Nolang'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/* This is the buttons side*/}
        <div className='bg-secondary rounded-3xl flex flex-col md:h-96 text-white'>
            <div className='p-4 flex justify-center gap-4 rounded-3xl bg-secondary'>
                <button className={`rounded-2xl ${like ? 'text-red-400' : ''} text-4xl bg-secondary-light p-4 hover:bg-primary hover:shadow-sm hover:shadow-secondary-lighter`} onClick={() => setLike(!like)}><TiHeartFullOutline /></button>
                <button className="rounded-2xl text-4xl bg-secondary-light p-4 hover:bg-primary hover:shadow-sm hover:shadow-secondary-lighter"><TiBookmark /></button>
                <button className="rounded-2xl text-4xl bg-secondary-light p-4 hover:bg-primary hover:shadow-sm hover:shadow-secondary-lighter"><TiEject /></button>
            </div>
            {/* This will be hidden in the movile devices */}
            <div className='pb-10 bg-secondary-light rounded-3xl rounded-l-none h-full items-end justify-center hidden md:flex'>
                <a href={trailer} className='text-white font-bold text-2xl p-2 px-4 flex justify-center items-center bg-primary hover:bg-green-700 rounded-xl'>Watch trailer <TiArrowRight /></a>
            </div>
        </div>
    </div >
}
