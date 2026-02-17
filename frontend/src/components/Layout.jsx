import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { RiMenuLine } from 'react-icons/ri';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-40 px-4 py-3 flex items-center justify-between shadow-md">
                <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                    LibraryPro
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-300 hover:text-white">
                    <RiMenuLine size={24} />
                </button>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 min-h-screen transition-all duration-300 md:ml-64 pt-16 md:pt-0`}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                    <div className="mt-12 text-center text-gray-400 text-sm">
                        Developed by <span className="font-semibold text-gray-500">Shubham Bhendavade</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Layout;
