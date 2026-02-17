const DeveloperCredit = () => {
    return (
        <div className="mt-8 flex justify-center items-center">
            <div className="relative group cursor-default">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative px-4 py-2 bg-black/20 backdrop-blur-sm rounded-lg ring-1 ring-white/10 leading-none flex items-center shadow-xl">
                    <span className="text-xs text-slate-300 mr-1 font-light tracking-wide">Developed by</span>
                    <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 animate-gradient-x neon-text">
                        Shubham Bhendavade
                    </span>
                </div>
            </div>

        </div>
    );
};

export default DeveloperCredit;
