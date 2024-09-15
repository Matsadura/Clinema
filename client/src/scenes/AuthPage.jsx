import { useState } from "react";
import authCoverPage from "../images/login-image.jfif";
import LogIn from "../components/Signin";
import SignUp from "../components/Signup";
import "./styles/AuthPage.css";

export default function AuthPage() {
  const [login, setLogin] = useState(false);
  const [wait, setWait] = useState(false);
  const [animateForm, setAnimateForm] = useState(null);
  const [animateImage, setAnimateImage] = useState(null);

  function slideRun() {
    setWait(!wait);
    setTimeout(setLogin, 700, !login);
    setAnimateForm("animate__form--toLeft");
    setAnimateImage("animate__img--toLeft");
  }

  return (
    <>
      <div className="flex">
        <div
          className={`hidden md:flex flex-1 flex-col w-1/2 justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 ${
            wait ? "animate__form--toRight" : animateForm
          }`}
        >
          {login ? (
            <SignUp slideRun={slideRun} />
          ) : (
            <LogIn slideRun={slideRun} />
          )}
        </div>
        <div
          className={`flex md:hidden flex-1 flex-col w-1/2 justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24`}
        >
          {login ? (
            <SignUp slideRun={() => setLogin(!login)} />
          ) : (
            <LogIn slideRun={() => setLogin(!login)} />
          )}
        </div>
        <div
          className={`hidden md:block w-1/2 overflow-hidden  ${
            wait ? "animate__img--toRight" : animateImage
          }`}
        >
          <img
            className="w-full h-screen min-h-[700px] inset-0 object-cover"
            src={authCoverPage}
            alt=""
          />
        </div>
      </div>
    </>
  );
}
