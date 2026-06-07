"use client";

import React from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  ArrowRight, 
  BrainCircuit, 
  LineChart, 
  Lightbulb, 
  User, 
  UserCheck, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight 
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export default function Homepage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Navigation Navbar */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="text-indigo-600 animate-pulse" size={28} />
            <span className="font-bold text-slate-800 tracking-tight text-lg">LearnTrack AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="outline" className="text-xs">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="text-xs">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-20 px-6 text-center w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 mb-6">
            <BrainCircuit size={14} />
            AI Performance Engine v1.0
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Smarter Learning, <span className="text-indigo-600">Powered by AI</span>
          </h1>
          
          <p className="mt-6 text-base md:text-lg text-slate-500 max-w-2xl leading-relaxed">
            An intelligent student analytics platform that tracks learning activities, predicts exam performance using Scikit-Learn models, and delivers personalized study recommendations to enhance academic outcomes.
          </p>

          <div className="mt-10 flex gap-4">
            <Link href="/auth/register">
              <Button className="px-6 py-3 text-sm flex items-center gap-2 shadow-sm font-semibold">
                Get Started
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="px-6 py-3 text-sm font-semibold">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Innovative Features</h2>
          <p className="text-sm text-slate-505 mt-2">Core components designed to optimize learning consistency</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <LineChart size={20} />
              </div>
              <CardTitle>AI Performance Prediction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Predict final grades and dropout risks using Scikit-Learn models trained on student study sessions, focus scores, and quiz accuracy averages.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <BrainCircuit size={20} />
              </div>
              <CardTitle>Weak Topic Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically flags specific concept gaps in your syllabus using Pandas data analysis engines, detailing mastery progress across all subtopics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <Lightbulb size={20} />
              </div>
              <CardTitle>Personalized Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive curated study actions, video tutorials, and customized test-taking strategies derived directly from quiz behavior evaluations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white border-t border-b border-slate-200 py-16 px-6 w-full">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">How It Works</h2>
            <p className="text-sm text-slate-500 mt-2">Three simple steps to unlock predictive cognitive statistics</p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-4 relative">
            
            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-4">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-800">Take Quiz</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
                Attempt comprehensive multiple-choice assessments in subjects like Machine Learning, Compiler Design, or Computer Networks.
              </p>
            </div>

            {/* Arrow separator (desktop only) */}
            <div className="hidden md:flex self-center text-slate-300">
              <ChevronRight size={20} />
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-4">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-800">AI Analyzes</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
                The analytics engine tracks response speed, accuracy, and active study timestamps to calculate focus scores and learning styles.
              </p>
            </div>

            {/* Arrow separator (desktop only) */}
            <div className="hidden md:flex self-center text-slate-300">
              <ChevronRight size={20} />
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-4">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-800">Get Insights</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
                Review your concept mastery map, read dynamic exam strategies, unlock badge rewards, and chat with the AI Doubt Tutor.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Tailored Access Roles</h2>
          <p className="text-sm text-slate-500 mt-2">Enforcing granular role configurations throughout the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <BookOpen size={20} />
              </div>
              <CardTitle>Student Area</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log in to take exams, track your study consistency, explore concept mastery indexes, and solve syllabus blocks with the doubt chatbot.
              </p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <UserCheck size={20} />
              </div>
              <CardTitle>Teacher Area</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review classroom average indicators, evaluate risk profiles, filter student directory lists, and open detailed student concept mapping charts.
              </p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                <ShieldCheck size={20} />
              </div>
              <CardTitle>Admin Area</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Audit system registrations, monitor database seeding logs, change user account permissions, or perform profile deletions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer bar */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 w-full text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <GraduationCap size={16} />
            <span>LearnTrack AI</span>
          </div>
          <p>&copy; {new Date().getFullYear()} LearnTrack AI. Developed as part of a Hackathon. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
