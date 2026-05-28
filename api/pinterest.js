export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    try {
        const apiUrl = `https://pinterest-video-downloader.p.rapidapi.com/dl?id=${extractPinId(url)}`;
        
        const response = await fetch(`https://pinterestdownloader.app/api/ajaxSearch?q=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const data = await response.json();
        
        if (data && data.images) {
            return res.status(200).json({
                success: true,
                image_urls: data.images?.map(img => img.url) || [data.image],
                video_url: data.video,
                thumbnail: data.thumbnail
            });
        }
        
        return res.status(200).json({ success: false, error: 'فشل تحميل المحتوى' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

function extractPinId(url) {
    const match = url.match(/pin\/(\d+)/);
    return match ? match[1] : null;
}