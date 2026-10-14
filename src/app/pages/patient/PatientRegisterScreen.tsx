import React from "react";
import { Navigate } from "react-router";

export default function PatientRegisterScreen() {
  return <Navigate to="/patient/login" replace />;
}
