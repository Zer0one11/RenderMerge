"use client";

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function MediaMerger() {
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loadStatus, setLoadStatus] = useState('');
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    const initFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
      
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
      } catch (e) {
        console.error(e);
        setLoadStatus('Error loading system components');
      }
    };

    initFFmpeg();
  }, []);

  const texts = {
    ru: {
      title: 'СЕРВИС ОБРАБОТКИ МЕДИА',
      loading: 'ИНИЦИАЛИЗАЦИЯ...',
      video: 'ВИДЕОФАЙЛ',
      audio: 'АУДИОФАЙЛ',
      start: 'ВЫПОЛНИТЬ СШИВАНИЕ',
      status: 'РЕНДЕРИНГ...',
      done: 'ОБРАБОТКА ЗАВЕРШЕНА'
    },
    en: {
      title: 'MEDIA PROCESSING SERVICE',
      loading: 'INITIALIZING...',
      video: 'VIDEO FILE',
      audio: 'AUDIO FILE',
      start: 'START MERGE',
      status: 'RENDERING...',
      done: 'PROCESSING COMPLETED'
    }
  };

  const t = texts[language];

  const process = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !videoFile || !audioFile) return;
    
    setProcessing(true);

    try {
      await ffmpeg.writeFile('v_in', await fetchFile(videoFile));
      await ffmpeg.writeFile('a_in', await fetchFile(audioFile));

      await ffmpeg.exec([
        '-i', 'v_in',
        '-i', 'a_in',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        'out.mp4'
      ]);

      const data = await ffmpeg.readFile('out.mp4');
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `result_${Date.now()}.mp4`;
      link.click();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '40px auto', 
      fontFamily: 'Courier, monospace', 
      padding: '20px', 
      border: '1px solid #000',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{t.title}</span>
        <div>
          <button onClick={() => setLanguage('ru')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: language === 'ru' ? 'underline' : 'none' }}>RU</button>
          <button onClick={() => setLanguage('en')} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '10px', fontSize: '11px', textDecoration: language === 'en' ? 'underline' : 'none' }}>EN</button>
        </div>
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #000', fontSize: '11px' }}>
          {loadStatus || t.loading}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>{t.video}</label>
            <input 
              type="file" 
              // Используем только расширения, чтобы не триггерить галерею напрямую
              accept=".mp4,.mov,.mkv,.webm,.avi" 
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>{t.audio}</label>
            <input 
              type="file" 
              accept=".mp3,.wav,.m4a,.ogg,.aac" 
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)} 
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>
          <button 
            disabled={processing || !videoFile || !audioFile} 
            onClick={process}
            style={{ 
              padding: '12px', 
              background: processing ? '#888' : '#000', 
              color: '#fff', 
              border: 'none', 
              cursor: processing ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {processing ? t.status : t.start}
          </button>
        </div>
      )}
      
      {processing && (
        <div style={{ marginTop: '15px', fontSize: '9px', textAlign: 'center', color: '#666', textTransform: 'uppercase' }}>
          процесс выполняется локально. не закрывайте страницу.
        </div>
      )}
    </div>
  );
}
