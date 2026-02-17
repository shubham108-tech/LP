import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RiTimerLine } from 'react-icons/ri';

const ExamPortal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);

    useEffect(() => {
        startExam();
    }, [id]);

    useEffect(() => {
        if (timeLeft === 0) {
            submitExam();
        }
        if (!timeLeft) return;

        const intervalId = setInterval(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const startExam = async () => {
        try {
            const res = await api.post(`/exams/start/${id}`);
            setExam(res.data.exam);
            setQuestions(res.data.questions);
            setTimeLeft(res.data.exam.duration_minutes * 60);
            setLoading(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to start exam');
            navigate('/teacher/exams');
        }
    };

    const handleOptionSelect = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const submitExam = async () => {
        try {
            const res = await api.post('/exams/submit', {
                exam_id: id,
                answers
            });
            setResult(res.data);
            toast.success('Exam submitted successfully!');
        } catch (error) {
            toast.error('Failed to submit exam');
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading Exam...</div>;

    if (result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center animate-fade-in-up">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-6 ${result.status === 'pass' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {result.status === 'pass' ? '🎉' : '😔'}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{result.status === 'pass' ? 'Congratulations!' : 'Keep Practicing!'}</h2>
                    <p className="text-slate-500 mb-8">You have {result.status === 'pass' ? 'passed' : 'failed'} the exam.</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-blue-600">{result.score}</div>
                            <div className="text-xs text-blue-400 uppercase font-bold tracking-wider">Score</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-gray-600">{result.totalQuestions}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Questions</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-green-600">{result.correctCount}</div>
                            <div className="text-xs text-green-400 uppercase font-bold tracking-wider">Correct</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-red-600">{result.wrongCount}</div>
                            <div className="text-xs text-red-400 uppercase font-bold tracking-wider">Wrong</div>
                        </div>
                    </div>

                    <button onClick={() => navigate('/teacher/exams')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-500/30">
                        Back to Exams
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Timer */}
            <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">{exam.title}</h1>
                    <p className="text-xs text-slate-500">Total Marks: {exam.total_marks}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold flex items-center gap-2 ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                    <RiTimerLine /> {formatTime(timeLeft)}
                </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
                {questions.map((q, index) => (
                    <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-slate-800"><span className="font-bold text-slate-400 mr-2">Q{index + 1}.</span> {q.question_text}</h3>
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-bold">{q.marks} Marks</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['a', 'b', 'c', 'd'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => handleOptionSelect(q.id, opt)}
                                    className={`text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${answers[q.id] === opt
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.01]'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${answers[q.id] === opt ? 'bg-white text-blue-600 border-white' : 'bg-gray-100 text-gray-400 border-gray-300'
                                        }`}>
                                        {opt.toUpperCase()}
                                    </span>
                                    {q[`option_${opt}`]}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <button
                    onClick={submitExam}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                    Submit Exam
                </button>
            </div>
        </div>
    );
};

export default ExamPortal;
