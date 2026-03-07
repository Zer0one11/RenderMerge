"use client";

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function MediaMerger() {
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile1, setAudioFile1] = useState<File | null>(null);
  const [audioFile2, setAudioFile2] = useState<File | null>(null);
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
        setLoadStatus('Ошибка загрузки компонентов');
      }
    };
    initFFmpeg();
  }, []);

  const texts = {
    ru: {
      title: 'СЕРВИС ОБРАБОТКИ МЕДИА',
      loading: 'ИНИЦИАЛИЗАЦИЯ...',
      video: 'ВИДЕОФАЙЛ',
      audio1: 'ЗВУК 1 (ОСНОВНОЙ)',
      audio2: 'ЗВУК 2 (НАЛОЖЕНИЕ)',
      start: 'ВЫПОЛНИТЬ СШИВАНИЕ',
      status: 'РЕНДЕРИНГ...',
    },
    en: {
      title: 'MEDIA PROCESSING SERVICE',
      loading: 'INITIALIZING...',
      video: 'VIDEO FILE',
      audio1: 'AUDIO 1 (MAIN)',
      audio2: 'AUDIO 2 (OVERLAY)',
      start: 'START MERGE',
      status: 'RENDERING...',
    }
  };

  const t = texts[language];

  const process = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !videoFile || !audioFile1) return;
    setProcessing(true);

    try {
      await ffmpeg.writeFile('v_in', await fetchFile(videoFile));
      await ffmpeg.writeFile('a1_in', await fetchFile(audioFile1));
      
      let args = ['-i', 'v_in', '-i', 'a1_in'];

      if (audioFile2) {
        await ffmpeg.writeFile('a2_in', await fetchFile(audioFile2));
        args.push('-i', 'a2_in');
        
        // Наслаиваем два звука друг на друга (amix)
        // duration=first означает, что звук закончится вместе с видео (первым входом)
        args.push(
          '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first[aout]',
          '-map', '0:v:0',
          '-map', '[aout]'
        );
      } else {
        // Если только один звук - просто подставляем его
        args.push('-map', '0:v:0', '-map', '1:a:0');
      }

      // Видео копируем без потерь, аудио жмем в AAC
      args.push('-c:v', 'copy', '-c:a', 'aac', '-shortest', 'out.mp4');

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile('out.mp4');
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `mixed_${Date.now()}.mp4`;
      link.click();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', fontFamily: 'Courier, monospace', padding: '20px', border: '1px solid #000', backgroundColor: '#fff' }}>
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
            <input type="file" accept=".mp4,.mov,.mkv,.webm,.avi" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>{t.audio1}</label>
            <input type="file" accept=".mp3,.wav,.m4a,.ogg,.aac" onChange={(e) => setAudioFile1(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>{t.audio2}</label>
            <input type="file" accept=".mp3,.wav,.m4a,.ogg,.aac" onChange={(e) => setAudioFile2(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: '12px' }} />
          </div>
          <button 
            disabled={processing || !videoFile || !audioFile1} 
            onClick={process}
            style={{ padding: '12px', background: processing ? '#888' : '#000', color: '#fff', border: 'none', cursor: processing ? 'default' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            {processing ? t.status : t.start}
          </button>
        </div>
      )}
      {processing && <div style={{ marginTop: '15px', fontSize: '9px', textAlign: 'center', color: '#666' }}>ИДЕТ СШИВАНИЕ И НАЛОЖЕНИЕ...</div>}
    </div>
  );
}
