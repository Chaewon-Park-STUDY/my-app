import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

function VideoApp() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('google_token');
    if (saved) {
      const token = JSON.parse(saved);
      setUser(token);
      loadVideos(token.access_token);
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      localStorage.setItem('google_token', JSON.stringify(tokenResponse));
      setUser(tokenResponse);
      loadVideos(tokenResponse.access_token);
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  const logout = () => {
    localStorage.removeItem('google_token');
    setUser(null);
    setVideos([]);
  };

  const loadVideos = async (token) => {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType contains 'video/'&fields=files(id,name)",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setVideos(data.files || []);
  };

  const uploadVideo = async (file) => {
    if (!user) return;
    setUploading(true);

    const metadata = { name: file.name, mimeType: file.type };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.access_token}` },
      body: form,
    });

    const data = await res.json();
    setVideos((prev) => [...prev, { id: data.id, name: file.name }]);
    setUploading(false);
    alert('✅ 업로드 완료!');
  };

  const downloadVideo = async (fileId, fileName) => {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${user.access_token}` } }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '60px', fontFamily: 'sans-serif' }}>
      <h1>🍅 My App</h1>
      <p>동영상 보관함</p>

      {!user ? (
        <button onClick={() => login()} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Google 계정으로 로그인
        </button>
      ) : (
        <>
          <p>✅ 로그인 완료!</p>
          <button onClick={logout} style={{ marginBottom: '10px', padding: '5px 10px', cursor: 'pointer' }}>
            로그아웃
          </button>
          <br />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files[0] && uploadVideo(e.target.files[0])}
          />
          {uploading && <p>⏳ 업로드 중...</p>}

          {videos.length > 0 && (
            <>
              <h2>📁 업로드된 동영상</h2>
              {videos.map((v) => (
                <div key={v.id} style={{ margin: '10px' }}>
                  <span>{v.name}</span>
                  <button
                    onClick={() => downloadVideo(v.id, v.name)}
                    style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }}
                  >
                    ⬇️ 다운로드
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="1066885051645-oon67b9r39c6rj6v8p7hpgd8kre7kclg.apps.googleusercontent.com">
      <VideoApp />
    </GoogleOAuthProvider>
  );
}

export default App;