import { useState } from "react";
import logoImage from "../images/brand-logo-light.svg";
import { request } from "../tools/requestModule";

export default function LogIn({ slideRun }) {
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123456789");
  const [errCred, setErrCred] = useState(false);

  function hondleSubmit(e) {
    e.preventDefault();
    const request_header = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    };
    request("/login", request_header).then((res) => {
      console.log(res);
      if (res.status === 200) {
        localStorage.setItem("_token", res.data.token);
        localStorage.setItem("_user_id", res.data.user_id); // TMP
        window.location.href = "/";
      } else {
        setErrCred(true);
        setEmail("");
        setPassword("");
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
          Log in
        </h2>
      </div>

      <div className="mt-8">
        <div className="mt-6">
          <form
            action="#"
            onSubmit={hondleSubmit}
            method="POST"
            className="space-y-6"
          >
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="youemail@company.domain"
                  required
                  className={`block w-full text-white bg-secondary-dark ${
                    errCred
                      ? "border-2 border-red-400 focus:shadow-red-400"
                      : "border border-primary focus:shadow-primary"
                  } rounded-md px-3 py-2 placeholder-gray-500  focus:shadow-sm  focus:outline-none sm:text-sm`}
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
                  autoComplete="current-password"
                  placeholder="password goas here..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`block w-full text-white bg-secondary-dark ${
                    errCred
                      ? "border-2 border-red-400 focus:shadow-red-400"
                      : "border border-primary focus:shadow-primary"
                  } rounded-md px-3 py-2 placeholder-gray-500  focus:shadow-sm  focus:outline-none sm:text-sm`}
                />
                {errCred ? (
                  <span className="pl-2 pt-2 block text-sm text-red-100">
                    Wrong credential.
                  </span>
                ) : null}
              </div>
            </div>
            <div className="">
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary hover:text-green-300"
                >
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
              You don't have account?{" "}
              <a
                className="text-primary hover:text-green-300 cursor-pointer"
                onClick={slideRun}
              >
                {" "}
                Create new one
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
