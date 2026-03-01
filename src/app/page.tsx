"use client";

import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function MediaMerger() {
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const ffmpegRef = useRef(new FFmpeg());

  const texts = {
    ru: {
      title: 'СЕРВИС ОБРАБОТКИ МЕДИА',
      load: 'ЗАГРУЗИТЬ КОМПОНЕНТЫ',
      video: 'ВИДЕОФАЙЛ',
      audio: 'АУДИОФАЙЛ',
      start: 'ВЫПОЛНИТЬ СШИВАНИЕ',
      status: 'РЕНДЕРИНГ...',
      done: 'ГОТОВО'
    },
    en: {
      title: 'MEDIA PROCESSING SERVICE',
      load: 'LOAD COMPONENTS',
      video: 'VIDEO FILE',
      audio: 'AUDIO FILE',
      start: 'START MERGE',
      status: 'RENDERING...',
      done: 'DONE'
    }
  };

  const t = texts[language];

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setLoaded(true);
  };

  const process = async () => {
    if (!videoFile || !audioFile) return;
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;

    await ffmpeg.writeFile('v_in.mp4', await fetchFile(videoFile));
    await ffmpeg.writeFile('a_in.mp3', await fetchFile(audioFile));

    await ffmpeg.exec([
      '-i', 'v_in.mp4',
      '-i', 'a_in.mp3',
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
    link.download = 'render_result.mp4';
    link.click();
    setProcessing(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', fontFamily: 'Courier, monospace', padding: '20px', border: '1px solid #000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <span style={{ fontWeight: 'bold' }}>{t.title}</span>
        <div>
          <button onClick={() => setLanguage('ru')} style={{ border: 'none', background: 'none', cursor: 'pointer', textDecoration: language === 'ru' ? 'underline' : 'none' }}>RU</button>
          <button onClick={() => setLanguage('en')} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '10px', textDecoration: language === 'en' ? 'underline' : 'none' }}>EN</button>
        </div>
      </div>

      {!loaded ? (
        <button onClick={load} style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {t.load}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>{t.video}</label>
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>{t.audio}</label>
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          </div>
          <button 
            disabled={processing || !videoFile || !audioFile} 
            onClick={process}
            style={{ padding: '12px', background: processing ? '#888' : '#000', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {processing ? t.status : t.start}
          </button>
        </div>
      )}
    </div>
  );
}
