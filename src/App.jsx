import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Camera, HelpCircle, AlertTriangle, 
  Clock, Award, ChevronRight, Navigation, BookOpen, Lock, Unlock, X, Crosshair 
} from 'lucide-react';

// Térkép csomagok
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET IKON FIX (Hogy látszódjanak a markerek) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Egyedi ikonok
const targetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// --- JÁTÉK ADATOK ---
const STATIONS = [
  {
    id: 1,
    title: "A Padlás Titka",
    location: "Badacsonyi Tájház",
    lat: 46.7975, lng: 17.5020,
    letter: "Drága Barátom! Ha ezt olvasod, megtaláltad a rejtekhelyemet a régi Tájház padlásán...",
    task: "Számold meg az ablakokat és a cserepek ritmusát!",
    answer: "1798", 
    hints: ["Számold meg az ablakokat.", "Tetőcserepek mintázata kettesével.", "Építés éve (1790) + 8."],
    requiresPhoto: false
  },
  {
    id: 2,
    title: "A Borkereskedő Háza",
    location: "Főutca, Régi Kereskedőház",
    lat: 46.7930, lng: 17.5040,
    letter: "Gratulálok! Most a Főutcán állsz. Ez a ház egykor a vidék leggazdagabb borkereskedőjéé volt...",
    task: "Készíts fotót a homlokzatról és fejtsd meg a kódot!",
    answer: "BOR",
    hints: ["Nézd a pad léceit oldalról.", "3 fő díszítőelem van fent.", "Mindenki szereti inni."],
    requiresPhoto: true // EZ A FELADAT FOTÓT KÉR
  },
  {
    id: 3, title: "A Présház Rejtélye", location: "Szőlőhegy", lat: 46.8010, lng: 17.4980,
    letter: "Felfelé vezet az út. Itt pihen a 'Bacchus Könnye' nevű öreg prés...", task: "Olvasd le a kódot a présről!", answer: "450", 
    hints: ["Akós mértékegység.", "4 óra 50 perc.", "4-5-0"], requiresPhoto: false
  },
  {
    id: 4, title: "A Kápolna Üzenete", location: "Szent Donát Kápolna", lat: 46.8050, lng: 17.4950,
    letter: "Szent Donát a védőszent. De vigyázz, egy részlet csak most...", task: "Fotózd le a részletet!", answer: "SD71", 
    hints: ["Monogram: SD.", "Évszám vége.", "SD + 71"], requiresPhoto: true
  },
  {
    id: 5, title: "A Kilátó Titka", location: "Kisfaludy-kilátó", lat: 46.8100, lng: 17.4900,
    letter: "Milyen pazar a kilátás! Keress egy pontot...", task: "Lépcsőfokok + Hegycsúcs.", answer: "88GULACS", 
    hints: ["88 lépcsőfok.", "Gulács hegy.", "Szám + Hegy"], requiresPhoto: false
  },
  {
    id: 6, title: "A Pince Labirintusa", location: "Régi Borpince", lat: 46.7950, lng: 17.5010,
    letter: "Már majdnem a végére értél. De a legnehezebb próba...", task: "Azonosítsd az eszközt!", answer: "LOPÓ", 
    hints: ["Bort szívnak vele.", "Üveg, hosszú nyak.", "Kóstoláshoz kell."], requiresPhoto: false
  },
  {
    id: 7, title: "A Végső Titok", location: "Rózsakő", lat: 46.8020, lng: 17.4990,
    letter: "Itt állunk a Rózsakőnél. Nézd vissza az utadat!...", task: "Kombináld a kulcsszavakat!", answer: "KÉKNYELŰ", 
    hints: ["Első szín.", "Második eszköz része.", "Badacsonyi fajta."], requiresPhoto: false
  }
];

// --- SEGÉDKOMPONENSEK ---

// Térkép automatikus középre igazítása
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Élő Kamera Komponens
function LiveCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } // Hátsó kamera kérése
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Kamera hiba:", err);
        alert("Nem sikerült elérni a kamerát. Ellenőrizd a jogosultságokat!");
        onClose();
      }
    }
    setupCamera();

    return () => {
      // Stream leállítása kilépéskor
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute w-full h-full object-cover"
        />
        {/* Célkereszt */}
        <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-lg pointer-events-none"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md z-10"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Kamera vezérlők */}
      <div className="h-24 bg-black flex items-center justify-center gap-8 pb-safe">
        <button 
          onClick={handleCapture}
          className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white border-2 border-black"></div>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// --- FŐ APP ---

