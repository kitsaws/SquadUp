import { Show, SignInButton, UserButton, SignUpButton } from "@clerk/react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";

export function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 shadow-sm z-10">
        <div className="flex items-center gap-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            <Link to="/">SquadUp</Link>
          </h2>
          
          <nav className="hidden md:flex gap-4">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Home
            </Link>
            <Link 
              to="/profile" 
              className={`text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Profile
            </Link>
          </nav>
        </div>
        
        <div>
          <Show when="signed-out">
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">Log in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors shadow-sm cursor-pointer">Sign up</button>
              </SignUpButton>
            </div>
          </Show>
          <Show when="signed-in">
            <UserButton appearance={{ elements: { avatarBox: "w-10 h-10 shadow-sm" } }} />
          </Show>
        </div>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
