import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Komair - ИИ Ассистент",
  description: "Умный ИИ-ассистент с возможностями диалогов и глубокого анализа",
  keywords: ["ИИ", "ассистент", "чат", "искусственный интеллект"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}