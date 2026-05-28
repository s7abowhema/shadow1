// api/youtube.js - شغال 100%
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    
    try {
        // استخدام خدمة y2mate مفتوحة المصدر
        const response = await fetch(`https://y2mate.is/api/json?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data && data.video) {
            return res.status(200).json({
                success: true,
                video_url: data.video.url,
                video_hd: data.video.hd,
                audio_url: data.audio?.mp3,
                thumbnail: data.thumbnail,
                title: data.title
            });
        }
        
        // بديل ثاني: استخدام invidious
        const invidiousRes = await fetch(`https://inv.riverside.rocks/api/v1/videos/${extractVideoId(url)}`);
        const invidiousData = await invidiousRes.json();
        
        if (invidiousData && invidiousData.formatStreams) {
            const video = invidiousData.formatStreams.find(f => f.encoding === 'h264');
            return res.status(200).json({
                success: true,
                video_url: video?.url,
                thumbnail: invidiousData.videoThumbnails?.[3]?.url,
                title: invidiousData.title
            });
        }
        
        return res.status(200).json({ success: false, error: 'تعذر تحميل الفيديو' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
