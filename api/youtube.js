export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'الطريقة غير مدعومة' });
    
    const { url, type = 'video', quality = '720' } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    
    function extractVideoId(url) {
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
    
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ success: false, error: 'رابط يوتيوب غير صالح' });
    
    try {
        if (type === 'audio') {
            // تحميل الصوت MP3
            const audioRes = await fetch(`https://api.vevioz.com/api/spotify/dl?url=${encodeURIComponent(url)}`);
            const audioData = await audioRes.json();
            
            if (audioData && audioData.success && audioData.download_url) {
                return res.status(200).json({
                    success: true,
                    title: audioData.title || 'صوت يوتيوب',
                    thumbnail: audioData.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    audio_url: audioData.download_url,
                    author: audioData.author || '',
                    duration: audioData.duration || ''
                });
            }
            
            // API بديل للصوت
            const backupRes = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
            const backupData = await backupRes.json();
            const audioStream = backupData.audioStreams?.[0];
            
            if (audioStream?.url) {
                return res.status(200).json({
                    success: true,
                    title: backupData.title || 'صوت يوتيوب',
                    thumbnail: backupData.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    audio_url: audioStream.url,
                    author: backupData.uploader || '',
                    duration: backupData.duration || ''
                });
            }
            
            return res.status(404).json({ success: false, error: 'تعذر تحميل الصوت' });
        } else {
            // تحميل الفيديو
            const qualities = ['1080', '720', '480', '360', '240', '144'];
            const targetQuality = qualities.includes(quality) ? quality : '720';
            
            const videoRes = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
            const videoData = await videoRes.json();
            
            const videoStreams = videoData.videoStreams || [];
            const bestVideo = videoStreams.find(v => v.quality === targetQuality + 'p') ||
                            videoStreams.find(v => v.quality === '720p') ||
                            videoStreams.find(v => v.quality === '480p') ||
                            videoStreams[videoStreams.length - 1];
            
            if (bestVideo?.url) {
                return res.status(200).json({
                    success: true,
                    title: videoData.title || 'فيديو يوتيوب',
                    thumbnail: videoData.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    video_url: bestVideo.url,
                    quality: bestVideo.quality || targetQuality + 'p',
                    author: videoData.uploader || '',
                    duration: videoData.duration || ''
                });
            }
            
            return res.status(404).json({ success: false, error: 'تعذر تحميل الفيديو' });
        }
    } catch (error) {
        console.error('YouTube API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
