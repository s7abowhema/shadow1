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
        // المصدر الأول: Piped API
        const pipedResponse = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
        
        if (pipedResponse.ok) {
            const data = await pipedResponse.json();
            const videoStreams = data.videoStreams || [];
            const audioStreams = data.audioStreams || [];
            
            const bestVideo = videoStreams.find(v => v.quality === '720p') || 
                            videoStreams.find(v => v.quality === '480p') ||
                            videoStreams[videoStreams.length - 1];
            
            const bestAudio = audioStreams.find(a => a.quality === 'medium') || 
                            audioStreams[audioStreams.length - 1];
            
            if (bestVideo?.url) {
                return res.status(200).json({
                    success: true,
                    title: data.title || 'فيديو يوتيوب',
                    thumbnail: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: bestVideo.url,
                    audio_url: bestAudio?.url || null,
                    author: data.uploader || '',
                    duration: data.duration || 0
                });
            }
        }
        
        // المصدر الثاني: Invidious API
        const invidiousResponse = await fetch(`https://invidious.io.lol/api/v1/videos/${videoId}`);
        
        if (invidiousResponse.ok) {
            const data = await invidiousResponse.json();
            const videoFormats = data.formatStreams || [];
            
            const video = videoFormats.find(f => f.type === 'video/mp4' && f.qualityLabel === '720p') ||
                        videoFormats.find(f => f.type === 'video/mp4');
            const audio = videoFormats.find(f => f.type === 'audio/mp4');
            
            if (video?.url) {
                return res.status(200).json({
                    success: true,
                    title: data.title || 'فيديو يوتيوب',
                    thumbnail: data.videoThumbnails?.[3]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: video.url,
                    audio_url: audio?.url || null,
                    author: data.author || '',
                    duration: data.lengthSeconds || 0
                });
            }
        }
        
        // المصدر الثالث: Cobalt API
        const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                videoQuality: '720',
                audioFormat: 'mp3'
            })
        });
        
        if (cobaltResponse.ok) {
            const cobaltData = await cobaltResponse.json();
            if (cobaltData.url) {
                return res.status(200).json({
                    success: true,
                    title: 'فيديو يوتيوب',
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: cobaltData.url,
                    audio_url: cobaltData.audio || null
                });
            }
        }
        
        // لو كل المصادر فشلت
        return res.status(404).json({ 
            success: false, 
            error: 'تعذر تحميل الفيديو. تأكد من الرابط وحاول مرة أخرى' 
        });
        
    } catch (error) {
        console.error('YouTube API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ في الخادم: ' + error.message 
        });
    }
}
