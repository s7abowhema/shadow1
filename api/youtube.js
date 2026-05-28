export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    try {
        // استخدام API مجاني
        const apiUrl = `https://youtube-video-download-info.p.rapidapi.com/dl?id=${extractVideoId(url)}`;
        // ملاحظة: تحتاج مفتاح API حقيقي أو تستخدم خدمة بديلة
        
        // حل مؤقت - استخدم y2mate.nu أو savethevideo.com
        const response = await fetch(`https://savethevideo.com/api/ajaxSearch?q=${encodeURIComponent(url)}&vt=mp4`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        return res.status(200).json({ success: false, error: 'يوتيوب قيد التطوير قريباً' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}