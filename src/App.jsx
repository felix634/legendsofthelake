import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Camera, HelpCircle, AlertTriangle, 
  Clock, Award, ChevronRight, Navigation, BookOpen, Lock, Unlock 
} from 'lucide-react';

// --- JÁTÉK ADATOK (MOST MÁR KOORDINÁTÁKKAL) ---
// A koordináták a Badacsonyi helyszínek közelítő pontjai

const STATIONS = [
  {
    id: 1,
    title: "A Padlás Titka",
    location: "Badacsonyi Tájház",
    lat: 46.7975, // Minta koordináta (Badacsony központ)
    lng: 17.5020,
    letter: `
      "Drága Barátom! 
      Ha ezt olvasod, megtaláltad a rejtekhelyemet a régi Tájház padlásán..."
    `,
    task: "Keresd meg az épületrészek számaiból összeálló kódot!",
    answer: "1798", 
    hints: ["Számold meg az ablakokat.", "Tetőcserepek mintázata.", "Építés éve + 8."],
    keyword: "KÉK"
  },
  {
    id: 2,
    title: "A Borkereskedő Háza",
    location: "Főutca, Régi Kereskedőház",
    lat: 46.7930, 
    lng: 17.5040,
    letter: `
      "Gratulálok! Most a Főutcán állsz..."
    `,
    task: "Fejtsd meg a homlokzat és a pad titkát!",
    answer: "BOR",
    hints: ["Nézd a pad léceit.", "3 fő díszítőelem.", "Mindenki szereti."],
    keyword: "NYELŰ"
  },
  // ... (A többi állomás ugyanígy, rövidítve a kód átláthatósága miatt)
  {
    id: 3, title: "A Présház Rejtélye", location: "Szőlőhegy", lat: 46.8010, lng: 17.4980,
    letter: "Felfelé vezet az út...", task: "Olvasd le a kódot a présről!", answer: "450", 
    hints: ["Akós mértékegység.", "4 óra 50 perc.", "4-5-0"], keyword: "ZAMATOS"
  },
  {
    id: 4, title: "A Kápolna Üzenete", location: "Szent Donát Kápolna", lat: 46.8050, lng: 17.4950,
    letter: "Szent Donát a védőszent...", task: "Fotózd le a részletet!", answer: "SD71", 
    hints: ["Monogram: SD.", "Évszám vége.", "SD + 71"], keyword: "VULKÁNI"
  },
  {
    id: 5, title: "A Kilátó Titka", location: "Kisfaludy-kilátó", lat: 46.8100, lng: 17.4900,
    letter: "Pazar a kilátás...", task: "Lépcsőfokok + Hegycsúcs.", answer: "88GULACS", 
    hints: ["88 lépcsőfok.", "Gulács hegy.", "Szám + Hegy"], keyword: "BADACSONYI"
  },
  {
    id: 6, title: "A Pince Labirintusa", location: "Régi Borpince", lat: 46.7950, lng: 17.5010,
    letter: "A mélyben vár a próba...", task: "Azonosítsd az eszközt!", answer: "LOPÓ", 
    hints: ["Bort szívnak vele.", "Üveg, hosszú nyak.", "Kóstoláshoz kell."], keyword: "LEGENDÁS"
  },
  {
    id: 7, title: "A Végső Titok", location: "Rózsakő", lat: 46.8020, lng: 17.4990,
    letter: "Itt állunk a Rózsakőnél...", task: "Kombináld a kulcsszavakat!", answer: "KÉKNYELŰ", 
    hints: ["Első szín.", "Második eszköz része.", "Badacsonyi fajta."], keyword: "VÉGE"
  }
];

// --- SEGÉDFÜGGVÉNY: Távolság számítása (Haversine formula) ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Föld sugara méterben
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Távolság méterben
}

