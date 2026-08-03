import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { RiMenuLine } from 'react-icons/ri';
import Notifications from './Notifications';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-[#12072b] border-b border-purple-900/40 text-white z-40 px-4 py-3 flex items-center justify-between shadow-md">
                <div className="text-xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-300 to-pink-400 text-transparent bg-clip-text">
                    LibraryPro
                </div>
                <div className="flex items-center gap-4">
                    <Notifications />
                    <button onClick={() => setIsSidebarOpen(true)} className="text-purple-300 hover:text-white">
                        <RiMenuLine size={24} />
                    </button>
                </div>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 min-h-screen transition-all duration-300 md:ml-64 pt-16 md:pt-0`}>
                {/* Desktop Header */}
                <div className="hidden md:flex justify-end items-center px-8 py-4 bg-white border-b border-purple-100 sticky top-0 z-30 shadow-xs">
                    <Notifications />
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                    <div className="mt-12 text-center text-slate-400 text-sm">
                        Developed by <span className="font-semibold text-purple-700">Shubham Bhendavade</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Layout;
