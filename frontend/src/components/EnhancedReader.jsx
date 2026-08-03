import { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    RiCloseLine, RiPencilLine, RiFontSize, RiPaletteLine,
    RiEraserLine, RiDeleteBin7Line, RiDownloadLine, RiSunLine,
    RiMoonLine, RiContrastDropLine, RiFocus2Line, RiTimerLine,
    RiMessage3Line, RiSendPlaneFill, RiZoomInLine, RiZoomOutLine,
    RiArrowRightUpLine, RiBrushLine, RiSave3Line, RiArrowGoBackLine,
    RiDropLine, RiVolumeUpLine, RiPauseCircleLine, RiStopCircleLine,
    RiSettings3Line, RiTranslate2, RiSkipBackLine, RiSkipForwardLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const EnhancedReader = ({ book, onClose, SERVER_URL, user, discussions = [], postMessage }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [tool, setTool] = useState('none'); // 'none', 'pencil', 'highlighter', 'eraser'
    const [color, setColor] = useState('#3b82f6'); // Default blue
    const [lineWidth, setLineWidth] = useState(3);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [zoom, setZoom] = useState(1.0);
    const [readingTime, setReadingTime] = useState(0);
    const [showDiscussions, setShowDiscussions] = useState(false);
    const [opacity, setOpacity] = useState(100);
    const [drawings, setDrawings] = useState({}); // { [page]: [paths] }
    const [isSaved, setIsSaved] = useState(true);
    const [audioState, setAudioState] = useState('idle'); // 'idle', 'playing', 'paused'
    const synth = window.speechSynthesis;

    const [pdfDocument, setPdfDocument] = useState(null);
    const [voices, setVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [audioRate, setAudioRate] = useState(1);
    const [audioPitch, setAudioPitch] = useState(1);
    const [autoTranslate, setAutoTranslate] = useState(true);
    const [targetLang, setTargetLang] = useState('hi');
    const targetLangRef = useRef('hi');
    const autoTranslateRef = useRef(true);
    const audioRateRef = useRef(1);
    const audioPitchRef = useRef(1);
    const selectedVoiceURIRef = useRef('');

    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const utteranceRef = useRef(null);
    const audioStateRef = useRef('idle'); // Keep track immediately for logic
    const audioChunksRef = useRef([]);
    const currentAudioChunkIndexRef = useRef(0);

    const [showTranslation, setShowTranslation] = useState(false);
    const [pageTranslationLang, setPageTranslationLang] = useState('hi');
    const pageTranslationLangRef = useRef('hi');
    const [translatedPageText, setTranslatedPageText] = useState('');
    const [isTranslatingPage, setIsTranslatingPage] = useState(false);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
            if (!selectedVoiceURI && availableVoices.length > 0) {
                const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
                    || availableVoices.find(v => v.lang.startsWith('en'))
                    || availableVoices[0];
                if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
            }
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []); // Only run once for loading voices

    // Sync refs
    useEffect(() => {
        targetLangRef.current = targetLang;
        pageTranslationLangRef.current = pageTranslationLang;
        autoTranslateRef.current = autoTranslate;
        audioRateRef.current = audioRate;
        audioPitchRef.current = audioPitch;
        selectedVoiceURIRef.current = selectedVoiceURI;
    }, [targetLang, pageTranslationLang, autoTranslate, audioRate, audioPitch, selectedVoiceURI]);

    const fileObj = useMemo(() => ({
        url: `${SERVER_URL}/${book.pdf_url}`,
        httpHeaders: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }), [SERVER_URL, book.pdf_url]);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const isDrawing = useRef(false);
    const currentPath = useRef([]);

    // Load annotations from local storage
    useEffect(() => {
        const key = `ebook_annotations_${user?.id || 'guest'}_${book.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setDrawings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse annotations", e);
            }
        }
    }, [book.id, user?.id]);

    // Scroll to top on page change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }

        // Stop audio when page changes
        if (audioState !== 'idle' && synth) {
            audioStateRef.current = 'idle';
            synth.cancel();
            if (window.speechInterval) clearInterval(window.speechInterval);
            setAudioState('idle');
        }
    }, [pageNumber]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            if (synth) synth.cancel();
            if (window.speechInterval) clearInterval(window.speechInterval);
        };
    }, []);

    // Page Translation Effect
    useEffect(() => {
        if (!showTranslation || !pdfDocument) return;

        const translateCurrentPage = async () => {
            setIsTranslatingPage(true);
            try {
                const page = await pdfDocument.getPage(pageNumber);
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');

                if (!text.trim()) {
                    setTranslatedPageText('No readable text found on this page.');
                    setIsTranslatingPage(false);
                    return;
                }

                // Chunk text to avoid Translation API URI length limits
                const chunks = text.match(/[\s\S]{1,1000}(?=\s|$)/g) || [text];
                let fullTranslation = '';

                for (let chunk of chunks) {
                    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${pageTranslationLang}&dt=t&q=${encodeURIComponent(chunk.trim())}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const json = await res.json();
                        const translatedChunk = json[0].map(item => item[0]).join('');
                        fullTranslation += translatedChunk + ' ';
                    }
                }
                setTranslatedPageText(fullTranslation);
            } catch (err) {
                console.error('Page translation error', err);
                setTranslatedPageText('Failed to translate page.');
            }
            setIsTranslatingPage(false);
        };

        translateCurrentPage();
    }, [pageNumber, showTranslation, pageTranslationLang, pdfDocument]);

    const speakCurrentChunk = async () => {
        if (currentAudioChunkIndexRef.current >= audioChunksRef.current.length || audioStateRef.current !== 'playing') {
            if (audioStateRef.current === 'playing') {
                setAudioState('idle');
                audioStateRef.current = 'idle';
            }
            return;
        }

        let chunkText = audioChunksRef.current[currentAudioChunkIndexRef.current].trim();
        if (!chunkText) {
            currentAudioChunkIndexRef.current++;
            speakCurrentChunk();
            return;
        }

        // Auto-Translate logic
        let languageToSpeak = 'en'; // default
        if (autoTranslateRef.current) {
            let baseLang = targetLangRef.current !== 'auto' ? targetLangRef.current : pageTranslationLangRef.current;
            languageToSpeak = baseLang;

            if (baseLang && baseLang !== 'en') {
                try {
                    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${baseLang}&dt=t&q=${encodeURIComponent(chunkText)}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const json = await res.json();
                        chunkText = json[0].map(item => item[0]).join('');
                    }
                } catch (err) {
                    console.error('Translation error', err);
                }
            }
        }

        if (audioStateRef.current !== 'playing') return; // User paused during translation

        let safeChunkText = chunkText.replace(/[\#\*\_\`\[\]\(\)\|]/g, ' ').trim(); // Strip weird symbols
        if (!safeChunkText) {
            if (audioStateRef.current === 'playing') {
                currentAudioChunkIndexRef.current++;
                speakCurrentChunk();
            }
            return;
        }

        const utterance = new SpeechSynthesisUtterance(safeChunkText);
        const currentVoices = window.speechSynthesis.getVoices();
        let selectedVoice = selectedVoiceURIRef.current ? currentVoices.find(v => v.voiceURI === selectedVoiceURIRef.current) : null;

        // Crucial fix: Assign voice matching the language to avoid Synthesis-Failed
        if (autoTranslateRef.current && languageToSpeak && languageToSpeak !== 'en') {

            // 1. Did the user intentionally select a valid voice for this specific language?
            if (selectedVoice && selectedVoice.lang.toLowerCase().startsWith(languageToSpeak.toLowerCase())) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
            } else {
                // 2. Otherwise auto-find the first available compatible voice
                let matchingVoice = currentVoices.find(v => v.lang.toLowerCase().startsWith(languageToSpeak.toLowerCase()));

                // Fallback to Hindi voice for Devanagari scripts if native voice is missing
                if (!matchingVoice && ['mr', 'gu', 'bn', 'ta', 'te', 'kn', 'ml'].includes(languageToSpeak)) {
                    matchingVoice = currentVoices.find(v => v.lang.toLowerCase().startsWith('hi'));
                }

                // DO NOT fallback to a random default (English) voice for Hindi/regional text.
                // Giving Devanagari script to an English voice causes "synthesis-failed" crash on Chrome/Edge.
                if (matchingVoice) {
                    utterance.voice = matchingVoice;
                    utterance.lang = matchingVoice.lang; // Use the matched voice's explicit language
                } else {
                    // Let the browser decide natively based on the proper lang tag
                    const langMap = { 'hi': 'hi-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'bn': 'bn-IN', 'kn': 'kn-IN', 'ml': 'ml-IN' };
                    utterance.lang = langMap[languageToSpeak] || languageToSpeak;
                    // Leave utterance.voice null so browser relies strictly on utterance.lang
                }
            }
        } else if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else if (currentVoices.length > 0) {
            utterance.voice = currentVoices[0]; // Extra safe fallback
        }

        utterance.rate = audioRateRef.current;

        let finalPitch = audioPitchRef.current;
        if (safeChunkText.includes('!')) finalPitch = Math.min(2, finalPitch + 0.2);
        if (safeChunkText.includes('?')) finalPitch = Math.min(2, finalPitch + 0.1);
        utterance.pitch = finalPitch;

        utterance.onend = () => {
            if (audioStateRef.current === 'playing') {
                currentAudioChunkIndexRef.current++;
                speakCurrentChunk();
            }
        };

        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                setAudioState('idle');
                audioStateRef.current = 'idle';
                toast.error(`Audio error: ${e.error}`);
            }
        };

        utteranceRef.current = utterance; // Prevent GC

        try {
            synth.speak(utterance);
        } catch (err) {
            console.error(err);
        }

        if (window.speechInterval) clearInterval(window.speechInterval);
        window.speechInterval = setInterval(() => {
            if (synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
            } else if (!synth.speaking) {
                clearInterval(window.speechInterval);
            }
        }, 14000);
    };

    const extractTextAndSpeak = async () => {
        if (!fileObj || !pdfjs) return;
        try {
            toast.loading('Preparing audio...', { id: 'audio-toast' });
            let pdf = pdfDocument;
            if (!pdf) {
                const loadingTask = pdfjs.getDocument(fileObj);
                pdf = await loadingTask.promise;
            }
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();

            let text = textContent.items.map(item => item.str).join(' ');
            toast.dismiss('audio-toast');

            if (!text.trim()) {
                toast.error('No readable text found on this page.');
                return;
            }

            synth.cancel();
            if (window.speechInterval) clearInterval(window.speechInterval);

            // Chunk text to avoid SpeechSynthesis limits
            audioChunksRef.current = text.match(/[\s\S]{1,100}(?=\s|$)/g) || [text];
            currentAudioChunkIndexRef.current = 0;

            setAudioState('playing');
            audioStateRef.current = 'playing';
            speakCurrentChunk();

        } catch (error) {
            console.error('Audio extraction error', error);
            toast.error('Failed to prepare audio.');
            toast.dismiss('audio-toast');
            setAudioState('idle');
            audioStateRef.current = 'idle';
        }
    };

    const toggleAudio = () => {
        if (audioState === 'idle') {
            extractTextAndSpeak();
        } else if (audioState === 'playing') {
            synth.pause();
            setAudioState('paused');
            audioStateRef.current = 'paused';
        } else if (audioState === 'paused') {
            synth.resume();
            setAudioState('playing');
            audioStateRef.current = 'playing';
        }
    };

    const stopAudio = () => {
        audioStateRef.current = 'idle';
        synth.cancel();
        if (window.speechInterval) clearInterval(window.speechInterval);
        setAudioState('idle');
    };

    const skipForward = () => {
        if (audioState === 'idle' || audioChunksRef.current.length === 0) return;
        if (currentAudioChunkIndexRef.current < audioChunksRef.current.length - 1) {
            currentAudioChunkIndexRef.current++;
            if (audioState === 'playing') {
                synth.cancel();
                speakCurrentChunk();
            }
        }
    };

    const skipBackward = () => {
        if (audioState === 'idle' || audioChunksRef.current.length === 0) return;
        if (currentAudioChunkIndexRef.current > 0) {
            currentAudioChunkIndexRef.current--;
            if (audioState === 'playing') {
                synth.cancel();
                speakCurrentChunk();
            }
        }
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                setPageNumber(prev => (prev < numPages ? prev + 1 : prev));
            } else if (e.key === 'ArrowLeft') {
                setPageNumber(prev => (prev > 1 ? prev - 1 : prev));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [numPages]);

    // Save annotations
    const saveAnnotations = () => {
        const key = `ebook_annotations_${user?.id || 'guest'}_${book.id}`;
        localStorage.setItem(key, JSON.stringify(drawings));
        setIsSaved(true);
        // Show a brief toast or indication? For now, button state change is enough.
    };

    const undoLastAction = () => {
        setDrawings(prev => {
            const pageDrawings = prev[pageNumber] || [];
            if (pageDrawings.length === 0) return prev;
            const newPageDrawings = pageDrawings.slice(0, -1);
            setIsSaved(false);
            return {
                ...prev,
                [pageNumber]: newPageDrawings
            };
        });
    };

    // Reading Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setReadingTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    function onDocumentLoadSuccess(pdf) {
        setNumPages(pdf.numPages);
        setPdfDocument(pdf);
    }

    // Canvas Drawing Logic
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to container
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [pageNumber, zoom]);

    // Redraw canvas when page or drawings change
    useEffect(() => {
        redrawCanvas();
    }, [pageNumber, drawings, zoom]);

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pageDrawings = drawings[pageNumber] || [];

        pageDrawings.forEach(path => {
            if (path.points.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);

            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            ctx.strokeStyle = path.tool === 'highlighter'
                ? `${path.color}${Math.round((path.opacity / 100) * 255).toString(16).padStart(2, '0')}`
                : path.color; // Pencils are solid for now or we could apply opacity too

            // If tool is pencil but has user configured opacity, maybe apply it? 
            // The user request implied "alpha option" generally. Let's apply it if stored.
            if (path.tool === 'pencil' && path.opacity !== undefined) {
                ctx.strokeStyle = `${path.color}${Math.round((path.opacity / 100) * 255).toString(16).padStart(2, '0')}`;
            }

            ctx.lineWidth = path.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (path.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.stroke();
        });
    };

    const startDrawing = (e) => {
        if (tool === 'none') return;
        isDrawing.current = true;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Adjust for zoom if needed, but simple x/y relative to canvas is usually enough if resizing logic adapts
        // Since we clear and redraw based on current canvas size, relative points (offset) work best if we don't handle zoom scaling in storage.
        // Actually, to support zoom, points should be stored relative to 100% size or normalized. 
        // For simplicity in this iteration, we'll assume the canvas scales visually but the coordinate system matches the element size.
        // If zoom changes canvas dimensions, we might need to scale coordinates. 
        // Let's assume resizeCanvas sets width/height to match offsetWidth/Height.

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPath.current = [{ x, y }];

        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);

        // Visual feedback styling
        const currentOpacityHex = Math.round((opacity / 100) * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = tool === 'highlighter' ? `${color}${currentOpacityHex}` : color; // Pencil solid usually
        if (tool === 'pencil') ctx.strokeStyle = `${color}${currentOpacityHex}`;

        ctx.lineWidth = tool === 'highlighter' ? lineWidth * 3 : lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = lineWidth * 2;
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const draw = (e) => {
        if (!isDrawing.current || tool === 'none') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPath.current.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        // Save path to state
        const newPath = {
            tool,
            color,
            lineWidth: tool === 'highlighter' ? lineWidth * 3 : (tool === 'eraser' ? lineWidth * 2 : lineWidth),
            opacity,
            points: currentPath.current
        };

        setDrawings(prev => ({
            ...prev,
            [pageNumber]: [...(prev[pageNumber] || []), newPath]
        }));
        setIsSaved(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setDrawings(prev => ({ ...prev, [pageNumber]: [] }));
        setIsSaved(false);
    };

    const [loadingProgress, setLoadingProgress] = useState(true);

    // Load saved progress
    useEffect(() => {
        if (!user || !book) return;
        setLoadingProgress(true);
        const progressKey = `reading_progress_${user.id || 'guest'}_${book.id}`;
        console.log('Loading progress from key:', progressKey);
        const savedPage = localStorage.getItem(progressKey);
        console.log('Saved page found:', savedPage);
        if (savedPage) {
            setPageNumber(parseInt(savedPage));
        } else {
            setPageNumber(1);
        }
        // Small timeout to ensure state settles before allowing saves
        setTimeout(() => setLoadingProgress(false), 100);
    }, [book.id, user?.id]);

    // Save progress on page change
    useEffect(() => {
        if (loadingProgress) return;
        if (!user || !book) return;
        if (pageNumber > 0) {
            const progressKey = `reading_progress_${user.id || 'guest'}_${book.id}`;
            console.log('Saving progress to key:', progressKey, 'Page:', pageNumber);
            localStorage.setItem(progressKey, pageNumber);
        }
    }, [pageNumber, book.id, user?.id, loadingProgress]);

    return (
        <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-white font-bold text-sm leading-tight">{book.book_name}</h3>
                        <p className="text-[10px] text-slate-400">Page {pageNumber} of {numPages}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg gap-1 border border-slate-700">
                        <ToolBtn active={tool === 'none'} onClick={() => setTool('none')} icon={<RiFocus2Line />} label="View" />
                        <ToolBtn active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={<RiPencilLine />} label="Paint" />
                        <ToolBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} icon={<RiBrushLine />} label="Highlight" />
                        <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<RiEraserLine />} label="Eraser" />
                        <div className="h-6 w-px bg-slate-700 mx-1"></div>
                        <button onClick={undoLastAction} className="p-2 text-slate-400 hover:text-white transition" title="Undo"><RiArrowGoBackLine size={18} /></button>
                        <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-400 transition" title="Clear Page"><RiDeleteBin7Line size={18} /></button>
                        <button onClick={saveAnnotations} className={`p-2 transition ${isSaved ? 'text-emerald-500' : 'text-yellow-500 animate-pulse'}`} title={isSaved ? "Saved" : "Unsaved Changes"}>
                            <RiSave3Line size={18} />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg gap-1 border border-slate-700">
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`p-2 rounded-lg transition flex items-center gap-2 ${showTranslation ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                            title="Translate Page Text"
                        >
                            <RiTranslate2 size={18} />
                            <span className="text-[10px] font-bold uppercase hidden lg:inline">Translate</span>
                        </button>
                        <button
                            onClick={() => setShowDiscussions(!showDiscussions)}
                            className={`p-2 rounded-lg transition flex items-center gap-2 ${showDiscussions ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                            <RiMessage3Line size={18} />
                            <span className="text-[10px] font-bold uppercase hidden lg:inline">Discussions</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Color Picker (Only if drawing) */}
                    {['pencil', 'highlighter'].includes(tool) && (
                        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            {[
                                '#3b82f6', // blue
                                '#ef4444', // red
                                '#10b981', // green
                                '#f59e0b', // amber
                                '#ffffff', // white
                            ].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-4 h-4 rounded-full border border-slate-600 transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Brush Size & Opacity */}
                    {['pencil', 'highlighter', 'eraser'].includes(tool) && (
                        <div className="flex items-center gap-4 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            {/* Size */}
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                <input
                                    type="range" min="1" max="20" value={lineWidth}
                                    onChange={(e) => setLineWidth(e.target.value)}
                                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    title="Brush Size"
                                />
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                            </div>

                            <div className="w-px h-4 bg-slate-600"></div>

                            {/* Opacity */}
                            <div className="flex items-center gap-2" title="Opacity / Alpha">
                                <RiDropLine className="text-slate-400 text-xs" />
                                <input
                                    type="range" min="10" max="100" value={opacity}
                                    onChange={(e) => setOpacity(e.target.value)}
                                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-400 w-6">{opacity}%</span>
                            </div>
                        </div>
                    )}

                    {/* Visual Controls */}
                    <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            <RiSunLine size={16} />
                            <input
                                type="range" min="50" max="150" value={brightness}
                                onChange={(e) => setBrightness(e.target.value)}
                                title="Brightness"
                                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            <RiContrastDropLine size={16} />
                            <input
                                type="range" min="50" max="150" value={contrast}
                                onChange={(e) => setContrast(e.target.value)}
                                title="Contrast"
                                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="text-emerald-400 flex items-center gap-1 font-mono text-xs bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-800">
                        <RiTimerLine /> {formatTime(readingTime)}
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                    <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-700">
                        <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="p-2 text-slate-400 hover:text-white transition"><RiZoomOutLine size={18} /></button>
                        <span className="text-[10px] text-slate-500 flex items-center px-1 border-x border-slate-700 font-bold">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 3.0))} className="p-2 text-slate-400 hover:text-white transition"><RiZoomInLine size={18} /></button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                    >
                        <RiCloseLine size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <div ref={scrollRef} className={`flex-1 overflow-auto bg-slate-900 p-8 flex flex-col items-center custom-scrollbar transition-all duration-300 ${showDiscussions ? 'mr-0 lg:mr-80' : ''}`}>
                    <div
                        ref={containerRef}
                        className="relative shadow-2xl transition-all duration-300"
                        style={{
                            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center'
                        }}
                    >
                        <Document
                            file={fileObj}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => {
                                console.error('Error while loading document!', error);
                                alert('Error loading PDF: ' + error.message);
                            }}
                            loading={
                                <div className="flex flex-col items-center gap-4 py-20">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-blue-400 font-medium">Decrypting knowledge...</p>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                width={Math.min(window.innerWidth * 0.9, 800)}
                                renderAnnotationLayer={true}
                                renderTextLayer={true}
                            />
                        </Document>

                        {/* Drawing Canvas Layer */}
                        <canvas
                            ref={canvasRef}
                            className={`absolute inset-0 z-20 touch-none ${tool === 'none' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseOut={stopDrawing}
                        />

                        {/* Translation Overlay */}
                        {showTranslation && (
                            <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-sm p-6 flex flex-col font-sans transition-all duration-300">
                                <div className="flex justify-between items-center mb-6 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <RiTranslate2 className="text-indigo-400 text-xl" />
                                        <h3 className="text-white font-bold">Translation Mode</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={pageTranslationLang}
                                            onChange={(e) => {
                                                setPageTranslationLang(e.target.value);
                                                setTargetLang(e.target.value);
                                                setAutoTranslate(true); // Enable audio translation when page translation changes
                                                pageTranslationLangRef.current = e.target.value;
                                                targetLangRef.current = e.target.value;
                                                autoTranslateRef.current = true;
                                                if (audioStateRef.current === 'playing') {
                                                    synth.cancel();
                                                    speakCurrentChunk();
                                                }
                                            }}
                                            className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none focus:border-indigo-500"
                                        >
                                            <option value="hi">Hindi (हिंदी)</option>
                                            <option value="mr">Marathi (मराठी)</option>
                                            <option value="gu">Gujarati (ગુજરાતી)</option>
                                            <option value="bn">Bengali (বাংলা)</option>
                                            <option value="ta">Tamil (தமிழ்)</option>
                                            <option value="te">Telugu (తెలుగు)</option>
                                            <option value="kn">Kannada (ಕನ್ನಡ)</option>
                                            <option value="ml">Malayalam (മലയാളം)</option>
                                            <option value="en">English</option>
                                        </select>
                                        <button onClick={() => setShowTranslation(false)} className="text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-lg"><RiCloseLine /></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-slate-200">
                                    {isTranslatingPage ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-400">
                                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="animate-pulse">Translating to {pageTranslationLang === 'hi' ? 'Hindi' : pageTranslationLang === 'mr' ? 'Marathi' : 'your language'}...</p>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap leading-relaxed text-lg" style={{ fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
                                            {translatedPageText}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="mt-8 mb-12 flex items-center gap-6 bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                            className="text-slate-400 hover:text-white disabled:opacity-30 p-2"
                        >
                            Previous
                        </button>
                        <div className="text-white font-bold flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={pageNumber}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= numPages) setPageNumber(val);
                                }}
                                className="w-12 bg-slate-900 border border-slate-600 rounded text-center text-blue-400 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-600">/</span>
                            <span>{numPages}</span>
                        </div>
                        <button
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                            className="text-slate-400 hover:text-white disabled:opacity-30 p-2"
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* Discussion Sidebar */}
                <div className={`fixed right-0 top-[73px] bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${showDiscussions ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2"><RiMessage3Line className="text-blue-500" /> Book Discussion</h3>
                        <button onClick={() => setShowDiscussions(false)} className="text-slate-400 hover:text-white"><RiCloseLine /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {discussions.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10 p-4">
                                <RiMessage3Line className="mx-auto text-4xl mb-2 opacity-20" />
                                <p className="text-sm">No discussions yet.</p>
                                <p className="text-[10px]">Start the conversation by asking a doubt!</p>
                            </div>
                        ) : (
                            discussions.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${msg.user_id === user?.id
                                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
                                        }`}>
                                        <p className="leading-relaxed">{msg.message}</p>
                                    </div>
                                    <span className="text-[9px] text-slate-500 mt-1 px-1">
                                        {msg.user_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-800">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const msg = e.target.message.value;
                            if (msg.trim()) {
                                postMessage(book.id, msg);
                                e.target.message.value = '';
                            }
                        }} className="flex gap-2">
                            <input
                                name="message"
                                placeholder="Write a message..."
                                className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoComplete="off"
                            />
                            <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                                <RiSendPlaneFill />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Custom Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
};

const ToolBtn = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        title={label}
        className={`p-2 rounded-md transition flex items-center gap-2 ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
    >
        {icon}
        <span className="text-[10px] font-bold uppercase hidden md:inline">{label}</span>
    </button>
);

export default EnhancedReader;