function App() {
  const [gameState, setGameState] = useState('WELCOME');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [score, setScore] = useState(1000);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [userInput, setUserInput] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isPhotoTaken, setIsPhotoTaken] = useState(false);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);
  const [gpsError, setGpsError] = useState(null); // Ha túl messze van

  // Időzítő
  useEffect(() => {
    let interval;
    if (gameState === 'PLAYING') {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  };

  const startGame = () => {
    setGameState('PLAYING');
    setStartTime(Date.now());
    setCurrentStageIndex(0);
  };

  // --- VALÓDI GPS ELLENŐRZÉS ---
  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', msg: 'A böngésződ nem támogatja a helymeghatározást.' });
      return;
    }

    setIsCheckingGPS(true);
    setFeedback({ type: 'info', msg: 'Műholdak keresése... Maradj egy helyben!' });
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const target = STATIONS[currentStageIndex];
        
        // Távolság számítása
        const distance = calculateDistance(userLat, userLng, target.lat, target.lng);
        
        setIsCheckingGPS(false);

        // 50 méteres körzetet engedünk meg
        if (distance <= 50) {
          setIsLocationVerified(true);
          setFeedback({ type: 'success', msg: 'Megérkeztél a helyszínre! A levél feloldva.' });
        } else {
          // Ha túl messze van
          let distanceText = distance < 1000 
            ? `${Math.round(distance)} méterre` 
            : `${(distance / 1000).toFixed(1)} km-re`;
            
          setGpsError(`Túl messze vagy a céltól (${distanceText})!`);
          setFeedback({ type: 'error', msg: 'Nem vagy a helyszínen.' });
        }
      },
      (error) => {
        setIsCheckingGPS(false);
        setFeedback({ type: 'error', msg: 'Hiba a helymeghatározásnál: ' + error.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // FEJLESZTŐI KISKAPU (Csak teszteléshez, ha a GPS nem enged)
  const devBypass = () => {
    if (window.confirm("FEJLESZTŐI MÓD: Biztosan átugrod a GPS ellenőrzést?")) {
      setIsLocationVerified(true);
      setGpsError(null);
      setFeedback({ type: 'success', msg: 'DEV MÓD: Helyszín feloldva.' });
    }
  };

  const submitAnswer = () => {
    const currentStage = STATIONS[currentStageIndex];
    if (userInput.trim().toUpperCase() === currentStage.answer.toUpperCase()) {
      setFeedback({ type: 'success', msg: 'Helyes megfejtés!' });
      setTimeout(() => {
        setScore(prev => prev + 100);
        if (currentStageIndex < STATIONS.length - 1) {
          setCurrentStageIndex(prev => prev + 1);
          // Reset
          setUserInput("");
          setHintsUsed(0);
          setIsPhotoTaken(false);
          setIsLocationVerified(false);
          setFeedback(null);
          setGpsError(null);
        } else {
          setGameState('FINISHED');
        }
      }, 1500);
    } else {
      setFeedback({ type: 'error', msg: 'Hibás kód! Próbáld újra.' });
    }
  };

  const requestHint = () => {
    if (hintsUsed < 3) {
      setHintsUsed(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 50));
    }
  };

  // --- RENDER ---
  const currentStage = STATIONS[currentStageIndex];

  if (gameState === 'WELCOME') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb')] bg-cover bg-center bg-blend-overlay bg-black/60">
      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 text-transparent bg-clip-text">Legends of the Lake</h1>
      <button onClick={startGame} className="w-full max-w-sm py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold mt-8 shadow-lg cursor-pointer">
        Játék Indítása (GPS Szükséges)
      </button>
    </div>
  );

  if (gameState === 'FINISHED') return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Award size={80} className="text-yellow-400 mb-6" />
      <h2 className="text-4xl font-bold">Gratulálunk!</h2>
      <p className="mt-4 text-xl">Végső pontszám: {score}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24">
      {/* HEADER */}
      <header className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30 font-bold text-emerald-400">
            {currentStageIndex + 1}/7
          </div>
          <span className="font-bold hidden sm:block">Legends of the Lake</span>
        </div>
        <div className="flex gap-4 font-mono">
          <span className="text-yellow-500 flex items-center gap-1"><Award size={16}/> {score}</span>
          <span className="text-cyan-400 flex items-center gap-1"><Clock size={16}/> {formatTime(elapsedTime)}</span>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">{currentStage.title}</h2>
              <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                <MapPin size={14} /> {currentStage.location}
              </div>
            </div>
            
            {isLocationVerified ? (
              <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-900/50">
                <Unlock size={12} /> Helyszínen
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 text-xs font-bold bg-red-900/20 px-2 py-1 rounded-full border border-red-900/50">
                <Lock size={12} /> Lezárva
              </span>
            )}
          </div>

          <div className="p-6">
            {!isLocationVerified ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                   <Navigation size={40} className={`text-slate-500 ${isCheckingGPS ? 'animate-pulse text-blue-400' : ''}`} />
                   {isCheckingGPS && <span className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></span>}
                </div>
                
                <p className="text-slate-400 px-4">
                  A feladat megtekintéséhez a helyszínen kell lenned ({currentStage.location}).
                </p>

                {gpsError && (
                  <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-300 text-sm font-bold">
                    ⚠️ {gpsError}
                  </div>
                )}
                
                <button 
                  onClick={verifyLocation}
                  disabled={isCheckingGPS}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-blue-900/20"
                >
                  {isCheckingGPS ? "Műholdak keresése..." : "GPS Helyzet Ellenőrzése"}
                </button>

                {/* FEJLESZTŐI GOMB - Csak akkor jelenik meg, ha hiba van, hogy tudd tesztelni */}
                {gpsError && (
                  <button 
                    onClick={devBypass}
                    className="mt-4 text-xs text-slate-600 hover:text-slate-400 underline cursor-pointer"
                  >
                    [DEV MODE] Ugrás a helyszínre (Teszteléshez)
                  </button>
                )}
              </div>
            ) : (
              // TARTALOM (Ha a GPS sikeres)
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="prose prose-invert bg-slate-950/50 p-4 rounded-xl border border-slate-800 italic text-slate-300 font-serif">
                  <BookOpen size={20} className="text-emerald-500 mb-2" />
                  {currentStage.letter}
                </div>
                
                <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl">
                  <h3 className="font-bold text-emerald-400 mb-1 flex items-center gap-2">
                    <AlertTriangle size={18} /> Feladat
                  </h3>
                  <p>{currentStage.task}</p>
                </div>

                <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Írd be a kódot..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono uppercase focus:border-emerald-500 outline-none"
                    />
                    <button 
                      onClick={submitAnswer}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-bold cursor-pointer"
                    >
                      <ChevronRight />
                    </button>
                  </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Hiba/Siker üzenet sáv */}
        {feedback && (
          <div className={`p-4 rounded-xl border text-center font-bold
            ${feedback.type === 'success' ? 'bg-green-900/50 border-green-500 text-green-400' : 
              feedback.type === 'error' ? 'bg-red-900/50 border-red-500 text-red-400' : 
              'bg-blue-900/50 border-blue-500 text-blue-400 animate-pulse'}`}>
            {feedback.msg}
          </div>
        )}
      </main>

      {/* FOOTER - Tippek */}
      {isLocationVerified && (
        <div className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-4 backdrop-blur-md">
          <div className="max-w-2xl mx-auto flex justify-center gap-4">
             {[0, 1, 2].map((idx) => (
                <button 
                  key={idx}
                  onClick={requestHint}
                  disabled={hintsUsed > idx}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all
                    ${hintsUsed > idx ? 'bg-slate-800 border-slate-700 text-slate-500' : 
                      hintsUsed === idx ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-bounce cursor-pointer' : 
                      'bg-slate-900 border-slate-700 text-slate-600'}`}
                >
                  <HelpCircle size={20} />
                </button>
             ))}
          </div>
          {hintsUsed > 0 && (
             <p className="text-center text-yellow-400 text-sm mt-2 font-bold bg-yellow-900/20 py-2 rounded-lg max-w-2xl mx-auto">
               Tipp: {currentStage.hints[hintsUsed - 1]} (-50 pont)
             </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;