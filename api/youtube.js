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
    
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }
    
    // استخراج ID الفيديو من رابط يوتيوب
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
        // استخدام خدمة y2mate.is (شغالة ومجانية)
        const y2mateApi = `https://y2mate.is/api/json?url=${encodeURIComponent(url)}`;
        const response = await fetch(y2mateApi, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data.video && data.video.url) {
                return res.status(200).json({
                    success: true,
                    title: data.title || 'فيديو يوتيوب',
                    thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: data.video.url,
                    audio_url: data.audio?.mp3 || null,
                    author: data.author || ''
                });
            }
        }
        
        // API بديل: yt5s
        const yt5sApi = `https://yt5s.com/api/ajaxSearch?q=${encodeURIComponent(url)}`;
        const response2 = await fetch(yt5sApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0'
            },
            body: new URLSearchParams({ q: url, vt: 'mp4' })
        });
        
        if (response2.ok) {
            const data2 = await response2.json();
            if (data2 && data2.links && data2.links.mp4) {
                return res.status(200).json({
                    success: true,
                    title: data2.title || 'فيديو يوتيوب',
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: data2.links.mp4['720p'] || data2.links.mp4['480p'] || Object.values(data2.links.mp4)[0],
                    author: data2.author || ''
                });
            }
        }
        
        // لو كل حاجة فشلت
        return res.status(404).json({
            success: false,
            error: 'تعذر تحميل الفيديو. تأكد من الرابط وحاول مرة أخرى'
        });
        
    } catch (error) {
        console.error('YouTube API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ: ' + error.message
        });
    }
}
