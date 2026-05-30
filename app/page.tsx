"use client"

import dynamic from "next/dynamic"

const BracketDemo = dynamic(
  () => import("../components/bracket-demo").then((module) => module.BracketDemo),
  {
    ssr: false,
  }
)

export default function Home() {
  return (
    <BracketDemo />
  );
}
