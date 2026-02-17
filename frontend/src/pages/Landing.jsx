import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DeveloperCredit from '../components/DeveloperCredit';

const Landing = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col relative overflow-hidden">

            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            {/* Navbar */}
            <nav className="container mx-auto px-6 py-8 flex justify-between items-center relative z-10">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    LibraryPro
                </div>
                <div className="space-x-4">
                    <Link to="/login" className="px-6 py-2 rounded-full border border-blue-400/30 hover:bg-white/10 transition-colors">
                        Login
                    </Link>
                    <Link to="/register" className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                        Register
                    </Link>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="container mx-auto px-6 flex-1 flex flex-col justify-center items-center text-center relative z-10 pb-20">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
                >
                    Manage Your Library <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        With Intelligence
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-xl md:text-2xl text-blue-100 max-w-3xl mb-12 leading-relaxed"
                >
                    A sophisticated platform for modern educational institutions.
                    Track inventory, manage issues, and streamline requests seamlessly.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-col md:flex-row gap-4 justify-center"
                >
                    <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1">
                        Get Started
                    </Link>
                    <Link to="/login" className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/10">
                        Teacher Login
                    </Link>
                </motion.div>

            </div>

            {/* Library Holdings / Stats Section */}
            <div className="container mx-auto px-6 pb-20 relative z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {[
                        { label: "Total Books", value: "15,000+", icon: "📚", color: "from-blue-400 to-cyan-300" },
                        { label: "Digital Journals", value: "2,500+", icon: "💻", color: "from-purple-400 to-pink-300" },
                        { label: "Research Papers", value: "850+", icon: "📝", color: "from-amber-400 to-orange-300" },
                        { label: "Active Members", value: "3,000+", icon: "👥", color: "from-emerald-400 to-teal-300" }
                    ].map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-white/10 transition-all group"
                        >
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                            <h3 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.color} mb-1`}>
                                {stat.value}
                            </h3>
                            <p className="text-blue-200/70 font-medium">{stat.label}</p>
                            <div className={`h-1 w-12 mt-4 rounded-full bg-gradient-to-r ${stat.color} opacity-50 group-hover:w-full transition-all duration-500`}></div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="flex flex-col items-center py-6 text-blue-200/40 text-sm relative z-10 space-y-2">
                <p>&copy; {new Date().getFullYear()} LibraryPro System. All rights reserved.</p>
                <DeveloperCredit />
            </footer>
        </div >
    );
};

export default Landing;
