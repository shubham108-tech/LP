import React from 'react';

const Background3DEffect = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#090217]">
            {/* 3D Main Graphic Wallpaper Layer */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-1000"
                style={{
                    backgroundImage: "url('/bg_3d_purple.png')",
                    backgroundAttachment: 'fixed',
                    filter: 'contrast(105%) brightness(98%)'
                }}
            />

            {/* Glowing Ambient Radial Glow Orbs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-700/15 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[130px]" />

            {/* Animated 3D Floating Geometry Cubes Layer */}
            <div className="absolute inset-0 [perspective:1000px] opacity-40">
                {/* Floating Cube 1 */}
                <div className="absolute top-[15%] right-[10%] w-16 h-16 animate-float-slow transform-gpu">
                    <div className="w-full h-full border-2 border-fuchsia-400/40 rounded-xl bg-purple-900/30 backdrop-blur-md shadow-[0_0_25px_rgba(217,70,239,0.3)] rotate-12 rotate-y-45"></div>
                </div>

                {/* Floating Cube 2 */}
                <div className="absolute top-[60%] right-[18%] w-12 h-12 animate-float-reverse transform-gpu">
                    <div className="w-full h-full border border-indigo-400/50 rounded-lg bg-indigo-900/40 backdrop-blur-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] -rotate-45"></div>
                </div>

                {/* Floating Cube 3 */}
                <div className="absolute bottom-[20%] left-[8%] w-20 h-20 animate-float-slow transform-gpu">
                    <div className="w-full h-full border-2 border-purple-400/30 rounded-2xl bg-fuchsia-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.25)] rotate-45"></div>
                </div>

                {/* Cyber Geometric Mesh Grid */}
                <div 
                    className="absolute inset-0 opacity-15"
                    style={{
                        backgroundImage: `radial-gradient(rgba(192, 132, 252, 0.4) 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />
            </div>

            {/* Dark Vignette Overlay for Crisp Content Contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0319]/40 via-transparent to-[#0a0319]/60" />
        </div>
    );
};

export default Background3DEffect;
