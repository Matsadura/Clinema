import React, { useEffect, useState, useSyncExternalStore } from "react";
import { DataConext } from "./Context";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

export const PrivateRoute = ({ open = false, element: Element }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { setData } = useContext(DataConext);

  //   localStorage.setItem(
  //     "_token",
  //     "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcyNjM2MDM3NiwianRpIjoiMGZiNDRkMDYtMDQyYS00OGQ2LTliZjQtY2IyN2FjNTE4NDE2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjlkNGJmNjFlLTgxMzQtNDhlNi1hZjVlLTE5YjI1ZGRhZTg5MCIsIm5iZiI6MTcyNjM2MDM3NiwiY3NyZiI6IjkxZjBkOWUzLTBjNGMtNDI3My1hZjI5LWRlNWI5MWZkNjI3ZiIsImV4cCI6MTcyNjQ0Njc3Nn0.kLdUiEWaYnWGietH3MLkHdN74w929-QVS85TKPuVI-0"
  //   );

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/auth_validate", {
      headers: {
        Authorization: localStorage.getItem("_token"),
      },
    })
      .then((res) => res.json())
      .then((data) => setData({ isAuthenticated: true, user: data }))
      .catch((err) => {
        console.log(err);
        setData({ isAuthenticated: false, user: null });
      })
      .finally(() => setIsLoading(false));
  });

  if (isLoading) return null;

  if (open) {
    return <Element />;
  }

  return isAuthenticated ? <Element /> : <Navigate to="/login" />;
};
