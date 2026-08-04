import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DeveloperCredit from '../components/DeveloperCredit';
import { SERVER_URL } from '../config';

const Landing = () => {
    const [stats, setStats] = useState({
        totalBooks: 0,
        digitalJournals: 0,
        researchPapers: 0,
        activeMembers: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/admin/public-stats`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#120428] via-[#3a065c] to-[#990a88] text-white flex flex-col relative overflow-hidden">
            {/* SVG Wave Background Layers Matching User's Image */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="none">
                    <path fill="#7c0a96" fillOpacity="0.4" d="M0,192L60,208C120,224,240,256,360,256C480,256,600,224,720,208C840,192,960,192,1080,213.3C1200,235,1320,277,1380,298.7L1440,320L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"></path>
                    <path fill="#c026d3" fillOpacity="0.3" d="M0,480L80,458.7C160,437,320,395,480,405.3C640,416,800,480,960,490.7C1120,501,1280,459,1360,437.3L1440,416L1440,900L1360,900C1280,900,1120,900,960,900C800,900,640,900,480,900C320,900,160,900,80,900L0,900Z"></path>
                </svg>
            </div>

            {/* Navbar */}
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-20 bg-purple-950/40 rounded-2xl mt-4 border border-purple-800/40 backdrop-blur-md">
                <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-300 via-pink-300 to-purple-200 tracking-tight">
                    LibraryPro
                </div>
                <div className="space-x-4">
                    <Link to="/login" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 transition-colors shadow-lg shadow-fuchsia-600/30 font-bold">
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="container mx-auto px-6 flex-1 flex flex-col justify-center items-center text-center relative z-10 py-16">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                    Manage Your Library <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-300 to-purple-200">
                        With Intelligence
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-purple-100/90 max-w-3xl mb-12 leading-relaxed font-medium">
                    A sophisticated platform for modern educational institutions.
                    Track inventory, manage issues, and streamline requests seamlessly.
                </p>

                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Link to="/login" className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl font-bold text-lg hover:from-fuchsia-500 hover:to-purple-500 shadow-xl shadow-fuchsia-600/30">
                        Login to Portal
                    </Link>
                </div>
            </div>

            {/* Library Holdings / Stats Section */}
            <div className="container mx-auto px-6 pb-20 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: "Total Books", value: String(stats.totalBooks ?? 0).padStart(2, '0'), icon: "📚", color: "from-fuchsia-400 to-pink-300" },
                        { label: "Digital Journals", value: String(stats.digitalJournals ?? 0).padStart(2, '0'), icon: "💻", color: "from-purple-400 to-fuchsia-300" },
                        { label: "Research Papers", value: String(stats.researchPapers ?? 0).padStart(2, '0'), icon: "📝", color: "from-pink-400 to-purple-300" },
                        { label: "Active Members", value: String(stats.activeMembers ?? 0).padStart(2, '0'), icon: "👥", color: "from-fuchsia-300 to-pink-400" }
                    ].map((stat, index) => (
                        <div
                            key={index}
                            className="bg-purple-950/50 border border-purple-800/40 p-8 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden"
                        >
                            <div className="text-5xl mb-6">{stat.icon}</div>
                            <h3 className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.color} mb-2 tracking-tight`}>
                                {stat.value}
                            </h3>
                            <p className="text-purple-200/70 font-semibold uppercase tracking-wider text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="flex flex-col items-center py-6 text-purple-200/60 text-sm relative z-10 space-y-2 border-t border-purple-900/40">
                <p>&copy; {new Date().getFullYear()} LibraryPro System. All rights reserved.</p>
                <DeveloperCredit />
            </footer>
        </div>
    );
};

export default Landing;
