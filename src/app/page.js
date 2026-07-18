"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const POPULAR_LOCATIONS = [
  'Bangkok',
  'สวนลุมพินี กรุงเทพ',
  'สวนจตุจักร กรุงเทพ',
  'สวนเบญจกิติ กรุงเทพ',
  'Chiang Mai',
  'สวนบวกหาด เชียงใหม่',
  'มหาวิทยาลัยเชียงใหม่',
  'Chon Buri',
  'หาดบางแสน ชลบุรี',
  'Phuket',
  'สวนหลวง ร.9 ภูเก็ต',
  'Khon Kaen',
  'บึงแก่นนคร ขอนแก่น',
  'Nonthaburi'
];

// ฟังก์ชันคำนวณ Pace & Speed
const formatPace = (seconds, distanceKm) => {
  if (!distanceKm || distanceKm <= 0 || seconds <= 0) return "0'00\"";
  const totalPaceSeconds = seconds / distanceKm;
  const mins = Math.floor(totalPaceSeconds / 60);
  const secs = Math.floor(totalPaceSeconds % 60);
  return `${mins}'${secs < 10 ? '0' : ''}${secs}"`;
};

const formatTime = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// ==========================================
// 1. DASHBOARD COMPONENT (หน้าหลักวิเคราะห์อากาศ + Tracker Sidebar)
// ==========================================
function Dashboard({ onSaveRunLog }) {
  const [searchQuery, setSearchQuery] = useState('สวนลุมพินี กรุงเทพ');
  const [distance, setDistance] = useState(5);
  const [targetDuration, setTargetDuration] = useState(30);

  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [weatherData, setWeatherData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- State สำหรับ Sidebar & Stopwatch Tracking ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [runDistanceInput, setRunDistanceInput] = useState('5.0');
  const timerRef = useRef(null);

  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTracking]);

  const handleStartRun = () => {
    setIsTracking(true);
  };

  const handlePauseRun = () => {
    setIsTracking(false);
  };

  const handleResetRun = () => {
    setIsTracking(false);
    setElapsedSeconds(0);
  };

  const handleFinishRun = () => {
    const dist = parseFloat(runDistanceInput) || 0;
    if (dist <= 0 || elapsedSeconds <= 0) {
      alert('กรุณากรอกระยะทางและเปิดการจับเวลาวิ่ง');
      return;
    }

    // คำนวณ Pace และ Speed
    const paceStr = formatPace(elapsedSeconds, dist);
    const speedKmh = ((dist / (elapsedSeconds / 3600))).toFixed(1);

    // คำนวณ Pace ในรูปแบบตัวเลขเพื่อประมวลผลคำแนะนำ
    const totalPaceSec = elapsedSeconds / dist;
    const paceMin = totalPaceSec / 60;

    let advice = "";
    let encouragement = "";

    if (paceMin < 5) {
      advice = "เพซเร็วระดับนักกีฬา! ควรจิบน้ำผสมเกลือแร่เพื่อชดเชยการสูญเสียเหงื่ออย่างรวดเร็ว และยืดเหยียดกล้ามเนื้อส่วนขาเป็นพิเศษ";
      encouragement = "🔥 ยอดเยี่ยมมาก! ฟอร์มการวิ่งของคุณแข็งแกร่งและน่าประทับใจสุดๆ!";
    } else if (paceMin <= 7) {
      advice = "เป็นโซนการวิ่ง Aerobic ที่ดีเยี่ยมเพื่อสร้างความทนทาน ควบคุมจังหวะการหายใจและจิบน้ำทุกๆ 15-20 นาที";
      encouragement = "👏 ทำได้ดีมาก! รักษาวินัยและจังหวะการวิ่งที่สมดุลนี้ไว้นะครับ!";
    } else {
      advice = "การวิ่งเน้นฟื้นฟู (Easy Run) ช่วยเผาผลาญไขมันและลดความเสี่ยงการบาดเจ็บ คูลดาวน์หลังวิ่ง 5-10 นาทีเพื่อลดกรดแลกติก";
      encouragement = "🌱 เก่งมากครับ! ทุกๆ ก้าวคือความสำเร็จในการดูแลสุขภาพของตัวคุณเอง!";
    }

    const newLog = {
      id: Date.now(),
      date: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      location: weatherData ? weatherData.locationName : searchQuery,
      distance: dist,
      duration: formatTime(elapsedSeconds),
      pace: paceStr,
      speed: speedKmh,
      temp: weatherData ? `${Math.round(weatherData.temp)}°C` : 'N/A',
      pm25: weatherData ? weatherData.pm25 : 'N/A',
      advice,
      encouragement
    };

    onSaveRunLog(newLog);
    setIsTracking(false);
    setElapsedSeconds(0);
    setIsSidebarOpen(false);
    alert('บันทึกการวิ่งเรียบร้อยแล้ว! สามารถดูรายละเอียดและคำแนะนำได้ที่หน้า "ประวัติการวิ่ง"');
  };

  // --- End Sidebar State ---

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length > 0) {
      const filtered = POPULAR_LOCATIONS.filter((item) =>
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (locationName) => {
    setSearchQuery(locationName);
    setSuggestions([]);
    setShowDropdown(false);
    handleSearch(null, locationName);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e = null, overrideLocation = null) => {
    if (e && e.preventDefault) e.preventDefault();

    const targetLocation = overrideLocation || searchQuery;
    if (!targetLocation.trim()) return;

    setShowDropdown(false);
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/analyze-run`, {
        location: targetLocation,
        distanceKm: Number(distance),
        durationMinutes: Number(targetDuration)
      });

      setWeatherData(res.data.currentWeather);
      setRecommendations(res.data.topSlots || []);
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err);
      setError('ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบชื่อสถานที่หรือลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const getPm25Status = (val) => {
    if (val <= 25) return { text: 'ดีเยี่ยม', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (val <= 50) return { text: 'ปานกลาง', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    return { text: 'เริ่มมีผลกระทบ', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  };

  const currentDistNum = parseFloat(runDistanceInput) || 0;
  const currentPaceStr = formatPace(elapsedSeconds, currentDistNum);
  const currentSpeedStr = currentDistNum > 0 && elapsedSeconds > 0 
    ? ((currentDistNum / (elapsedSeconds / 3600))).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-12 animate-fade-in relative">
      {/* Floating Button สำหรับเปิด Sidebar บันทึกการวิ่ง */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black px-5 py-3.5 rounded-full shadow-2xl shadow-amber-400/30 hover:scale-105 transition-all flex items-center gap-2 border border-amber-300 cursor-pointer"
      >
        <span className="text-xl">⏱️</span>
        <span>บันทึกกิจกรรมวิ่ง</span>
      </button>

      {/* Sidebar Drawer สำหรับจับเวลา/บันทึกการวิ่ง */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-[#0d1017] border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto animate-slide-in">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>🏃‍♂️</span> บันทึกการวิ่งปัจจุบัน
                </h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-slate-400 hover:text-white text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Timer Display */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2 shadow-inner">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">เวลาที่ใช้ไป</span>
                <div className="text-5xl font-black text-amber-400 tracking-widest font-mono">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              {/* Real-time Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400">Pace เฉลี่ย</div>
                  <div className="text-2xl font-black text-white mt-1">{currentPaceStr}</div>
                  <div className="text-[10px] text-slate-500">นาที/กม.</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-center">
                  <div className="text-xs text-slate-400">ความเร็ว</div>
                  <div className="text-2xl font-black text-white mt-1">{currentSpeedStr}</div>
                  <div className="text-[10px] text-slate-500">กม./ชม.</div>
                </div>
              </div>

              {/* Distance Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">ระยะทางที่วิ่งได้ (กม.)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={runDistanceInput}
                  onChange={(e) => setRunDistanceInput(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 text-white rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-400"
                  placeholder="0.0"
                />
              </div>

              {/* Timer Control Buttons */}
              <div className="flex gap-3">
                {!isTracking ? (
                  <button
                    onClick={handleStartRun}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    ▶️ {elapsedSeconds > 0 ? 'วิ่งต่อ' : 'เริ่มวิ่ง'}
                  </button>
                ) : (
                  <button
                    onClick={handlePauseRun}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    ⏸️ หยุดชั่วคราว
                  </button>
                )}
                <button
                  onClick={handleResetRun}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 rounded-xl cursor-pointer"
                >
                  🔄 รีเซ็ต
                </button>
              </div>
            </div>

            {/* Complete Run Button */}
            <div className="pt-6 border-t border-slate-800 space-y-2">
              <button
                onClick={handleFinishRun}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-4 rounded-2xl shadow-lg shadow-amber-400/20 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer text-base"
              >
                🏁 หยุดวิ่ง และ บันทึกผลลัพธ์
              </button>
              <p className="text-[11px] text-center text-slate-500">
                ระบบจะประมวลผลคำแนะนำและคำส่งเสริมลงในหน้าประวัติ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Configuration Card */}
      <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl relative">
        <form onSubmit={(e) => handleSearch(e)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              กำหนดแผนการวิ่ง
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Location Input */}
            <div className="md:col-span-6 space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-slate-400">สถานที่ / สวนสาธารณะ</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => searchQuery.trim() && suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="ค้นหาชื่อเมือง หรือ สวนสาธารณะ..."
                  className="w-full bg-[#0d1017] border border-slate-800 text-white rounded-2xl px-4 py-3.5 pl-11 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 font-medium text-sm transition-all"
                  required
                />
                <span className="absolute left-4 top-3.5 text-slate-500 text-base">📍</span>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-[#0d1017] border border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/40 backdrop-blur-xl">
                  {suggestions.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectSuggestion(item)}
                      className="px-4 py-3 hover:bg-amber-400/10 hover:text-amber-400 text-slate-300 font-medium text-sm cursor-pointer transition-colors flex items-center gap-3"
                    >
                      <span className="text-xs text-slate-500">📌</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Distance Input */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-semibold text-slate-400">ระยะทาง (กม.)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-[#0d1017] border border-slate-800 text-white rounded-2xl px-4 py-3.5 pl-11 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 font-medium text-sm transition-all"
                  required
                />
                <span className="absolute left-4 top-3.5 text-slate-500 text-base">🏃</span>
              </div>
            </div>

            {/* Duration Input */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-semibold text-slate-400">เวลาคาดการณ์ (นาที)</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(e.target.value)}
                  className="w-full bg-[#0d1017] border border-slate-800 text-white rounded-2xl px-4 py-3.5 pl-11 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 font-medium text-sm transition-all"
                  required
                />
                <span className="absolute left-4 top-3.5 text-slate-500 text-base">⏱️</span>
              </div>
            </div>
          </div>

          {/* Quick Location Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-slate-500 font-medium mr-1">ทางเลือกยอดนิยม:</span>
            {['สวนลุมพินี กรุงเทพ', 'สวนเบญจกิติ กรุงเทพ', 'สวนบวกหาด เชียงใหม่', 'หาดบางแสน ชลบุรี'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  handleSearch(null, tag);
                }}
                className="text-xs bg-slate-800/50 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/50 transition-all cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-amber-400/10 flex justify-center items-center gap-2 text-base cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                กำลังวิเคราะห์สภาพอากาศ...
              </span>
            ) : (
              <>⚡ วิเคราะห์เวลาวิ่งที่ดีที่สุด</>
            )}
          </button>
        </form>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-20 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังประมวลผลข้อมูลอุณหภูมิ และ PM2.5...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-3xl text-center font-medium backdrop-blur-md">
          ⚠️ {error}
        </div>
      )}

      {/* Weather Results */}
      {weatherData && !loading && (
        <div className="space-y-12">
          {/* Top 3 Recommendation Cards */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
              <div>
                <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Optimal Window</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                  Top 3 ช่วงเวลาที่ดีที่สุดในการวิ่ง
                </h2>
              </div>
              <p className="text-slate-400 text-xs">
                คำนวณจากเป้าหมาย {distance} กม. ({targetDuration} นาที)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.slice(0, 3).map((slot, index) => {
                const isBest = index === 0;
                return (
                  <div
                    key={index}
                    className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
                      isBest
                        ? 'bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 border-amber-400/80 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 backdrop-blur-md'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span
                          className={`text-[11px] font-black px-3 py-1 rounded-full border ${
                            isBest
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          #{index + 1} {isBest ? 'RECOMMENDED' : 'OPTION'}
                        </span>
                        <div className="text-right">
                          <span className="text-3xl font-black text-amber-400">{slot.score}</span>
                          <span className="text-xs text-slate-500 font-bold">/100</span>
                        </div>
                      </div>

                      <div className="text-2xl font-extrabold text-white mb-2 tracking-tight">
                        {slot.timeSlot}
                      </div>

                      <p className="text-xs text-slate-400 mb-6 leading-relaxed font-normal">
                        {slot.reason}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/60 text-center">
                      <div className="bg-[#0b0e14] p-2.5 rounded-2xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">อุณหภูมิ</div>
                        <div className="text-sm font-bold text-white mt-0.5">{slot.temp}°C</div>
                      </div>
                      <div className="bg-[#0b0e14] p-2.5 rounded-2xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">PM2.5</div>
                        <div className="text-sm font-bold text-amber-400 mt-0.5">{slot.pm25}</div>
                      </div>
                      <div className="bg-[#0b0e14] p-2.5 rounded-2xl border border-slate-800/50">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">ความชื้น</div>
                        <div className="text-sm font-bold text-white mt-0.5">{slot.humidity}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Current Real-time Weather Section */}
          <section className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Realtime Conditions</span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  สภาพอากาศปัจจุบัน ณ {weatherData.locationName}
                </h3>
              </div>
              <div className="flex items-center gap-3 bg-[#0d1017] px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-3xl">{weatherData.icon}</span>
                <div>
                  <div className="text-xl font-black text-white">{Math.round(weatherData.temp)}°C</div>
                  <div className="text-[10px] text-slate-500 font-medium">อุณหภูมิปัจจุบัน</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0d1017] p-5 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>อุณหภูมิ</span>
                  <span>🌡️</span>
                </div>
                <div className="text-2xl font-black text-white">{Math.round(weatherData.temp)}°C</div>
                <p className="text-[11px] text-slate-500">รู้สึกเหมือน {Math.round(weatherData.temp) + 1}°C</p>
              </div>

              {(() => {
                const pmStatus = getPm25Status(weatherData.pm25);
                return (
                  <div className="bg-[#0d1017] p-5 rounded-2xl border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                      <span>ฝุ่น PM2.5</span>
                      <span>🌫️</span>
                    </div>
                    <div className="text-2xl font-black text-amber-400">
                      {weatherData.pm25} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
                    </div>
                    <div className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${pmStatus.bg} ${pmStatus.color} border ${pmStatus.border}`}>
                      {pmStatus.text}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-[#0d1017] p-5 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>ความชื้นสัมพัทธ์</span>
                  <span>💧</span>
                </div>
                <div className="text-2xl font-black text-white">{weatherData.humidity}%</div>
                <p className="text-[11px] text-slate-500">
                  {weatherData.humidity > 70 ? 'อากาศค่อนข้างชื้น' : 'ระดับกำลังพอดี'}
                </p>
              </div>

              <div className="bg-[#0d1017] p-5 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
                  <span>ความเร็วลม</span>
                  <span>💨</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {weatherData.windSpeed} <span className="text-xs text-slate-500 font-normal">m/s</span>
                </div>
                <p className="text-[11px] text-slate-500">ลมพัดสบาย</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. HISTORY PAGE COMPONENT (หน้าประวัติการวิ่ง)
// ==========================================
function HistoryPage({ logs }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span>📜</span> ประวัติการวิ่ง (Run Log)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              บันทึกและติดตามสถิติการวิ่ง พร้อมคำแนะนำสรีรวิทยาและกำลังใจ
            </p>
          </div>
          <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-3 py-1 rounded-full font-bold">
            ทั้งหมด {logs.length} รายการ
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3 bg-[#0d1017]/50">
            <div className="text-4xl">🏃‍♂️</div>
            <p className="text-slate-300 font-bold">ยังไม่มีบันทึกการวิ่ง</p>
            <p className="text-xs text-slate-500">
              กดปุ่ม "⏱️ บันทึกกิจกรรมวิ่ง" ที่หน้า Dashboard เพื่อเริ่มจับเวลาและบันทึกประวัติ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-[#0d1017] border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all shadow-lg"
              >
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">📍</span>
                    <span className="font-bold text-white text-base">{log.location}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{log.date}</span>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">ระยะทาง</div>
                    <div className="text-lg font-black text-amber-400">{log.distance} กม.</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">เวลาที่ใช้</div>
                    <div className="text-lg font-black text-white">{log.duration}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Pace เฉลี่ย</div>
                    <div className="text-lg font-black text-emerald-400">{log.pace} /กม.</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">ความเร็ว</div>
                    <div className="text-lg font-black text-white">{log.speed} กม./ชม.</div>
                  </div>
                </div>

                {/* Encouragement & AI Advice */}
                <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-4 rounded-xl border border-amber-500/20 space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>💬</span> {log.encouragement}
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed pl-5 border-l-2 border-amber-400/40">
                    <span className="font-semibold text-slate-200">คำแนะนำ: </span>
                    {log.advice}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. PROFILE PAGE COMPONENT (หน้าโปรไฟล์นักวิ่ง)
// ==========================================
function ProfilePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
          <span>👤</span> โปรไฟล์นักวิ่ง (Runner Profile)
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          ตั้งค่าข้อมูลร่างกาย โซนอัตราการเต้นหัวใจ และระดับความชินกับอากาศร้อน
        </p>

        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3 bg-[#0d1017]/50">
          <div className="text-4xl">⚙️</div>
          <p className="text-slate-300 font-bold">ระบบจัดการโปรไฟล์</p>
          <p className="text-xs text-slate-500">ปรับแต่งการคำนวณ Heat Index ให้เข้ากับร่างกายของคุณ</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. MAIN APP COMPONENT (จัดการ Tab & Header)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'history' | 'profile'
  const [runLogs, setRunLogs] = useState([]);

  const handleSaveRunLog = (newLog) => {
    setRunLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 font-sans selection:bg-amber-400 selection:text-black relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10 space-y-8">
        {/* Header / Navigation Bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
              RW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                  Run<span className="text-amber-400">wise</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  v2.0 AI
                </span>
              </div>
              <p className="text-slate-400 text-xs tracking-wide">Smart Athletic Weather Intelligence</p>
            </div>
          </div>

          {/* Tab Selection Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              ⚡ วิเคราะห์สภาพอากาศ
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              📜 ประวัติการวิ่ง {runLogs.length > 0 && `(${runLogs.length})`}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              👤 โปรไฟล์
            </button>
          </div>
        </header>

        {/* Dynamic Main Content based on Selected Tab */}
        <main>
          {activeTab === 'dashboard' && <Dashboard onSaveRunLog={handleSaveRunLog} />}
          {activeTab === 'history' && <HistoryPage logs={runLogs} />}
          {activeTab === 'profile' && <ProfilePage />}
        </main>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-slate-800/80 text-slate-600 text-xs tracking-wider pb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>© {new Date().getFullYear()} RUNWISE CORP. ALL RIGHTS RESERVED.</div>
          <div className="text-amber-500/60 font-medium">ENGINEERED FOR HIGH PERFORMANCE</div>
        </footer>
      </div>
    </div>
  );
}