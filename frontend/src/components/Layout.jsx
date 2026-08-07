import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { RiMenuLine } from 'react-icons/ri';
import Notifications from './Notifications';
import Background3DEffect from './Background3DEffect';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Prevent body background scrolling on mobile when sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [isSidebarOpen]);

    return (
        <div className="flex min-h-screen font-sans relative">
            {/* 3D Purple Wallpaper & Interactive Background Layer */}
            <Background3DEffect />

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-[#12072b]/90 backdrop-blur-xl border-b border-purple-500/30 text-white z-40 px-4 py-3 flex items-center justify-between shadow-lg">
                <div className="text-xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-300 to-pink-400 text-transparent bg-clip-text">
                    LibraryPro
                </div>
                <div className="flex items-center gap-4">
                    <Notifications />
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="text-purple-300 hover:text-white p-1 rounded-lg focus:outline-none"
                        aria-label="Open navigation menu"
                    >
                        <RiMenuLine size={24} />
                    </button>
                </div>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 min-h-screen transition-all duration-300 md:ml-64 pt-16 md:pt-0`}>
                {/* Desktop Header */}
                <div className="hidden md:flex justify-end items-center px-8 py-4 bg-white/80 backdrop-blur-xl border-b border-purple-200/50 sticky top-0 z-30 shadow-sm">
                    <Notifications />
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                    <div className="mt-12 text-center text-purple-200/70 text-sm font-medium drop-shadow">
                        Developed by <span className="font-bold text-fuchsia-300">Shubham Bhendavade</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Layout;
