import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  ShieldAlert, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  FileText, 
  Info,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Terminal,
  ExternalLink,
  History as HistoryIcon,
  LogIn,
  LogOut,
  User,
  Trash2,
  Moon,
  Sun
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc,
  limit
} from 'firebase/firestore';

interface AnalysisResult {
  verdict: 'FAKE' | 'REAL';
  confidence: number;
  extractedText: string;
  redFlags: string[];
  suspiciousPhrases: string[];
  explanation: string;
  grammarScore: number;
}

interface ScanHistory {
  id: string;
  verdict: 'FAKE' | 'REAL';
  confidence: number;
  explanation: string;
  timestamp: any;
  imageUrl: string;
  extractedText: string;
  redFlags: string[];
  suspiciousPhrases: string[];
  grammarScore: number;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchHistory(u.uid);
        setNewDisplayName(u.displayName || '');
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/unauthorized-domain') {
        alert(`Configuration Error: This domain is not authorized in your Firebase Console. \n\nPlease add ${window.location.hostname} to your "Authorized domains" list in Firebase Authentication Settings.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        alert("Configuration Error: Google Sign-in is not enabled in your Firebase Console. \n\nPlease go to Authentication > Sign-in method and enable the Google provider.");
      } else {
        alert(`Login failed: ${err.message}`);
      }
    }
  };

  const logout = () => signOut(auth);

  const fetchHistory = async (uid: string) => {
    const path = 'scans';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanHistory));
      setHistory(docs);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  const saveScan = async (res: AnalysisResult, img: string) => {
    if (!user) return;
    const path = 'scans';
    try {
      const newDoc = {
        userId: user.uid,
        verdict: res.verdict,
        confidence: res.confidence,
        explanation: res.explanation,
        imageUrl: img,
        extractedText: res.extractedText || "",
        redFlags: res.redFlags || [],
        suspiciousPhrases: res.suspiciousPhrases || [],
        grammarScore: res.grammarScore || 0,
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, path), newDoc);
      setLastSavedId(docRef.id);
      fetchHistory(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteScan = async (id: string) => {
    const path = `scans/${id}`;
    try {
      await deleteDoc(doc(db, 'scans', id));
      setHistory(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const wipeAllHistory = async () => {
    if (!user || !window.confirm("Are you sure you want to delete ALL scan history? This cannot be undone.")) return;
    
    setIsDeletingAll(true);
    const path = 'scans';
    try {
      const q = query(collection(db, path), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, path, d.id)));
      await Promise.all(deletePromises);
      setHistory([]);
      setShowSettings(false);
      alert("All records purged successfully.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDisplayName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, { displayName: newDisplayName });
      setUser({ ...user, displayName: newDisplayName } as FirebaseUser);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Update failed. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePoster = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    setSuggestion(null);
    
    try {
      const response = await fetch('/api/analyze-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      
      const data = await response.json();
      if (data.error) {
        setSuggestion(data.suggestion);
        throw new Error(data.error);
      }
      setResult(data);
      if (user) {
        saveScan(data, image);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${
      darkMode ? 'bg-dark-950 text-slate-200' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${
        darkMode ? 'bg-dark-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="text-white size-6" />
            </div>
            <div className="cursor-pointer" onClick={() => {setShowHistory(false); setShowSettings(false); setResult(null); setImage(null);}}>
              <h1 className={`font-black text-xl tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                TRUSTPOSTER<span className="text-indigo-500">.AI</span>
              </h1>
            </div>
          </div>
          
          <nav className="flex items-center gap-4 lg:gap-8">
            <div className="hidden md:flex items-center gap-6 text-sm font-bold uppercase tracking-widest text-slate-500">
              <button 
                onClick={() => {setShowHistory(!showHistory); setShowSettings(false);}} 
                className={`hover:text-indigo-500 transition-colors flex items-center gap-2 ${showHistory ? 'text-indigo-500' : ''}`}
              >
                <HistoryIcon size={14} /> History
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="hover:text-indigo-500 transition-colors flex items-center gap-2"
              >
                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                {darkMode ? 'Light' : 'Dark'}
              </button>
            </div>
            
            {user ? (
              <div className={`flex items-center gap-4 pl-4 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button 
                  onClick={() => {setShowSettings(!showSettings); setShowHistory(false);}}
                  className={`flex items-center gap-2 transition-all p-1 rounded-xl group ${showSettings ? 'bg-indigo-500/10' : ''}`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} className="size-8 rounded-full border border-indigo-500/50 group-hover:border-indigo-500" alt={user.displayName || 'User'} />
                  ) : (
                    <div className={`size-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <User size={16} />
                    </div>
                  )}
                </button>
                <button onClick={logout} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-500' : 'hover:bg-red-50 text-slate-500 hover:text-red-600'}`}>
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <LogIn size={16} /> Login
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {showSettings && user ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>Account Configuration</h2>
                  <p className="text-slate-500 mt-1">Manage your identity and forensic preferences.</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white border text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Close Settings
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className={`md:col-span-1 p-8 rounded-[2.5rem] border text-center space-y-6 ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
                }`}>
                  <div className="relative inline-block">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="size-24 rounded-full border-4 border-indigo-500/20 shadow-2xl mx-auto" alt="Avatar" />
                    ) : (
                      <div className="size-24 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-500">
                        <User size={40} />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 size-6 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.displayName}</h3>
                    <p className="text-sm font-medium text-slate-500">{user.email}</p>
                  </div>
                  <div className="pt-6 border-t border-slate-800/50">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Account Tier</p>
                    <div className="bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                      Forensic Expert
                    </div>
                  </div>
                </div>

                {/* Preferences bento */}
                <div className="md:col-span-2 space-y-8">
                  <div className={`p-8 rounded-[2rem] border ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-lg'
                  }`}>
                    <h4 className={`text-lg font-bold flex items-center gap-2 mb-8 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      <User size={18} className="text-indigo-500" />
                      Profile Information
                    </h4>
                    
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Legal Name / Pseudonym</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                            placeholder="Enter your name"
                            className={`w-full px-6 py-4 rounded-2xl border transition-all focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold ${
                              darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          disabled={isUpdatingProfile || newDisplayName === user.displayName}
                          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                        >
                          {isUpdatingProfile ? 'Saving...' : 'Update Records'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className={`p-8 rounded-[2rem] border grid gap-8 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-lg'
                  }`}>
                    <h4 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      <Terminal size={18} className="text-indigo-500" />
                      Digital Identity & Privacy
                    </h4>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between group">
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Analytical Dark Mode</p>
                          <p className="text-xs text-slate-500">Low-glare interface for long sessions.</p>
                        </div>
                        <button 
                          onClick={() => setDarkMode(!darkMode)}
                          className={`w-14 h-8 rounded-full transition-all flex items-center p-1 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <div className={`size-6 rounded-full bg-white shadow-md transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between group">
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Instant Scan Auto-Save</p>
                          <p className="text-xs text-slate-500">Automatically push analysis reports to the cloud.</p>
                        </div>
                        <div className={`w-14 h-8 rounded-full transition-all flex items-center p-1 bg-indigo-600`}>
                          <div className={`size-6 rounded-full bg-white shadow-md translate-x-6`} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between group opacity-50 cursor-not-allowed">
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Cloud Artifact Sync</p>
                          <p className="text-xs text-slate-500">Automatically sync snapshots to mobile devices.</p>
                        </div>
                        <div className="w-14 h-8 rounded-full bg-slate-800/50 p-1">
                          <div className="size-6 rounded-full bg-slate-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] border space-y-6 ${
                    darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'
                  }`}>
                    <div>
                      <h4 className="text-lg font-bold text-red-500 flex items-center gap-2">
                        <Trash2 size={18} />
                        Danger Zone
                      </h4>
                      <p className={`text-sm mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-red-700'}`}>Permanent data removal actions.</p>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-black/20 border border-red-500/20">
                      <div>
                        <p className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Purge Scan History</p>
                        <p className="text-xs text-slate-500">Delete all your analysis records from our database.</p>
                      </div>
                      <button 
                        onClick={wipeAllHistory}
                        disabled={isDeletingAll}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isDeletingAll ? 'Purging...' : 'Wipe All'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex md:items-center justify-between flex-col md:flex-row gap-4">
                <div>
                  <h2 className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>Forensic Logs</h2>
                  <p className="text-slate-500 mt-1">Audit trail of analyzed internship posters.</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className={`text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg ${
                    darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  Return to Scanner
                </button>
              </div>

              {!user && (
                <div className={`rounded-3xl p-12 text-center space-y-6 border-2 border-dashed ${
                  darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="bg-white/10 p-5 rounded-full inline-block backdrop-blur-sm">
                    <User className={`${darkMode ? 'text-indigo-400' : 'text-amber-500'} size-10`} />
                  </div>
                  <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-amber-900'}`}>Session Access Required</h3>
                  <p className={`${darkMode ? 'text-slate-400' : 'text-amber-700'} max-w-sm mx-auto font-medium`}>
                    Authentication is needed to persistent scan results and access advanced forensic reports.
                  </p>
                  <button onClick={login} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95">
                    Connect with Google
                  </button>
                </div>
              )}

              {user && history.length === 0 && (
                <div className={`text-center py-32 rounded-[2rem] border-2 border-dashed ${
                  darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <HistoryIcon className={`${darkMode ? 'text-slate-800' : 'text-slate-200'} size-20 mx-auto mb-6`} />
                  <h3 className={`text-2xl font-black ${darkMode ? 'text-slate-700' : 'text-slate-800'}`}>Database Empty</h3>
                  <p className="text-slate-500 mt-2">Start your first forensic scan to see reports here.</p>
                </div>
              )}

              {user && history.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {history.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-3xl overflow-hidden shadow-2xl transition-all group flex flex-col ${
                        darkMode ? 'bg-slate-900 border border-slate-800 hover:border-indigo-500/50' : 'bg-white border border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="h-56 relative overflow-hidden shrink-0">
                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Scan" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl ${
                          item.verdict === 'FAKE' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                        }`}>
                          {item.verdict}
                        </div>
                      </div>
                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                              {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'Live'}
                            </span>
                            <div className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 text-[10px] font-mono">
                              {item.confidence}% ACCURACY
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed line-clamp-4 italic border-l-2 pl-4 ${
                            darkMode ? 'text-slate-400 border-indigo-500/30' : 'text-slate-600 border-indigo-100'
                          }`}>
                            "{item.explanation}"
                          </p>
                        </div>
                        <div className="pt-6 flex items-center justify-between">
                           <button 
                             onClick={() => {
                               setResult({
                                 verdict: item.verdict,
                                 confidence: item.confidence,
                                 explanation: item.explanation,
                                 extractedText: item.extractedText,
                                 redFlags: item.redFlags,
                                 suspiciousPhrases: item.suspiciousPhrases,
                                 grammarScore: item.grammarScore
                               }); 
                               setImage(item.imageUrl); 
                               setShowHistory(false);
                               setLastSavedId(item.id);
                             }}
                             className="text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
                           >
                              Inspect Details
                           </button>
                           <button 
                             onClick={() => deleteScan(item.id)}
                             className="text-slate-600 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/5"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Analyzer Column */}
              <div className="space-y-10">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black uppercase tracking-[0.2em] border border-indigo-500/20"
                  >
                    AI Security Guard
                  </motion.div>
                  <h2 className={`text-5xl font-black tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Is that internship <span className="text-indigo-600">legit?</span>
                  </h2>
                  <p className={`text-lg max-w-[90%] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Predatory scammers use high-urgency language and fake branding to target students. Use our AI to scan for forensic red flags instantly.
                  </p>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    group relative h-[28rem] rounded-[2.5rem] border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden
                    flex flex-col items-center justify-center p-8 text-center
                    ${image 
                      ? (darkMode ? 'border-indigo-500 bg-indigo-500/5' : 'border-indigo-400 bg-indigo-50/30') 
                      : (darkMode ? 'border-slate-800 bg-dark-900 hover:border-indigo-500 hover:bg-slate-900' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50')}
                  `}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Poster preview" className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white text-dark-950 px-6 py-3 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl">
                          <Upload size={20} /> Replace Asset
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className={`p-8 rounded-full inline-block transition-transform duration-500 group-hover:scale-110 ${
                        darkMode ? 'bg-slate-800' : 'bg-indigo-50'
                      }`}>
                        <Upload className={`${darkMode ? 'text-indigo-400' : 'text-indigo-500'} size-16`} strokeWidth={1} />
                      </div>
                      <div>
                        <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          Drop Forensic Artifact
                        </p>
                        <p className={`text-sm mt-2 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          Upload JPG, PNG, or WEBP up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <button
                  onClick={analyzePoster}
                  disabled={!image || isAnalyzing}
                  className={`
                    w-full py-6 px-10 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-4
                    ${!image || isAnalyzing 
                      ? (darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400') + ' cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_20px_50px_rgba(79,70,229,0.3)] active:scale-[0.98]'}
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white" />
                      Scanning Neurological Patterns...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="size-6" />
                      Initiate Neural Audit
                    </>
                  )}
                </button>

                {/* Red Flag Checklist */}
                <div className="bg-slate-900 rounded-2xl p-6 text-slate-300">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Terminal className="size-4 text-indigo-400" />
                    Detector Parameters
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {[
                      "Linguistic Pattern Matching",
                      "Scam Vocabulary Check",
                      "OCR Text Extraction",
                      "Grammar Analysis",
                      "Urgency & Scarcity Detection",
                      "Suspicious Link Extraction"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-indigo-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Dynamic Displays */}
              <div className="relative lg:sticky lg:top-24 h-fit">
                <AnimatePresence mode="wait">
                  {!result && !error && !isAnalyzing && (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`rounded-[3rem] p-16 text-center border-2 border-dashed flex flex-col items-center justify-center min-h-[500px] ${
                        darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className={`p-8 rounded-full mb-8 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <Search className={darkMode ? 'text-slate-700' : 'text-slate-300'} size={64} strokeWidth={1} />
                      </div>
                      <h3 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Awaiting Evidence</h3>
                      <p className={`mt-4 max-w-xs text-lg font-medium leading-relaxed ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        Upload a poster to see the AI report, confidence score, and red flag summary.
                      </p>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/50 rounded-[2.5rem] p-10 flex gap-6 items-start backdrop-blur-sm shadow-2xl shadow-red-500/10"
                    >
                      <AlertCircle className="text-red-500 shrink-0 mt-1 size-10" />
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-red-500">Scan Interrupted</h3>
                        <div className="space-y-1">
                          <p className="text-red-300 font-bold leading-relaxed">{error}</p>
                          {suggestion && (
                            <p className="text-red-400/70 text-sm font-medium italic">
                              Suggestion: {suggestion}
                            </p>
                          )}
                        </div>
                        <button onClick={analyzePoster} className="mt-2 bg-red-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95">
                          Retry Diagnostic
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {result && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8 pb-12"
                    >
                      {/* Performance Card */}
                      <div className={`p-8 rounded-[3rem] border-2 shadow-2xl transition-all relative overflow-hidden ${
                        result.verdict === 'FAKE' 
                          ? (darkMode ? 'bg-red-900/20 border-red-500/30 shadow-red-900/20' : 'bg-red-50 border-red-200') 
                          : (darkMode ? 'bg-emerald-900/20 border-emerald-500/30 shadow-emerald-900/20' : 'bg-emerald-50 border-emerald-200')
                      }`}>
                        <div className="flex items-center justify-between gap-6 relative z-10">
                          <div className="flex items-center gap-6">
                            <div className={`p-6 rounded-[2rem] shadow-xl ${
                              result.verdict === 'FAKE' ? 'bg-red-500' : 'bg-emerald-500'
                            }`}>
                              {result.verdict === 'FAKE' ? (
                                <XCircle className="text-white size-12" />
                              ) : (
                                <ShieldCheck className="text-white size-12" />
                              )}
                            </div>
                            <div>
                              <p className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${
                                result.verdict === 'FAKE' ? 'text-red-500' : 'text-emerald-500'
                              }`}>Verdict Status</p>
                              <h3 className={`text-6xl font-black tracking-tighter leading-none ${
                                result.verdict === 'FAKE' ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-emerald-400' : 'text-emerald-600')
                              }`}>
                                {result.verdict}
                              </h3>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className={`text-4xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {result.confidence}%
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Certainty</p>
                          </div>
                        </div>
                        {/* Background subtle decoration */}
                        <div className={`absolute -right-10 -bottom-10 size-48 rounded-full blur-[80px] opacity-20 ${
                          result.verdict === 'FAKE' ? 'bg-red-500' : 'bg-emerald-500'
                        }`} />
                      </div>

                      {/* Forensic Findings */}
                      <div className={`rounded-[2.5rem] border overflow-hidden shadow-xl ${
                        darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div className={`px-8 py-5 border-b flex items-center justify-between ${
                          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <h4 className={`font-black uppercase tracking-widest text-xs flex items-center gap-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Terminal size={14} className="text-indigo-500" />
                            Forensic Log
                          </h4>
                          <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            DOC_ID: {lastSavedId || 'PENDING_SYNC'}
                          </span>
                        </div>
                        <div className="p-8 space-y-8">
                          <p className={`text-xl font-medium leading-relaxed italic ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            "{result.explanation}"
                          </p>

                          {result.redFlags.length > 0 && (
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Risk Pattern Analysis</h5>
                              <div className="flex flex-wrap gap-3">
                                {result.redFlags.map((flag, i) => (
                                  <span key={i} className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all hover:scale-105 ${
                                    darkMode 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                                    : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                                  }`}>
                                    <ShieldAlert size={14} />
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.suspiciousPhrases.length > 0 && (
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Malicious Strings Identified</h5>
                              <div className={`rounded-2xl p-6 grid gap-4 border ${
                                darkMode ? 'bg-black/40 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-inner'
                              }`}>
                                {result.suspiciousPhrases.map((phrase, i) => (
                                  <div key={i} className="flex items-center gap-3 group">
                                    <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className={`font-mono text-sm tracking-tight ${darkMode ? 'text-red-400/90' : 'text-red-600 font-bold'}`}>
                                      {phrase}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-6 pt-4">
                            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Linguistic Integrity</p>
                              <div className="flex items-center gap-4">
                                 <div className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{result.grammarScore}%</div>
                                 <div className={`h-2.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                   <div 
                                     className={`h-full transition-all duration-1000 ${result.grammarScore > 70 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                     style={{ width: `${result.grammarScore}%` }} 
                                   />
                                 </div>
                              </div>
                            </div>
                            <div className={`p-6 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">OCR Processing</p>
                                <div className="text-xl font-bold text-emerald-500 flex items-center gap-2">
                                  <CheckCircle2 size={20} /> Verified
                                </div>
                              </div>
                              <BrainCircuit className="text-slate-700 size-10 opacity-30" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transcribed Data */}
                      <div className={`rounded-[2.5rem] border overflow-hidden transition-all ${
                        darkMode ? 'bg-dark-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                      }`}>
                         <div className={`px-8 py-5 flex items-center justify-between font-black uppercase tracking-widest text-xs border-b ${
                           darkMode ? 'bg-slate-800 shadow-xl border-slate-700' : 'bg-slate-50 border-slate-200'
                         }`}>
                           <span className="flex items-center gap-3">
                             <FileText size={16} className="text-indigo-500" />
                             Neural Extraction Result
                           </span>
                           <span className="text-slate-500 flex items-center gap-1">
                             <Info size={12} /> Pre-processed
                           </span>
                         </div>
                         <div className="p-8">
                            <div className={`p-6 rounded-2xl font-mono text-xs leading-relaxed max-h-60 overflow-y-auto custom-scrollbar ${
                              darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600 shadow-inner'
                            }`}>
                              {result.extractedText}
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Red Flags Knowledge Base Section */}
      <section className={`border-t py-24 ${darkMode ? 'bg-dark-900 border-slate-800' : 'bg-indigo-50/30 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/20">
              Scam Education Kit
            </div>
            <h2 className={`text-4xl font-black tracking-tighter sm:text-5xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              The Red Flag <span className="text-red-500">Registry</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Our AI is trained on these high-confidence indicators of recruitment fraud. Memorize these to protect yourself offline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Financial Requests",
                desc: "Asking for 'Security Deposits', 'Training Fees', or 'Laptop Processing charges' is the #1 sign of a fraud.",
                icon: <XCircle className="text-red-500" />,
                tags: ["Fee", "Deposit", "Payment"]
              },
              {
                title: "Artificial Urgency",
                desc: "Phrases like 'Apply within 2 hours' or 'Only 3 slots left' bypass your critical thinking.",
                icon: <AlertCircle className="text-amber-500" />,
                tags: ["Urgent", "Immediate", "Limited"]
              },
              {
                title: "Identity Evasion",
                desc: "Legitimate firms use @company.com. Scammers hide behind @gmail.com or @outlook.com.",
                icon: <ShieldAlert className="text-indigo-500" />,
                tags: ["Generic Email", "No Domain"]
              },
              {
                title: "Communication Gaps",
                desc: "Offering jobs purely over WhatsApp or Telegram without a formal video/in-person interview.",
                icon: <Search className="text-blue-500" />,
                tags: ["WhatsApp Only", "No Interview"]
              },
              {
                title: "Unrealistic Pay",
                desc: "Offering $2000/week for data entry or simple tasks without requiring specialized skills.",
                icon: <ShieldCheck className="text-emerald-500" />,
                tags: ["High Stipend", "No Experience"]
              },
              {
                title: "Poor Aesthetics",
                desc: "Rainbow font colors, blurry logos, and significant typos in professional-looking documents.",
                icon: <Terminal className="text-slate-500" />,
                tags: ["Typos", "Low Res", "Design"]
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className={`p-8 rounded-[2rem] border transition-all ${
                  darkMode ? 'bg-dark-950 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-xl'
                }`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50'}`}>
                    {item.icon}
                  </div>
                  <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                </div>
                <p className={`mb-8 leading-relaxed font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500 text-sm'}`}>
                  {item.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map(tag => (
                    <span key={tag} className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                      darkMode ? 'bg-slate-900 text-slate-500 border border-slate-800' : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className={`border-t transition-colors ${darkMode ? 'bg-dark-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
             <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <ShieldAlert className="text-white size-6" />
              </div>
              <h1 className={`font-black text-2xl tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                TRUSTPOSTER<span className="text-indigo-500">.AI</span>
              </h1>
            </div>
            <p className={`text-lg leading-relaxed max-w-md ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              An advanced AI forensic toolkit dedicated to neutralizing recruitment fraud and protecting the professional future of students worldwide.
            </p>
            <div className="flex gap-4">
              <button className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all">
                <Terminal size={20} />
              </button>
              <button className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all">
                <ExternalLink size={20} />
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            <h4 className={`font-black uppercase tracking-widest text-[10px] ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>Project Core</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-500">
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Forensic Methodology</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Dataset Documentation</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Red Flag Registry</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Cybersecurity Blog</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className={`font-black uppercase tracking-widest text-[10px] ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>Engineering Tools</h4>
            <div className="flex flex-wrap gap-2">
              {["React 19", "Gemini Pro Vision", "Tailwind 4", "Firebase", "NLP Engine", "OCR Forensic"].map(tool => (
                <span key={tool} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={`py-8 border-t text-center text-[10px] font-black uppercase tracking-[0.3em] ${
          darkMode ? 'border-slate-800 text-slate-700' : 'border-slate-100 text-slate-400'
        }`}>
          &copy; 2026 TrustPoster AI Cybersecurity Solutions. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