function App() {
  const [gameState, setGameState] = useState('WELCOME');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [score, setScore] = useState(1000);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [userInput, setUserInput] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Időzítő
  useEffect(() => {
    let interval;
    if (gameState === 'PLAYING') {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // GPS követés a háttérben (a térképhez)
  useEffect(() => {
    if (gameState === 'PLAYING' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("GPS hiba:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [gameState]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0'+s : s}`;
  };

  const startGame = () => {
    setGameState('PLAYING');
    setStartTime(Date.now());
    setCurrentStageIndex(0);
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const verifyLocation = () => {
    if (!navigator.geolocation) return;
    setIsCheckingGPS(true);
    setFeedback({ type: 'info', msg: 'Pozíció keresése...' });
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Haversine távolság számítás (egyszerűsítve)
        const lat1 = position.coords.latitude;
        const lon1 = position.coords.longitude;
        const lat2 = STATIONS[currentStageIndex].lat;
        const lon2 = STATIONS[currentStageIndex].lng;
        
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;

        setIsCheckingGPS(false);
        setUserPos([lat1, lon1]);

        if (dist <= 50) {
          setIsLocationVerified(true);
          setFeedback({ type: 'success', msg: 'Megérkeztél!' });
        } else {
          setGpsError(`Túl messze vagy! (${dist < 1000 ? Math.round(dist) + "m" : (dist/1000).toFixed(1) + "km"})`);
          setFeedback({ type: 'error', msg: 'Nem vagy a helyszínen.' });
        }
      },
      (error) => {
        setIsCheckingGPS(false);
        setFeedback({ type: 'error', msg: 'GPS Hiba' });
      },
      { enableHighAccuracy: true }
    );
  };

  const devBypass = () => {
    if (window.confirm("DEV MODE: Ugrás a helyszínre?")) {
      setIsLocationVerified(true);
      setGpsError(null);
      // Fake pozíció beállítása a célra
      setUserPos([STATIONS[currentStageIndex].lat, STATIONS[currentStageIndex].lng]); 
      setFeedback({ type: 'success', msg: 'DEV MODE: Feloldva.' });
    }
  };

  const handlePhotoCapture = (photoData) => {
    setCapturedPhoto(photoData);
    setIsCameraOpen(false);
    setScore(prev => prev + 50);
    setFeedback({ type: 'success', msg: 'Fotó rögzítve! (+50p)' });
  };

  const submitAnswer = () => {
    const currentStage = STATIONS[currentStageIndex];
    // Ellenőrizzük, hogy kell-e fotó
    if (currentStage.requiresPhoto && !capturedPhoto) {
      setFeedback({ type: 'error', msg: 'Ehhez a feladathoz fotó szükséges!' });
      return;
    }

    if (userInput.trim().toUpperCase() === currentStage.answer.toUpperCase()) {
      setFeedback({ type: 'success', msg: 'HELYES!' });
      document.activeElement.blur();
      setTimeout(() => {
        setScore(prev => prev + 100);
        if (currentStageIndex < STATIONS.length - 1) {
          setCurrentStageIndex(prev => prev + 1);
          // Reset
          setUserInput("");
          setHintsUsed(0);
          setCapturedPhoto(null);
          setIsLocationVerified(false);
          setFeedback(null);
          setGpsError(null);
          window.scrollTo(0,0);
        } else {
          setGameState('FINISHED');
        }
      }, 1000);
    } else {
      setFeedback({ type: 'error', msg: 'Hibás kód!' });
    }
  };

  const currentStage = STATIONS[currentStageIndex];

  // --- RENDER ---

  if (gameState === 'WELCOME') return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb')] bg-cover bg-center bg-black/60 bg-blend-overlay">
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-500 text-transparent bg-clip-text">Legends of the Lake</h1>
      <button onClick={startGame} className="w-full max-w-sm py-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-bold text-lg mt-8 shadow-lg">
        START
      </button>
    </div>
  );

  if (gameState === 'FINISHED') return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
      <Award size={96} className="text-yellow-400 mb-6 animate-bounce" />
      <h2 className="text-3xl font-bold mb-2">Gratulálunk!</h2>
      <p className="text-6xl font-mono font-bold text-emerald-400 my-4">{score}</p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-200 flex flex-col relative">
      
      {/* KAMERA MODAL */}
      {isCameraOpen && (
        <LiveCamera onCapture={handlePhotoCapture} onClose={() => setIsCameraOpen(false)} />
      )}

      {/* TÉRKÉP MODAL */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-900 flex flex-col">
          <div className="h-14 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-4">
            <h3 className="font-bold text-white">Térkép</h3>
            <button onClick={() => setIsMapOpen(false)} className="p-2 bg-slate-800 rounded-full">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 relative">
            <MapContainer 
              center={[currentStage.lat, currentStage.lng]} 
              zoom={15} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Célállomás */}
              <Marker position={[currentStage.lat, currentStage.lng]} icon={targetIcon}>
                <Popup>{currentStage.title}</Popup>
              </Marker>
              
              {/* Célállomás zóna (50m) */}
              <Circle 
                center={[currentStage.lat, currentStage.lng]} 
                radius={50} 
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }} 
              />

              {/* Játékos pozíciója */}
              {userPos && (
                <>
                  <Marker position={userPos}>
                    <Popup>Te itt vagy</Popup>
                  </Marker>
                  <MapRecenter lat={userPos[0]} lng={userPos[1]} />
                </>
              )}
            </MapContainer>
            
            {!userPos && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-[400] backdrop-blur-md">
                GPS jel keresése...
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIX HEADER */}
      <header className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 z-50 px-4 h-14 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-sm">
            {currentStageIndex + 1}
          </div>
          <span className="font-bold text-sm text-white">Legend</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-yellow-500 flex gap-1"><Award size={12}/>{score}</span>
        </div>
      </header>

      {/* FLOATING MAP BUTTON (Mindig látszik) */}
      {!isMapOpen && !isCameraOpen && (
        <button 
          onClick={() => setIsMapOpen(true)}
          className="fixed bottom-24 right-4 z-40 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-900/50 hover:bg-blue-500 active:scale-95 transition-transform"
        >
          <MapPin size={24} />
        </button>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 pt-20 pb-32 px-4 w-full max-w-md mx-auto">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl mb-4">
          <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex justify-between items-start">
            <div>
              <h2 className="font-bold text-white text-lg">{currentStage.title}</h2>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                <MapPin size={12} /> {currentStage.location}
              </div>
            </div>
            {isLocationVerified ? <Unlock size={18} className="text-emerald-500" /> : <Lock size={18} className="text-slate-600" />}
          </div>

          <div className="p-5">
            {!isLocationVerified ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-slate-400">Menj a helyszínre a feladatért!</p>
                {gpsError && <div className="text-xs bg-red-900/20 text-red-300 p-2 rounded">⚠️ {gpsError}</div>}
                <button onClick={verifyLocation} disabled={isCheckingGPS} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg">
                  {isCheckingGPS ? "Keresés..." : "ITT VAGYOK"}
                </button>
                {gpsError && <button onClick={devBypass} className="text-[10px] text-slate-600 mt-2">[DEV BYPASS]</button>}
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-slate-300 text-sm font-serif italic">
                  <BookOpen size={16} className="text-emerald-600 mb-2 opacity-50" />
                  {currentStage.letter}
                </div>
                
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl">
                  <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider mb-2 flex gap-2">
                    <AlertTriangle size={14} /> Feladat
                  </h3>
                  <p className="text-sm font-medium text-slate-200">{currentStage.task}</p>
                </div>

                {/* KAMERA GOMB (Ha a feladat kéri) */}
                {currentStage.requiresPhoto && (
                  <div className="space-y-2">
                    <button 
                      onClick={() => setIsCameraOpen(true)}
                      className={`w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all
                        ${capturedPhoto 
                          ? 'bg-green-900/10 border-green-500 text-green-500' 
                          : 'bg-slate-800 border-slate-600 text-blue-400 hover:bg-slate-700'}`}
                    >
                      <Camera size={18} />
                      {capturedPhoto ? "Új fotó készítése" : "Kamera megnyitása"}
                    </button>
                    
                    {capturedPhoto && (
                      <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden border border-slate-700">
                        <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex gap-1 items-center">
                            <Award size={10} /> Fotó rögzítve
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 h-12">
                  <input 
                    type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                    placeholder="KÓD..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-[16px] text-white font-mono uppercase focus:border-emerald-500 outline-none"
                  />
                  <button onClick={submitAnswer} className="bg-emerald-600 text-white px-5 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-3 rounded-xl border text-center font-bold text-sm shadow-2xl z-[60] animate-in slide-in-from-top-4 fade-in duration-300
            ${feedback.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-400' : 
              feedback.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-200' : 
              'bg-blue-900/90 border-blue-500 text-blue-200'}`}>
            {feedback.msg}
          </div>
        )}
      </main>

      {/* FOOTER - Hint System */}
      {isLocationVerified && (
        <div className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 pb-safe pt-3 px-4 z-40">
           <div className="max-w-md mx-auto flex justify-between items-center pb-4">
             <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Segítség</span>
             <div className="flex gap-3">
               {[0, 1, 2].map((idx) => (
                 <button 
                   key={idx}
                   onClick={() => { if(hintsUsed <= idx) { setHintsUsed(h => h+1); setScore(s => Math.max(0, s-50)); } }}
                   disabled={hintsUsed > idx}
                   className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all touch-manipulation
                     ${hintsUsed > idx ? 'bg-slate-800 border-slate-700 text-slate-600' : 
                       'bg-slate-900 border-slate-700 text-yellow-500 hover:border-yellow-500'}`}
                 >
                   <HelpCircle size={18} />
                 </button>
               ))}
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;