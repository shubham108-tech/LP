import { useState, useEffect } from 'react';
import api from '../services/api';
import { SERVER_URL } from '../config';
import { RiTrophyLine, RiBookOpenLine, RiMedalLine } from 'react-icons/ri';

const Leaderboard = () => {
    const [data, setData] = useState({ topReaders: [], examToppers: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/gamification/leaderboard');
            setData({
                topReaders: res.data.topReaders || [],
                examToppers: res.data.examToppers || []
            });
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse bg-gray-100 h-64 rounded-xl"></div>;

    const RankItem = ({ user, rank, metric, label, icon: Icon, color }) => (
        <div className="flex items-center justify-between p-3 first:bg-gradient-to-r first:from-yellow-50 first:to-orange-50 rounded-lg group hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                    rank === 2 ? 'bg-gray-100 text-gray-500' :
                        rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                    {rank}
                </div>
                {user.profile_image ? (
                    <img src={`${SERVER_URL}${user.profile_image}`} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                        {user.name?.charAt(0)}
                    </div>
                )}
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">{user.name}</h4>
                    {rank === 1 && <span className="text-[10px] bg-yellow-400 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Champion</span>}
                </div>
            </div>
            <div className="text-right">
                <div className={`font-bold text-lg ${color}`}>{metric}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Top Readers */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600">
                    <RiBookOpenLine size={100} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <RiBookOpenLine className="text-blue-500" /> Top Readers
                </h3>
                <div className="space-y-2 relative z-10">
                    {data.topReaders.length > 0 ? (
                        data.topReaders.map((user, index) => (
                            <RankItem
                                key={user.id}
                                user={user}
                                rank={index + 1}
                                metric={user.books_read}
                                label="Books Read"
                                color="text-blue-600"
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No readers yet.</div>
                    )}
                </div>
            </div>

            {/* Exam Toppers */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-purple-600">
                    <RiTrophyLine size={100} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <RiTrophyLine className="text-purple-500" /> Exam Toppers
                </h3>
                <div className="space-y-2 relative z-10">
                    {data.examToppers.length > 0 ? (
                        data.examToppers.map((user, index) => (
                            <RankItem
                                key={user.id}
                                user={user}
                                rank={index + 1}
                                metric={user.total_score}
                                label="Total Score"
                                color="text-purple-600"
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">No exam data yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
