import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiAddLine, RiDeleteBinLine, RiTimerLine, RiFileListLine, RiCheckboxCircleLine, RiEyeLine, RiListUnordered } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

const ExamsManager = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', duration_minutes: 60, total_marks: 100,
        passing_marks: 33, start_time: '', end_time: '', branch: '', batch: '', division: '', class_group: ''
    });

    // For Question Modal
    const [showQModal, setShowQModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [qData, setQData] = useState({
        question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', marks: 1
    });

    // For View Questions Modal
    const [showQuestionsList, setShowQuestionsList] = useState(false);
    const [questionsList, setQuestionsList] = useState([]);
    const [currentExamTitle, setCurrentExamTitle] = useState('');

    const [viewResults, setViewResults] = useState(null); // Exam object to view results for
    const [results, setResults] = useState([]);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await api.get('/exams');
            setExams(res.data);
        } catch (error) {
            toast.error('Failed to load exams');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/exams', formData);
            toast.success('Exam created successfully');
            setShowForm(false);
            setFormData({ title: '', description: '', duration_minutes: 60, total_marks: 100, passing_marks: 33, start_time: '', end_time: '', branch: '', batch: '', division: '', class_group: '' });
            fetchExams();
        } catch (error) {
            toast.error('Failed to create exam');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        try {
            await api.post('/exams/questions', { ...qData, exam_id: selectedExamId });
            toast.success('Question added');
            setQData({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', marks: 1 });
            fetchExams(); // Update counts
        } catch (error) {
            toast.error('Failed to add question');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete exam?')) return;
        try {
            await api.delete(`/exams/${id}`);
            toast.success('Exam deleted');
            fetchExams();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const fetchResults = async (exam) => {
        try {
            const res = await api.get(`/exams/${exam.id}/results`);
            setResults(res.data);
            setViewResults(exam);
        } catch (error) {
            toast.error('Failed to load results');
        }
    };

    const fetchQuestions = async (exam) => {
        try {
            const res = await api.get(`/exams/questions/${exam.id}`);
            setQuestionsList(res.data);
            setCurrentExamTitle(exam.title);
            setShowQuestionsList(true);
        } catch (error) {
            toast.error('Failed to load questions');
        }
    };

    const ExamCountdown = ({ startTime, onComplete }) => {
        const [timeLeft, setTimeLeft] = useState(null);
        const completedRef = useRef(false);

        useEffect(() => {
            const calculateTimeLeft = () => {
                const now = new Date();
                const start = new Date(startTime);
                const difference = +start - +now;

                if (difference > 0) {
                    setTimeLeft(difference);
                    completedRef.current = false;
                } else {
                    setTimeLeft(0);
                    if (!completedRef.current) {
                        completedRef.current = true;
                        if (onComplete) setTimeout(onComplete, 3000); // 3-second delay
                    }
                }
            };

            calculateTimeLeft();
            const timer = setInterval(calculateTimeLeft, 1000);

            return () => clearInterval(timer);
        }, [startTime]);

        if (timeLeft === null) return null;

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        if (timeLeft === 0) {
            return (
                <div className="mt-2 text-center animate-pulse">
                    <p className="text-sm font-bold text-blue-600">Starting...</p>
                </div>
            );
        }

        return (
            <div className="mt-2 text-center">
                <p className="text-xs text-slate-500 mb-1">Exam starts in:</p>
                <div className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 inline-block min-w-[120px]">
                    {days > 0 && <span>{days}d </span>}
                    <span>{hours.toString().padStart(2, '0')}:</span>
                    <span>{minutes.toString().padStart(2, '0')}:</span>
                    <span>{seconds.toString().padStart(2, '0')}</span>
                </div>
            </div>
        );
    };

    // Student View Component (Simple List)
    const StudentView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => (
                <div key={exam.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${exam.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
                            exam.status === 'upcoming' ? 'bg-blue-100 text-blue-600' :
                                exam.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {exam.status}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><RiTimerLine /> {exam.duration_minutes}m</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{exam.title}</h3>
                    <div className="text-sm text-slate-500 mb-4 flex gap-4">
                        <span>Q: {exam.question_count}</span>
                        <span>Marks: {exam.total_marks}</span>
                    </div>

                    <div className="text-xs text-slate-400 mb-4">
                        Date: {new Date(exam.start_time).toLocaleString()}
                    </div>

                    {exam.status === 'upcoming' && (
                        <div className="flex flex-col gap-2">
                            <ExamCountdown startTime={exam.start_time} onComplete={fetchExams} />
                            <button disabled className="w-full py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg font-bold cursor-not-allowed text-sm">
                                Please Wait
                            </button>
                        </div>
                    )}

                    {exam.status === 'live' && (
                        <button
                            onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-bold hover:shadow-lg hover:from-red-700 hover:to-rose-700 transition transform hover:-translate-y-0.5 mt-2"
                        >
                            Start Exam Now
                        </button>
                    )}
                    {exam.status === 'completed' && (
                        <div className="text-center mt-4">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase mb-2 border border-green-200">
                                Completed
                            </span>
                            {exam.my_score !== undefined && exam.my_score !== null ? (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p className="font-bold text-slate-800 text-lg">
                                        Your Score: <span className={exam.my_score >= exam.passing_marks ? "text-green-600" : "text-red-500"}>{exam.my_score}</span>
                                        <span className="text-gray-400 text-sm">/{exam.total_marks}</span>
                                    </p>
                                    <p className={`text-xs font-bold mt-1 uppercase ${exam.my_score >= exam.passing_marks ? "text-green-600" : "text-red-500"}`}>
                                        {exam.my_score >= exam.passing_marks ? "Passed" : "Failed"}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">Results Pending</p>
                            )}
                        </div>
                    )}
                    {exam.status === 'expired' && (
                        <span className="block text-center text-sm font-medium text-gray-500 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            Exam Expired
                        </span>
                    )}
                </div>
            ))}
            {exams.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">No exams available.</div>
            )}
        </div>
    );

    if (user.role === 'student') {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Online Exams</h1>
                <StudentView />
            </div>
        );
    }

    // Teacher View
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Exam Management</h1>
                    <p className="text-sm text-slate-500">Create and manage online tests</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                    <RiAddLine /> Create Exam
                </button>
            </div>

            {/* Create Exam Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
                    <h2 className="text-lg font-bold mb-4">Create New Exam</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                            <input type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                            <input type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.total_marks} onChange={e => setFormData({ ...formData, total_marks: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Batch (Year)</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.batch} onChange={e => setFormData({ ...formData, batch: e.target.value })} placeholder="e.g. 2024" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })} placeholder="e.g. A, B" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class/Group (e.g. S1, T1)</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.class_group} onChange={e => setFormData({ ...formData, class_group: e.target.value })} placeholder="e.g. F1, S2, T3" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Question Modal */}
            {showQModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Add Question</h2>
                        <form onSubmit={handleAddQuestion} className="space-y-4">
                            <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="3" placeholder="Question Text" required value={qData.question_text} onChange={e => setQData({ ...qData, question_text: e.target.value })} />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Option A" required value={qData.option_a} onChange={e => setQData({ ...qData, option_a: e.target.value })} />
                                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Option B" required value={qData.option_b} onChange={e => setQData({ ...qData, option_b: e.target.value })} />
                                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Option C" required value={qData.option_c} onChange={e => setQData({ ...qData, option_c: e.target.value })} />
                                <input type="text" className="px-4 py-2 border rounded-lg" placeholder="Option D" required value={qData.option_d} onChange={e => setQData({ ...qData, option_d: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <select className="px-4 py-2 border rounded-lg" value={qData.correct_option} onChange={e => setQData({ ...qData, correct_option: e.target.value })}>
                                    <option value="a">Correct: A</option>
                                    <option value="b">Correct: B</option>
                                    <option value="c">Correct: C</option>
                                    <option value="d">Correct: D</option>
                                </select>
                                <input type="number" className="px-4 py-2 border rounded-lg w-24" placeholder="Marks" value={qData.marks} onChange={e => setQData({ ...qData, marks: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowQModal(false)} className="px-4 py-2 text-gray-600">Close</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Questions Modal */}
            {showQuestionsList && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Questions: {currentExamTitle}</h2>
                            <button onClick={() => setShowQuestionsList(false)} className="p-2 hover:bg-gray-100 rounded-full"><RiAddLine className="transform rotate-45" size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            {questionsList.map((q, index) => (
                                <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between mb-2">
                                        <div className="font-bold text-slate-700">Q{index + 1}. {q.question_text}</div>
                                        <div className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">{q.marks} Marks</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div className={q.correct_option === 'a' ? 'text-green-600 font-bold' : ''}>A: {q.option_a}</div>
                                        <div className={q.correct_option === 'b' ? 'text-green-600 font-bold' : ''}>B: {q.option_b}</div>
                                        <div className={q.correct_option === 'c' ? 'text-green-600 font-bold' : ''}>C: {q.option_c}</div>
                                        <div className={q.correct_option === 'd' ? 'text-green-600 font-bold' : ''}>D: {q.option_d}</div>
                                    </div>
                                </div>
                            ))}
                            {questionsList.length === 0 && <div className="text-center text-gray-400 py-10">No questions added yet.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* View Results Modal */}
            {viewResults && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Results: {viewResults.title}</h2>
                            <button onClick={() => setViewResults(null)} className="p-2 hover:bg-gray-100 rounded-full"><RiAddLine className="transform rotate-45" size={24} /></button>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3">Student</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td className="p-3 font-medium">{r.student_name} <span className="text-gray-400 font-normal">({r.email})</span></td>
                                        <td className="p-3 font-bold text-blue-600">{r.score}/{viewResults.total_marks}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${r.status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                                        <td className="p-3 text-gray-500">{new Date(r.completed_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {results.length === 0 && (
                                    <tr><td colSpan="4" className="p-6 text-center text-gray-400">No attempts yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{exam.title}</h3>
                            <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                <span>{new Date(exam.start_time).toLocaleString()} - {new Date(exam.end_time).toLocaleString()}</span>
                                <span>Duration: {exam.duration_minutes}m</span>
                                {exam.batch && <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded">Batch: {exam.batch}</span>}
                                {exam.division && <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded">Div: {exam.division}</span>}
                                {exam.class_group && <span className="bg-purple-100 text-purple-600 px-1 py-0.5 rounded">{exam.class_group}</span>}
                                <span>Attempts: {exam.attempts_count}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => fetchQuestions(exam)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 flex items-center gap-1">
                                <RiListUnordered /> Questions ({exam.question_count})
                            </button>
                            <button onClick={() => { setSelectedExamId(exam.id); setShowQModal(true); }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                                + Add Q
                            </button>
                            <button onClick={() => fetchResults(exam)} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center gap-1">
                                <RiEyeLine /> Results
                            </button>
                            <button onClick={() => handleDelete(exam.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                                <RiDeleteBinLine />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExamsManager;
