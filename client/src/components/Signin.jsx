import image from "../images/login-image.jfif";
import { FaGithub } from "react-icons/fa6";
import { FaTwitter } from "react-icons/fa";
import logoImage from "../images/brand-logo-light.svg";
import { useState } from "react";
import './styles/SignIn.css';

function LogIn() {
  return <h1>Hello</h1>
}

export default function SignIn() {
  const [login, setLogin] = useState(true);
  const [wait, setWait] = useState(true);

  function slideRun() {
    setWait(!wait);
    setTimeout(setLogin, 700, !login)
  }

  return (
    <>
      <div className="flex">
        <div className={`flex flex-1 flex-col w-1/2 justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 ${!wait ? 'animate__form--toLeft' : 'animate__form--toRight'}`}>
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="flex flex-col items-center">
              <img
                className="h-12 w-auto to_left"
                src={logoImage}
                alt="Your Company"
              />
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-white text-center testing">{login ? "Sign in to your account" : "login"}</h2>
            </div>

            <div className="mt-8">
              <div>
                <div>
                  <p className="text-sm font-medium text-white mb-3">Sign in with</p>

                  <div className="mt-1 grid grid-cols-2 gap-5">
                    <div>
                      <a
                        href="#"
                        className="inline-flex w-full justify-center rounded-md border-2 border-primary bg-white text-2xl py-2 px-4 font-medium text-gray-500 shadow-sm hover:text-white hover:bg-secondary-dark"
                      >
                        <span className="sr-only">Sign in with Twitter</span>
                        <FaTwitter />
                      </a>
                    </div>

                    <div>
                      <a
                        href="#"
                        className="inline-flex w-full justify-center rounded-md border-2 border-primary bg-white text-2xl py-2 px-4 font-medium text-gray-500 shadow-sm hover:text-white hover:bg-secondary-dark"
                      >
                        <span className="sr-only">Sign in with GitHub</span>
                        <FaGithub />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-secondary px-2 text-white">Or continue with</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <form action="#" method="POST" className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="youemail@company.domain"
                        required
                        className="block w-full text-white bg-secondary-dark border border-primary rounded-md px-3 py-2 placeholder-gray-500 focus:shadow-sm focus:shadow-primary focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="password" className="block text-sm font-medium text-white">
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="password goas here..."
                        required
                        className="block w-full text-white bg-secondary-dark border border-primary rounded-md px-3 py-2 placeholder-gray-500 focus:shadow-sm focus:shadow-primary focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-primary"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <a href="#" className="font-medium text-primary hover:text-green-800">
                        Forgot your password?
                      </a>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="flex w-full justify-center rounded-md bg-primary py-2 px-4 text-sm  text-white font-bold shadow-sm hover:bg-green-800 border border-transparent hover:border-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Sign in
                    </button>
                  </div>
                  <div className="text-white select-none">
                    You don't have account? <a className="text-primary cursor-pointer" onClick={slideRun}> Create new one</a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div >
        <div className={`hidden md:block w-1/2 overflow-hidden ${wait ? 'animate__img--toRight' : 'animate__img--toLeft'}`}>
          <img
            className="h-screen min-h-[700px] inset-0 object-cover"
            src={image}
            alt=""
          />
        </div>
      </div >
    </>
  )
}
