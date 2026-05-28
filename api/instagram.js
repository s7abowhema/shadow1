export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false });
    
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    try {
        const apiUrl = `https://instagram-media-downloader.p.rapidapi.com/rapi/instagram/media?id=${url}`;
        
        // استخدام API بديل مجاني مؤقتاً
        const response = await fetch(`https://snapinst.app/api/ajaxSearch?q=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const data = await response.json();
        
        if (data && data.medias) {
            return res.status(200).json({
                success: true,
                video_url: data.medias[0]?.url,
                image_urls: data.medias.filter(m => m.type === 'image').map(m => m.url),
                thumbnail: data.thumbnail
            });
        }
        
        return res.status(200).json({ success: false, error: 'تعذر العثور على المحتوى' });
    } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}