export default async function handler(req, res) {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'الطريقة غير مدعومة' });
    }
    
    const { url, type = 'video', quality = '360' } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }
    
    // استخراج ID الفيديو
    function extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&]+)/,
            /(?:youtu\.be\/)([^?]+)/,
            /(?:youtube\.com\/embed\/)([^/?]+)/,
            /(?:youtube\.com\/v\/)([^/?]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        return res.status(400).json({ success: false, error: 'رابط يوتيوب غير صالح' });
    }
    
    try {
        if (type === 'audio') {
            // تحميل صوت MP3
            const audioResult = await downloadAudio(url);
            if (audioResult.success) {
                return res.status(200).json({
                    success: true,
                    title: audioResult.title,
                    thumbnail: audioResult.thumbnail,
                    audio_url: audioResult.download_url,
                    duration: audioResult.duration
                });
            } else {
                return res.status(500).json({ success: false, error: audioResult.error });
            }
        } else {
            // تحميل فيديو
            const videoResult = await downloadVideo(url, quality);
            if (videoResult.success) {
                return res.status(200).json({
                    success: true,
                    title: videoResult.title,
                    thumbnail: videoResult.thumbnail,
                    video_url: videoResult.download_url,
                    quality: quality + 'p'
                });
            } else {
                return res.status(500).json({ success: false, error: videoResult.error });
            }
        }
    } catch (error) {
        console.error('YouTube API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'حدث خطأ في الخادم'
        });
    }
}

// دالة تحميل الفيديو (من ytvideo.js)
async function downloadVideo(url, quality = '360') {
    try {
        // استخدام API من savenow.to
        const initResponse = await fetch(
            `https://p.savenow.to/ajax/download.php?copyright=0&format=${quality}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            }
        );
        
        const initData = await initResponse.json();
        
        if (!initData.success || !initData.id) {
            return { success: false, error: 'فشل بدء التحميل' };
        }
        
        const downloadId = initData.id;
        let downloadUrl = null;
        let attempts = 0;
        
        while (!downloadUrl && attempts < 30) {
            const progressResponse = await fetch(
                `https://p.savenow.to/api/progress?id=${downloadId}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );
            
            const progressData = await progressResponse.json();
            
            if (progressData.success === 1 && progressData.download_url) {
                downloadUrl = progressData.download_url;
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (downloadUrl) {
            return {
                success: true,
                title: initData.info?.title || 'فيديو يوتيوب',
                thumbnail: initData.info?.image || `https://img.youtube.com/vi/${extractVideoIdSimple(url)}/maxresdefault.jpg`,
                download_url: downloadUrl
            };
        }
        
        return { success: false, error: 'انتهى الوقت ولم يتم الحصول على رابط التحميل' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// دالة تحميل الصوت (من ytaudio.js)
async function downloadAudio(url) {
    try {
        // استخدام API من savetube
        const cdnResponse = await fetch('https://media.savetube.vip/api/random-cdn');
        const cdnData = await cdnResponse.json();
        
        if (!cdnData.status) {
            return { success: false, error: 'فشل الحصول على CDN' };
        }
        
        const cdn = cdnData.cdn;
        
        // الحصول على معلومات الفيديو
        const infoResponse = await fetch(`https://${cdn}/v2/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://yt.savetube.me',
                'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0'
            },
            body: JSON.stringify({ url: url })
        });
        
        const infoData = await infoResponse.json();
        
        if (!infoData.data) {
            return { success: false, error: 'فشل الحصول على معلومات الفيديو' };
        }
        
        // فك التشفير (بسيط)
        let decryptedData;
        try {
            const encrypted = Buffer.from(infoData.data, 'base64');
            const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
            const iv = encrypted.slice(0, 16);
            const data = encrypted.slice(16);
            
            // استخدام web crypto api بدلاً من crypto (لأنه يعمل على Vercel)
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: iv },
                cryptoKey,
                data
            );
            
            decryptedData = JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            // إذا فشل فك التشفير، استخدم طريقة بديلة
            return await downloadAudioFallback(url);
        }
        
        // طلب رابط التحميل
        const downloadResponse = await fetch(`https://${cdn}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                id: extractVideoIdSimple(url),
                downloadType: 'audio',
                quality: '128',
                key: decryptedData.key
            })
        });
        
        const downloadData = await downloadResponse.json();
        
        if (downloadData.data && downloadData.data.downloadUrl) {
            return {
                success: true,
                title: decryptedData.title,
                thumbnail: decryptedData.thumbnail || `https://img.youtube.com/vi/${extractVideoIdSimple(url)}/hqdefault.jpg`,
                duration: decryptedData.duration,
                download_url: downloadData.data.downloadUrl
            };
        }
        
        return { success: false, error: 'فشل الحصول على رابط التحميل' };
    } catch (err) {
        return await downloadAudioFallback(url);
    }
}

// طريقة بديلة لتحميل الصوت
async function downloadAudioFallback(url) {
    try {
        const response = await fetch(`https://api.vevioz.com/api/spotify/dl?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data && data.success && data.download_url) {
            return {
                success: true,
                title: data.title || 'Audio',
                thumbnail: data.thumbnail || '',
                download_url: data.download_url
            };
        }
        
        return { success: false, error: 'تعذر تحميل الصوت' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function extractVideoIdSimple(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&]+)/,
        /(?:youtu\.be\/)([^?]+)/,
        /(?:youtube\.com\/embed\/)([^/?]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}