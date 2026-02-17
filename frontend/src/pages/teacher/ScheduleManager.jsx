import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiAddLine, RiDeleteBinLine, RiTimeLine } from 'react-icons/ri';

const ScheduleManager = () => {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '', type: 'class', start_time: '', end_time: '', description: '', branch: ''
    });

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await api.get('/schedules');
            setSchedules(res.data);
        } catch (error) {
            toast.error('Failed to load schedule');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/schedules', formData);
            toast.success('Event scheduled');
            setShowForm(false);
            setFormData({ title: '', type: 'class', start_time: '', end_time: '', description: '', branch: '' });
            fetchSchedules();
        } catch (error) {
            toast.error('Failed to create schedule');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await api.delete(`/schedules/${id}`);
            toast.success('Event removed');
            fetchSchedules();
        } catch (error) {
            toast.error('Failed to remove event');
        }
    };

    // Group schedules by date
    const groupedSchedules = schedules.reduce((acc, curr) => {
        const date = new Date(curr.start_time).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr);
        return acc;
    }, {});

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Schedule & Timetable</h1>
                    <p className="text-sm text-slate-500">Upcoming classes, exams, and events</p>
                </div>
                {user.role !== 'student' && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        <RiAddLine /> Add Event
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
                    <h2 className="text-lg font-bold mb-4">Schedule New Event</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="class">Class</option>
                                <option value="exam">Exam</option>
                                <option value="event">Event/Holiday</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch (Optional)</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g. CS-A" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea rows="2" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-8">
                {Object.keys(groupedSchedules).sort((a, b) => new Date(a) - new Date(b)).map(date => (
                    <div key={date}>
                        <h3 className="font-bold text-slate-500 uppercase tracking-widest text-sm mb-4 sticky top-0 bg-gray-50/95 backdrop-blur py-2 z-10">{date}</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {groupedSchedules[date].map(item => (
                                <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex justify-between items-center ${item.type === 'exam' ? 'border-l-red-500' :
                                        item.type === 'event' ? 'border-l-green-500' : 'border-l-blue-500'
                                    }`}>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-lg text-slate-700">
                                            <span className="text-xs font-bold uppercase">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <RiTimeLine className="text-gray-400 my-1" />
                                            <span className="text-xs text-gray-400">{new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                                            <p className="text-sm text-slate-500">{item.description || 'No details provided.'}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.type === 'exam' ? 'bg-red-100 text-red-600' :
                                                        item.type === 'event' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>{item.type}</span>
                                                {item.branch && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{item.branch}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {user.role !== 'student' && (
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                            <RiDeleteBinLine size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {schedules.length === 0 && (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                        No upcoming events scheduled.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleManager;
