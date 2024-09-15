import { useState } from "react";
import logoImage from "../images/brand-logo-light.svg";
import { request } from "../tools/requestModule";

export default function SignUp({ slideRun }) {
  const [email, setEmail] = useState("alien@alianice.com");
  const [fname, setFname] = useState("alien");
  const [lname, setLname] = useState("Hikaro");
  const [password, setPassword] = useState("123456789");
  const [ConfPassword, setConfPassword] = useState("123456789");
  const [errPassowrd, setErrPassword] = useState(false);
  const [error, setError] = useState(null);

  function hodnleSubmit(e) {
    e.preventDefault();
    if (password !== ConfPassword) {
      setErrPassword(true);
      return;
    } else {
      setErrPassword(false);
    }
    const requestHeader = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fname,
        last_name: lname,
        email,
        password,
      }),
    };
    request("/register", requestHeader).then((res) => {
      if (res.status === 201) {
        slideRun();
      } else {
        setError(res.data.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm lg:w-96">
      <div className="flex flex-col items-center">
        <img
          className="h-12 w-auto to_left"
          src={logoImage}
          alt="Your Company"
        />
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white text-center testing">
          Create you account
        </h2>
      </div>

      <div className="mt-8">
        <div className="mt-6">
          <form
            action="#"
            onSubmit={hodnleSubmit}
            method="POST"
            className="space-y-6"
          >
            {/* Name inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white"
                >
                  First Name
                </label>
                <div className="mt-1">
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="email"
                    placeholder="youemail@company.domain"
                    onChange={(e) => setFname(e.target.value)}
                    value={fname}
                    required
                    className="block w-full text-white bg-secondary-dark border border-primary rounded-md px-3 py-2 placeholder-gray-500 focus:shadow-sm focus:shadow-primary focus:outline-none sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white"
                >
                  Last Name
                </label>
                <div className="mt-1">
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="email"
                    placeholder="youemail@company.domain"
                    onChange={(e) => setLname(e.target.value)}
                    value={lname}
                    required
                    className="block w-full text-white bg-secondary-dark border border-primary rounded-md px-3 py-2 placeholder-gray-500 focus:shadow-sm focus:shadow-primary focus:outline-none sm:text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="youemail@company.domain"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  required
                  className="block w-full text-white bg-secondary-dark border border-primary rounded-md px-3 py-2 placeholder-gray-500 focus:shadow-sm focus:shadow-primary focus:outline-none sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength="8"
                  autoComplete="current-password"
                  placeholder="password goas here..."
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  required
                  className={`block w-full text-white bg-secondary-dark ${
                    errPassowrd
                      ? "border-2 border-red-400 focus:shadow-red-400"
                      : "border border-primary focus:shadow-primary"
                  } rounded-md px-3 py-2 placeholder-gray-500  focus:shadow-sm  focus:outline-none sm:text-sm`}
                />
              </div>

              {errPassowrd ? (
                <span className="pl-3 pt-1 block text-sm text-red-100">
                  The password confirmation does not match.
                </span>
              ) : null}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white"
              >
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Confirm your password..."
                  required
                  onChange={(e) => setConfPassword(e.target.value)}
                  value={ConfPassword}
                  className={`block w-full text-white bg-secondary-dark ${
                    errPassowrd
                      ? "border-2 border-red-400 focus:shadow-red-400"
                      : "border border-primary focus:shadow-primary"
                  } rounded-md px-3 py-2 placeholder-gray-500  focus:shadow-sm  focus:outline-none sm:text-sm`}
                />
              </div>
            </div>
            <div className="p-0 m-0">
              <span className="text-sm bg-secondary-dark rounded-md px-2 pt-2 pb-2 flex items-center text-red-400">
                {error || <br />}
              </span>
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-primary mt-4 py-2 px-4 text-sm  text-white font-bold shadow-sm hover:bg-green-800 border border-transparent hover:border-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Sign Up
              </button>
            </div>
            <div className="text-white select-none">
              You already have an account?{" "}
              <a
                className="text-primary hover:text-green-300 cursor-pointer"
                onClick={slideRun}
              >
                Log in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
